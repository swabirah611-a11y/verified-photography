import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  Heart, 
  User, 
  GraduationCap, 
  Calendar, 
  Camera, 
  Briefcase, 
  Sparkles, 
  ArrowRight, 
  Check, 
  X, 
  Shield, 
  Cpu, 
  Zap, 
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  Smartphone
} from 'lucide-react';

import { CmsConfig } from '../lib/supabase';

interface ServicesSectionProps {
  onBookService: (serviceName: string) => void;
  cmsConfig?: CmsConfig;
}

interface ServiceItem {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  iconName: string;
  pricingRange: string;
  features: string[];
  gradient: string;
  themeColor: string;
}

export default function ServicesSection({ onBookService, cmsConfig }: ServicesSectionProps) {
  // Service list dynamically loaded from CMS or following specification exactly
  const services: ServiceItem[] = (cmsConfig?.services && cmsConfig.services.length > 0 ? cmsConfig.services : [
    {
      id: 'ser-1',
      title: 'Wedding Photography',
      iconName: 'Heart',
      description: 'Exquisite, full-scale documentation of your traditional and white weddings, focusing on rich emotions, traditional attire, and key family milestones in Uromi, Ekpoma, or Auchi.',
      pricingRange: 'From ₦250,000',
      features: ['Multi-day traditional & white coverage', 'Two professional principal shooters', 'UHD Cinematic Video highlights', 'Premium handcrafted photobook & online vault']
    },
    {
      id: 'ser-2',
      title: 'Portrait Photography',
      iconName: 'User',
      description: 'Individually crafted high-fashion or studio portraits for executives, creatives, and models seeking to establish a compelling and powerful digital persona.',
      pricingRange: 'From ₦50,000',
      features: ['Editorial retouching & color grading', 'Sophisticated modular studio flash setup', 'Multiple clothing changes allowed', 'Ultra-high res commercial license files']
    },
    {
      id: 'ser-3',
      title: 'Graduation Photography',
      iconName: 'GraduationCap',
      description: 'Confident and celebratory portraits honoring your hard-earned academic triumph. Customized specifically for scholars at AAU Ekpoma and neighboring campuses.',
      pricingRange: 'From ₦40,000',
      features: ['Pristine academic gowns & caps provided', 'Professional posture & facial coaching', 'One massive wood-framed physical print', '15 fully polished high-res digital copies']
    },
    {
      id: 'ser-4',
      title: 'Birthday Photography',
      iconName: 'Sparkles',
      description: 'High-energy, color-accurate reporting of your birthday festivities. Capturing genuine smiles, elegant couture, and sparkling celebratory moments.',
      pricingRange: 'From ₦60,000',
      features: ['Pre-event private portrait session', 'Comprehensive candid coverage', 'Same-day social media preview gallery', 'Dynamic ambient strobe setup included']
    },
    {
      id: 'ser-5',
      title: 'Event Coverage',
      iconName: 'Calendar',
      description: 'Sophisticated event coverage for corporate summits, traditional festivals, and high-society anniversaries, engineered to elevate your brand presence.',
      pricingRange: 'From ₦150,000',
      features: ['Real-time rapid media feed delivery', 'Optimized web & print resolution packages', 'Elite candid crowd interactions', 'Custom corporate branding watermarks']
    },
    {
      id: 'ser-6',
      title: 'Commercial Photography',
      iconName: 'Briefcase',
      description: 'Elegantly lit product layouts and industrial workflow storytelling. Designed to establish trust, capture textures, and significantly boost your sales conversions.',
      pricingRange: 'From ₦120,000',
      features: ['Extreme micro macro product lens details', 'Advanced custom background styling', 'High-end color fidelity calibration', 'Unlimited commercial use copyright release']
    }
  ]).map((ser, index) => {
    const gradients = [
      'from-[#FF6B6B] to-[#2EC4B6]',
      'from-[#34D399] to-[#2EC4B6]',
      'from-[#6EE7B7] to-[#2EC4B6]',
      'from-[#F59E0B] to-[#2EC4B6]',
      'from-[#3B82F6] to-[#2EC4B6]',
      'from-[#A78BFA] to-[#2EC4B6]'
    ];
    const themeColors = ['#FF6B6B', '#34D399', '#6EE7B7', '#F59E0B', '#3B82F6', '#A78BFA'];
    return {
      id: ser.id,
      title: ser.title,
      shortDesc: (ser as any).shortDesc || ser.description.substring(0, 80) + '...',
      fullDesc: ser.description,
      iconName: ser.iconName,
      pricingRange: ser.pricingRange,
      features: ser.features,
      gradient: (ser as any).gradient || gradients[index % gradients.length],
      themeColor: (ser as any).themeColor || themeColors[index % themeColors.length]
    };
  });

  // Helper to map icon names to Lucide icons
  const renderIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'Heart': return <Heart className={className} />;
      case 'User': return <User className={className} />;
      case 'GraduationCap': return <GraduationCap className={className} />;
      case 'Calendar': return <Calendar className={className} />;
      case 'Briefcase': return <Briefcase className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      default: return <Camera className={className} />;
    }
  };

  // 3D Orbit showcase states
  const [orbitAngle, setOrbitAngle] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [lensFocusing, setLensFocusing] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Mobile Carousel states
  const [mobileActiveIdx, setMobileActiveIdx] = useState(0);
  const carouselTrackRef = useRef<HTMLDivElement>(null);

  // Scroll tracking for workflow connector progress
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start end", "end start"]
  });
  
  // Transform scroll progress to clean numeric state for horizontal connector glow
  const workflowProgress = useTransform(scrollYProgress, [0.15, 0.55], [0, 100]);
  const [timelineProgressPercent, setTimelineProgressPercent] = useState(0);

  useEffect(() => {
    return workflowProgress.on("change", (val) => {
      setTimelineProgressPercent(Math.min(Math.max(val, 0), 100));
    });
  }, [workflowProgress]);

  // Orbit angle incremental driver
  useEffect(() => {
    let animationFrameId: number;
    const updateAngle = () => {
      // Pause orbit rotation when a card is hovered or actively selected
      if (hoveredIdx === null && selectedIdx === null) {
        setOrbitAngle((prev) => (prev + 0.15) % 360);
      }
      animationFrameId = requestAnimationFrame(updateAngle);
    };
    animationFrameId = requestAnimationFrame(updateAngle);
    return () => cancelAnimationFrame(animationFrameId);
  }, [hoveredIdx, selectedIdx]);

  // Mouse move handler for camera lens depth parallax
  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    setMouseOffset({ x: x * 20, y: y * 20 });
  };

  const handleContainerMouseLeave = () => {
    setMouseOffset({ x: 0, y: 0 });
  };

  // Card selection triggers a lens focus flash and modal slide-up
  const handleSelectService = (idx: number) => {
    setLensFocusing(true);
    setSelectedIdx(idx);
    setTimeout(() => {
      setLensFocusing(false);
    }, 600);
  };

  // Why Choose Us cards
  const whyChooseUsData = [
    {
      icon: <Sparkles className="w-6 h-6 text-[#2EC4B6]" />,
      title: 'Creative Vision',
      desc: 'Every single photograph is masterfully planned with deep artistic intention, custom moodboards, and unique concepts.'
    },
    {
      icon: <Cpu className="w-6 h-6 text-[#6EE7B7]" />,
      title: 'Professional Equipment',
      desc: 'Equipped with bleeding-edge mirrorless cameras, ultra-sharp prime G-Master lenses, and specialized battery strobe systems.'
    },
    {
      icon: <Zap className="w-6 h-6 text-[#2EC4B6]" />,
      title: 'Fast Delivery',
      desc: 'Meticulous professional edits and color grading delivered promptly to your secure digital vault within 5 to 7 days.'
    },
    {
      icon: <Award className="w-6 h-6 text-[#6EE7B7]" />,
      title: 'Customer Experience',
      desc: 'Fluid and friendly tailored communication from our easy online booking process through the finalized heirloom delivery.'
    }
  ];

  // Creative process timeline details
  const workflowSteps = [
    {
      title: 'Consultation',
      desc: 'Conceptual brainstorming and scheduling.',
      threshold: 15
    },
    {
      title: 'Planning',
      desc: 'Wardrobe sync and scouting backdrops.',
      threshold: 35
    },
    {
      title: 'Photoshoot',
      desc: 'Cinematic staging with dynamic lighting.',
      threshold: 55
    },
    {
      title: 'Professional Editing',
      desc: 'Precision color-science and fine-art grade.',
      threshold: 75
    },
    {
      title: 'Final Delivery',
      desc: 'Instant high-res private gallery download.',
      threshold: 95
    }
  ];

  // Mobile carousel navigation
  const slideNext = () => {
    setMobileActiveIdx((prev) => (prev + 1) % services.length);
  };
  const slidePrev = () => {
    setMobileActiveIdx((prev) => (prev - 1 + services.length) % services.length);
  };

  return (
    <section 
      id="services" 
      className="relative py-24 md:py-32 overflow-hidden bg-[#071A14] select-none"
    >
      {/* Background Ambience Layers */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] right-[-15%] w-[600px] h-[600px] bg-[#2EC4B6] opacity-[0.04] blur-[150px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-15%] w-[500px] h-[500px] bg-[#6EE7B7] opacity-[0.03] blur-[130px] rounded-full" />
        
        {/* Subtle diagonal light streaks */}
        <div className="absolute top-1/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#2EC4B6]/10 to-transparent rotate-[10deg]" />
        <div className="absolute top-2/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent -rotate-[10deg]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EC4B6] animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold">Our Services</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-space font-bold tracking-tight text-[#F8FFF9]"
          >
            Photography Crafted Around Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-glow">Story</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-sm md:text-base text-[#A7C4B8] max-w-3xl mx-auto leading-relaxed"
          >
            Whether it's a wedding, graduation, birthday, portrait session, or corporate event, every shoot is planned with creativity, precision, and attention to detail.
          </motion.p>
        </div>

        {/* 3D Circular Orbit Showcase (Desktop & Wide Screen Display) */}
        <div 
          className="hidden lg:flex flex-col items-center justify-center h-[650px] relative w-full mb-32"
          onMouseMove={handleContainerMouseMove}
          onMouseLeave={handleContainerMouseLeave}
        >
          {/* Laser connection indicators from Lens center to orbiting Cards */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <linearGradient id="laser-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2EC4B6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.1" />
              </linearGradient>
              <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing rays extending to each card */}
            {services.map((_, idx) => {
              // Calculate target coordinates based on matching orbit angle
              const currentRad = ((orbitAngle + idx * 60) * Math.PI) / 180;
              const radiusX = 340; // horizontal radius of orbit ellipse
              const radiusY = 240; // vertical radius of orbit ellipse
              const targetX = 384 + radiusX * Math.cos(currentRad); // Center offsets mapped to 50% coordinate
              const targetY = 325 + radiusY * Math.sin(currentRad);
              
              const isCardHovered = hoveredIdx === idx;
              const isAnyCardFocused = selectedIdx !== null;
              
              return (
                <line
                  key={idx}
                  x1="50%"
                  y1="50%"
                  x2={`${(targetX / 768) * 100}%`}
                  y2={`${(targetY / 650) * 100}%`}
                  stroke="url(#laser-gradient)"
                  strokeWidth={isCardHovered ? "2.5" : "1"}
                  strokeDasharray={isCardHovered ? "none" : "5 5"}
                  opacity={isAnyCardFocused ? (selectedIdx === idx ? 0.8 : 0.05) : (isCardHovered ? 0.9 : 0.35)}
                  filter="url(#laser-glow)"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Central 3D Interactive Camera Lens */}
          <motion.div
            style={{
              x: mouseOffset.x,
              y: mouseOffset.y,
            }}
            transition={{ type: "spring", stiffness: 150, damping: 20 }}
            className="absolute z-20 w-44 h-44 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(46,196,182,0.15)] bg-gradient-to-br from-[#10261F] to-[#040E0B] border-[6px] border-white/5 cursor-pointer group"
            onClick={() => {
              // Quick playful pulse focus flash when user clicks center lens
              setLensFocusing(true);
              setTimeout(() => setLensFocusing(false), 500);
            }}
          >
            {/* Outer rotating scale markings */}
            <motion.div 
              animate={{ rotate: orbitAngle * -1.5 }}
              className="absolute inset-1 rounded-full border border-dashed border-[#2EC4B6]/20 pointer-events-none" 
            />

            {/* Main Lens Core Elements */}
            <div className="w-32 h-32 rounded-full bg-black border-4 border-[#10261F] flex items-center justify-center relative overflow-hidden">
              {/* Radial gloss reflection */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,_rgba(46,196,182,0.45)_0%,_transparent_60%)] z-10 animate-pulse duration-[4000ms]" />
              <div className="absolute bottom-2 right-2 w-14 h-14 bg-gradient-to-tr from-[#8B5CF6]/20 to-transparent rounded-full blur-md z-10" />

              {/* Internal aperture gold blades overlay */}
              <div className="absolute inset-6 rounded-full border border-white/10 opacity-30 transform rotate-12" />
              <div className="absolute inset-8 rounded-full border border-white/15 opacity-20 transform -rotate-45" />

              {/* Shutter glass reflections following mouse movement */}
              <motion.div 
                style={{
                  x: mouseOffset.x * 0.4,
                  y: mouseOffset.y * 0.4
                }}
                className="absolute inset-4 rounded-full bg-gradient-to-br from-transparent via-[#2EC4B6]/15 to-transparent blur-[2px] z-20 pointer-events-none" 
              />

              {/* Deep central glass element */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#071A14] to-black border-2 border-[#2EC4B6]/20 flex items-center justify-center relative z-20">
                <div className="w-6 h-6 rounded-full bg-black border border-white/20 relative flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#2EC4B6] glow-shadow animate-pulse" />
                </div>
              </div>

              {/* High-speed Auto-focus Lens Flash Shutter overlay */}
              <AnimatePresence>
                {lensFocusing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 bg-white z-30 flex items-center justify-center"
                  >
                    <div className="text-[#2EC4B6] font-mono text-[9px] tracking-wider uppercase font-bold animate-pulse">FOCUS...</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Lens outer technical labeling text */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono tracking-widest text-[#A7C4B8] uppercase bg-[#071A14] px-2 py-0.5 rounded border border-white/5 opacity-80">
              VERIFIED LENS F/1.2 GM
            </div>
          </motion.div>

          {/* Six Orbiting glass cards representing the services */}
          {services.map((service, idx) => {
            // Trigonometric circular path calculation
            const baseRad = (idx * 60 * Math.PI) / 180;
            const orbitRad = (orbitAngle * Math.PI) / 180;
            const currentRad = baseRad + orbitRad;

            const radiusX = 340; // horizontal stretch
            const radiusY = 240; // vertical height
            const posX = radiusX * Math.cos(currentRad);
            const posY = radiusY * Math.sin(currentRad);

            // Determine if card is currently behind or in front (visual 3D layering simulation)
            const isBehind = Math.sin(currentRad) < 0; 
            const scale = isBehind ? 0.82 : 1.05;
            const zIndex = isBehind ? 15 : 25;
            const cardOpacity = isBehind ? 0.65 : 1;

            const isHovered = hoveredIdx === idx;
            const isAnySelected = selectedIdx !== null;
            const isThisSelected = selectedIdx === idx;

            return (
              <motion.div
                key={service.id}
                className="absolute w-[260px] cursor-pointer"
                style={{
                  x: posX,
                  y: posY,
                  zIndex: isThisSelected ? 100 : (isHovered ? 50 : zIndex),
                }}
                animate={{
                  scale: isThisSelected ? 1.25 : (isHovered ? 1.12 : scale),
                  opacity: isAnySelected ? (isThisSelected ? 1 : 0.25) : (isHovered ? 1 : cardOpacity)
                }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 18
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleSelectService(idx)}
              >
                {/* Floating premium glassmorphism card wrap */}
                <div 
                  className={`p-6 rounded-2xl bg-white/[0.02] border backdrop-blur-md transition-all duration-500 overflow-hidden relative shadow-2xl ${
                    isHovered 
                      ? 'border-[#2EC4B6]/50 shadow-[0_0_30px_rgba(46,196,182,0.25)] bg-white/[0.04]' 
                      : 'border-white/5'
                  }`}
                  style={{
                    boxShadow: isHovered ? `0 15px 40px -10px ${service.themeColor}33` : ''
                  }}
                >
                  {/* Subtle decorative glowing corner accent */}
                  <div 
                    className="absolute top-0 right-0 w-16 h-16 opacity-10 group-hover:opacity-40 blur-xl rounded-full transition-opacity" 
                    style={{ backgroundColor: service.themeColor }}
                  />

                  {/* Card Reflection light swipe effect */}
                  <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div className={`absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/${isHovered ? '10' : '5'} to-transparent -skew-x-25 transition-transform duration-1000 ${isHovered ? 'translate-x-full' : ''}`} />
                  </div>

                  {/* Card Details */}
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      {/* Interactive Service Icon */}
                      <div 
                        className={`p-3 rounded-xl bg-white/[0.03] border border-white/5 transition-all duration-300 ${
                          isHovered ? 'bg-[#2EC4B6]/15 border-[#2EC4B6]/30 text-[#2EC4B6]' : 'text-[#A7C4B8]'
                        }`}
                        style={{
                          color: isHovered ? service.themeColor : '',
                          borderColor: isHovered ? `${service.themeColor}55` : '',
                          backgroundColor: isHovered ? `${service.themeColor}1a` : ''
                        }}
                      >
                        {renderIcon(service.iconName, "w-6 h-6")}
                      </div>
                      
                      {/* Price tag */}
                      <span className="text-[10px] font-mono tracking-wider font-bold px-2.5 py-1 rounded-full bg-white/[0.04] text-[#2EC4B6] border border-white/5">
                        {service.pricingRange}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-space font-bold text-[#F8FFF9] mb-2 group-hover:text-[#2EC4B6] transition-colors">
                      {service.title}
                    </h3>

                    {/* Short Description */}
                    <p className="text-xs text-[#A7C4B8] leading-relaxed mb-4">
                      {service.shortDesc}
                    </p>

                    {/* Expandable Hover Feature details */}
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: isHovered ? 'auto' : 0,
                        opacity: isHovered ? 1 : 0
                      }}
                      className="overflow-hidden space-y-2 mb-4"
                    >
                      <div className="h-px bg-white/5 my-2" />
                      {service.features.slice(0, 2).map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-[10px] text-[#A7C4B8]">
                          <Check className="w-3 h-3 text-[#2EC4B6] flex-shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </motion.div>

                    {/* CTA Glowing Outline Button */}
                    <div className="flex justify-end pt-1">
                      <motion.div
                        animate={{
                          opacity: isHovered ? 1 : 0.5,
                          y: isHovered ? 0 : 3
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-space font-bold transition-all border ${
                          isHovered 
                            ? 'bg-[#2EC4B6]/10 text-white border-[#2EC4B6]/40 glow-shadow' 
                            : 'bg-white/[0.02] text-[#A7C4B8] border-white/10'
                        }`}
                      >
                        <span>Explore & Book</span>
                        <ArrowRight className="w-3 h-3" />
                      </motion.div>
                    </div>

                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mobile Swipeable Carousel (Shown on Tablets and Phones) */}
        <div className="lg:hidden w-full relative mb-24 px-1">
          <div className="overflow-hidden relative rounded-3xl backdrop-blur-md border border-white/5 bg-white/[0.01] p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#2EC4B6]" />
                <span className="text-[10px] font-mono tracking-widest text-[#A7C4B8] uppercase">Swipe to Explore</span>
              </div>
              <span className="text-xs font-mono text-[#2EC4B6]">
                {mobileActiveIdx + 1} / {services.length}
              </span>
            </div>

            {/* Slider view container */}
            <div className="min-h-[280px] flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mobileActiveIdx}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.35 }}
                  className="w-full text-left"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3.5 rounded-xl bg-[#10261F] border border-[#2EC4B6]/20 text-[#2EC4B6]">
                      {renderIcon(services[mobileActiveIdx].iconName, "w-6 h-6")}
                    </div>
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-[#10261F] text-[#2EC4B6] border border-[#2EC4B6]/25">
                      {services[mobileActiveIdx].pricingRange}
                    </span>
                  </div>

                  <h3 className="text-xl font-space font-bold text-[#F8FFF9] mb-2">
                    {services[mobileActiveIdx].title}
                  </h3>
                  
                  <p className="text-xs md:text-sm text-[#A7C4B8] leading-relaxed mb-6">
                    {services[mobileActiveIdx].fullDesc}
                  </p>

                  <ul className="space-y-2 mb-8">
                    {services[mobileActiveIdx].features.map((feat, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2 text-xs text-[#A7C4B8]">
                        <Check className="w-3.5 h-3.5 text-[#2EC4B6] mt-0.5 flex-shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => onBookService(services[mobileActiveIdx].title)}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-[#071A14] font-space font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    <span>Instant Reservation Booking</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Carousel navigation controls */}
            <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5">
              <button 
                onClick={slidePrev}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/5"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {/* Carousel dots indicators */}
              <div className="flex gap-1.5">
                {services.map((_, dotIdx) => (
                  <button
                    key={dotIdx}
                    onClick={() => setMobileActiveIdx(dotIdx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      dotIdx === mobileActiveIdx ? 'w-5 bg-[#2EC4B6]' : 'w-1.5 bg-white/20'
                    }`}
                  />
                ))}
              </div>

              <button 
                onClick={slideNext}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white border border-white/5"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 3D Focal Zoom Overlay Modal when a service is clicked (Desktop Only) */}
        <AnimatePresence>
          {selectedIdx !== null && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl"
            >
              <motion.div
                initial={{ scale: 0.9, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-full max-w-2xl bg-[#091F18] border border-[#2EC4B6]/30 p-8 rounded-3xl relative shadow-[0_0_60px_rgba(46,196,182,0.2)] overflow-hidden"
              >
                {/* Visual glow accent behind the modal contents */}
                <div className="absolute top-[-20%] right-[-20%] w-60 h-60 rounded-full bg-[#2EC4B6]/10 blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 rounded-full bg-[#6EE7B7]/5 blur-3xl" />

                {/* Close Button */}
                <button
                  onClick={() => setSelectedIdx(null)}
                  className="absolute top-6 right-6 p-2 rounded-full bg-white/[0.03] hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10 z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Modal Header */}
                <div className="flex items-start gap-5 mb-6">
                  <div className="p-4 rounded-2xl bg-[#2EC4B6]/10 border border-[#2EC4B6]/30 text-[#2EC4B6] shadow-[0_0_15px_rgba(46,196,182,0.15)]">
                    {renderIcon(services[selectedIdx].iconName, "w-8 h-8")}
                  </div>
                  <div>
                    <span className="text-xs font-mono uppercase text-[#2EC4B6] tracking-wider font-semibold">Premium Photography Package</span>
                    <h3 className="text-2xl md:text-3xl font-space font-bold text-white mt-1">
                      {services[selectedIdx].title}
                    </h3>
                  </div>
                </div>

                {/* Modal Description */}
                <p className="text-[#A7C4B8] text-sm md:text-base leading-relaxed mb-6">
                  {services[selectedIdx].fullDesc}
                </p>

                {/* Sub features checklist block */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 mb-8">
                  <h4 className="text-xs font-mono uppercase text-white tracking-widest mb-3 font-semibold">Included Deliverables:</h4>
                  <div className="grid md:grid-cols-2 gap-3">
                    {services[selectedIdx].features.map((feature, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-[#A7C4B8]">
                        <Check className="w-4 h-4 text-[#2EC4B6] mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#A7C4B8]">Investment Range:</span>
                    <div className="text-2xl font-space font-bold text-[#2EC4B6] mt-0.5">
                      {services[selectedIdx].pricingRange}
                    </div>
                  </div>

                  <div className="flex gap-4 w-full sm:w-auto">
                    <button
                      onClick={() => setSelectedIdx(null)}
                      className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#F8FFF9] text-xs font-space font-semibold transition-colors border border-white/5 flex-1 sm:flex-initial"
                    >
                      Back to Services
                    </button>
                    <button
                      onClick={() => {
                        const sTitle = services[selectedIdx!].title;
                        setSelectedIdx(null);
                        onBookService(sTitle);
                      }}
                      className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-[#071A14] hover:shadow-[0_0_20px_rgba(46,196,182,0.4)] text-xs font-space font-bold transition-all flex-1 sm:flex-initial flex items-center justify-center gap-1.5"
                    >
                      <span>Book Service</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Creative Process Workflow Timeline Section */}
        <div ref={timelineRef} className="mt-28 md:mt-36 pt-16 border-t border-white/5 relative">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 mb-3"
            >
              <span className="text-[10px] font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold">Workflow Staging</span>
            </motion.div>
            
            <motion.h3
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-space font-bold text-[#F8FFF9]"
            >
              Our Creative Process
            </motion.h3>
            <p className="text-xs md:text-sm text-[#A7C4B8] mt-2 max-w-xl mx-auto">
              From our first conceptual conversation down to final high-definition art vault framing, we engineer a seamless client path.
            </p>
          </div>

          {/* Desktop Process Timeline Layout */}
          <div className="hidden md:block relative px-6 py-12">
            {/* Background passive gray path line */}
            <div className="absolute top-[52px] left-[10%] right-[10%] h-[3px] bg-white/5 rounded-full z-0" />

            {/* Glowing active connector that moves as user scrolls the section */}
            <div 
              className="absolute top-[52px] left-[10%] h-[3px] bg-gradient-to-r from-[#2EC4B6] via-[#6EE7B7] to-[#2EC4B6] rounded-full z-0 shadow-[0_0_15px_rgba(46,196,182,0.6)] transition-all duration-300"
              style={{
                width: `${timelineProgressPercent * 0.8}%` // Scales nicely from left to right bounds
              }}
            />

            {/* Steps Nodes Grid */}
            <div className="grid grid-cols-5 relative z-10">
              {workflowSteps.map((step, idx) => {
                const isActive = timelineProgressPercent >= step.threshold;
                
                return (
                  <motion.div 
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="flex flex-col items-center text-center px-4"
                  >
                    {/* Node Circle */}
                    <div 
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-[#071A14] ${
                        isActive 
                          ? 'border-[#2EC4B6] text-[#2EC4B6] shadow-[0_0_20px_rgba(46,196,182,0.5)]' 
                          : 'border-white/10 text-[#A7C4B8]'
                      }`}
                    >
                      {isActive ? (
                        <motion.div
                          initial={{ scale: 0.7 }}
                          animate={{ scale: 1 }}
                          className="w-2.5 h-2.5 rounded-full bg-[#2EC4B6]"
                        />
                      ) : (
                        <span className="text-xs font-mono font-bold">{idx + 1}</span>
                      )}
                    </div>

                    {/* Step label info */}
                    <h4 className={`mt-5 text-sm font-space font-bold transition-colors duration-500 ${
                      isActive ? 'text-[#2EC4B6]' : 'text-white'
                    }`}>
                      {step.title}
                    </h4>

                    <p className="mt-2 text-xs text-[#A7C4B8] max-w-[150px] leading-relaxed mx-auto">
                      {step.desc}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Mobile Process Timeline Layout */}
          <div className="md:hidden space-y-6 px-2">
            {workflowSteps.map((step, idx) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex gap-4 items-start"
              >
                <div className="w-8 h-8 rounded-full bg-[#10261F] border border-[#2EC4B6]/30 flex items-center justify-center text-xs font-mono font-bold text-[#2EC4B6]">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-space font-bold text-sm text-white">
                    {step.title}
                  </h4>
                  <p className="text-xs text-[#A7C4B8] mt-1 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Why Choose VERIFIED PHOTOGRAPHY Grid Section */}
        <div className="mt-32 pt-20 border-t border-white/5">
          <div className="text-center mb-16">
            <motion.h3
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-space font-bold text-[#F8FFF9]"
            >
              Why Choose VERIFIED PHOTOGRAPHY
            </motion.h3>
            <p className="text-xs md:text-sm text-[#A7C4B8] mt-2 max-w-xl mx-auto">
              We fuse cutting-edge image tech with authentic storytelling to build masterpieces.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUsData.map((card, idx) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#2EC4B6]/30 hover:bg-white/[0.03] transition-all duration-300 relative group overflow-hidden"
              >
                {/* Floating blur ball in corner of card */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-[#2EC4B6] opacity-[0.01] group-hover:opacity-[0.03] blur-xl rounded-full transition-all duration-300" />
                
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-[#2EC4B6]/10 group-hover:border-[#2EC4B6]/25 text-[#A7C4B8] group-hover:text-[#2EC4B6] inline-block mb-4 transition-all duration-300">
                  {card.icon}
                </div>

                <h4 className="text-base font-space font-bold text-[#F8FFF9] mb-2 group-hover:text-[#2EC4B6] transition-colors">
                  {card.title}
                </h4>

                <p className="text-xs md:text-sm text-[#A7C4B8] leading-relaxed">
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
