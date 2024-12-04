import React, { useState, forwardRef, useImperativeHandle } from 'react';
import boardLayout from '../assets/just_text.png';
import Dice from './Dice';
import DiceHistory from './DiceHistory';
import ChipStack from './ChipStack';
import DiceArea from './DiceArea';
import GameState from './GameState';

// Add chip configuration
const CHIPS_CONFIG = [
  { value: 1, color: 'bg-white', ringColor: 'border-gray-300' },
  { value: 5, color: 'bg-red-600', ringColor: 'border-red-300' },
  { value: 10, color: 'bg-orange-500', ringColor: 'border-orange-300' },
  { value: 25, color: 'bg-green-600', ringColor: 'border-green-300' },
  { value: 50, color: 'bg-blue-600', ringColor: 'border-blue-300' },
  { value: 100, color: 'bg-gray-900', ringColor: 'border-gray-400' },
];

interface WinningArea {
  id: string;
  type: 'win' | 'lose';
}

interface BettingArea {
  id: string;
  name: string;
  style: React.CSSProperties;
}

interface NumberArea {
  id: string;
  name: string;
  baseX: number;
}

interface BettingAreaConfig {
  id: string;
  visible: boolean;
}

interface DiceRoll {
  die1: number;
  die2: number;
  total: number;
}

interface Bet {
  areaId: string;
  amount: number;
  color: string;
  count: number;
}

export interface CrapsTableRef {
  handleUndo: () => void;
  handleClear: () => void;
}

interface CrapsTableProps {
  selectedChipValue: number | null;
  bank: number;
  setBank: (value: number) => void;
  helpMode: boolean;
  setHelpMode: (value: boolean) => void;
  bets: Bet[];
  setBets: (bets: Bet[] | ((prev: Bet[]) => Bet[])) => void;
  dice: { die1: number; die2: number };
  isRolling: boolean;
  point: number | null;
  winningAreas?: WinningArea[];
  setDice?: (dice: { die1: number; die2: number }) => void;
}

