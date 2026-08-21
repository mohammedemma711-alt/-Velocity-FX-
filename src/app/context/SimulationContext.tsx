'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Trader, Trade, Position, CurrencyPair } from '../types';
import { mockTraders as initialMockTraders } from '../data/mockTraders';

interface SimulationContextType {
  traders: Trader[];
  userTrader: Trader;
  positions: Position[];
  tradeHistory: Trade[];
  currencyPairs: CurrencyPair[];
  selectedPair: CurrencyPair;
  setSelectedPair: (pair: CurrencyPair) => void;
  openPosition: (symbol: string, type: 'BUY' | 'SELL', lots: number, leverage: number, stopLoss?: number, takeProfit?: number) => boolean;
  closePosition: (positionId: string) => void;
  updateUserProfile: (name: string, avatar: string, country: string) => void;
  resetAccount: () => void;
  isLoading: boolean;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const INITIAL_BALANCE = 10000;

const DEFAULT_PAIRS: CurrencyPair[] = [
  { symbol: 'EUR/USD', price: 1.09250, bid: 1.09243, ask: 1.09257, prevPrice: 1.09250, high: 1.09650, low: 1.08950, changePercent: 0.12, history: Array(30).fill(1.09250) },
  { symbol: 'GBP/USD', price: 1.27420, bid: 1.27411, ask: 1.27429, prevPrice: 1.27420, high: 1.27980, low: 1.26900, changePercent: 0.24, history: Array(30).fill(1.27420) },
  { symbol: 'USD/JPY', price: 146.520, bid: 146.505, ask: 146.535, prevPrice: 146.520, high: 147.200, low: 145.800, changePercent: -0.35, history: Array(30).fill(146.520) },
  { symbol: 'AUD/USD', price: 0.65820, bid: 0.65812, ask: 0.65828, prevPrice: 0.65820, high: 0.66250, low: 0.65400, changePercent: -0.08, history: Array(30).fill(0.65820) },
  { symbol: 'USD/CAD', price: 1.36250, bid: 1.36240, ask: 1.36260, prevPrice: 1.36250, high: 1.36800, low: 1.35750, changePercent: 0.05, history: Array(30).fill(1.36250) },
  { symbol: 'USD/CHF', price: 0.87420, bid: 0.87410, ask: 0.87430, prevPrice: 0.87420, high: 0.88000, low: 0.86900, changePercent: -0.15, history: Array(30).fill(0.87420) }
];

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyPairs, setCurrencyPairs] = useState<CurrencyPair[]>(DEFAULT_PAIRS);
  const [selectedPairSymbol, setSelectedPairSymbol] = useState<string>(DEFAULT_PAIRS[0].symbol);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [userTrader, setUserTrader] = useState<Trader>({
    id: 'user-trader',
    name: 'You (Trader)',
    avatar: 'TR',
    country: 'US',
    rank: 12,
    previousRank: 12,
    balance: INITIAL_BALANCE,
    equity: INITIAL_BALANCE,
    roi: 0.0,
    winRate: 0.0,
    totalTrades: 0,
    maxDrawdown: 0.0,
    profitFactor: 0.0,
    preferredPairs: [],
    isUser: true,
    history: Array(30).fill(0).map((_, i) => ({ day: i + 1, equity: INITIAL_BALANCE }))
  });

  const [traders, setTraders] = useState<Trader[]>(initialMockTraders);
  const [isLoading, setIsLoading] = useState(true);

  // Load state from DB on mount
  useEffect(() => {
    async function loadState() {
      try {
        const res = await fetch('/api/state');
        const json = await res.json();
        if (json.success && json.data) {
          const dbData = json.data.user_trader ? json.data : json.data.data; // support both direct and nested formats
          if (dbData) {
            const { user_trader, traders: dbTraders, positions: dbPositions, trade_history } = dbData;
            if (user_trader) setUserTrader(user_trader);
            if (dbTraders) setTraders(dbTraders);
            if (dbPositions) setPositions(dbPositions);
            if (trade_history) setTradeHistory(trade_history);
          }
        }
      } catch (err) {
        console.error('Failed to load simulator state from database:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadState();
  }, []);

  // Helper to sync state to database
  const syncToDatabase = async () => {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTrader: userTraderRef.current,
          traders,
          positions: positionsRef.current,
          tradeHistory
        })
      });
    } catch (err) {
      console.error('Failed to sync state to database:', err);
    }
  };

  // Debounced auto-save whenever state changes
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isLoading) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      syncToDatabase();
    }, 1200); // 1.2s debounce to bundle high frequency changes (e.g. tick monitoring / drifts)

    return () => clearTimeout(timer);
  }, [userTrader, traders, positions, tradeHistory, isLoading]);

  // Derived state for the selected currency pair
  const selectedPair = currencyPairs.find(p => p.symbol === selectedPairSymbol) || currencyPairs[0];
  const setSelectedPair = (pair: CurrencyPair) => {
    setSelectedPairSymbol(pair.symbol);
  };

  // References for live positions to avoid stale closures in intervals
  const positionsRef = useRef<Position[]>([]);
  const currencyPairsRef = useRef<CurrencyPair[]>([]);
  const userTraderRef = useRef<Trader>(userTrader);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    currencyPairsRef.current = currencyPairs;
  }, [currencyPairs]);

  useEffect(() => {
    userTraderRef.current = userTrader;
  }, [userTrader]);

  // Real-time Forex Price Feeds (Brownian Motion Simulation)
  useEffect(() => {
    const priceInterval = setInterval(() => {
      setCurrencyPairs((prevPairs) =>
        prevPairs.map((pair) => {
          const isJpy = pair.symbol.endsWith('JPY');
          // Drift and volatility variables
          const volatility = isJpy ? 0.06 : 0.0004;
          const change = (Math.random() - 0.5) * volatility;
          
          const newPrice = Math.max(0.0001, pair.price + change);
          const spread = isJpy ? 0.015 : 0.00014; // spread size
          
          const bid = Number((newPrice - spread / 2).toFixed(isJpy ? 3 : 5));
          const ask = Number((newPrice + spread / 2).toFixed(isJpy ? 3 : 5));
          const roundedPrice = Number(newPrice.toFixed(isJpy ? 3 : 5));
          
          // Historical ticks (max 50 points for charts)
          const newHistory = [...pair.history.slice(1), roundedPrice];
          
          const dailyOpen = pair.price - (pair.price * (pair.changePercent / 100));
          const high = Math.max(pair.high, roundedPrice);
          const low = Math.min(pair.low, roundedPrice);
          const changePercent = Number((((roundedPrice - dailyOpen) / dailyOpen) * 100).toFixed(2));

          return {
            ...pair,
            price: roundedPrice,
            bid,
            ask,
            prevPrice: pair.price,
            high,
            low,
            changePercent,
            history: newHistory
          };
        })
      );
    }, 1000);

    return () => clearInterval(priceInterval);
  }, []);


  // Handle unrealized PnL, Stop-Loss, and Take-Profit checks
  useEffect(() => {
    const positionMonitorInterval = setInterval(() => {
      if (positionsRef.current.length === 0) return;

      const activePairs = currencyPairsRef.current;
      const currentPositions = [...positionsRef.current];
      const closedTradesList: Trade[] = [];
      const remainingPositions: Position[] = [];

      let balanceAdjust = 0;

      currentPositions.forEach((pos) => {
        const pair = activePairs.find((p) => p.symbol === pos.symbol);
        if (!pair) {
          remainingPositions.push(pos);
          return;
        }

        const isJpy = pos.symbol.endsWith('JPY');
        const multiplier = isJpy ? 100 : 10000;
        const currentPrice = pos.type === 'BUY' ? pair.bid : pair.ask;
        
        let pips = (currentPrice - pos.openPrice) * multiplier;
        if (pos.type === 'SELL') {
          pips = (pos.openPrice - currentPrice) * multiplier;
        }

        // Check Stop Loss
        let triggered = false;
        let triggerPrice = currentPrice;
        let triggerReason: 'SL' | 'TP' | null = null;

        if (pos.stopLoss !== undefined) {
          if (pos.type === 'BUY' && currentPrice <= pos.stopLoss) {
            triggered = true;
            triggerPrice = pos.stopLoss;
            triggerReason = 'SL';
          } else if (pos.type === 'SELL' && currentPrice >= pos.stopLoss) {
            triggered = true;
            triggerPrice = pos.stopLoss;
            triggerReason = 'SL';
          }
        }

        // Check Take Profit
        if (pos.takeProfit !== undefined) {
          if (pos.type === 'BUY' && currentPrice >= pos.takeProfit) {
            triggered = true;
            triggerPrice = pos.takeProfit;
            triggerReason = 'TP';
          } else if (pos.type === 'SELL' && currentPrice <= pos.takeProfit) {
            triggered = true;
            triggerPrice = pos.takeProfit;
            triggerReason = 'TP';
          }
        }

        if (triggered && triggerReason) {
          let triggeredPips = (triggerPrice - pos.openPrice) * multiplier;
          if (pos.type === 'SELL') {
            triggeredPips = (pos.openPrice - triggerPrice) * multiplier;
          }
          const triggeredProfit = Number((triggeredPips * pos.lots * 10).toFixed(2));
          balanceAdjust += triggeredProfit;

          closedTradesList.push({
            id: pos.id,
            symbol: pos.symbol,
            type: pos.type,
            lots: pos.lots,
            leverage: pos.leverage,
            openPrice: pos.openPrice,
            closePrice: triggerPrice,
            openTime: pos.openTime,
            closeTime: Date.now(),
            profit: triggeredProfit,
            pips: Number(triggeredPips.toFixed(1))
          });
        } else {
          remainingPositions.push(pos);
        }
      });

      if (closedTradesList.length > 0) {
        setTradeHistory((prev) => [...prev, ...closedTradesList]);
        setPositions(remainingPositions);
        
        // Update user profile balance
        setUserTrader((prev) => {
          const newBalance = Number((prev.balance + balanceAdjust).toFixed(2));
          const totalTrades = prev.totalTrades + closedTradesList.length;
          
          const combinedHistory = [...tradeHistory, ...closedTradesList];
          const wins = combinedHistory.filter(t => t.profit > 0).length;
          const winRate = Number(((wins / Math.max(1, totalTrades)) * 100).toFixed(1));

          // Profit Factor Calculation
          const grossProfits = combinedHistory.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
          const grossLosses = Math.abs(combinedHistory.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
          const profitFactor = grossLosses === 0 ? (grossProfits > 0 ? 9.99 : 0) : Number((grossProfits / grossLosses).toFixed(2));

          // Preferred pairs
          const pairCounts: { [key: string]: number } = {};
          combinedHistory.forEach(t => {
            pairCounts[t.symbol] = (pairCounts[t.symbol] || 0) + 1;
          });
          const preferredPairs = Object.keys(pairCounts)
            .sort((a, b) => pairCounts[b] - pairCounts[a])
            .slice(0, 3);

          return {
            ...prev,
            balance: newBalance,
            totalTrades,
            winRate,
            profitFactor,
            preferredPairs
          };
        });
      }
    }, 1000);

    return () => clearInterval(positionMonitorInterval);
  }, [tradeHistory]);

  // Recalculate user equity in real-time based on open positions PnL
  useEffect(() => {
    const equityInterval = setInterval(() => {
      const activePairs = currencyPairsRef.current;
      const activePositions = positionsRef.current;
      const currentUser = userTraderRef.current;

      let totalUnrealizedPnL = 0;

      activePositions.forEach((pos) => {
        const pair = activePairs.find((p) => p.symbol === pos.symbol);
        if (!pair) return;

        const isJpy = pos.symbol.endsWith('JPY');
        const multiplier = isJpy ? 100 : 10000;
        const currentPrice = pos.type === 'BUY' ? pair.bid : pair.ask;

        let pips = (currentPrice - pos.openPrice) * multiplier;
        if (pos.type === 'SELL') {
          pips = (pos.openPrice - currentPrice) * multiplier;
        }

        totalUnrealizedPnL += pips * pos.lots * 10;
      });

      const currentEquity = Number((currentUser.balance + totalUnrealizedPnL).toFixed(2));
      const currentRoi = Number((((currentEquity - INITIAL_BALANCE) / INITIAL_BALANCE) * 100).toFixed(2));

      // Calculate max drawdown on the fly if needed
      // Find peak balance/equity to calculate drawdown, simplified here
      const peak = Math.max(INITIAL_BALANCE, currentUser.balance, currentEquity);
      const currentDrawdown = peak > 0 ? Number((((peak - currentEquity) / peak) * 100).toFixed(1)) : 0;
      const maxDrawdown = Math.max(currentUser.maxDrawdown, currentDrawdown);

      // Keep user history updated
      const newHistory = [...currentUser.history];
      if (newHistory.length > 0) {
        newHistory[newHistory.length - 1] = {
          day: 30,
          equity: currentEquity
        };
      }

      setUserTrader((prev) => ({
        ...prev,
        equity: currentEquity,
        roi: currentRoi,
        maxDrawdown,
        history: newHistory
      }));
    }, 500);

    return () => clearInterval(equityInterval);
  }, []);

  // Leaderboard Updates: Periodically drift other mock traders' performance, merge user, sort
  useEffect(() => {
    const leaderBoardInterval = setInterval(() => {
      setTraders((prevMockTraders) => {
        // Drift mock traders performance slightly so the leader board looks dynamic
        const driftedMockTraders = prevMockTraders.map((trader) => {
          // 25% chance a trader gets a performance tick update
          if (Math.random() > 0.75) {
            const tradeChange = (Math.random() - 0.45) * 6; // random ROI shift
            const newRoi = Number((trader.roi + tradeChange).toFixed(2));
            const newBalance = Number((INITIAL_BALANCE * (1 + newRoi / 100)).toFixed(2));
            
            // Randomly update stats
            const totalTrades = trader.totalTrades + 1;
            const didWin = Math.random() < (trader.winRate / 100);
            const wins = Math.round(trader.winRate / 100 * trader.totalTrades) + (didWin ? 1 : 0);
            const winRate = Number(((wins / totalTrades) * 100).toFixed(1));

            // Generate history update
            const updatedHistory = [...trader.history];
            if (updatedHistory.length > 0) {
              updatedHistory[updatedHistory.length - 1] = {
                day: 30,
                equity: newBalance
              };
            }

            return {
              ...trader,
              roi: newRoi,
              balance: newBalance,
              equity: newBalance,
              totalTrades,
              winRate,
              history: updatedHistory
            };
          }
          return trader;
        });

        // Add user to the list
        const currentUserInList = { ...userTraderRef.current };
        const combined = [...driftedMockTraders.filter(t => t.id !== 'user-trader'), currentUserInList];

        // Sort by ROI descending
        const sorted = combined.sort((a, b) => b.roi - a.roi);

        // Assign ranks
        const ranked = sorted.map((t, idx) => {
          const currentRank = idx + 1;
          // Track previous rank
          const prevRank = t.id === 'user-trader' 
            ? (userTraderRef.current.rank || currentRank) 
            : (t.rank || currentRank);

          return {
            ...t,
            rank: currentRank,
            previousRank: prevRank
          };
        });

        // Set user trader's rank details
        const updatedUser = ranked.find(t => t.id === 'user-trader');
        if (updatedUser) {
          setUserTrader(prev => ({
            ...prev,
            rank: updatedUser.rank,
            previousRank: updatedUser.previousRank
          }));
        }

        return ranked.filter(t => t.id !== 'user-trader'); // keep state clean of user, context will combine them dynamically
      });
    }, 5000);

    return () => clearInterval(leaderBoardInterval);
  }, []);

  // Helper to compile final sorted list of traders including the user
  const allTraders = [...traders, userTrader].sort((a, b) => b.roi - a.roi).map((t, idx) => ({
    ...t,
    rank: idx + 1
  }));

  // Actions: Open Position
  const openPosition = (
    symbol: string,
    type: 'BUY' | 'SELL',
    lots: number,
    leverage: number,
    stopLoss?: number,
    takeProfit?: number
  ): boolean => {
    const pair = currencyPairs.find((p) => p.symbol === symbol);
    if (!pair) return false;

    // Check margin availability
    // Contract size = 100,000. Margin required = (lots * 100,000 * openPrice) / leverage
    // For simplicity: margin required = (lots * 100,000) / leverage (based on base currency USD/XXX)
    // Or simpler: margin required = lots * 100000 / leverage
    const marginRequired = (lots * 100000) / leverage;
    
    // Total margin of existing positions
    const existingMargin = positions.reduce((sum, pos) => sum + (pos.lots * 100000) / pos.leverage, 0);
    const totalNewMargin = existingMargin + marginRequired;

    if (totalNewMargin > userTrader.equity) {
      // Not enough free margin
      return false;
    }

    const openPrice = type === 'BUY' ? pair.ask : pair.bid;
    const newPosition: Position = {
      id: `pos-${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      type,
      lots,
      leverage,
      openPrice,
      openTime: Date.now(),
      stopLoss,
      takeProfit
    };

    setPositions((prev) => [...prev, newPosition]);
    return true;
  };

  // Actions: Close Position
  const closePosition = (positionId: string) => {
    const position = positions.find((p) => p.id === positionId);
    if (!position) return;

    const pair = currencyPairs.find((p) => p.symbol === position.symbol);
    if (!pair) return;

    const isJpy = position.symbol.endsWith('JPY');
    const multiplier = isJpy ? 100 : 10000;
    const currentPrice = position.type === 'BUY' ? pair.bid : pair.ask;

    let pips = (currentPrice - position.openPrice) * multiplier;
    if (position.type === 'SELL') {
      pips = (position.openPrice - currentPrice) * multiplier;
    }

    const profit = Number((pips * position.lots * 10).toFixed(2));

    const newTrade: Trade = {
      id: position.id,
      symbol: position.symbol,
      type: position.type,
      lots: position.lots,
      leverage: position.leverage,
      openPrice: position.openPrice,
      closePrice: currentPrice,
      openTime: position.openTime,
      closeTime: Date.now(),
      profit,
      pips: Number(pips.toFixed(1))
    };

    setTradeHistory((prev) => [...prev, newTrade]);
    setPositions((prev) => prev.filter((p) => p.id !== positionId));

    // Update user profile balance
    setUserTrader((prev) => {
      const newBalance = Number((prev.balance + profit).toFixed(2));
      const totalTrades = prev.totalTrades + 1;
      
      const combinedHistory = [...tradeHistory, newTrade];
      const wins = combinedHistory.filter(t => t.profit > 0).length;
      const winRate = Number(((wins / totalTrades) * 100).toFixed(1));

      const grossProfits = combinedHistory.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
      const grossLosses = Math.abs(combinedHistory.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
      const profitFactor = grossLosses === 0 ? (grossProfits > 0 ? 9.99 : 0) : Number((grossProfits / grossLosses).toFixed(2));

      // Preferred pairs
      const pairCounts: { [key: string]: number } = {};
      combinedHistory.forEach(t => {
        pairCounts[t.symbol] = (pairCounts[t.symbol] || 0) + 1;
      });
      const preferredPairs = Object.keys(pairCounts)
        .sort((a, b) => pairCounts[b] - pairCounts[a])
        .slice(0, 3);

      return {
        ...prev,
        balance: newBalance,
        totalTrades,
        winRate,
        profitFactor,
        preferredPairs
      };
    });
  };

  // Actions: Update User Profile
  const updateUserProfile = (name: string, avatar: string, country: string) => {
    setUserTrader((prev) => ({
      ...prev,
      name: name || prev.name,
      avatar: avatar ? avatar.substring(0, 2).toUpperCase() : prev.avatar,
      country: country || prev.country
    }));
  };

  // Actions: Reset Account
  const resetAccount = async () => {
    try {
      await fetch('/api/state', { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to reset database cache:', err);
    }
    setPositions([]);
    setTradeHistory([]);
    setTraders(initialMockTraders);
    setUserTrader({
      id: 'user-trader',
      name: userTrader.name,
      avatar: userTrader.avatar,
      country: userTrader.country,
      rank: 12,
      previousRank: 12,
      balance: INITIAL_BALANCE,
      equity: INITIAL_BALANCE,
      roi: 0.0,
      winRate: 0.0,
      totalTrades: 0,
      maxDrawdown: 0.0,
      profitFactor: 0.0,
      preferredPairs: [],
      isUser: true,
      history: Array(30).fill(0).map((_, i) => ({ day: i + 1, equity: INITIAL_BALANCE }))
    });
  };

  return (
    <SimulationContext.Provider
      value={{
        traders: allTraders,
        userTrader,
        positions,
        tradeHistory,
        currencyPairs,
        selectedPair,
        setSelectedPair,
        openPosition,
        closePosition,
        updateUserProfile,
        resetAccount,
        isLoading
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
