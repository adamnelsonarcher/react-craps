export interface RollOutcome {
  type: 'natural' | 'craps' | 'point-set' | 'seven-out' | 'point-made' | 'normal';
  point?: number | null;
  isComingOut: boolean;
}

export interface WinningArea {
  id: string;
  type: 'win' | 'lose';
} 