import { useEffect, useState } from 'react';

/**
 * Small localStorage helpers. Storage can be unavailable (private mode, blocked
 * cookies), so every access is wrapped and falls back to the default value.
 */

export const STORAGE_KEYS = {
  /** Bank plus any chips on the table, so a refresh returns your bets to you. */
  bankroll: 'rollsim.bankroll',
  /** Balance used when the board is reset or you rebuy after going broke. */
  startingBank: 'rollsim.startingBank',
  quickRoll: 'rollsim.quickRoll',
  keepWinningBets: 'rollsim.keepWinningBets',
} as const;

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function save(key: string, value: string | number | boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage unavailable — the game still works, it just won't remember.
  }
}

/** A stored non-negative number, or `fallback` if missing or invalid. */
export function loadNumber(key: string, fallback: number): number {
  const raw = read(key);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function loadBoolean(key: string, fallback: boolean): boolean {
  const raw = read(key);
  return raw === null ? fallback : raw === 'true';
}

/** `useState` for a boolean preference that's remembered between visits. */
export function useStoredBoolean(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => loadBoolean(key, fallback));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}

/** `useState` for a non-negative number preference that's remembered between visits. */
export function useStoredNumber(key: string, fallback: number) {
  const [value, setValue] = useState(() => loadNumber(key, fallback));
  useEffect(() => save(key, value), [key, value]);
  return [value, setValue] as const;
}
