
import React, { useState, useEffect, useCallback } from 'react';
import Visualizer from './components/Visualizer';
import ControlPanel from './components/ControlPanel';
import { SymmetryMode, MAGIC_COLORS, Stroke } from './types';
import { audioSynth } from './services/audioSynth';

const App: React.FC = () => {
  const [symmetry, setSymmetry] = useState<SymmetryMode>(6);
  const [color, setColor] = useState<string>(MAGIC_COLORS[2].value); // Default Gold
  const [brushSize, setBrushSize] = useState<number>(4);
  const [triggerAnim, setTriggerAnim] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Initialize audio context on first click anywhere
  useEffect(() => {
    const initAudio = () => audioSynth.resume();
    window.addEventListener('mousedown', initAudio);
    return () => window.removeEventListener('mousedown', initAudio);
  }, []);

  // Handle Undo (Keyboard + Button)
  const handleUndo = useCallback(() => {
    if (isAnimating) return;
    setStrokes(prev => {
      if (prev.length === 0) return prev;
      const newStrokes = [...prev];
      newStrokes.pop();
      return newStrokes;
    });
  }, [isAnimating]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  const handleCastSpell = () => {
    if (strokes.length === 0) return;
    setIsAnimating(true);
    setTriggerAnim(prev => prev + 1);
    audioSynth.playCastEffect();
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
  };

  const handleClear = () => {
    setStrokes([]);
    setIsAnimating(false);
  };

  // Callback for when Visualizer finishes a new stroke
  const handleStrokeAdded = (newStroke: Stroke) => {
    setStrokes(prev => [...prev, newStroke]);
  };

  return (
    <div className="relative w-screen h-screen bg-[#050505] overflow-hidden select-none">
      
      {/* Background Texture/Vignette */}
      <div className="absolute inset-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] z-10"></div>
      
      {/* Stars/Dust (CSS only for static background feel) */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

      {/* Top Left Title */}
      <div className="absolute top-8 left-8 z-40 pointer-events-none select-none">
        <h1 className="font-magic text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-[#FFD700] to-[#8e6e38] drop-shadow-[0_0_15px_rgba(218,165,32,0.4)] tracking-widest">
          Magical Paint
        </h1>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#8e6e38] to-transparent mt-2 opacity-50"></div>
      </div>

      {/* Standby Prompt */}
      {strokes.length === 0 && !isAnimating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none z-30 animate-[pulse_3s_ease-in-out_infinite]">
          <p className="font-magic text-2xl md:text-3xl text-[#FFD700] mb-3 tracking-[0.2em] drop-shadow-lg">
            Hold Left Click to Draw
          </p>
          <p className="font-serif text-[#8e6e38] text-xl md:text-2xl tracking-[0.3em] opacity-80 border-t border-[#8e6e38]/30 pt-2 inline-block px-8">
            按住鼠标左键开启绘画
          </p>
        </div>
      )}

      <Visualizer 
        symmetry={symmetry}
        color={color}
        brushSize={brushSize}
        isAnimating={isAnimating}
        triggerAnimation={triggerAnim}
        onAnimationComplete={handleAnimationComplete}
        strokes={strokes}
        onStrokeAdded={handleStrokeAdded}
      />
      
      <ControlPanel
        symmetry={symmetry}
        setSymmetry={setSymmetry}
        color={color}
        setColor={setColor}
        brushSize={brushSize}
        setBrushSize={setBrushSize}
        onCastSpell={handleCastSpell}
        onClear={handleClear}
        onUndo={handleUndo}
        isAnimating={isAnimating}
        canUndo={strokes.length > 0}
      />
      
    </div>
  );
};

export default App;
