export interface RollOutcome {
  type: 'natural' | 'craps' | 'point-set' | 'seven-out' | 'point-made' | 'normal';
  point?: number | null;
  isComingOut: boolean;
}

export interface WinningArea {
  id: string;
  type: 'win' | 'lose';
  timestamp?: number;
}

export interface BetMovement {
  fromId: string;
  toId: string;
  amount: number;
  color: string;
  count: number;
}

export interface ResolvingBet {
  areaId: string;
  amount: number;
  color: string;
  count: number;
  isWinning: boolean;
  position: { x: number; y: number };
  winAmount?: number;
  totalAmount?: number;
  showTotalAtBet?: boolean;
} 