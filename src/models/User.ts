import { asBoolean, asMap, asObject, asOptional } from 'cleaners'
import * as Nano from 'nano'

import { Base } from '.'
import { Device } from './Device'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CONFIG = require('../../serverConfig.json')

const nanoDb = Nano(CONFIG.dbFullpath)
const dbUserSettings = nanoDb.db.use('db_user_settings')

const asUserDevices = asMap(asBoolean)
const asUserNotifications = asObject({
  enabled: asOptional(asBoolean),
  currencyCodes: asMap(
    asObject({
      '1': asBoolean,
      '24': asBoolean
    })
  )
})
const asUser = asObject({
  devices: asUserDevices,
  notifications: asUserNotifications
})

export class User extends Base implements ReturnType<typeof asUser> {
  public static table = dbUserSettings
  public static asType = asUser

  public devices: ReturnType<typeof asUserDevices>
  public notifications: ReturnType<typeof asUserNotifications>

  // @ts-expect-error
  constructor(...args) {
    super(...args)

    // @ts-expect-error
    if (!this.devices) this.devices = {}
    // @ts-expect-error
    if (!this.notifications) {
      this.notifications = {
        enabled: true,
        currencyCodes: {}
      }
    }
  }

  public async attachDevice(deviceId: string) {
    const device = await Device.fetch(deviceId)
    if (!device)
      throw new Error('Device must be registered before attaching to user.')

    this.devices[deviceId] = true

    await this.save()
  }

  public async fetchDevices(): Promise<Device[]> {
    const devices: Device[] = []

    let updated = false
    for (const deviceId in this.devices) {
      const device = await Device.fetch(deviceId)
      if (device) {
        devices.push(device)
        continue
      }

      delete this.devices[deviceId]
      updated = true
    }

    if (updated) await this.save()

    return devices
  }

  public async registerNotifications(currencyCodes: string[]) {
    const currencyCodesToUnregister = Object.keys(
      this.notifications.currencyCodes
    ).filter(code => !currencyCodes.includes(code))
    for (const code of currencyCodesToUnregister) {
      delete this.notifications.currencyCodes[code]
    }

    for (const code of currencyCodes) {
      if (code in this.notifications.currencyCodes) continue

      this.notifications.currencyCodes[code] = {
        '1': true,
        '24': true
      }
    }

    await this.save()
  }
}
