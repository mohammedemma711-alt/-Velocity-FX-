export interface Trader {
  id: string;
  name: string;
  avatar: string;
  country: string; // ISO 2-letter country code
  rank: number;
  previousRank: number;
  balance: number;
  equity: number;
  roi: number; // Return on Investment (percentage)
  winRate: number; // percentage of winning trades
  totalTrades: number;
  maxDrawdown: number; // max drawdown percentage
  profitFactor: number;
  preferredPairs: string[];
  isUser?: boolean;
  history: { day: number; equity: number }[]; // 30-day equity history
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  leverage: number;
  openPrice: number;
  closePrice: number;
  openTime: number; // timestamp
  closeTime: number; // timestamp
  profit: number; // USD
  pips: number;
}

export interface Position {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  lots: number;
  leverage: number;
  openPrice: number;
  openTime: number; // timestamp
  takeProfit?: number;
  stopLoss?: number;
}

export interface CurrencyPair {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  prevPrice: number;
  high: number;
  low: number;
  changePercent: number;
  history: number[]; // ticks
}
