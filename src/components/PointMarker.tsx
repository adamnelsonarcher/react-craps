import React, { useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { POINT_MARKER_OFF_POSITION, POINT_MARKER_POSITIONS } from '../game/tableLayout';

interface PointMarkerProps {
  /** Current point, or `null` during the come-out roll. */
  point: number | null;
  /** The board element the marker is positioned against. */
  boardRef: React.RefObject<HTMLElement>;
}

/**
 * The ON/OFF puck. Rendered in a portal with fixed positioning so it can sit just
 * above the board edge and slide between numbers.
 */
const PointMarker: React.FC<PointMarkerProps> = ({ point, boardRef }) => {
  // `null` until measured, so the puck doesn't slide in from the corner on load.
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const isOn = point !== null;
  const { x: percentX, y: percentY } =
    (isOn && POINT_MARKER_POSITIONS[point]) || POINT_MARKER_OFF_POSITION;

  const updatePosition = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    setScreenPosition({
      x: rect.left + (rect.width * percentX) / 100,
      y: rect.top + (rect.height * percentY) / 100,
    });
  }, [boardRef, percentX, percentY]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);

    // The board also changes size without a window resize (e.g. while the layout settles).
    const board = boardRef.current;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null;
    if (board && observer) observer.observe(board);

    return () => {
      window.removeEventListener('resize', updatePosition);
      observer?.disconnect();
    };
  }, [boardRef, updatePosition]);

  if (!screenPosition) return null;

  return ReactDOM.createPortal(
    <div
      className={`fixed w-[clamp(1.75rem,3vw,3rem)] h-[clamp(1.75rem,3vw,3rem)]
                 rounded-full flex items-center justify-center
                 border-[0.2rem] transform -translate-x-1/2 -translate-y-1/2
                 font-bold transition-all duration-1000 ease-in-out pointer-events-none
                 ${isOn ? 'bg-white border-black text-black' : 'bg-black border-white text-white'}`}
      style={{
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        fontSize: 'clamp(0.6rem, 1.2vw, 1rem)',
      }}
      role="status"
      aria-label={isOn ? `Point is ${point}` : 'Point is off (come-out roll)'}
    >
      {isOn ? 'ON' : 'OFF'}
    </div>,
    document.body
  );
};

export default PointMarker;
