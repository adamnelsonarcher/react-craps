import React, { useEffect, useState } from 'react';
import { DicePair } from '../types/game';

/**
 * Developer overlay for measuring board coordinates and forcing dice rolls.
 * Hidden by default: run `window.enableDevTools()` in the browser console to show
 * its toggle button.
 */

declare global {
  interface Window {
    enableDevTools?: () => void;
  }
}

const PRESETS: Array<{ name: string } & DicePair> = [
  { name: 'Snake Eyes (2)', die1: 1, die2: 1 },
  { name: 'Yo (11)', die1: 6, die2: 5 },
  { name: 'Boxcars (12)', die1: 6, die2: 6 },
  { name: 'Three Craps', die1: 2, die2: 1 },
  { name: 'Seven', die1: 4, die2: 3 },
  { name: 'Hard 8', die1: 4, die2: 4 },
];

const DiceControls: React.FC<{ onRoll: (dice: DicePair) => void }> = ({ onRoll }) => {
  const [dice, setDice] = useState<DicePair>({ die1: 1, die2: 1 });

  const dieSelect = (key: keyof DicePair, label: string) => (
    <div>
      <label className="block text-sm">{label}</label>
      <select
        value={dice[key]}
        onChange={(e) => setDice(prev => ({ ...prev, [key]: Number(e.target.value) }))}
        className="bg-gray-800 rounded px-2 py-1"
      >
        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );

  return (
    <div
      className="absolute top-24 left-0 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm z-[950]"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="font-bold mb-2">Dice Controls</h3>
      <div className="flex gap-4">
        {dieSelect('die1', 'Die 1')}
        {dieSelect('die2', 'Die 2')}
      </div>
      <div className="mt-2 flex justify-between items-center gap-2">
        <span className="text-sm">Total: {dice.die1 + dice.die2}</span>
        <button
          type="button"
          onClick={() => onRoll(dice)}
          className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-sm"
        >
          Roll These Dice
        </button>
      </div>
      <div className="mt-3 border-t border-gray-600 pt-2">
        <div className="text-sm font-bold mb-1">Quick Sets:</div>
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map(preset => (
            <button
              type="button"
              key={preset.name}
              onClick={() => {
                setDice({ die1: preset.die1, die2: preset.die2 });
                onRoll({ die1: preset.die1, die2: preset.die2 });
              }}
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface DevToolsProps {
  boardRef: React.RefObject<HTMLElement>;
  active: boolean;
  onToggle: () => void;
  onForcedRoll: (dice: DicePair) => void;
}

const toBoardPercent = (e: MouseEvent, board: HTMLElement) => {
  const rect = board.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * 100,
    y: ((e.clientY - rect.top) / rect.height) * 100,
  };
};

const DevTools: React.FC<DevToolsProps> = ({ boardRef, active, onToggle, onForcedRoll }) => {
  const [enabled, setEnabled] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [clickLog, setClickLog] = useState<string[]>([]);

  useEffect(() => {
    window.enableDevTools = () => {
      setEnabled(true);
      console.info('Dev tools button enabled');
    };
    return () => {
      delete window.enableDevTools;
    };
  }, []);

  // Track the cursor / clicks in board-relative percentages while active.
  useEffect(() => {
    const board = boardRef.current;
    if (!active || !board) return;
    const onMove = (e: MouseEvent) => setMouse(toBoardPercent(e, board));
    const onClick = (e: MouseEvent) => {
      const { x, y } = toBoardPercent(e, board);
      setClickLog(prev => [...prev, `X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`]);
    };
    board.addEventListener('mousemove', onMove);
    board.addEventListener('click', onClick);
    return () => {
      board.removeEventListener('mousemove', onMove);
      board.removeEventListener('click', onClick);
    };
  }, [active, boardRef]);

  if (!enabled) return null;

  return (
    <>
      <button
        type="button"
        className="absolute bottom-12 left-2 z-50 bg-blue-500 text-white px-2 py-1 rounded"
        onClick={onToggle}
      >
        {active ? 'Hide' : 'Show'} Dev Tools
      </button>

      {active && (
        <>
          <div className="absolute top-12 left-0 bg-black/50 text-white p-2 text-sm z-[950] pointer-events-none">
            X: {mouse.x.toFixed(2)}%<br />
            Y: {mouse.y.toFixed(2)}%
          </div>
          <DiceControls onRoll={onForcedRoll} />
          <div
            className="absolute top-0 right-0 bg-black/50 text-white p-2 max-h-[300px] overflow-y-auto z-[950]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(clickLog.join('\n'))}
              className="bg-blue-500 text-white px-2 py-1 rounded mb-2"
            >
              Copy Log
            </button>
            <div className="text-sm">
              {clickLog.map((entry, index) => <div key={index}>{entry}</div>)}
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DevTools;
