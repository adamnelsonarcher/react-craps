import React, { useState } from 'react';
import boardLayout from '../assets/just_text.png';

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

const CrapsTable: React.FC = () => {
  const [showDevTools, setShowDevTools] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [clickLog, setClickLog] = useState<string[]>([]);
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

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
  ]);

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
        width: '49.29%',  // 63.32% - 14.03%
        height: '16.35%'  // 45.49% - 29.14%
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

  return (
    <div className="relative w-full h-full">
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
      
      {/* Moved dev tools button to bottom left */}
      <button 
        className="absolute bottom-2 left-2 z-50 bg-blue-500 text-white px-2 py-1 rounded"
        onClick={() => setShowDevTools(!showDevTools)}
      >
        {showDevTools ? 'Hide' : 'Show'} Dev Tools
      </button>

      <div 
        className="absolute inset-0"
        onMouseMove={handleMouseMove}
        onClick={handleGlobalClick}
      >
        {visibleBettingAreas.map((area) => (
          <div
            key={area.id}
            className="absolute cursor-pointer transition-all duration-200"
            style={{
              ...area.style,
              backgroundColor: hoveredArea === area.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: hoveredArea === area.id ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
            }}
            onMouseEnter={() => setHoveredArea(area.id)}
            onMouseLeave={() => setHoveredArea(null)}
            onClick={(e) => {
              if (!showDevTools) {
                e.stopPropagation();
                console.log(`Clicked ${area.name}`);
              }
              // When dev tools are on, let the click propagate
            }}
          />
        ))}

        {/* Dev Tools Overlay */}
        {showDevTools && (
          <>
            <div className="absolute top-12 left-0 bg-black/50 text-white p-2 text-sm">
              X: {mousePosition.x.toFixed(2)}%<br />
              Y: {mousePosition.y.toFixed(2)}%<br />
              Image: {imageSize.width} x {imageSize.height}
            </div>
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
};

export default CrapsTable;