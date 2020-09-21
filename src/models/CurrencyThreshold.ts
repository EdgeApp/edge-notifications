import { asMap, asNumber, asObject } from 'cleaners'
import * as Nano from 'nano'

import { Base } from '.'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const CONFIG = require('../../serverConfig.json')

const nanoDb = Nano(CONFIG.dbFullpath)
const dbCurrencyThreshold = nanoDb.db.use('db_currency_thresholds')

const asThresholds = asMap(
  asObject({
    lastUpdated: asNumber,
    price: asNumber
  })
)

const asCurrencyThreshold = asObject({
  thresholds: asThresholds
})

export class CurrencyThreshold
  extends Base
  implements ReturnType<typeof asCurrencyThreshold> {
  public static table = dbCurrencyThreshold
  public static asType = asCurrencyThreshold

  public thresholds: ReturnType<typeof asThresholds>

  // @ts-expect-error
  constructor(...args) {
    super(...args)

    // @ts-expect-error
    if (!this.thresholds) this.thresholds = {}
  }

  public static async fromCode(
    currencyCode: string
  ): Promise<CurrencyThreshold> {
    const threshold = new CurrencyThreshold(null, currencyCode)
    const obj = { lastUpdated: 0, price: 0 }
    threshold.thresholds[1] = obj
    threshold.thresholds[24] = obj
    await threshold.save()
    return threshold
  }

  public async update(
    hours: string,
    timestamp: number,
    price: number
  ): Promise<CurrencyThreshold> {
    this.thresholds[hours] = {
      lastUpdated: timestamp,
      price
    }
    return (await this.save()) as CurrencyThreshold
  }
}
