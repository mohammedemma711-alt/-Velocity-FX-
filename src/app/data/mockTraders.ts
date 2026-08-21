import { Trader } from '../types';

const rawTraders = [
  {
    id: 'trader-1',
    name: "Alex 'PipMaster' Mercer",
    avatar: "AM",
    country: "US",
    roi: 312.4,
    winRate: 74.2,
    totalTrades: 342,
    maxDrawdown: 6.8,
    profitFactor: 2.45,
    preferredPairs: ["EUR/USD", "GBP/USD", "AUD/USD"]
  },
  {
    id: 'trader-2',
    name: "Yuki Tanaka",
    avatar: "YT",
    country: "JP",
    roi: 245.8,
    winRate: 68.5,
    totalTrades: 289,
    maxDrawdown: 8.2,
    profitFactor: 2.12,
    preferredPairs: ["USD/JPY", "EUR/JPY", "GBP/JPY"]
  },
  {
    id: 'trader-3',
    name: "Sofia Rodriguez",
    avatar: "SR",
    country: "BR",
    roi: 198.2,
    winRate: 71.1,
    totalTrades: 194,
    maxDrawdown: 9.4,
    profitFactor: 1.98,
    preferredPairs: ["EUR/USD", "USD/CAD", "GBP/USD"]
  },
  {
    id: 'trader-4',
    name: "Liam O'Connor",
    avatar: "LO",
    country: "IE",
    roi: 176.5,
    winRate: 65.4,
    totalTrades: 215,
    maxDrawdown: 7.9,
    profitFactor: 1.85,
    preferredPairs: ["GBP/USD", "EUR/GBP", "EUR/USD"]
  },
  {
    id: 'trader-5',
    name: "Amara Adebayo",
    avatar: "AA",
    country: "NG",
    roi: 154.3,
    winRate: 69.8,
    totalTrades: 167,
    maxDrawdown: 11.2,
    profitFactor: 1.76,
    preferredPairs: ["USD/JPY", "GBP/USD", "USD/ZAR"]
  },
  {
    id: 'trader-6',
    name: "Emma Watson",
    avatar: "EW",
    country: "GB",
    roi: 138.9,
    winRate: 62.1,
    totalTrades: 156,
    maxDrawdown: 5.5,
    profitFactor: 1.68,
    preferredPairs: ["EUR/USD", "GBP/USD", "EUR/GBP"]
  },
  {
    id: 'trader-7',
    name: "Chen Wei",
    avatar: "CW",
    country: "CN",
    roi: 122.4,
    winRate: 67.3,
    totalTrades: 228,
    maxDrawdown: 10.1,
    profitFactor: 1.59,
    preferredPairs: ["USD/JPY", "AUD/USD", "NZD/USD"]
  },
  {
    id: 'trader-8',
    name: "Lucas Dubois",
    avatar: "LD",
    country: "FR",
    roi: 109.1,
    winRate: 59.8,
    totalTrades: 142,
    maxDrawdown: 12.4,
    profitFactor: 1.48,
    preferredPairs: ["EUR/USD", "EUR/JPY", "USD/CHF"]
  },
  {
    id: 'trader-9',
    name: "Hassan Al-Sayed",
    avatar: "HA",
    country: "AE",
    roi: 98.7,
    winRate: 61.5,
    totalTrades: 118,
    maxDrawdown: 8.7,
    profitFactor: 1.42,
    preferredPairs: ["USD/JPY", "USD/CAD", "GBP/USD"]
  },
  {
    id: 'trader-10',
    name: "Chloe Smith",
    avatar: "CS",
    country: "AU",
    roi: 87.2,
    winRate: 58.9,
    totalTrades: 135,
    maxDrawdown: 6.2,
    profitFactor: 1.35,
    preferredPairs: ["AUD/USD", "NZD/USD", "AUD/JPY"]
  },
  {
    id: 'trader-11',
    name: "Hans Schmidt",
    avatar: "HS",
    country: "DE",
    roi: 74.5,
    winRate: 56.4,
    totalTrades: 98,
    maxDrawdown: 14.1,
    profitFactor: 1.28,
    preferredPairs: ["EUR/USD", "USD/CHF", "EUR/GBP"]
  }
];

// Helper to generate 30 days of equity history that trends toward the final balance
function generateEquityHistory(startingBalance: number, finalBalance: number, days: number = 30) {
  const history = [];
  const totalChange = finalBalance - startingBalance;
  
  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1);
    // Linear progression + some volatility/noise
    const baseValue = startingBalance + totalChange * progress;
    // Add sinusoidal wave and deterministic noise using sine and cosine functions
    const noise = (Math.sin(progress * Math.PI * 3.5) * (totalChange * 0.15)) + 
                  (Math.cos(progress * Math.PI * 7.2) * (totalChange * 0.04));
    
    // Make sure it doesn't drop below a minimum threshold
    const equity = Math.max(startingBalance * 0.5, Math.round(baseValue + noise));
    
    history.push({
      day: i + 1,
      equity
    });
  }
  
  // Ensure the last day matches the final balance exactly
  history[days - 1].equity = finalBalance;
  return history;
}

export const mockTraders: Trader[] = rawTraders.map((trader, index) => {
  const baseBalance = 10000; // All traders start with $10,000 mock cash
  const finalBalance = baseBalance * (1 + trader.roi / 100);
  const rank = index + 1;
  
  // Deterministic rank shifts based on index to avoid hydration mismatch
  const rankShift = index === 0 ? 0 : index % 3 === 1 ? 1 : index % 3 === 2 ? -1 : 0;
  
  return {
    ...trader,
    rank,
    previousRank: rank + rankShift,
    balance: finalBalance,
    equity: finalBalance,
    history: generateEquityHistory(baseBalance, finalBalance)
  };
});
