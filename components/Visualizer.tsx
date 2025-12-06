
import React, { useRef, useEffect, useState } from 'react';
import { Stroke, Point, SymmetryMode } from '../types';
import { audioSynth } from '../services/audioSynth';

interface VisualizerProps {
  symmetry: SymmetryMode;
  color: string;
  brushSize: number;
  isAnimating: boolean;
  triggerAnimation: number; // Increment to trigger
  onAnimationComplete: () => void;
  strokes: Stroke[];
  onStrokeAdded: (stroke: Stroke) => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ 
  symmetry, 
  color,
  brushSize, 
  isAnimating, 
  triggerAnimation, 
  onAnimationComplete,
  strokes,
  onStrokeAdded
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const currentStrokeRef = useRef<Point[]>([]);
  const isSpacePressedRef = useRef(false);
  const isShiftPressedRef = useRef(false); // Track Shift key
  
  // Camera State (View Transform)
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [cameraVersion, setCameraVersion] = useState(0); // Force re-render on pan/zoom

  // Particles for atmosphere
  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string, size: number}[]>([]);
  // Mouse tracking in WORLD coordinates
  const worldMouseRef = useRef({ x: 0, y: 0 });

  // Helper: Convert Screen Coordinate to World Coordinate
  const toWorld = (sx: number, sy: number, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    // World 0,0 is at the center of the screen when camera x,y is 0,0
    const wx = (sx - cx - cameraRef.current.x) / cameraRef.current.zoom;
    const wy = (sy - cy - cameraRef.current.y) / cameraRef.current.zoom;
    return { x: wx, y: wy };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = true;
      }
      if (e.key === 'Shift') {
        isShiftPressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        isSpacePressedRef.current = false;
      }
      if (e.key === 'Shift') {
        isShiftPressedRef.current = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let startTime = 0;
    
    // Resize handler
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const width = canvas.width;
      const height = canvas.height;
      const cx = width / 2;
      const cy = height / 2;

      // Clear with trail effect for mysterious vibe
      // Note: We clear the whole screen in screen space
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for clearing
      ctx.fillStyle = 'rgba(5, 5, 8, 0.2)'; 
      ctx.fillRect(0, 0, width, height);
      
      // --- START WORLD TRANSFORM ---
      // Translate to center + camera offset, then scale
      ctx.translate(cx + cameraRef.current.x, cy + cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      
      // Now (0,0) is the center of the magic circle
      
      // Draw grid/guide (subtle)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.03)';
      ctx.lineWidth = 1 / cameraRef.current.zoom; // Keep line width constant on screen
      ctx.beginPath();
      ctx.arc(0, 0, 100, 0, Math.PI * 2);
      ctx.arc(0, 0, 250, 0, Math.PI * 2);
      ctx.arc(0, 0, 400, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Guide Lines based on current symmetry
      // We draw these long enough to cover huge zoom outs
      const guideLength = Math.max(width, height) * 2 / cameraRef.current.zoom;
      ctx.beginPath();
      for (let i = 0; i < symmetry; i++) {
        const theta = (Math.PI * 2 / symmetry) * i;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(theta) * guideLength, Math.sin(theta) * guideLength);
      }
      ctx.stroke();

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // -----------------------------
      // RENDER LOGIC
      // -----------------------------
      
      const renderStroke = (strokePoints: Point[], strokeColor: string, strokeWidth: number, strokeSym: number, progress = 1.0) => {
        const pointCount = Math.floor(strokePoints.length * progress);
        if (pointCount < 2) return;

        // Create symmetry copies
        for (let s = 0; s < strokeSym; s++) {
          ctx.save();
          // No need to translate cx,cy here because we are already in world space centered at 0,0
          ctx.rotate((Math.PI * 2 / strokeSym) * s);

          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth; 
          
          // Glow
          ctx.shadowBlur = (isAnimating ? 20 : 5);
          ctx.shadowColor = strokeColor;

          // Draw path
          const p0 = strokePoints[0];
          ctx.moveTo(p0.x, p0.y);
          
          for (let i = 1; i < pointCount; i++) {
            const p = strokePoints[i];
            ctx.lineTo(p.x, p.y);
          }
          ctx.stroke();
          
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      };

      if (isAnimating) {
        // Animation Phase: Replay strokes over time
        const durationPerStroke = 500; // ms
        const totalDuration = strokes.length * durationPerStroke + 1000;
        const elapsed = timestamp - startTime;
        
        strokes.forEach((stroke, index) => {
           const strokeStart = index * 200;
           const strokeElapsed = elapsed - strokeStart;
           const progress = Math.min(1, Math.max(0, strokeElapsed / durationPerStroke));
           
           if (progress > 0) {
             const pulse = 1 + Math.sin(elapsed * 0.005) * 0.5;
             renderStroke(stroke.points, stroke.color, stroke.width * pulse, stroke.symmetry, progress);
           }
        });

        if (elapsed > totalDuration) {
           onAnimationComplete();
        }

      } else {
        // Drawing Phase: Render completed strokes from props
        strokes.forEach(stroke => {
          renderStroke(stroke.points, stroke.color, stroke.width, stroke.symmetry);
        });

        // Render current stroke being drawn
        if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
          renderStroke(currentStrokeRef.current, color, brushSize, symmetry);
        }
      }

      // -----------------------------
      // PARTICLES
      // -----------------------------
      if (isDrawingRef.current && !isPanningRef.current) {
        for(let s=0; s<symmetry; s++) {
           const theta = (Math.PI * 2 / symmetry) * s;
           // Rotate mouse world pos around center
           // Note: We use the LAST point in the stroke for particle emission so it matches the smoothed line
           const emitPos = currentStrokeRef.current.length > 0 
              ? currentStrokeRef.current[currentStrokeRef.current.length - 1] 
              : worldMouseRef.current;

           const dx = emitPos.x;
           const dy = emitPos.y;
           
           const rx = dx * Math.cos(theta) - dy * Math.sin(theta);
           const ry = dx * Math.sin(theta) + dy * Math.cos(theta);

           if (Math.random() > 0.5) {
             particlesRef.current.push({
               x: rx,
               y: ry,
               vx: (Math.random() - 0.5) * 2,
               vy: (Math.random() - 0.5) * 2,
               life: 1.0,
               color: color,
               size: Math.random() * 3
             });
           }
        }
      }

      // Update and draw particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.size *= 0.95;

        if (p.life <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [strokes, symmetry, color, brushSize, isAnimating, triggerAnimation, cameraVersion]); 

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.001;
    const newZoom = Math.min(Math.max(0.1, cameraRef.current.zoom - e.deltaY * zoomIntensity), 5);
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // World pos before zoom
    const wx = (mouseX - window.innerWidth/2 - cameraRef.current.x) / cameraRef.current.zoom;
    const wy = (mouseY - window.innerHeight/2 - cameraRef.current.y) / cameraRef.current.zoom;

    // Update zoom
    cameraRef.current.zoom = newZoom;

    // Update pan to keep wx, wy at mouseX, mouseY
    cameraRef.current.x = mouseX - window.innerWidth/2 - wx * newZoom;
    cameraRef.current.y = mouseY - window.innerHeight/2 - wy * newZoom;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isAnimating) return;
    
    if (e.button === 1 || isSpacePressedRef.current) {
      isPanningRef.current = true;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      audioSynth.resume();
      isDrawingRef.current = true;
      
      const worldPos = toWorld(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      currentStrokeRef.current = [worldPos];
      worldMouseRef.current = worldPos;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Panning Logic
    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Drawing Logic
    const targetWorldPos = toWorld(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    worldMouseRef.current = targetWorldPos;
    
    if (!isDrawingRef.current || isAnimating) return;
    
    let nextPoint = targetWorldPos;

    // Stabilization Logic (Shift Key)
    if (isShiftPressedRef.current && currentStrokeRef.current.length > 0) {
      const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      // Weighted average (Low pass filter)
      // 0.1 means we only move 10% of the way to the target per event, creating a heavy "drag" feel
      const smoothingFactor = 0.15; 
      nextPoint = {
        x: lastPoint.x + (targetWorldPos.x - lastPoint.x) * smoothingFactor,
        y: lastPoint.y + (targetWorldPos.y - lastPoint.y) * smoothingFactor
      };
    }
    
    currentStrokeRef.current.push(nextPoint);
    
    // Throttle sound
    if (Math.random() > 0.8) {
      audioSynth.playSparkle();
    }
  };

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      return;
    }

    if (!isDrawingRef.current || isAnimating) return;
    isDrawingRef.current = false;
    
    if (currentStrokeRef.current.length > 2) {
      onStrokeAdded({
        points: [...currentStrokeRef.current],
        color: color,
        width: brushSize, // Use user selected brush size
        symmetry: symmetry,
        timestamp: Date.now()
      });
    }
    currentStrokeRef.current = [];
  };

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full touch-none ${isAnimating ? 'pointer-events-none' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()} // Prevent context menu on right click
    />
  );
};

export default Visualizer;
