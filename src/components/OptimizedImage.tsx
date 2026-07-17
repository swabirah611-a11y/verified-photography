import React, { useState } from 'react';
import { Camera, Sparkles } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  placeholderText?: string;
}

export default function OptimizedImage({ 
  src, 
  alt, 
  className = "", 
  placeholderText = "Loading Visual...", 
  ...props 
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Secure handler to disable copy-saving
  const preventSave = (e: React.MouseEvent | React.TouchEvent | React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a1f18] select-none">
      {/* Blurred Loading Placeholder */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-[#0c241c] to-[#040e0b] animate-pulse">
          {/* Ambient spin effect */}
          <div className="relative w-12 h-12 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-dashed border-[#2EC4B6]/20 rounded-full animate-spin duration-[6000ms]" />
            <Camera className="w-5 h-5 text-[#2EC4B6] animate-pulse" />
          </div>
          <span className="mt-3 text-[10px] font-mono tracking-widest text-[#A7C4B8] uppercase">
            {placeholderText}
          </span>
        </div>
      )}

      {/* Error Fallback */}
      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0c241c] text-center p-4">
          <Camera className="w-8 h-8 text-red-400 mb-2" />
          <span className="text-xs font-mono text-[#A7C4B8] uppercase">Failed to resolve frame</span>
        </div>
      )}

      {/* Main Image */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        onContextMenu={preventSave}
        onDragStart={preventSave}
        className={`w-full h-full object-cover transition-all duration-1000 ease-out select-none ${
          isLoaded ? 'scale-100 opacity-100 blur-0' : 'scale-110 opacity-0 blur-md'
        } ${className}`}
        {...props}
      />

      {/* High-contrast Glass shine overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.05] mix-blend-overlay" />
      
      {/* Anti-save transparent block layer */}
      <div 
        className="absolute inset-0 z-20" 
        onContextMenu={preventSave}
        onDragStart={preventSave}
        onTouchStart={preventSave}
      />
    </div>
  );
}
