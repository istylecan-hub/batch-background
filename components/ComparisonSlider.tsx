import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface ComparisonSliderProps {
  original: string;
  processed: string;
  className?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ original, processed, className }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    }
  }, []);

  const handleMouseDown = () => setIsDragging(true);
  const handleMouseUp = () => setIsDragging(false);
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none cursor-ew-resize group ${className}`}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* Background (Processed Image - After) */}
      <img 
        src={processed} 
        alt="After" 
        className="absolute top-0 left-0 w-full h-full object-contain bg-neutral-900/50"
      />

      {/* Foreground (Original Image - Before) - Clipped */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={original} 
          alt="Before" 
          className="absolute top-0 left-0 h-full max-w-none object-contain"
          style={{ width: containerRef.current?.offsetWidth || '100%' }} 
        />
        <div className="absolute bottom-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
          Original
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-primary/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
        AI Generated
      </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.5)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg transform -translate-x-1/2 text-neutral-900">
          <ChevronsLeftRight size={16} />
        </div>
      </div>
    </div>
  );
};
