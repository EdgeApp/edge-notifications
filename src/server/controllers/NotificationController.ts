import { asMap, asObject, asOptional, asString, asUnknown } from 'cleaners'
import * as express from 'express'

import { Device, User } from '../../models'
import { NotificationManager } from '../../NotificationManager'

export const NotificationController = express.Router()

NotificationController.post('/send', async (req, res) => {
  try {
    if (!req.apiKey.admin) return res.sendStatus(401)

    const asBody = asObject({
      title: asString,
      body: asString,
      data: asOptional(asMap(asUnknown)),
      userId: asString
    })

    const { title, body, data, userId } = asBody(req.body)

    const manager = await NotificationManager.init(req.apiKey)

    const user = await User.fetch(userId)
    if (!user) return res.status(404).send('User does not exist.')

    const tokenPromises = []
    for (const deviceId in user.devices) {
      tokenPromises.push(
        Device.fetch(deviceId).then((device: Device) => device.tokenId)
      )
    }
    const tokens = await Promise.all(tokenPromises)

    const response = await manager.sendNotifications(title, body, tokens, data)
    const { successCount, failureCount } = response
    console.log(
      `Sent notifications to user ${userId} devices: ${successCount} success - ${failureCount} failure`
    )

    res.json(response)
  } catch (err) {
    console.error(
      `Failed to send notifications to user ${req.body.userId} devices`,
      err
    )
    res.status(500).json(err)
  }
})