// Move DiceControls outside CrapsTable component
const DiceControls: React.FC<{
  currentDice: { die1: number; die2: number };
  onDiceChange: (dice: { die1: number; die2: number }) => void;
}> = ({ currentDice, onDiceChange }) => {
  const [tempDice, setTempDice] = useState(currentDice);

  // Add common dice combinations
  const presets = [
    { name: "Snake Eyes (2)", die1: 1, die2: 1 },
    { name: "Yo (11)", die1: 6, die2: 5 },
    { name: "Box Cars (12)", die1: 6, die2: 6 },
    { name: "Three Craps", die1: 2, die2: 1 },
  ];

  return (
    <div 
      className="absolute top-24 left-0 bg-black/80 text-white p-4 rounded-lg backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <h3 className="font-bold mb-2">Dice Controls</h3>
      <div className="flex gap-4">
        <div>
          <label className="block text-sm">Die 1</label>
          <select 
            value={tempDice.die1}
            onChange={(e) => setTempDice(prev => ({ ...prev, die1: Number(e.target.value) }))}
            className="bg-gray-800 rounded px-2 py-1"
          >
            {[1,2,3,4,5,6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm">Die 2</label>
          <select 
            value={tempDice.die2}
            onChange={(e) => setTempDice(prev => ({ ...prev, die2: Number(e.target.value) }))}
            className="bg-gray-800 rounded px-2 py-1"
          >
            {[1,2,3,4,5,6].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2 flex justify-between items-center">
        <span className="text-sm">Total: {tempDice.die1 + tempDice.die2}</span>
        <button 
          onClick={() => onDiceChange(tempDice)}
          className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded text-sm"
        >
          Set Dice
        </button>
      </div>
      <div className="mt-3 border-t border-gray-600 pt-2">
        <div className="text-sm font-bold mb-1">Quick Sets:</div>
        <div className="grid grid-cols-2 gap-1">
          {presets.map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                setTempDice({ die1: preset.die1, die2: preset.die2 });
                onDiceChange({ die1: preset.die1, die2: preset.die2 });
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

const CrapsTable = forwardRef<CrapsTableRef, CrapsTableProps>(({ 
  selectedChipValue, 
  bank, 
  setBank,
  helpMode,
  setHelpMode,
  bets,
  setBets,
  dice,
  isRolling,
  point,
  winningAreas,
  setDice
}, ref) => {
  const [showDevTools, setShowDevTools] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [clickLog, setClickLog] = useState<string[]>([]);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [rollHistory, setRollHistory] = useState<DiceRoll[]>([]);
  const [betHistory, setBetHistory] = useState<Bet[][]>([]);  // Stack of bet states
  const [quickRoll, setQuickRoll] = useState(false);
  const [showDevToolsButton, setShowDevToolsButton] = useState(false);
  const [helpText, setHelpText] = useState<string | null>(null);

  // Constants based on your measurements for 4
  const numberWidth = 29.92 - 21.67;  // ~8.25%
  const numberSpacing = 8.5;  // Spacing between each number section
  
  // Configuration for which areas to show
  const [areaConfig, setAreaConfig] = useState<BettingAreaConfig[]>([
    { id: 'number-full', visible: false },  // Hide full number rectangles
    { id: 'place', visible: true },
    { id: 'buy', visible: true },
    { id: 'lay', visible: true },
    { id: 'field', visible: true },
    { id: 'come', visible: true },
    { id: 'dont-come', visible: true },
    { id: 'pass-line-chips', visible: false },
    { id: 'dont-pass-chips', visible: false },
  ]);

  // Add this object for betting area descriptions
  const bettingDescriptions: Record<string, string> = {
    'pass-line': 'Pass Line: The most common bet. Win if first roll is 7/11, lose on 2/3/12. Any other number becomes the "point" - you win if point is rolled again before a 7.',
    'dont-pass': "Don't Pass: Opposite of Pass Line. Win on 2/3, lose on 7/11, push on 12. After point, win if 7 comes before point.",
    'come': 'Come: Like a Pass Line bet, but made after the point. Win on 7/11, lose on 2/3/12.',
    'dont-come': "Don't Come: Opposite of Come bet. Win on 2/3, lose on 7/11, push on 12.",
    'field': 'Field: One-roll bet. Win on 2,3,4,9,10,11,12. 2 and 12 typically pay double.',
    'any-7': 'Any Seven: One-roll bet. Win if next roll is 7.',
    'any-craps': 'Any Craps: One-roll bet. Win if next roll is 2, 3, or 12.',
    'hard-4': 'Hard 4: Win if 2-2 is rolled before any 7 or "easy" 4 (3-1).',
    'hard-6': 'Hard 6: Win if 3-3 is rolled before any 7 or "easy" 6 (4-2, 5-1).',
    'hard-8': 'Hard 8: Win if 4-4 is rolled before any 7 or "easy" 8 (5-3, 6-2).',
    'hard-10': 'Hard 10: Win if 5-5 is rolled before any 7 or "easy" 10 (6-4).',
  };

  const generateNumberAreas = () => {
    const numbers: NumberArea[] = [
      { id: '4', name: 'Four', baseX: 21.67 },
      { id: '5', name: 'Five', baseX: 21.67 + numberSpacing },
      { id: '6', name: 'Six', baseX: 21.67 + (numberSpacing * 2) },
      { id: '8', name: 'Eight', baseX: 21.67 + (numberSpacing * 2.96) },
      { id: '9', name: 'Nine', baseX: 21.67 + (numberSpacing * 3.92) },
      { id: '10', name: 'Ten', baseX: 21.67 + (numberSpacing * 4.93) },
    ];

    return numbers.flatMap(num => [
      // Full number rectangle
      {
        id: `number-${num.id}-full`,
        name: `Number ${num.name} Area`,
        style: {
          top: '1.78%',
          left: `${num.baseX - 0.23}%`,
          width: `${numberWidth + 0.5}%`,
          height: '27.2%'
        }
      },
      // Place bet
      {
        id: `place-${num.id}`,
        name: `Place ${num.name}`,
        style: {
          top: '12.33%',
          left: `${num.baseX}%`,
          width: `${numberWidth}%`,
          height: '16.2%'
        }
      },
      // Buy bet
      {
        id: `buy-${num.id}`,
        name: `Buy ${num.name}`,
        style: {
          top: '7.74%',
          left: `${num.baseX}%`,
          width: `${numberWidth}%`,
          height: '4.28%'
        }
      },
      // Lay bet
      {
        id: `lay-${num.id}`,
        name: `Lay ${num.name}`,
        style: {
          top: '2.08%',
          left: `${num.baseX}%`,
          width: `${numberWidth}%`,
          height: '5.51%'
        }
      }
    ]);
  };

  const bettingAreas: BettingArea[] = [
    ...generateNumberAreas(),
    // Come area
    {
      id: 'come',
      name: 'Come',
      style: {
        top: '29.14%',
        left: '14.03%',
        width: '49.29%',
        height: '16.35%'
      }
    },
    // Don't come bar
    {
      id: 'dont-come',
      name: "Don't Come Bar",
      style: {
        top: '2.08%',
        left: '14.03%',
        width: '7.56%',   // 21.59% - 14.03%
        height: '26.75%'  // 28.83% - 2.08%
      }
    },
    // Field area (using clip-path for curved edge)
    {
      id: 'field',
      name: 'Field',
      style: {
        top: '45.49%',
        left: '14.11%',
        width: '49.13%',  // 63.24% - 14.11%
        height: '13.45%', // 58.94% - 45.49%
        clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 15% 100%, 5% 80%, 0% 45%)'
      }
    },
    // Pass Line area with corrected coordinates
    {
      id: 'pass-line',
      name: 'Pass Line',
      style: {
        top: '1.93%',
        left: '2.80%',
        width: '60.21%',    // 63.01% - 2.80%
        height: '73.67%',   // 75.60% - 1.93%
        clipPath: `polygon(
          0.7% 0%,         /* 3.18%, 2.39% */
          8.4% 0.8%,       /* 7.84%, 2.54% */
          8.6% 64%,        /* 7.99%, 49.47% */
          10.8% 77%,       /* 9.29%, 59.09% */
          19% 86%,         /* 14.26%, 65.67% */
          29% 87.5%,       /* 20.22%, 66.89% */
          100% 88%,        /* 63.01%, 67.19% */
          100% 99%,        /* 62.94%, 75.14% */
          18% 99.5%,       /* 13.72%, 75.60% */
          8% 94.5%,        /* 7.69%, 72.09% */
          1.6% 83%,        /* 3.79%, 63.83% */
          0% 66%,          /* 2.80%, 51.30% */
          0.4% 0%          /* 3.02%, 1.93% */
        )`
      }
    },
    // Don't Pass Bar - using clip-path for curved edges
    {
      id: 'dont-pass',
      name: "Don't Pass Bar",
      style: {
        top: '2.54%',
        left: '9.29%',
        width: '53.65%',    // 62.94% - 9.29%
        height: '62.21%',   // 64.75% - 2.54%
        clipPath: `polygon(
          0% 0%,           /* 9.29%, 2.54% */
          0% 50%,          /* 9.29%, 33.42% */
          0% 76%,          /* 9.29%, 49.62% */
          1% 85%,          /* 9.83%, 55.58% */
          5.5% 94%,        /* 12.27%, 60.93% */
          13% 98%,         /* 16.40%, 63.98% */
          15% 99%,         /* 17.54%, 64.60% */
          35% 100%,        /* 28.24%, 64.75% */
          100% 99%,        /* 62.94%, 64.44% */
          100% 91%,        /* 62.94%, 59.09% */
          46% 91%,         /* 34.28%, 59.25% */
          21% 90%,         /* 20.52%, 58.79% */
          14.5% 87%,       /* 17.09%, 56.95% */
          9% 79%,          /* 14.33%, 51.91% */
          8.5% 67%,        /* 13.88%, 44.42% */
          8.5% 2%          /* 13.88%, 3.92% */
        )`
      }
    },
    {
      id: 'any-7',
      name: 'Any 7',
      style: {
        top: '33.26%',
        left: '67.22%',
        width: '28.81%',
        height: '5.51%'
      }
    },
    {
      id: 'hard-6',
      name: 'Hard 6',
      style: {
        top: '39.68%',
        left: '65.08%',
        width: '15.89%',
        height: '12.16%'
      }
    },
    {
      id: 'hard-10',
      name: 'Hard 10',
      style: {
        top: '39.53%',
        left: '81.58%',
        width: '15.90%',
        height: '12.16%'
      }
    },
    {
      id: 'hard-8',
      name: 'Hard 8',
      style: {
        top: '51.91%',
        left: '65.15%',
        width: '15.75%',
        height: '12.62%'
      }
    },
    {
      id: 'hard-4',
      name: 'Hard 4',
      style: {
        top: '51.91%',
        left: '81.51%',
        width: '15.97%',
        height: '12.46%'
      }
    },
    {
      id: 'roll-3',
      name: 'Roll 3',
      style: {
        top: '64.44%',
        left: '65.15%',
        width: '10.55%',
        height: '11.70%'
      }
    },
    {
      id: 'roll-2',
      name: 'Roll 2',
      style: {
        top: '64.75%',
        left: '76.31%',
        width: '10.24%',
        height: '11.24%'
      }
    },
    {
      id: 'roll-12',
      name: 'Roll 12',
      style: {
        top: '64.60%',
        left: '87.16%',
        width: '10.17%',
        height: '11.54%'
      }
    },
    {
      id: 'roll-11-1',
      name: 'Roll 11',
      style: {
        top: '76.67%',
        left: '65.00%',
        width: '15.67%',
        height: '12.77%'
      }
    },
    {
      id: 'roll-11-2',
      name: 'Roll 11',
      style: {
        top: '76.52%',
        left: '81.28%',
        width: '16.12%',
        height: '12.31%'
      }
    },
    {
      id: 'any-craps',
      name: 'Any Craps',
      style: {
        top: '89.51%',
        left: '65.15%',
        width: '32.18%',
        height: '7.72%'
      }
    },
    // Invisible chip placement areas
    {
      id: 'pass-line-chips',
      name: 'Pass Line',
      style: {
        top: '69.45%',      // Slightly adjusted for better placement
        left: '36.26%',     // Slightly adjusted for better placement
        width: '32px',      // Fixed width for chip
        height: '32px',     // Fixed height for chip
        pointerEvents: 'none', // Make sure it doesn't interfere with clicks
        // backgroundColor: 'rgba(255,0,0,0.2)', // Uncomment for debugging
      }
    },
    {
      id: 'dont-pass-chips',
      name: "Don't Pass Bar",
      style: {
        top: '60.15%',      // Slightly adjusted for better placement
        left: '38.09%',     // Slightly adjusted for better placement
        width: '32px',      // Fixed width for chip
        height: '32px',     // Fixed height for chip
        pointerEvents: 'none', // Make sure it doesn't interfere with clicks
        // backgroundColor: 'rgba(0,255,0,0.2)', // Uncomment for debugging
      }
    }
  ];

  // Filter betting areas based on configuration
  const visibleBettingAreas = bettingAreas.filter(area => {
    // Check for full number areas first
    if (area.id.includes('number') && area.id.includes('full')) {
      return false; // Always hide full number areas
    }
    
    // Check other area types
    const areaType = area.id.split('-')[0];
    const config = areaConfig.find(c => c.id === areaType);
    return config ? config.visible : true;
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showDevTools) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const handleGlobalClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showDevTools) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const logEntry = `X: ${x.toFixed(2)}%, Y: ${y.toFixed(2)}%`;
    setClickLog(prev => [...prev, logEntry]);
  };

  const copyToClipboard = () => {
    const text = clickLog.join('\n');
    navigator.clipboard.writeText(text);
  };

  const toggleAreaVisibility = (areaType: string) => {
    setAreaConfig(prev => prev.map(config => 
      config.id === areaType 
        ? { ...config, visible: !config.visible }
        : config
    ));
  };

  const handleAreaClick = (areaId: string) => {
    if (!selectedChipValue) return;
    if (selectedChipValue > bank) return;
    
    const chipAreaId = areaId === 'pass-line' ? 'pass-line-chips' :
                      areaId === 'dont-pass' ? 'dont-pass-chips' :
                      areaId;
    
    setBetHistory(prev => [...prev, bets]);
    const newBank = bank - selectedChipValue;
    setBank(newBank);
    
    setBets((prev: Bet[]) => {
      const existingBet = prev.find((bet: Bet) => bet.areaId === chipAreaId);
      if (existingBet) {
        const newAmount = existingBet.amount + selectedChipValue;
        const optimalChip = CHIPS_CONFIG
          .slice()
          .reverse()
          .find(chip => newAmount >= chip.value) || CHIPS_CONFIG[0];
        
        return prev.map((bet: Bet) => 
          bet.areaId === chipAreaId 
            ? { 
                ...bet, 
                amount: newAmount,
                color: optimalChip.color,
                count: Math.min(5, Math.ceil(newAmount / optimalChip.value))
              }
            : bet
        );
      }
      
      console.log('Adding new bet for area:', chipAreaId);
      return [...prev, {
        areaId: chipAreaId,
        amount: selectedChipValue,
        color: CHIPS_CONFIG.find(c => c.value === selectedChipValue)?.color || 'bg-chip-red',
        count: 1
      }];
    });
  };

  const handleUndo = () => {
    if (betHistory.length === 0) return;
    
    const currentBets = bets;
    const previousBets = betHistory[betHistory.length - 1];
    
    const currentTotal = currentBets.reduce((sum, bet) => sum + bet.amount, 0);
    const previousTotal = previousBets.reduce((sum, bet) => sum + bet.amount, 0);
    const difference = currentTotal - previousTotal;
    
    const newBank = bank + difference;
    setBank(newBank);
    
    setBets(previousBets);
    setBetHistory(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (bets.length > 0) {
      const totalBets = bets.reduce((sum, bet) => sum + bet.amount, 0);
      const newBank = bank + totalBets;
      setBank(newBank);
      setBetHistory(prev => [...prev, bets]);
      setBets([]);
    }
  };

  // Add this function to handle help mode clicks
  const handleHelpClick = (areaId: string) => {
    const baseAreaId = areaId.split('-').slice(0, 2).join('-'); // Handle numbered bets like 'place-6'
    let description = bettingDescriptions[baseAreaId] || '';
    
    // Handle place/buy/lay bets
    if (areaId.startsWith('place-')) {
      const number = areaId.split('-')[1];
      description = `Place ${number}: Bet that ${number} will be rolled before a 7. Better odds than buying.`;
    } else if (areaId.startsWith('buy-')) {
      const number = areaId.split('-')[1];
      description = `Buy ${number}: Like a place bet, but with better payouts and a 5% commission.`;
    } else if (areaId.startsWith('lay-')) {
      const number = areaId.split('-')[1];
      description = `Lay ${number}: Bet against ${number}. Win if 7 comes before ${number}, with a 5% commission.`;
    }
    
    setHelpText(description);
  };

  // Expose methods to parent through ref
  useImperativeHandle(ref, () => ({
    handleUndo,
    handleClear
  }));

  // Add this useEffect to set up the console command
  React.useEffect(() => {
    // @ts-ignore
    window.enableDevTools = () => {
      setShowDevToolsButton(true);
      console.log('Dev tools button enabled');
    };
  }, []);

  return (
    <div className={`relative w-full h-full ${helpMode ? 'cursor-help' : ''}`}>
      {/* Hover Indicator */}
      <div className="absolute -top-12 left-0 right-0 flex justify-center">
        {hoveredArea && (
          <div className="bg-black/70 text-white px-4 py-2 rounded-full
                        font-bold text-lg transition-opacity duration-150">
            {bettingAreas.find(area => 
              area.id === hoveredArea && 
              !area.id.includes('number') && 
              !area.id.includes('full')
            )?.name}
          </div>
        )}
      </div>

      <img 
        src={boardLayout}
        alt="Craps Table Layout"
        className="w-full h-full object-contain"
        onLoad={(e) => setImageSize({
          width: e.currentTarget.naturalWidth,
          height: e.currentTarget.naturalHeight
        })}
      />
      
      {/* Dev tools button - only show if enabled */}
      {showDevToolsButton && (
        <button 
          className="absolute bottom-2 left-2 z-50 bg-blue-500 text-white px-2 py-1 rounded"
          onClick={() => setShowDevTools(!showDevTools)}
        >
          {showDevTools ? 'Hide' : 'Show'} Dev Tools
        </button>
      )}

      {/* Help Mode Button */}
      <button 
        className={`absolute bottom-4 left-4 z-50 px-4 h-8 rounded-full 
                    flex items-center justify-center gap-2
                    ${helpMode ? 'bg-blue-500' : 'bg-gray-600'} 
                    text-white font-bold text-lg
                    hover:bg-opacity-90 transition-colors
                    ring-2 ring-white/50 shadow-lg`}
        onClick={() => {
          setHelpMode(!helpMode);
          setHelpText(null);
        }}
      >
        ? {helpMode && <span className="text-sm font-normal">Help</span>}
      </button>

      {/* Help Text Popup */}
      {helpText && helpMode && (
        <div className="absolute bottom-4 left-28 z-50
                        bg-black/90 text-white p-3 rounded-lg
                        shadow-lg backdrop-blur-sm
                        max-w-[300px]">
          <p className="text-sm leading-tight">{helpText}</p>
        </div>
      )}

      <GameState 
        isRolling={isRolling}
        diceTotal={dice.die1 + dice.die2}
        die1={dice.die1}
        die2={dice.die2}
      />

      <div 
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onClick={handleGlobalClick}
      >
        {visibleBettingAreas.map((area) => {
          const isWinning = winningAreas?.some(
            winArea => winArea.id === area.id && winArea.type === 'win'
          );

          return (
            <div
              key={area.id}
              className={`absolute cursor-pointer transition-all duration-200
                          ${isWinning ? 'animate-flash-win bg-[rgba(255,255,200,0.25)]' : ''}`}
              data-bet-id={area.id}
              style={{
                ...area.style,
                backgroundColor: !isWinning && hoveredArea === area.id 
                  ? 'rgba(255, 255, 255, 0.1)' 
                  : 'transparent',
                border: hoveredArea === area.id 
                  ? '2px solid rgba(255, 255, 255, 0.3)' 
                  : '2px solid transparent',
                pointerEvents: 'all',
              }}
              onMouseEnter={() => setHoveredArea(area.id)}
              onMouseLeave={() => setHoveredArea(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (showDevTools) return;
                if (helpMode) {
                  handleHelpClick(area.id);
                } else {
                  handleAreaClick(area.id);
                }
              }}
            >
              {/* Render chip stack if there's a bet */}
              {bets.find(bet => bet.areaId === area.id) && (
                <ChipStack 
                  {...bets.find(bet => bet.areaId === area.id)!}
                  position={
                    area.id === 'pass-line' || area.id === 'dont-pass'
                      ? 'custom'
                      : area.id.startsWith('place-') ? 'bottom' : 'center'
                  }
                  areaId={area.id}
                  isOff={!point && (
                    area.id.startsWith('place-') || 
                    area.id.startsWith('buy-') || 
                    area.id.startsWith('lay-')
                  )}
                />
              )}
            </div>
          );
        })}

        {/* Dev Tools Overlay */}
        {showDevTools && (
          <>
            <div className="absolute top-12 left-0 bg-black/50 text-white p-2 text-sm">
              X: {mousePosition.x.toFixed(2)}%<br />
              Y: {mousePosition.y.toFixed(2)}%<br />
              Image: {imageSize.width} x {imageSize.height}
            </div>
            <DiceControls 
              currentDice={dice}
              onDiceChange={(newDice) => setDice?.(newDice)}
            />
            <div className="absolute top-0 right-0 bg-black/50 text-white p-2 max-h-[300px] overflow-y-auto">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard();
                }}
                className="bg-blue-500 text-white px-2 py-1 rounded mb-2"
              >
                Copy Log
              </button>
              <div className="text-sm">
                {clickLog.map((entry, index) => (
                  <div key={index}>{entry}</div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>    
    </div>      
  );
});

export default CrapsTable;