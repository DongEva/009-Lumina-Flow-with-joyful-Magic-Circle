
import React, { useState } from 'react';
import { SymmetryMode } from '../types';
import { Palette, Undo2, RefreshCcw, Sparkles, ChevronDown, ChevronUp, Settings2, PenTool, Download, Clapperboard } from 'lucide-react';

interface ControlPanelProps {
  symmetry: SymmetryMode;
  setSymmetry: (s: SymmetryMode) => void;
  color: string;
  setColor: (c: string) => void;
  brushSize: number;
  setBrushSize: (n: number) => void;
  onCastSpell: () => void;
  onClear: () => void;
  onUndo: () => void;
  onDownload: () => void;
  onDownloadVideo: () => void;
  isAnimating: boolean;
  canUndo: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  symmetry,
  setSymmetry,
  color,
  setColor,
  brushSize,
  setBrushSize,
  onCastSpell,
  onClear,
  onUndo,
  onDownload,
  onDownloadVideo,
  isAnimating,
  canUndo
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isAnimating) return null;

  // Minimized State (Bottom Right)
  if (isMinimized) {
    return (
      <button 
        onClick={() => setIsMinimized(false)}
        className="absolute bottom-6 right-6 p-4 bg-[#0f0a05] border-2 border-[#8e6e38] rounded-full text-[#FFD700] shadow-[0_0_20px_rgba(218,165,32,0.3)] hover:scale-110 transition-transform duration-300 z-50 group"
        title="Open Grimoire Controls"
      >
        <Settings2 size={24} className="group-hover:rotate-90 transition-transform duration-500"/>
        <div className="absolute inset-0 rounded-full bg-[#FFD700]/10 blur-md group-hover:bg-[#FFD700]/20"></div>
      </button>
    );
  }

  // Expanded State (Bottom Center)
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full max-w-4xl pointer-events-none px-4 z-50">
      
      {/* Main Grimoire Interface */}
      <div className="bg-[#0f0a05] border-2 border-[#8e6e38] rounded-xl p-4 md:p-6 pointer-events-auto flex flex-col md:flex-row gap-6 md:gap-8 items-center relative glow-box shadow-2xl animate-[fadeIn_0.3s_ease-out]">
        
        {/* Minimize Button */}
        <button 
          onClick={() => setIsMinimized(true)}
          className="absolute -top-3 -right-3 w-8 h-8 bg-[#0f0a05] border border-[#8e6e38] rounded-full flex items-center justify-center text-[#8e6e38] hover:text-[#FFD700] hover:border-[#FFD700] transition-colors shadow-lg z-10"
          title="Minimize to Corner"
        >
          <ChevronDown size={16} />
        </button>

        {/* Decorative corner accents */}
        <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-[#FFD700]"></div>
        <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-[#FFD700]"></div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-[#FFD700]"></div>
        <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-[#FFD700]"></div>

        {/* Title Decorator */}
        <div className="absolute -top-10 text-center w-full">
           <div className="font-magic text-lg text-[#FFD700] tracking-[0.3em] opacity-60 scale-75">ARCANUM</div>
        </div>

        {/* Symmetry Section */}
        <div className="flex flex-col items-center gap-3">
          <label className="font-serif text-[#8e6e38] uppercase text-[10px] tracking-widest">Symmetry</label>
          <div className="flex gap-2">
            {[2, 4, 6, 8, 12].map((val) => (
              <button
                key={val}
                onClick={() => setSymmetry(val as SymmetryMode)}
                className={`w-8 h-8 md:w-10 md:h-10 border border-[#8e6e38] rounded-full flex items-center justify-center font-magic transition-all duration-300
                  ${symmetry === val 
                    ? 'bg-[#8e6e38] text-black scale-110 shadow-[0_0_15px_rgba(142,110,56,0.6)]' 
                    : 'bg-black/50 text-[#8e6e38] hover:bg-[#8e6e38]/20'
                  }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-[#8e6e38]/30 hidden md:block"></div>

        {/* Color Palette (Circular Free Choice) */}
        <div className="flex flex-col items-center gap-3">
          <label className="font-serif text-[#8e6e38] uppercase text-[10px] tracking-widest flex items-center gap-2">
            <Palette size={12} /> Pigment
          </label>
          <div className="relative group">
            {/* Glow effect behind the orb */}
            <div 
              className="absolute inset-0 rounded-full blur-md opacity-50 group-hover:opacity-100 transition-opacity duration-500"
              style={{ backgroundColor: color }}
            ></div>
            
            <label 
              className="relative block w-12 h-12 rounded-full border-2 border-[#FFD700] cursor-pointer shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden transition-transform hover:scale-110 active:scale-95 group-hover:border-white"
              title="Click to choose any color"
            >
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0 opacity-0"
              />
              {/* Visible Color Orb */}
              <div 
                className="absolute inset-0 pointer-events-none" 
                style={{ 
                  backgroundColor: color,
                  boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.3), inset 0 -2px 10px rgba(0,0,0,0.5)' 
                }}
              ></div>
              
              {/* Shine reflection */}
              <div className="absolute top-2 left-3 w-3 h-2 bg-white/40 rounded-full rotate-[-45deg] blur-[1px]"></div>
            </label>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-[#8e6e38]/30 hidden md:block"></div>

        {/* Brush Size Slider */}
        <div className="flex flex-col items-center gap-3">
          <label className="font-serif text-[#8e6e38] uppercase text-[10px] tracking-widest flex items-center gap-2">
            <PenTool size={12} /> Width
          </label>
          <div className="w-24 md:w-32 flex items-center gap-2">
             <span className="text-[#8e6e38] text-xs opacity-50">1</span>
             <input 
               type="range" 
               min="1" 
               max="30" 
               step="1"
               value={brushSize} 
               onChange={(e) => setBrushSize(Number(e.target.value))}
               className="w-full h-1 bg-[#8e6e38]/30 rounded-lg appearance-none cursor-pointer accent-[#FFD700]"
               title={`Current width: ${brushSize}`}
             />
             <span className="text-[#8e6e38] text-xs opacity-50">30</span>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-12 bg-[#8e6e38]/30 hidden md:block"></div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-3 transition-all duration-300 rounded-full border border-transparent hover:border-[#8e6e38]/50 ${!canUndo ? 'text-[#8e6e38]/30' : 'text-[#8e6e38] hover:text-white hover:bg-[#8e6e38]/20'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={20} />
          </button>

          <button 
            onClick={onClear}
            className="p-3 text-[#8e6e38] hover:text-red-400 hover:rotate-90 transition-all duration-500 rounded-full border border-transparent hover:border-red-400/30 hover:bg-red-400/10"
            title="Clear Canvas"
          >
            <RefreshCcw size={20} />
          </button>

          <button
            onClick={onDownload}
            disabled={!canUndo}
            className={`p-3 transition-all duration-300 rounded-full border border-transparent hover:border-[#8e6e38]/50 ${!canUndo ? 'text-[#8e6e38]/30' : 'text-[#8e6e38] hover:text-white hover:bg-[#8e6e38]/20'}`}
            title="Download Poster Image"
          >
            <Download size={20} />
          </button>

          <button
            onClick={onDownloadVideo}
            disabled={!canUndo}
            className={`p-3 transition-all duration-300 rounded-full border border-transparent hover:border-[#8e6e38]/50 ${!canUndo ? 'text-[#8e6e38]/30' : 'text-[#8e6e38] hover:text-white hover:bg-[#8e6e38]/20'}`}
            title="Download Video Poster"
          >
            <Clapperboard size={20} />
          </button>
          
          <button
            onClick={onCastSpell}
            disabled={!canUndo}
            className={`group relative px-6 py-2 bg-gradient-to-r from-[#8e6e38] to-[#DAA520] text-black font-magic font-bold tracking-wider rounded-sm overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(218,165,32,0.3)]
              ${!canUndo ? 'opacity-50 grayscale' : ''}
            `}
          >
            <span className="relative z-10 flex items-center gap-2">
              <Sparkles size={16} /> INCANT
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>

      </div>
      
      <div className="text-[#8e6e38]/50 text-[10px] font-serif italic tracking-wider">
        Scroll to Zoom • Shift to Stabilize • Middle Mouse to Pan
      </div>
    </div>
  );
};

export default ControlPanel;
