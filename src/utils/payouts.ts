export const PAYOUT_TABLE = {
  // One-roll bets
  'any-7': 5,        // 5 to 1
  'any-craps': 8,    // 8 to 1
  'roll-2': 30,      // 30 to 1
  'roll-3': 15,      // 15 to 1
  'roll-12': 30,     // 30 to 1
  'roll-11-1': 15,   // 15 to 1
  'roll-11-2': 15,   // 15 to 1
  
  // Hard ways
  'hard-4': 8,       // 8 to 1
  'hard-6': 10,      // 10 to 1
  'hard-8': 10,      // 10 to 1
  'hard-10': 8,      // 8 to 1
  
  // Field bets (special case - handled separately)
  'field': {
    base: 1,         // 1 to 1
    '2': 2,          // 2 pays double
    '12': 3          // 12 pays triple
  },
  
  // Line bets
  'pass-line': 1,    // 1 to 1
  'dont-pass': 1,    // 1 to 1
  'come': 1,         // 1 to 1
  'dont-come': 1,    // 1 to 1
  
  // Place bets
  'place-4': 1.8,    // 9 to 5
  'place-10': 1.8,   // 9 to 5
  'place-5': 1.4,    // 7 to 5
  'place-9': 1.4,    // 7 to 5
  'place-6': 1.167,  // 7 to 6
  'place-8': 1.167,  // 7 to 6
  
  // Buy bets (5% commission)
  'buy-4': { multiplier: 2, commission: 0.05 },    // 2 to 1
  'buy-10': { multiplier: 2, commission: 0.05 },   // 2 to 1
  'buy-5': { multiplier: 1.5, commission: 0.05 },  // 3 to 2
  'buy-9': { multiplier: 1.5, commission: 0.05 },  // 3 to 2
  'buy-6': { multiplier: 1.2, commission: 0.05 },  // 6 to 5
  'buy-8': { multiplier: 1.2, commission: 0.05 },  // 6 to 5
  
  // Lay bets (5% commission)
  'lay-4': { multiplier: 0.5, commission: 0.05 },    // 1 to 2
  'lay-10': { multiplier: 0.5, commission: 0.05 },   // 1 to 2
  'lay-5': { multiplier: 0.667, commission: 0.05 },  // 2 to 3
  'lay-9': { multiplier: 0.667, commission: 0.05 },  // 2 to 3
  'lay-6': { multiplier: 0.833, commission: 0.05 },  // 5 to 6
  'lay-8': { multiplier: 0.833, commission: 0.05 }   // 5 to 6
} as const;

// Helper type for the payout table
export type PayoutKey = keyof typeof PAYOUT_TABLE; 