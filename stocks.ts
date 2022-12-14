import * as CurrencyConverter from "currency-converter-lt"
import {getStockData} from "./yahoo"

const currencyConverter = new CurrencyConverter()

export interface StockHolding {
    symbol: string
    quantity: number
}

export interface StockValue {
    symbol: string
    value: number
    nativeCurrency: string
    nativeValue: number
    price: number
    nativePrice: number
}

export interface TickerData {
    currency: string
    price: number
}

export class StockChecker {
    private readonly tickers: { [symbol: string]: TickerData } = {}

    private readonly rates: { [conversion: string]: number } = {}

    public async getTicker(symbol: string): Promise<TickerData> {
        if (this.tickers[symbol]) return this.tickers[symbol]
        const ticker = await getStockData([symbol])
        return this.tickers[symbol] = {
            currency: ticker[0].currency,
            price: ticker[0].regularMarketPrice.raw
        }
    }

    public async getRate(from: string, to: string): Promise<number> {
        if (from === to) return 1;

        const conversion = `${from}:${to}`
        if (this.rates[conversion]) return this.rates[conversion]
        const inverse = `${to}:${from}`
        const rate = await currencyConverter.from(from).to(to).convert()
        this.rates[inverse] = 1/rate
        return this.rates[conversion] = rate
    }

    public async getStockValue(holding: StockHolding, targetCurrency: string): Promise<StockValue> {
        const ticker = await this.getTicker(holding.symbol)
        const rate = await this.getRate(ticker.currency, targetCurrency)
        const value = holding.quantity * ticker.price * rate
        return {
            symbol: holding.symbol,
            value,
            nativeCurrency: ticker.currency,
            nativeValue: holding.quantity * ticker.price,
            price: ticker.price * rate,
            nativePrice: ticker.price,
        }
    }

    public async getStockValues(holdings: StockHolding[], targetCurrency: string): Promise<StockValue[]> {
        return Promise.all(holdings.map(h => this.getStockValue(h, targetCurrency)))
    }
}