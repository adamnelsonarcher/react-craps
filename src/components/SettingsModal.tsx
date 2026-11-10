import React from 'react';
import { useCanHover } from '../hooks/useLayout';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bank: number;
  /** Balance used by "Reset board" and the Rebuy button. */
  startingBank: number;
  /** Save the bank balance and starting balance. */
  onSave: (settings: { bank: number; startingBank: number }) => void;
  /** Clear the table and start over with `startingBank` in the bank. */
  onResetBoard: (startingBank: number) => void;
}

const GAME_NAME = 'RollSim';
const VERSION = '2.2';

/** Largest balance you can type in (keeps the bank display readable). */
export const MAX_BALANCE = 1_000_000;

/** Parse a whole-dollar amount between `min` and `MAX_BALANCE`, or return an error message. */
const parseAmount = (raw: string, label: string, min: number): number | string => {
  const value = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(value)) return `${label}: please enter a number.`;
  const whole = Math.floor(value);
  if (whole < min) return `${label} must be at least $${min.toLocaleString()}.`;
  if (whole > MAX_BALANCE) return `${label} can be at most $${MAX_BALANCE.toLocaleString()}.`;
  return whole;
};

const inputClass = `w-full rounded bg-gray-800 border border-white/10 px-3 py-2 text-white
  focus:outline-none focus:ring-2 focus:ring-blue-500`;

/**
 * Settings dialog: edit the bank balance and starting balance, reset the board;
 * also shows the game name, version and credits.
 */
const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  bank,
  startingBank,
  onSave,
  onResetBoard,
}) => {
  // `null` = not edited: show (and keep) the live bank, which can still change if a
  // roll lands while the dialog is open.
  const [draftBank, setDraftBank] = React.useState<string | null>(null);
  const [draftStart, setDraftStart] = React.useState(String(startingBank));
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = React.useState(false);
  // Don't auto-focus on touch screens: it would pop up the on-screen keyboard.
  const canHover = useCanHover();

  // Start from the current values each time the dialog opens.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (isOpen && !wasOpen.current) {
      setDraftBank(null);
      setDraftStart(String(startingBank));
      setError(null);
      setConfirmingReset(false);
    }
    wasOpen.current = isOpen;
  }, [isOpen, startingBank]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // The bank is only changed (and rounded to whole dollars) if you edited it.
  const parseBank = () => (draftBank === null ? bank : parseAmount(draftBank, 'Bank balance', 0));
  const parseStart = () => parseAmount(draftStart, 'Starting balance', 1);

  const handleSave = () => {
    const nextBank = parseBank();
    const nextStart = parseStart();
    if (typeof nextBank === 'string' || typeof nextStart === 'string') {
      setError(typeof nextBank === 'string' ? nextBank : (nextStart as string));
      return;
    }
    onSave({ bank: nextBank, startingBank: nextStart });
    onClose();
  };

  const handleReset = () => {
    const nextStart = parseStart();
    if (typeof nextStart === 'string') {
      setError(nextStart);
      setConfirmingReset(false);
      return;
    }
    onResetBoard(nextStart);
    onClose();
  };

  const saveOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
  };

  const startPreview = Number.isFinite(Number(draftStart)) && draftStart.trim() !== ''
    ? `$${Math.max(0, Math.floor(Number(draftStart))).toLocaleString()}`
    : 'the starting balance';

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close settings"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="relative w-[min(520px,90vw)] max-h-[90vh] overflow-y-auto rounded-xl bg-gray-900 text-white shadow-2xl border border-white/10"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div id="settings-title" className="text-xl font-bold">Settings</div>
            <div className="text-xs text-gray-300 mt-0.5">Adjust game options</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          <div>
            <label htmlFor="settings-bank" className="block text-sm font-semibold mb-2">Bank balance</label>
            <input
              id="settings-bank"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_BALANCE}
              step={1}
              value={draftBank ?? String(bank)}
              onChange={(e) => {
                setDraftBank(e.target.value);
                setError(null);
              }}
              onKeyDown={saveOnEnter}
              autoFocus={canHover}
              className={inputClass}
            />
            <div className="text-xs text-gray-300 mt-1.5">
              The money in your bank right now. Chips already on the table aren't affected.
            </div>
          </div>

          <div>
            <label htmlFor="settings-start" className="block text-sm font-semibold mb-2">Starting balance</label>
            <input
              id="settings-start"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_BALANCE}
              step={1}
              value={draftStart}
              onChange={(e) => {
                setDraftStart(e.target.value);
                setError(null);
              }}
              onKeyDown={saveOnEnter}
              className={inputClass}
            />
            <div className="text-xs text-gray-300 mt-1.5">
              What you start with when you reset the board or rebuy after going broke.
            </div>
          </div>

          {error && <div className="text-xs text-red-300" role="alert">{error}</div>}

          <div className="rounded-lg border border-red-500/30 bg-red-950/30 p-3">
            <div className="text-sm font-semibold">Reset board</div>
            {confirmingReset ? (
              <>
                <div className="text-xs text-gray-200 mt-1">
                  Take every bet off the table, turn the point off, clear the roll history and
                  set your bank to {startPreview}?
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-sm font-semibold"
                  >
                    Yes, reset the board
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingReset(false)}
                    className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                  >
                    Keep playing
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-3 mt-1">
                <div className="text-xs text-gray-300">
                  Start over: clears all bets, the point and roll history, and sets your bank to the
                  starting balance.
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className="shrink-0 px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-sm font-semibold"
                >
                  Reset board…
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
          >
            Save
          </button>
        </div>

        <div className="px-5 pb-4 text-[11px] text-gray-400">
          <div>{GAME_NAME} v{VERSION}</div>
          <div>
            Made by{' '}
            <a
              href="https://nelsonarcher.com"
              target="_blank"
              rel="noreferrer"
              className="text-gray-200 hover:text-white underline underline-offset-2"
            >
              Adam Nelson-Archer
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
