
import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Stroke, Point, SymmetryMode } from '../types';
import { audioSynth } from '../services/audioSynth';

interface VisualizerProps {
  symmetry: SymmetryMode;
  color: string;
  brushSize: number;
  isAnimating: boolean;
  triggerAnimation: number;
  onAnimationComplete: () => void;
  strokes: Stroke[];
  onStrokeAdded: (stroke: Stroke) => void;
}

export interface VisualizerHandle {
  savePoster: () => void;
  saveVideo: () => void;
}

const Visualizer = forwardRef<VisualizerHandle, VisualizerProps>(({ 
  symmetry, 
  color,
  brushSize, 
  isAnimating, 
  triggerAnimation, 
  onAnimationComplete,
  strokes,
  onStrokeAdded
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const currentStrokeRef = useRef<Point[]>([]);
  const isSpacePressedRef = useRef(false);
  const isShiftPressedRef = useRef(false);
  
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const [cameraVersion, setCameraVersion] = useState(0);

  const particlesRef = useRef<{x: number, y: number, vx: number, vy: number, life: number, color: string, size: number}[]>([]);
  const worldMouseRef = useRef({ x: 0, y: 0 });

  // Helper to draw text/layout for posters (shared logic concept)
  const drawPosterLayout = (ctx: CanvasRenderingContext2D, width: number, height: number, strokes: Stroke[]) => {
      // Background
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);
      
      const gradient = ctx.createRadialGradient(width/2, height/2, 100, width/2, height/2, height);
      gradient.addColorStop(0, '#1a1005');
      gradient.addColorStop(1, '#000000');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Text Overlay
      
      // Title
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#DAA520';
      ctx.fillStyle = '#FFD700';
      ctx.font = '70px Cinzel';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MAGICAL PAINT', width / 2, 150);
      
      // Subtitle Line
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(218, 165, 32, 0.5)';
      ctx.lineWidth = 2;
      ctx.moveTo(width / 2 - 200, 190);
      ctx.lineTo(width / 2 + 200, 190);
      ctx.stroke();

      // Stats
      const startTime = strokes[0].timestamp;
      const endTime = strokes[strokes.length - 1].timestamp;
      const durationMs = Math.max(0, endTime - startTime);
      const minutes = Math.floor(durationMs / 60000);
      const seconds = Math.floor((durationMs % 60000) / 1000);
      
      const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });

      // Footer Text
      ctx.shadowBlur = 0;
      ctx.font = '30px "Cormorant Garamond", serif';
      ctx.fillStyle = '#8e6e38';
      
      ctx.textAlign = 'left';
      ctx.fillText(`Summoned: ${dateStr}`, 80, height - 80);

      ctx.textAlign = 'right';
      ctx.fillText(`Casting Time: ${minutes}m ${seconds}s`, width - 80, height - 80);

      ctx.textAlign = 'center';
      ctx.font = 'italic 20px "Cormorant Garamond", serif';
      ctx.fillStyle = 'rgba(142, 110, 56, 0.5)';
      ctx.fillText('Arcane Grimoire Arts', width / 2, height - 80);
  };

  const getContentScaleAndOffset = (strokes: Stroke[], width: number, height: number) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      const checkBounds = (x: number, y: number) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      };

      strokes.forEach(stroke => {
        stroke.points.forEach(p => {
          for (let s = 0; s < stroke.symmetry; s++) {
            const angle = (Math.PI * 2 / stroke.symmetry) * s;
            const rx = p.x * Math.cos(angle) - p.y * Math.sin(angle);
            const ry = p.x * Math.sin(angle) + p.y * Math.cos(angle);
            checkBounds(rx, ry);
          }
        });
      });

      if (minX === Infinity) { minX = -100; maxX = 100; minY = -100; maxY = 100; }

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;

      const margin = 100;
      const availableW = width - (margin * 2);
      const availableH = height - 500; 
      
      const scaleW = availableW / contentWidth;
      const scaleH = availableH / contentHeight;
      const scale = Math.min(scaleW, scaleH, 5); 

      return { scale, centerX, centerY };
  };

  useImperativeHandle(ref, () => ({
    savePoster: () => {
      if (strokes.length === 0) return;

      const posterCanvas = document.createElement('canvas');
      const width = 1200;
      const height = 1600;
      posterCanvas.width = width;
      posterCanvas.height = height;
      const ctx = posterCanvas.getContext('2d');
      if (!ctx) return;

      // Draw Layout
      drawPosterLayout(ctx, width, height, strokes);

      // Setup Transform
      const { scale, centerX, centerY } = getContentScaleAndOffset(strokes, width, height);

      ctx.save();
      ctx.translate(width / 2, 300 + (height - 500) / 2);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      strokes.forEach(stroke => {
         for (let s = 0; s < stroke.symmetry; s++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / stroke.symmetry) * s);
            ctx.beginPath();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.shadowColor = stroke.color;
            ctx.shadowBlur = 10;
            if (stroke.points.length > 0) {
              ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
              for (let i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
              }
            }
            ctx.stroke();
            ctx.restore();
         }
      });
      ctx.restore();

      const dataUrl = posterCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Magical_Paint_Poster_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },

    saveVideo: () => {
      if (strokes.length === 0) return;

      const width = 900; // Slightly smaller for video performance
      const height = 1200;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const stream = canvas.captureStream(30); // 30 FPS
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Magical_Paint_Video_${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      };

      recorder.start();

      const { scale, centerX, centerY } = getContentScaleAndOffset(strokes, width, height);
      
      // Calculate total points to animate
      let totalPoints = 0;
      strokes.forEach(s => totalPoints += s.points.length);
      
      // Animation parameters
      const pointsPerFrame = Math.max(1, Math.ceil(totalPoints / (30 * 5))); // Aim for ~5 seconds max
      let currentStrokeIdx = 0;
      let currentPointIdx = 0;
      let frameId: number;

      // Pre-calculate drawn state to avoid clearing everything every frame for performance?
      // Actually, clearing and redrawing is cleaner for the "growth" effect with symmetry.
      // But for efficiency, we can draw progressively on top of the previous frame.
      
      // Initial background
      drawPosterLayout(ctx, width, height, strokes);

      const renderLoop = () => {
        // We draw progressively. 
        // Note: Layout (text) is static, so we don't clear rect. 
        // We just add lines.
        
        // Setup transform for drawing (need to do this every frame if we don't clear?)
        // Actually, setTransform persists.
        ctx.save();
        ctx.translate(width / 2, 300 + (height - 500) / 2);
        ctx.scale(scale, scale);
        ctx.translate(-centerX, -centerY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let pointsDrawnThisFrame = 0;

        while (pointsDrawnThisFrame < pointsPerFrame && currentStrokeIdx < strokes.length) {
           const stroke = strokes[currentStrokeIdx];
           
           if (currentPointIdx < stroke.points.length - 1) {
              // Draw a segment
              const p1 = stroke.points[currentPointIdx];
              const p2 = stroke.points[currentPointIdx + 1];

              for (let s = 0; s < stroke.symmetry; s++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / stroke.symmetry) * s);
                ctx.beginPath();
                ctx.strokeStyle = stroke.color;
                ctx.lineWidth = stroke.width;
                ctx.shadowColor = stroke.color;
                ctx.shadowBlur = 10;
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
              }
              currentPointIdx++;
              pointsDrawnThisFrame++;
           } else {
             // Move to next stroke
             currentStrokeIdx++;
             currentPointIdx = 0;
           }
        }

        ctx.restore();

        if (currentStrokeIdx < strokes.length) {
          frameId = requestAnimationFrame(renderLoop);
        } else {
          // Finish
          // Add a few frames of pause at the end
          setTimeout(() => {
            recorder.stop();
          }, 1000);
        }
      };

      frameId = requestAnimationFrame(renderLoop);
    }
  }));

  const toWorld = (sx: number, sy: number, width: number, height: number) => {
    const cx = width / 2;
    const cy = height / 2;
    const wx = (sx - cx - cameraRef.current.x) / cameraRef.current.zoom;
    const wy = (sy - cy - cameraRef.current.y) / cameraRef.current.zoom;
    return { x: wx, y: wy };
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressedRef.current = true;
      if (e.key === 'Shift') isShiftPressedRef.current = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') isSpacePressedRef.current = false;
      if (e.key === 'Shift') isShiftPressedRef.current = false;
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

      ctx.setTransform(1, 0, 0, 1, 0, 0); 
      ctx.fillStyle = 'rgba(5, 5, 8, 0.2)'; 
      ctx.fillRect(0, 0, width, height);
      
      ctx.translate(cx + cameraRef.current.x, cy + cameraRef.current.y);
      ctx.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      
      // Grid/Guides
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.03)';
      ctx.lineWidth = 1 / cameraRef.current.zoom;
      ctx.beginPath();
      ctx.arc(0, 0, 100, 0, Math.PI * 2);
      ctx.arc(0, 0, 250, 0, Math.PI * 2);
      ctx.arc(0, 0, 400, 0, Math.PI * 2);
      ctx.stroke();

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

      const renderStroke = (strokePoints: Point[], strokeColor: string, strokeWidth: number, strokeSym: number, progress = 1.0) => {
        const pointCount = Math.floor(strokePoints.length * progress);
        if (pointCount < 2) return;

        for (let s = 0; s < strokeSym; s++) {
          ctx.save();
          ctx.rotate((Math.PI * 2 / strokeSym) * s);
          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth; 
          ctx.shadowBlur = (isAnimating ? 20 : 5);
          ctx.shadowColor = strokeColor;

          const p0 = strokePoints[0];
          ctx.moveTo(p0.x, p0.y);
          for (let i = 1; i < pointCount; i++) {
            ctx.lineTo(strokePoints[i].x, strokePoints[i].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      };

      if (isAnimating) {
        const durationPerStroke = 500;
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
        if (elapsed > totalDuration) onAnimationComplete();
      } else {
        strokes.forEach(stroke => {
          renderStroke(stroke.points, stroke.color, stroke.width, stroke.symmetry);
        });
        if (isDrawingRef.current && currentStrokeRef.current.length > 0) {
          renderStroke(currentStrokeRef.current, color, brushSize, symmetry);
        }
      }

      if (isDrawingRef.current && !isPanningRef.current) {
        for(let s=0; s<symmetry; s++) {
           const theta = (Math.PI * 2 / symmetry) * s;
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
    const wx = (mouseX - window.innerWidth/2 - cameraRef.current.x) / cameraRef.current.zoom;
    const wy = (mouseY - window.innerHeight/2 - cameraRef.current.y) / cameraRef.current.zoom;
    cameraRef.current.zoom = newZoom;
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
    if (isPanningRef.current) {
      const dx = e.clientX - lastMousePosRef.current.x;
      const dy = e.clientY - lastMousePosRef.current.y;
      cameraRef.current.x += dx;
      cameraRef.current.y += dy;
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const targetWorldPos = toWorld(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
    worldMouseRef.current = targetWorldPos;
    if (!isDrawingRef.current || isAnimating) return;
    let nextPoint = targetWorldPos;
    if (isShiftPressedRef.current && currentStrokeRef.current.length > 0) {
      const lastPoint = currentStrokeRef.current[currentStrokeRef.current.length - 1];
      const smoothingFactor = 0.15; 
      nextPoint = {
        x: lastPoint.x + (targetWorldPos.x - lastPoint.x) * smoothingFactor,
        y: lastPoint.y + (targetWorldPos.y - lastPoint.y) * smoothingFactor
      };
    }
    currentStrokeRef.current.push(nextPoint);
    if (Math.random() > 0.8) audioSynth.playSparkle();
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
        width: brushSize,
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
      onContextMenu={(e) => e.preventDefault()} 
    />
  );
});

export default Visualizer;
