import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

export default function HeroCamera3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse positions for interactive parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for high-end feel
  const springConfig = { stiffness: 120, damping: 20, mass: 0.8 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Map mouse coordinate to subtle 3D rotations (-25 to 25 degrees)
  const rotateY = useTransform(smoothX, [-300, 300], [-18, 18]);
  const rotateX = useTransform(smoothY, [-300, 300], [18, -18]);
  const shadowX = useTransform(smoothX, [-300, 300], [-30, 30]);
  const shadowScale = useTransform(smoothY, [-300, 300], [0.9, 1.1]);

  // Accessories drift offsets
  const acc1Y = useTransform(smoothY, [-300, 300], [-25, 25]);
  const acc1X = useTransform(smoothX, [-300, 300], [-20, 20]);
  const acc2Y = useTransform(smoothY, [-300, 300], [30, -30]);
  const acc2X = useTransform(smoothX, [-300, 300], [-15, 15]);
  const acc3Y = useTransform(smoothY, [-300, 300], [-15, 15]);
  const acc3X = useTransform(smoothX, [-300, 300], [25, -25]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = rect.left + width / 2;
      const centerY = rect.top + height / 2;
      
      // Calculate offset from center
      const offsetX = e.clientX - centerX;
      const offsetY = e.clientY - centerY;

      // Bound values
      mouseX.set(Math.max(-300, Math.min(300, offsetX)));
      mouseY.set(Math.max(-300, Math.min(300, offsetY)));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <div
      ref={containerRef}
      id="hero-3d-experience"
      className="relative w-full h-[350px] md:h-[500px] flex items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
    >
      {/* Volumetric Emerald Backlight Glow */}
      <div className="absolute w-[220px] h-[220px] md:w-[350px] md:h-[350px] rounded-full bg-brand-accent/20 blur-[80px] pointer-events-none animate-glow-pulse" />
      
      {/* Backlight flare lines */}
      <div className="absolute w-[400px] h-0.5 bg-gradient-to-r from-transparent via-brand-accent/30 to-transparent rotate-12 blur-sm pointer-events-none" />
      <div className="absolute w-[450px] h-0.5 bg-gradient-to-r from-transparent via-brand-glow/20 to-transparent -rotate-25 blur-md pointer-events-none" />

      {/* Main 3D DSLR Camera Stage */}
      <motion.div
        id="dslr-camera-container"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-[280px] h-[220px] md:w-[380px] md:h-[300px] flex items-center justify-center animate-float-slow"
      >
        {/* Realistic DSLR Vector Camera Graphics */}
        <svg
          viewBox="0 0 500 400"
          className="w-full h-full drop-shadow-[0_20px_40px_rgba(7,26,20,0.8)] filter"
          style={{ transform: 'translateZ(50px)' }}
        >
          <defs>
            {/* Metallic Gradients */}
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1E2724" />
              <stop offset="50%" stopColor="#121816" />
              <stop offset="100%" stopColor="#0B0F0E" />
            </linearGradient>
            <linearGradient id="gripGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#111614" />
              <stop offset="100%" stopColor="#1C2421" />
            </linearGradient>
            <linearGradient id="metalBezel" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4A5F58" />
              <stop offset="40%" stopColor="#2D3B37" />
              <stop offset="50%" stopColor="#809A90" />
              <stop offset="60%" stopColor="#1D2623" />
              <stop offset="100%" stopColor="#3C4D47" />
            </linearGradient>
            <radialGradient id="lensGlass" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0B3C35" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#166B5E" stopOpacity="0.7" />
              <stop offset="85%" stopColor="#031F1C" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#020C0B" stopOpacity="1" />
            </radialGradient>
            <radialGradient id="emeraldReflection" cx="30%" cy="30%" r="40%">
              <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#2EC4B6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            
            {/* Soft Shadow Filter */}
            <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Left Grip Texture */}
          <path d="M 90 140 Q 75 200 85 280 L 140 280 L 140 140 Z" fill="url(#gripGrad)" />
          {/* Grip leather micro pattern lines */}
          <path d="M 83 160 L 115 160 M 80 180 L 120 180 M 78 200 L 122 200 M 78 220 L 122 220 M 80 240 L 122 240 M 83 260 L 120 260" stroke="#080C0B" strokeWidth="2.5" opacity="0.6" />

          {/* Main Body Chassis */}
          <rect x="120" y="110" width="280" height="190" rx="25" ry="25" fill="url(#bodyGrad)" stroke="#232F2A" strokeWidth="1.5" />
          
          {/* Top Dial Wheels & Pentaprism */}
          {/* Left dial */}
          <rect x="140" y="88" width="35" height="22" rx="4" fill="#131917" stroke="#33423C" strokeWidth="1" />
          <line x1="148" y1="88" x2="148" y2="110" stroke="#25302C" strokeWidth="1.5" />
          <line x1="158" y1="88" x2="158" y2="110" stroke="#25302C" strokeWidth="1.5" />
          <line x1="168" y1="88" x2="168" y2="110" stroke="#25302C" strokeWidth="1.5" />
          {/* Right shutter button */}
          <ellipse cx="340" cy="98" rx="16" ry="7" fill="#2E3C37" stroke="#4A5D56" strokeWidth="1" />
          <rect x="330" y="85" width="20" height="13" rx="2" fill="#0C100F" />
          {/* Pentaprism Housing (Center bump) */}
          <path d="M 210 110 L 230 65 L 290 65 L 310 110 Z" fill="url(#bodyGrad)" stroke="#283530" strokeWidth="1.5" />
          {/* Hot shoe mount */}
          <rect x="238" y="58" width="44" height="7" fill="#364540" />
          <rect x="244" y="54" width="32" height="4" fill="#0F1413" />

          {/* Golden/Emerald Accent Laser Ring */}
          <circle cx="260" cy="205" r="95" fill="none" stroke="url(#metalBezel)" strokeWidth="10" />
          <circle cx="260" cy="205" r="90" fill="none" stroke="#2EC4B6" strokeWidth="1.5" opacity="0.75" />

          {/* Main Lens Barrel Structure */}
          <circle cx="260" cy="205" r="80" fill="#101513" stroke="#1D2623" strokeWidth="3" />
          <circle cx="260" cy="205" r="70" fill="url(#metalBezel)" stroke="#090E0D" strokeWidth="1" />
          <circle cx="260" cy="205" r="66" fill="#151C19" />

          {/* Rotatable Aperture Blades & Glass (Continuously slowly rotating group) */}
          <g className="animate-spin-ultra-slow" style={{ transformOrigin: '260px 205px' }}>
            {/* Aperture blades guide lines */}
            <path d="M 260 145 L 235 255" stroke="#1D2724" strokeWidth="2" />
            <path d="M 260 265 L 285 155" stroke="#1D2724" strokeWidth="2" />
            <path d="M 200 205 L 320 205" stroke="#1D2724" strokeWidth="2" opacity="0.4" />
            <path d="M 220 165 L 300 245" stroke="#1D2724" strokeWidth="2" opacity="0.4" />
            
            {/* Cinematic Lens Glass Element */}
            <circle cx="260" cy="205" r="58" fill="url(#lensGlass)" />
            
            {/* Glare and Reflections */}
            <circle cx="260" cy="205" r="50" fill="url(#emeraldReflection)" />
            <ellipse cx="235" cy="180" rx="20" ry="8" fill="#FFFFFF" opacity="0.22" transform="rotate(-30, 235, 180)" />
            <ellipse cx="285" cy="230" rx="10" ry="4" fill="#6EE7B7" opacity="0.3" transform="rotate(-30, 285, 230)" />
            
            {/* Lens details text circular path decoration */}
            <circle cx="260" cy="205" r="44" fill="none" stroke="rgba(46,196,182,0.15)" strokeWidth="1" strokeDasharray="10 5" />
          </g>

          {/* Red branding ring & sensor lens marking */}
          <circle cx="260" cy="205" r="58" fill="none" stroke="#2EC4B6" strokeWidth="1" opacity="0.5" />
          <circle cx="160" cy="140" r="4" fill="#FF3B30" /> {/* Self timer light / red dot */}

          {/* Luxury Lens Glass Glare Overlay */}
          <path d="M 215 170 Q 240 160 270 175 Q 245 190 215 170 Z" fill="#ffffff" opacity="0.1" />
        </svg>

        {/* 3D Glass Reflection Overlay */}
        <div className="absolute top-[35%] left-[40%] w-[120px] h-[120px] rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none mix-blend-overlay rotate-12" />
      </motion.div>

      {/* Dynamic Ground Shadow */}
      <motion.div
        id="camera-ground-shadow"
        style={{
          scale: shadowScale,
          x: shadowX,
        }}
        className="absolute bottom-2 md:bottom-8 w-[160px] md:w-[240px] h-[16px] md:h-[24px] rounded-full bg-[#030B09]/80 blur-[8px] md:blur-[12px] -z-10"
      />

      {/* FLOATING ACCESSORIES (Moving independently at different speeds) */}

      {/* Accessory 1: Extra Portrait Lens (Top-Right) */}
      <motion.div
        style={{ y: acc1Y, x: acc1X, transformStyle: 'preserve-3d' }}
        className="absolute top-8 right-8 md:top-14 md:right-16 w-16 h-16 md:w-24 md:h-24 glass rounded-full flex items-center justify-center p-1 border-brand-accent/25 box-glow pointer-events-none animate-float-mid z-10"
      >
        <div className="w-full h-full rounded-full bg-brand-bg/90 border border-brand-accent/20 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Inner glass details */}
          <div className="absolute w-[80%] h-[80%] rounded-full bg-radial from-brand-accent/20 to-transparent blur-[2px]" />
          <div className="w-[70%] h-[70%] rounded-full border border-brand-accent/40 flex items-center justify-center">
            <span className="text-[7px] md:text-[9px] font-mono text-brand-glow">85mm</span>
          </div>
          {/* Glass reflection */}
          <div className="absolute top-1 left-2 w-1/2 h-1/3 bg-white/15 rounded-full rotate-[-20deg]" />
        </div>
      </motion.div>

      {/* Accessory 2: High-Speed SD Memory Card (Bottom-Left) */}
      <motion.div
        style={{ y: acc2Y, x: acc2X }}
        className="absolute bottom-16 left-6 md:bottom-24 md:left-14 w-12 h-16 md:w-16 md:h-20 glass rounded-lg p-1.5 border-white/10 shadow-lg pointer-events-none animate-float-fast"
      >
        <div className="w-full h-full bg-brand-secondary/90 border border-brand-glow/10 rounded-md p-1 flex flex-col justify-between relative overflow-hidden">
          {/* Gold Contacts */}
          <div className="flex gap-1 justify-end opacity-80">
            <div className="w-1 h-3 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-sm" />
            <div className="w-1 h-3 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-sm" />
            <div className="w-1 h-3 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-sm" />
            <div className="w-1 h-3 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-sm" />
          </div>
          {/* SD Label */}
          <div>
            <div className="text-[6px] md:text-[8px] font-mono text-brand-accent font-bold">V90 ULTRA</div>
            <div className="text-[10px] md:text-[14px] font-space font-bold text-brand-text leading-none mt-0.5">256<span className="text-[6px] md:text-[8px]">GB</span></div>
          </div>
          <div className="text-[4px] md:text-[6px] font-mono text-brand-muted">Verified Photo</div>
          
          {/* Lock switch indicator */}
          <div className="absolute top-5 left-0 w-1.5 h-1.5 bg-brand-accent" />
        </div>
      </motion.div>

      {/* Accessory 3: Classic Film Strip (Bottom-Right) */}
      <motion.div
        style={{ y: acc3Y, x: acc3X }}
        className="absolute bottom-10 right-4 md:bottom-16 md:right-12 w-20 h-10 md:w-28 md:h-14 pointer-events-none animate-float-slow"
      >
        <div className="w-full h-full flex items-center justify-center relative origin-center rotate-12">
          {/* Curled translucent film strip simulation */}
          <svg viewBox="0 0 100 40" className="w-full h-full drop-shadow-md">
            <path
              d="M 5 20 Q 25 5 50 20 T 95 20"
              fill="none"
              stroke="rgba(16, 38, 31, 0.95)"
              strokeWidth="15"
              strokeLinecap="round"
            />
            {/* Film Sprocket Holes */}
            <path
              d="M 5 20 Q 25 5 50 20 T 95 20"
              fill="none"
              stroke="#F8FFF9"
              strokeWidth="1"
              strokeDasharray="2 3"
              strokeLinecap="round"
              opacity="0.5"
              className="translate-y-[-5px]"
            />
            <path
              d="M 5 20 Q 25 5 50 20 T 95 20"
              fill="none"
              stroke="#F8FFF9"
              strokeWidth="1"
              strokeDasharray="2 3"
              strokeLinecap="round"
              opacity="0.5"
              className="translate-y-[5px]"
            />
            {/* Center negative frame indicators */}
            <path
              d="M 5 20 Q 25 5 50 20 T 95 20"
              fill="none"
              stroke="rgba(46, 196, 182, 0.4)"
              strokeWidth="8"
              strokeDasharray="8 6"
              strokeLinecap="butt"
            />
          </svg>
        </div>
      </motion.div>

      {/* Accessory 4: Animated Aperture Blades Logo (Top-Left) */}
      <motion.div
        className="absolute top-16 left-8 md:top-24 md:left-24 w-10 h-10 md:w-14 md:h-14 glass rounded-full flex items-center justify-center border-white/5 pointer-events-none animate-float-slow"
        style={{
          rotate: useTransform(smoothX, [-300, 300], [0, -45]),
        }}
      >
        <svg viewBox="0 0 100 100" className="w-7 h-7 md:w-9 md:h-9 text-brand-glow animate-spin-ultra-slow">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" opacity="0.5" />
          <polygon points="50,15 70,35 60,65 30,55" fill="none" stroke="currentColor" strokeWidth="2" />
          <polygon points="30,55 20,30 45,10 65,20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <polygon points="60,65 80,85 40,90 20,70" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
          <circle cx="50" cy="50" r="10" fill="currentColor" opacity="0.8" />
        </svg>
      </motion.div>

      {/* Floating Sparkling Light Particles inside the Stage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[15%] w-1.5 h-1.5 rounded-full bg-brand-glow animate-ping opacity-70" />
        <div className="absolute top-[60%] right-[20%] w-1 h-1 rounded-full bg-brand-accent animate-pulse opacity-40" />
        <div className="absolute bottom-[20%] left-[45%] w-2 h-2 rounded-full bg-brand-glow/30 blur-[1px] animate-bounce duration-[5000ms]" />
        <div className="absolute top-[40%] right-[35%] w-1 h-1 rounded-full bg-brand-glow/80 animate-ping duration-[3000ms]" />
      </div>
    </div>
  );
}
