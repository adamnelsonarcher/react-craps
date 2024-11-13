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
    // Pass Line with more points for smoother curves
    {
      id: 'pass-line',
      name: 'Pass Line',
      style: {
        position: 'absolute',
        top: '2.54%',
        left: '3.10%',
        width: '59.91%',
        height: '72.60%',
        clipPath: `polygon(
          ${3.10}% ${2.54}%,  /* Start */
          ${7.92}% ${2.70}%,  /* Top right corner */
          ${8.07}% ${52.67}%, /* Middle right before curve */
          ${10}% ${56}%,      /* Start curve */
          ${12}% ${60}%,      /* Middle of curve */
          ${14}% ${63}%,      /* Continue curve */
          ${17.39}% ${66.89}%, /* End of curve */
          ${62.86}% ${67.50}%, /* Top of straight section */
          ${63.01}% ${75.14}%, /* Bottom right corner */
          ${14.56}% ${74.99}%, /* Bottom left corner */
          ${10}% ${70}%,      /* Start bottom curve */
          ${7}% ${65}%,       /* Middle bottom curve */
          ${5}% ${60}%,       /* Continue bottom curve */
          ${3.10}% ${56.50}%, /* End bottom curve */
          ${3.10}% ${2.54}%   /* Back to start */
        )`
      }
    },
    // Don't Pass Bar - using clip-path for curved edges
    {
      id: 'dont-pass',
      name: "Don't Pass Bar",
      style: {
        top: '2.24%',
        left: '9.06%',
        width: '53.95%',
        height: '62.51%',
        clipPath: `polygon(
          9% 0%, 9% 71%, 
          12% 83%, 17.8% 91%, 
          22% 93%, 100% 94%, 
          100% 103%, 19% 103%, 
          10.3% 101%, 4.8% 95%, 
          0.4% 84%, 0% 43%, 
          0% 6.8%
        )`
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