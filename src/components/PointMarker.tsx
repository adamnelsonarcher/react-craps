import React from 'react';
import { POINT_MARKER_OFF_X, POINT_MARKER_X } from '../game/tableLayout';

interface PointMarkerProps {
  /** Current point, or `null` during the come-out roll. */
  point: number | null;
}

/** Puck diameter: scales with the chips (and so with the table). */
const PUCK_SIZE = 'clamp(24px, calc(var(--chip-size, 2.6rem) * 1.1), 52px)';

/**
 * The ON/OFF puck. Rendered inside the board: horizontally in board percentages (so it
 * always lines up with its number however the board is sized or moved), and vertically
 * just above the board's top edge (the felt's top padding leaves room for it).
 */
const PointMarker: React.FC<PointMarkerProps> = ({ point }) => {
  const isOn = point !== null;
  const x = (isOn && POINT_MARKER_X[point]) || POINT_MARKER_OFF_X;

  return (
    <div
      className={`absolute z-30 rounded-full flex items-center justify-center
                 border-[0.2rem] -translate-x-1/2
                 font-bold transition-[left,top] duration-1000 ease-in-out pointer-events-none select-none
                 ${isOn ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}
      style={{
        left: `${x}%`,
        top: `calc(-1 * ${PUCK_SIZE} - 0.375rem)`,
        width: PUCK_SIZE,
        height: PUCK_SIZE,
        fontSize: `calc(${PUCK_SIZE} * 0.32)`,
      }}
      role="status"
      aria-label={isOn ? `Point is ${point}` : 'Point is off (come-out roll)'}
    >
      {isOn ? 'ON' : 'OFF'}
    </div>
  );
};

export default PointMarker;
