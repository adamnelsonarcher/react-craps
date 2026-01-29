import React from 'react';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bank: number;
  onSetBank: (newBank: number) => void;
}

const GAME_NAME = 'RollSim';
const VERSION = '2.2';

const clampNonNegativeInt = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  bank,
  onSetBank
}) => {
  const [draftBank, setDraftBank] = React.useState<string>(String(bank));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setDraftBank(String(bank));
    setError(null);
  }, [isOpen, bank]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    const parsed = Number(draftBank);
    if (!Number.isFinite(parsed)) {
      setError('Please enter a valid number.');
      return;
    }
    const nextBank = clampNonNegativeInt(parsed);
    onSetBank(nextBank);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center"
      aria-hidden={!isOpen}
    >
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
        className="relative w-[min(520px,90vw)] rounded-xl bg-gray-900 text-white shadow-2xl border border-white/10"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <div id="settings-title" className="text-xl font-bold">
              Settings
            </div>
            <div className="text-xs text-gray-300 mt-0.5">
              Adjust game options
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-sm"
          >
            Close
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="text-sm font-semibold mb-2">Bank balance</div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={draftBank}
              onChange={(e) => {
                setDraftBank(e.target.value);
                setError(null);
              }}
              className="w-full rounded bg-gray-800 border border-white/10 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Bank balance"
            />
            <button
              type="button"
              onClick={() => setDraftBank(String(bank))}
              className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm whitespace-nowrap"
            >
              Reset
            </button>
          </div>
          {error && <div className="text-xs text-red-300 mt-2">{error}</div>}
          <div className="text-xs text-gray-300 mt-2">
            Sets your current bank amount. Values are rounded down to whole dollars.
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

