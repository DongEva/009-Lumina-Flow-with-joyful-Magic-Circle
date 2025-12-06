
export interface Point {
  x: number;
  y: number;
  pressure?: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  symmetry: number; // The symmetry setting used when this stroke was drawn
  timestamp: number;
}

export type SymmetryMode = 1 | 2 | 4 | 6 | 8 | 12;

export interface AppState {
  currentSymmetry: SymmetryMode;
  currentColor: string;
  isAnimating: boolean;
  showUI: boolean;
}

export const MAGIC_COLORS = [
  { name: 'Void', value: '#E0E0E0' }, // White/Silver
  { name: 'Crimson', value: '#FF3366' },
  { name: 'Gold', value: '#FFD700' },
  { name: 'Arcane', value: '#00FFFF' },
  { name: 'Deep', value: '#9933FF' },
  { name: 'Emerald', value: '#50C878' },
];
