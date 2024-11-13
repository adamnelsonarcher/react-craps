import React from 'react';
import CrapsTable from './components/CrapsTable';
import DiceArea from './components/DiceArea';
import BettingControls from './components/BettingControls';

const App: React.FC = () => {
  return (
    <div className="h-screen w-screen p-4 flex flex-col">
      <h1 className="text-4xl font-bold text-gold text-center mb-2">React Craps</h1>
      
      <div className="flex-1 flex gap-6">
        {/* Left side - Controls */}
        <div className="flex-1 flex flex-col gap-4 min-w-[300px]">
          <div className="bg-gray-800/50 rounded-lg p-4 text-center backdrop-blur-sm">
            <span className="text-2xl text-green-400 font-bold">Bank: $1000</span>
          </div>
          
          <BettingControls />
          
          <DiceArea />
        </div>
        
        {/* Right side - Table */}
        <div className="flex-[2.5] flex items-center justify-center bg-felt-green rounded-xl p-4">
          <div className="w-full aspect-[2/1]">
            <CrapsTable />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App; 