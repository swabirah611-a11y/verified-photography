import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  MapPin, 
  Calendar, 
  Award, 
  Shield, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  Eye, 
  Layers, 
  Compass, 
  User, 
  Sparkles, 
  ArrowRight,
  Bookmark,
  Zap,
  Palette,
  CloudLightning,
  MonitorPlay
} from 'lucide-react';
import { PORTFOLIO_ITEMS } from '../data';
import { PortfolioItem } from '../types';
import OptimizedImage from './OptimizedImage';
import { getExhibitions, getPortfolioItems, supabase } from '../lib/supabase';

interface PortfolioSectionProps {
  onBookSession: (sessionType: string) => void;
}

export default function PortfolioSection({ onBookSession }: PortfolioSectionProps) {
  // Dynamic portfolio items list to support admin CRUD changes
  const [activePortfolioItems, setActivePortfolioItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const exhibitions = await getExhibitions();
      
      // Filter only published exhibitions
      const published = exhibitions.filter(e => e.published);
      
      if (published.length > 0) {
        // Map to PortfolioItem format
        const mapped: PortfolioItem[] = published.map(e => ({
          id: e.id,
          title: e.title,
          category: e.category,
          location: 'Studio Capture',
          image: e.cover_image,
          description: e.description || '',
          date: e.created_at ? new Date(e.created_at).getFullYear().toString() : '2026',
          cameraSetup: 'Professional DSLR Setup'
        }));
        setActivePortfolioItems(mapped);
      } else {
        // Fallback to portfolio table if exhibition_art is empty
        const fallbackItems = await getPortfolioItems();
        setActivePortfolioItems(fallbackItems);
      }
    } catch (err: any) {
      console.warn('Failed to load exhibitions, attempting portfolio fallback:', err);
      try {
        const fallbackItems = await getPortfolioItems();
        setActivePortfolioItems(fallbackItems);
      } catch (fbErr: any) {
        console.error('Portfolio fallback failed:', fbErr);
        setError(fbErr.message || 'Error connecting to database');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();

    // 1. Listen for real-time CRUD notifications from the admin panel
    window.addEventListener('exhibitions_updated', loadItems);
    window.addEventListener('portfolio_items_updated', loadItems);

    // 2. Setup BroadcastChannel for cross-tab local updates
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('exhibitions_sync');
      channel.onmessage = (event) => {
        if (event.data === 'refresh') {
          loadItems();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported in this environment:', e);
    }

    // 3. Setup Supabase Realtime for cross-tab database-driven updates
    let realtimeSubscription: any = null;
    if (supabase) {
      try {
        realtimeSubscription = supabase
          .channel('exhibition_art_changes_public')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'exhibition_art' },
            () => {
              loadItems();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription failed:', err);
      }
    }

    return () => {
      window.removeEventListener('exhibitions_updated', loadItems);
      window.removeEventListener('portfolio_items_updated', loadItems);
      if (channel) {
        channel.close();
      }
      if (supabase && realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, []);

  // Category filter list following specifications exactly
  const categories = ['All', 'Wedding', 'Portrait', 'Graduation', 'Birthday', 'Events', 'Commercial'];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Fullscreen Viewer states
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);
  
  // Parallax camera offset tracking
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const galleryContainerRef = useRef<HTMLDivElement>(null);

  // Client-side swipe tracking for mobile fullscreen gallery
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Custom Category matching helper to link user specification to data structures
  const getFilteredItems = (): PortfolioItem[] => {
    return activePortfolioItems.filter(item => {
      if (selectedCategory === 'All') return true;
      const itemCat = (item.category || '').toLowerCase().trim();
      const filterCat = selectedCategory.toLowerCase().trim();

      if (filterCat === 'wedding' || filterCat === 'weddings') {
        return itemCat === 'weddings' || itemCat === 'wedding';
      }
      if (filterCat === 'portrait' || filterCat === 'portraits') {
        return itemCat === 'portraits' || itemCat === 'portrait';
      }
      if (filterCat === 'graduation' || filterCat === 'graduations') {
        return itemCat === 'graduations' || itemCat === 'graduation';
      }
      if (filterCat === 'birthday' || filterCat === 'birthdays') {
        return itemCat === 'birthday' || itemCat === 'birthdays' || itemCat === 'events' || itemCat === 'event' || itemCat.includes('birthday');
      }
      if (filterCat === 'events' || filterCat === 'event') {
        return itemCat === 'events' || itemCat === 'event' || itemCat === 'birthday' || itemCat === 'birthdays';
      }
      if (filterCat === 'commercial') {
        return itemCat === 'commercial';
      }
      return itemCat.includes(filterCat) || filterCat.includes(itemCat);
    });
  };

  const filteredItems = getFilteredItems();

  // Mouse move parallax movement driver for desktop gallery
  const handleGalleryMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!galleryContainerRef.current) return;
    const rect = galleryContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    
    // Smooth camera shift
    setCameraOffset({ x: x * 40, y: y * 40 });
  };

  const handleGalleryMouseLeave = () => {
    setCameraOffset({ x: 0, y: 0 });
  };

  // Keyboard controls for fullscreen lightroom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (fullscreenIdx === null) return;
      if (e.key === 'Escape') setFullscreenIdx(null);
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenIdx, filteredItems]);

  const handleNext = () => {
    if (fullscreenIdx === null || filteredItems.length === 0) return;
    setFullscreenIdx((prev) => (prev! + 1) % filteredItems.length);
  };

  const handlePrev = () => {
    if (fullscreenIdx === null || filteredItems.length === 0) return;
    setFullscreenIdx((prev) => (prev! - 1 + filteredItems.length) % filteredItems.length);
  };

  // Mobile swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || fullscreenIdx === null) return;
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 60) {
      handleNext();
      setTouchStart(null);
    } else if (diff < -60) {
      handlePrev();
      setTouchStart(null);
    }
  };

  // Pre-configured multi-depth layers layout coordinates (For Desktop 3D Suspension Simulation)
  const depthConfigurations = [
    { zIndex: 30, scale: 1.05, rot: "2deg", delay: 0.1, yFloatOffset: -8, speed: 4, depthLabel: "Front Layer" },
    { zIndex: 20, scale: 0.95, rot: "-3deg", delay: 0.25, yFloatOffset: 6, speed: 5, depthLabel: "Mid Ground" },
    { zIndex: 10, scale: 0.88, rot: "4deg", delay: 0.4, yFloatOffset: -12, speed: 6, depthLabel: "Deep Background" },
    { zIndex: 30, scale: 1.02, rot: "-2deg", delay: 0.15, yFloatOffset: 10, speed: 4.5, depthLabel: "Front Layer" },
    { zIndex: 20, scale: 0.98, rot: "1deg", delay: 0.3, yFloatOffset: -6, speed: 5.2, depthLabel: "Mid Ground" },
    { zIndex: 10, scale: 0.85, rot: "-4deg", delay: 0.5, yFloatOffset: 14, speed: 5.8, depthLabel: "Deep Background" },
  ];

  // Storytelling stages structure
  const storytellingSteps = [
    {
      step: "01",
      title: "Strategic Planning",
      icon: <Layers className="w-6 h-6 text-[#2EC4B6]" />,
      desc: "We curate visual concept boards, coordinate bespoke wardrobes, and scout breathtaking backdrops in Uromi or Ekpoma prior to the shoot.",
      color: "from-[#2EC4B6] to-[#040E0B]"
    },
    {
      step: "02",
      title: "Cinematic Shooting",
      icon: <Camera className="w-6 h-6 text-[#6EE7B7]" />,
      desc: "Executing precision shoots utilizing high-end dual Sony mirrorless hubs, ultra-sharp G-Master prime glass, and active strobe setups.",
      color: "from-[#6EE7B7] to-[#040E0B]"
    },
    {
      step: "03",
      title: "Editorial Fine-Arts",
      icon: <Palette className="w-6 h-6 text-[#2EC4B6]" />,
      desc: "Every raw shot undergoes professional color science calibration, meticulous editorial frequency separation, and contrast shaping.",
      color: "from-[#2EC4B6] to-[#040E0B]"
    },
    {
      step: "04",
      title: "Instant Heirloom Delivery",
      icon: <MonitorPlay className="w-6 h-6 text-[#6EE7B7]" />,
      desc: "Receive your final masterpieces within 5 to 7 days in a secure digital vault, with integrated commercial release files.",
      color: "from-[#6EE7B7] to-[#040E0B]"
    }
  ];

  // Testimonials with full design fidelity
  const clientHighlights = [
    {
      initials: "OI",
      name: "Dr. Osasere Imasuen",
      role: "AAU Faculty Scholar",
      service: "Graduation Fine-Art Shoot",
      quote: "The visual depth and posture calibration were extraordinary. They integrated high-end ambient studio strobe lighting with my academic robes perfectly. Absolutely magnificent experience!",
      rating: 5,
      bgGlow: "rgba(46, 196, 182, 0.05)"
    },
    {
      initials: "CA",
      name: "Mrs. Cynthia Alao",
      role: "Royal Benin Bride",
      service: "Full-Day Cultural Nuptials",
      quote: "Our traditional wedding was captured with breathtaking cultural richness. Every vibrant coral bead and emotional family tear stands out with crisp, lifelike detail in our premium photobook.",
      rating: 5,
      bgGlow: "rgba(110, 231, 183, 0.05)"
    },
    {
      initials: "EE",
      name: "Efe Eromosele",
      role: "Elite Fashion Model",
      service: "Outdoor Creative Editorial",
      quote: "Shooting in the Auchi hills with Verified Photography felt like a Vogue feature production. The composition, backlighting angles, and creative direction are completely out of this world.",
      rating: 5,
      bgGlow: "rgba(46, 196, 182, 0.05)"
    },
    {
      initials: "EA",
      name: "Chief Ehis Adesuwa",
      role: "CEO, Adesuwa Holdings",
      service: "Corporate Launch Coverage",
      quote: "Professionalism at its absolute peak. Verified Photography handled our corporate summit in Ekpoma. The fast delivery of color-graded promotional teasers left our entire board in awe.",
      rating: 5,
      bgGlow: "rgba(110, 231, 183, 0.05)"
    }
  ];

  return (
    <section 
      id="portfolio" 
      className="relative py-24 md:py-32 bg-[#051510] overflow-hidden select-none"
    >
      {/* Cinematic Background Atmosphere layers */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Soft, rolling fog highlights */}
        <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-[#2EC4B6] opacity-[0.03] blur-[150px] rounded-full" />
        <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-[#6EE7B7] opacity-[0.04] blur-[170px] rounded-full" />
        
        {/* Subtle glowing lines to simulate floating panels guide-lines */}
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#2EC4B6]/5 to-transparent" />
        <div className="absolute top-2/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#6EE7B7]/5 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* SECTION HEADER */}
        <div className="text-center mb-16 md:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/5 mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#2EC4B6] animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold">OUR PORTFOLIO</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-space font-bold tracking-tight text-[#F8FFF9]"
          >
            Moments That Speak Without <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-glow">Words</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-sm md:text-base text-[#A7C4B8] max-w-3xl mx-auto leading-relaxed font-sans"
          >
            "Every photograph tells a unique story. Explore our collection of weddings, portraits, graduations, birthdays, corporate events, and unforgettable moments captured with creativity and precision."
          </motion.p>
        </div>

        {/* GALLERY CATEGORIES / FILTER BAR */}
        <div className="flex justify-center mb-16 relative z-20">
          <div className="flex items-center gap-2 overflow-x-auto pb-4 pt-1 px-4 max-w-full scrollbar-none border-b border-white/5 md:border-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="relative px-5 py-2.5 rounded-full font-space text-xs font-semibold tracking-wide transition-all duration-300 border cursor-pointer whitespace-nowrap group"
                >
                  {/* Slider pill background */}
                  {isActive && (
                    <motion.div 
                      layoutId="activeFilterPill"
                      className="absolute inset-0 bg-[#2EC4B6] rounded-full shadow-[0_0_20px_rgba(46,196,182,0.4)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  
                  <span className={`relative z-10 transition-colors duration-300 ${
                    isActive ? 'text-[#071A14]' : 'text-[#A7C4B8] hover:text-white'
                  }`}>
                    {cat}
                  </span>

                  {/* Gentle hover border ring */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-full border border-white/5 group-hover:border-[#2EC4B6]/30 transition-colors duration-300 pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3D FLOATING GALLERY (Desktop Suspension Showcase) */}
        <div className="hidden lg:block w-full min-h-[750px] relative mt-12 mb-28">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="relative w-12 h-12 flex items-center justify-center mb-4">
                <div className="absolute inset-0 border-2 border-dashed border-[#2EC4B6]/20 rounded-full animate-spin duration-[6000ms]" />
                <Camera className="w-5 h-5 text-[#2EC4B6] animate-pulse" />
              </div>
              <span className="text-xs font-mono tracking-widest text-[#A7C4B8] uppercase">Loading digital exhibitions...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Camera className="w-8 h-8 text-red-400 mb-2" />
              <span className="text-xs font-mono text-red-400 uppercase">Failed to fetch exhibition catalog</span>
              <p className="text-xs text-[#A7C4B8] mt-2 max-w-sm mx-auto">{error}</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center border border-white/5 rounded-3xl bg-white/[0.01]">
              <Camera className="w-12 h-12 text-[#A7C4B8]/40 mb-4" />
              <h3 className="text-lg font-space font-bold text-white mb-2">No Curated Masterpieces</h3>
              <p className="text-xs text-[#A7C4B8] max-w-sm mx-auto leading-relaxed">
                The digital vault has no published pieces under this category yet.
              </p>
            </div>
          ) : (
            <>
              <div className="absolute -top-10 left-4 text-[10px] font-mono tracking-wider text-[#2EC4B6]/60 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#2EC4B6]" />
                <span>INTERACTIVE CAMERA PARALLAX: HOVER & MOVE CURSOR ACROSS SPACE</span>
              </div>

              <motion.div
                ref={galleryContainerRef}
                onMouseMove={handleGalleryMouseMove}
                onMouseLeave={handleGalleryMouseLeave}
                style={{
                  x: cameraOffset.x,
                  y: cameraOffset.y,
                }}
                transition={{ type: "spring", stiffness: 90, damping: 22 }}
                className="w-full h-full relative grid grid-cols-3 gap-y-12 gap-x-8 px-6"
              >
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, idx) => {
                    // Fetch pre-configured layers details to apply high-end visual physics
                    const layoutDetail = depthConfigurations[idx % depthConfigurations.length];
                    
                    return (
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8, y: 40 }}
                        animate={{ 
                          opacity: 1, 
                          scale: layoutDetail.scale, 
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.7, y: -40 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 100, 
                          damping: 18,
                          delay: idx * 0.05 
                        }}
                        style={{
                          zIndex: layoutDetail.zIndex,
                        }}
                        className="relative group cursor-pointer"
                        onClick={() => {
                          const absoluteIdx = filteredItems.findIndex(f => f.id === item.id);
                          setFullscreenIdx(absoluteIdx);
                        }}
                      >
                    {/* Independent floating wrapper */}
                    <motion.div
                      animate={{
                        y: [0, layoutDetail.yFloatOffset, 0],
                      }}
                      transition={{
                        duration: layoutDetail.speed,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: layoutDetail.delay
                      }}
                      className="w-full h-[360px] rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-md overflow-hidden relative shadow-2xl transition-all duration-500 group-hover:border-[#2EC4B6]/50 group-hover:shadow-[0_0_35px_rgba(46,196,182,0.2)]"
                    >
                      {/* Premium Glass reflection effect */}
                      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
                        <div className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
                      </div>

                      {/* Image Frame */}
                      <div className="w-full h-full relative overflow-hidden">
                        <OptimizedImage
                          src={item.image}
                          alt={item.title}
                          className="group-hover:scale-105 transition-transform duration-700 ease-out"
                        />
                        
                        {/* Interactive Dark Cinematic Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#040E0B]/95 via-[#040E0B]/35 to-transparent opacity-85 group-hover:opacity-90 transition-opacity duration-300" />
                      </div>

                      {/* Floating Micro Depth Badge indicators */}
                      <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <span className="text-[9px] font-mono tracking-widest text-[#2EC4B6] bg-[#071A14]/80 border border-[#2EC4B6]/25 px-2 py-0.5 rounded uppercase font-semibold">
                          {item.category}
                        </span>
                        <span className="text-[9px] font-mono text-[#A7C4B8] bg-black/40 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {layoutDetail.depthLabel}
                        </span>
                      </div>

                      {/* Location Badge */}
                      <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-5px] group-hover:translate-y-0 flex items-center gap-1 bg-black/40 px-2.5 py-0.5 rounded-full border border-white/10 text-[9px] font-mono text-[#A7C4B8]">
                        <MapPin className="w-3 h-3 text-[#2EC4B6]" />
                        <span>{item.location}</span>
                      </div>

                      {/* Interactive Hover Content layer */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex flex-col justify-end">
                        {/* Title */}
                        <h3 className="text-base font-space font-bold text-[#F8FFF9] mb-2 group-hover:text-[#2EC4B6] transition-colors duration-300">
                          {item.title}
                        </h3>

                        {/* Description (collapses gracefully) */}
                        <p className="text-xs text-[#A7C4B8] leading-relaxed line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-3 group-hover:translate-y-0">
                          {item.description}
                        </p>

                        {/* Interactive Details footer */}
                        <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-3 group-hover:translate-y-0 delay-75">
                          <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#6EE7B7]">
                            <User className="w-3.5 h-3.5 text-[#2EC4B6]" />
                            <span>VERIFIED ARTIST</span>
                          </div>
                          
                          <div className="inline-flex items-center gap-1.5 text-[10px] font-space font-bold text-white bg-[#2EC4B6]/20 border border-[#2EC4B6]/40 px-3 py-1 rounded-lg shadow-inner">
                            <span>View Project</span>
                            <Eye className="w-3.5 h-3.5 text-[#2EC4B6]" />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Empty state within the grid */}
          {filteredItems.length === 0 && (
            <div className="text-center py-24 bg-white/[0.01] rounded-2xl border border-white/5 backdrop-blur-md">
              <Camera className="w-12 h-12 text-[#A7C4B8]/40 mx-auto mb-4" />
              <h3 className="text-lg font-space font-bold text-white mb-2">No Pieces Found Under This Category</h3>
              <p className="text-xs text-[#A7C4B8] max-w-sm mx-auto leading-relaxed">
                We are actively updating our digital vault with fresh masterpiece logs. Select another exhibition filter category above.
              </p>
            </div>
          )}
          </>)}
        </div>

        {/* MOBILE & TABLET CAROUSEL (Touch Optimized Swiper) */}
        <div className="lg:hidden w-full mb-20 relative px-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative w-10 h-10 flex items-center justify-center mb-3">
                <div className="absolute inset-0 border border-dashed border-[#2EC4B6]/20 rounded-full animate-spin duration-[6000ms]" />
                <Camera className="w-4 h-4 text-[#2EC4B6] animate-pulse" />
              </div>
              <span className="text-[10px] font-mono tracking-widest text-[#A7C4B8] uppercase">Loading digital exhibitions...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Camera className="w-6 h-6 text-red-400 mb-2" />
              <span className="text-[10px] font-mono text-red-400 uppercase">Failed to fetch catalog</span>
              <p className="text-[10px] text-[#A7C4B8] mt-1 max-w-sm mx-auto">{error}</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="overflow-hidden relative rounded-3xl backdrop-blur-md border border-white/5 bg-white/[0.01] p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2EC4B6] animate-pulse" />
                  <span className="text-[10px] font-mono tracking-widest text-[#A7C4B8] uppercase">Swipe to navigate</span>
                </div>
                <span className="text-[10px] font-mono text-[#2EC4B6]">
                  {filteredItems.length} pieces found
                </span>
              </div>

              {/* Grid layout for robust performance and ease of scrolling */}
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredItems.map((item, idx) => (
                  <div 
                    key={item.id}
                    onClick={() => setFullscreenIdx(idx)}
                    className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0a1f18] h-[250px] cursor-pointer"
                  >
                    <OptimizedImage
                      src={item.image}
                      alt={item.title}
                    />
                    
                    {/* Mobile Card Text elements */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                      <div className="flex gap-2 mb-1.5">
                        <span className="text-[8px] font-mono tracking-widest text-[#2EC4B6] bg-black/40 border border-[#2EC4B6]/25 px-2 py-0.5 rounded uppercase font-bold">
                          {item.category}
                        </span>
                        <span className="text-[8px] font-mono text-[#A7C4B8] flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5 text-[#2EC4B6]" /> {item.location}
                        </span>
                      </div>
                      <h3 className="text-sm font-space font-bold text-[#F8FFF9] leading-tight">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white/[0.01] rounded-2xl border border-white/5">
              <Camera className="w-10 h-10 text-[#A7C4B8]/40 mx-auto mb-3" />
              <h3 className="text-sm font-space font-bold text-white mb-1">No Pieces Under This Collection</h3>
              <p className="text-[11px] text-[#A7C4B8]">Please try another filter category above.</p>
            </div>
          )}
        </div>


        {/* FEATURED PROJECT SHOWCASE */}
        <div className="mt-24 md:mt-32 pt-20 border-t border-white/5 relative">
          
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono tracking-widest text-[#2EC4B6] uppercase bg-white/[0.02] border border-white/5 px-3 py-1 rounded-full font-semibold">
              SIGNATURE VAULT HEADLINER
            </span>
            <h3 className="text-2xl md:text-3xl font-space font-bold text-[#F8FFF9] mt-3">
              Featured Project Showcase
            </h3>
            <p className="text-xs md:text-sm text-[#A7C4B8] mt-2 max-w-xl mx-auto">
              A deep investigative look into our masterclass productions, showcasing pristine equipment configurations and creative storytelling workflows.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 md:gap-12 items-center">
            
            {/* Left Side: Cinematic image with layered depth */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              
              {/* Back Layer accent glass frame */}
              <div className="absolute -bottom-6 -left-6 w-full h-full bg-[#10261F]/40 border border-white/5 rounded-3xl z-0 transform -rotate-2 scale-[0.98]" />
              
              {/* Main Image Layer */}
              <div className="relative z-10 w-full h-[320px] sm:h-[400px] md:h-[450px] rounded-3xl overflow-hidden border border-[#2EC4B6]/30 shadow-2xl group">
                <OptimizedImage
                  src="/src/assets/images/nigerian_traditional_wedding_1784211187352.jpg"
                  alt="Royal Benin Traditional Showcase"
                />
                
                {/* Micro focus elements overlays */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-mono text-[#F8FFF9]">
                  <Sparkles className="w-3.5 h-3.5 text-[#2EC4B6] animate-spin-ultra-slow" />
                  <span>CRAFTED IN ROYAL UROMI</span>
                </div>
              </div>

              {/* Overlapping smaller details panel to create real layered depth */}
              <div className="absolute -bottom-6 -right-4 w-44 h-44 rounded-2xl overflow-hidden border border-[#6EE7B7]/40 shadow-2xl z-20 hidden sm:block transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <OptimizedImage
                  src="/src/assets/images/graduation_portrait_ekpoma_1784211201712.jpg"
                  alt="AAU Ekpoma Portrait detail"
                />
              </div>

            </div>

            {/* Right Side: Project Details inside a premium glass card */}
            <div className="lg:col-span-6">
              <div className="p-8 md:p-10 rounded-3xl bg-white/[0.01] border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden">
                {/* Decorative glow corner indicator */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#2EC4B6]/5 blur-2xl rounded-full" />

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[10px] font-mono text-[#2EC4B6] tracking-widest uppercase font-bold px-2.5 py-1 rounded bg-[#2EC4B6]/10 border border-[#2EC4B6]/20">
                    EXHIBITION LEADER
                  </span>
                  <span className="text-[10px] font-mono text-[#A7C4B8] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#2EC4B6]" /> Dec 2025
                  </span>
                </div>

                <h4 className="text-2xl md:text-3xl font-space font-bold text-white mb-6">
                  The Royal Benin Nuptials
                </h4>

                {/* Grid properties list */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 mb-8 text-xs pb-6 border-b border-white/5">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#A7C4B8] block">Focus Category:</span>
                    <span className="font-space font-bold text-white mt-1 block">Traditional Weddings</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#A7C4B8] block">Exhibition Location:</span>
                    <span className="font-space font-semibold text-white mt-1 block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#2EC4B6]" /> Uromi, Edo State
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#A7C4B8] block">Photography Style:</span>
                    <span className="font-space font-medium text-white mt-1 block">Cinematic Fine-Art</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono uppercase text-[#A7C4B8] block">Premium Equipment Setup:</span>
                    <span className="font-mono text-[#6EE7B7] mt-1 block font-semibold">
                      Sony A7R V + 85mm f/1.4 GM
                    </span>
                  </div>
                </div>

                {/* Brief story content */}
                <div className="mb-8">
                  <span className="text-[9px] font-mono uppercase text-[#A7C4B8] block mb-2">The Production Narrative:</span>
                  <p className="text-xs md:text-sm text-[#A7C4B8] leading-relaxed">
                    A grand, color-accurate celebration of love and royal culture in Esan land. Our objective was to capture authentic emotions, high-energy wedding choreography, and complex textures of traditional coral beaded crowns with absolute fidelity. Utilizing multi-point high-speed strobe synchronization, we produced raw canvases formatted cleanly for lifelong museum-quality heirlooms.
                  </p>
                </div>

                {/* View Full Gallery scroll button */}
                <button
                  onClick={() => {
                    const headerEl = document.getElementById('portfolio');
                    if (headerEl) {
                      headerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#2EC4B6] text-[#071A14] font-space font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(46,196,182,0.3)] hover:shadow-[0_0_30px_rgba(46,196,182,0.5)] transition-all uppercase tracking-wider"
                >
                  <span>Explore Exhibition Grid</span>
                  <ArrowRight className="w-4 h-4 text-[#071A14]" />
                </button>

              </div>
            </div>

          </div>
        </div>


        {/* BEHIND THE LENS STORYTELLING FLOW */}
        <div className="mt-32 pt-20 border-t border-white/5 relative">
          
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold">STUDIO ETHOS</span>
            <h3 className="text-2xl md:text-3xl font-space font-bold text-[#F8FFF9] mt-3">
              Behind the Lens Workflow
            </h3>
            <p className="text-xs md:text-sm text-[#A7C4B8] mt-2 max-w-xl mx-auto">
              How we construct absolute masterworks. We follow a highly calculated, cinematic production chain to guarantee breathtaking results.
            </p>
          </div>

          <div className="relative">
            {/* Horizontal glowing progress line connector (Desktop only) */}
            <div className="absolute top-[80px] left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-[#2EC4B6] via-[#6EE7B7] to-[#2EC4B6] opacity-30 rounded-full hidden md:block" />
            <div className="absolute top-[80px] left-[12%] w-[76%] h-[2px] bg-gradient-to-r from-[#2EC4B6] via-[#6EE7B7] to-transparent rounded-full shadow-[0_0_10px_rgba(46,196,182,0.6)] hidden md:block animate-pulse" />

            <div className="grid md:grid-cols-4 gap-8 relative z-10">
              {storytellingSteps.map((step, sIdx) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: sIdx * 0.1 }}
                  className="group relative flex flex-col items-center md:items-start text-center md:text-left p-6 rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-md hover:border-[#2EC4B6]/30 hover:bg-white/[0.03] transition-all duration-300"
                >
                  {/* Floating light blob behind on hover */}
                  <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[#2EC4B6]/5 opacity-0 group-hover:opacity-100 blur-2xl rounded-full transition-opacity duration-500" />

                  {/* Step counter badge */}
                  <div className="absolute top-4 right-4 text-xs font-mono font-bold text-white/15 group-hover:text-[#2EC4B6]/30 transition-colors">
                    {step.step}
                  </div>

                  {/* Icon wrap */}
                  <div className="w-14 h-14 rounded-xl bg-[#10261F] border border-white/5 flex items-center justify-center text-[#2EC4B6] mb-5 group-hover:bg-[#2EC4B6]/10 group-hover:border-[#2EC4B6]/30 group-hover:shadow-[0_0_15px_rgba(46,196,182,0.2)] transition-all duration-300">
                    {step.icon}
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-space font-bold text-white mb-2.5 group-hover:text-[#2EC4B6] transition-colors">
                    {step.title}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-[#A7C4B8] leading-relaxed">
                    {step.desc}
                  </p>

                </motion.div>
              ))}
            </div>
          </div>

        </div>


        {/* CLIENT HIGHLIGHTS TESTIMONIALS */}
        <div className="mt-32 pt-20 border-t border-white/5 relative">
          
          <div className="text-center mb-16">
            <span className="text-[10px] font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold">TESTIMONIALS</span>
            <h3 className="text-2xl md:text-3xl font-space font-bold text-[#F8FFF9] mt-3">
              Stories Shared by Verified Clients
            </h3>
            <p className="text-xs md:text-sm text-[#A7C4B8] mt-2 max-w-xl mx-auto">
              Real voices from Ekpoma, Uromi, Auchi, and surrounding hubs celebrating academic, wedding, and corporate triumphs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {clientHighlights.map((client, idx) => (
              <motion.div
                key={client.name}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 backdrop-blur-md relative overflow-hidden transition-all duration-300 flex flex-col justify-between"
                style={{
                  boxShadow: `0 10px 30px -15px ${idx % 2 === 0 ? 'rgba(46,196,182,0.2)' : 'rgba(110,231,183,0.2)'}`
                }}
              >
                {/* Visual light accent ball in corner */}
                <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-[0.02] blur-xl" style={{ backgroundColor: idx % 2 === 0 ? '#2EC4B6' : '#6EE7B7' }} />

                <div>
                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-5">
                    {Array.from({ length: client.rating }).map((_, rIdx) => (
                      <Star key={rIdx} className="w-3.5 h-3.5 fill-[#2EC4B6] text-[#2EC4B6]" />
                    ))}
                  </div>

                  {/* Testimonial Quote */}
                  <p className="text-xs md:text-sm text-[#A7C4B8] leading-relaxed italic mb-6">
                    "{client.quote}"
                  </p>
                </div>

                {/* Client Meta card details */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  {/* Monogram placeholder */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10261F] to-[#040E0B] border border-[#2EC4B6]/20 flex items-center justify-center font-space font-bold text-xs text-[#2EC4B6]">
                    {client.initials}
                  </div>
                  <div>
                    <h5 className="text-xs font-space font-bold text-white">
                      {client.name}
                    </h5>
                    <span className="text-[9px] font-mono text-[#A7C4B8] block mt-0.5">
                      {client.role}
                    </span>
                    <span className="text-[8px] font-mono text-[#2EC4B6] tracking-wider uppercase font-bold block mt-0.5">
                      {client.service}
                    </span>
                  </div>
                </div>

              </motion.div>
            ))}
          </div>

        </div>

      </div>

      {/* FULLSCREEN LIGHTROOM VIEWER */}
      <AnimatePresence>
        {fullscreenIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 bg-black/95 backdrop-blur-2xl"
            onContextMenu={(e) => e.preventDefault()} // Block download
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            {/* Header control strip */}
            <div className="w-full flex justify-between items-center max-w-7xl mx-auto py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[#2EC4B6] tracking-widest uppercase font-bold bg-[#2EC4B6]/10 px-2.5 py-1 rounded border border-[#2EC4B6]/25">
                  Exhibition Mode
                </span>
                <span className="text-xs font-mono text-[#A7C4B8]">
                  Piece {fullscreenIdx + 1} of {filteredItems.length}
                </span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setFullscreenIdx(null)}
                className="p-2.5 rounded-full bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-[#A7C4B8] border border-white/10 hover:border-red-500/25 transition-all"
                aria-label="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immersive Center Showcase */}
            <div className="relative flex-1 w-full flex items-center justify-center max-w-5xl mx-auto my-4">
              
              {/* Previous Slider Action arrow button (Desktop Only) */}
              <button
                onClick={handlePrev}
                className="absolute left-4 z-30 p-3.5 rounded-full bg-black/60 hover:bg-white/10 text-white border border-white/10 transition-all hidden sm:block"
                aria-label="Previous frame"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Central Frame Zoom & Slide wrapper */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={fullscreenIdx}
                  initial={{ opacity: 0, scale: 0.95, z: -50 }}
                  animate={{ opacity: 1, scale: 1, z: 0 }}
                  exit={{ opacity: 0, scale: 0.95, z: -50 }}
                  transition={{ duration: 0.4 }}
                  className="relative w-full max-h-[70vh] flex items-center justify-center select-none"
                >
                  <img
                    src={filteredItems[fullscreenIdx].image}
                    alt={filteredItems[fullscreenIdx].title}
                    referrerPolicy="no-referrer"
                    draggable={false} // Disable dragging
                    onContextMenu={(e) => e.preventDefault()} // Disable right click saving
                    className="max-w-full max-h-[70vh] object-contain rounded-2xl border border-white/10 shadow-2xl select-none"
                  />
                  {/* Anti-save overlay block */}
                  <div className="absolute inset-0 z-10 pointer-events-auto" onContextMenu={(e) => e.preventDefault()} />
                </motion.div>
              </AnimatePresence>

              {/* Next Slider Action arrow button (Desktop Only) */}
              <button
                onClick={handleNext}
                className="absolute right-4 z-30 p-3.5 rounded-full bg-black/60 hover:bg-white/10 text-white border border-white/10 transition-all hidden sm:block"
                aria-label="Next frame"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

            </div>

            {/* Footer metadata sheet */}
            <div className="w-full max-w-3xl mx-auto bg-white/[0.01] border border-white/5 p-5 rounded-2xl mb-4 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] font-mono text-[#2EC4B6] font-bold tracking-widest uppercase bg-[#2EC4B6]/10 border border-[#2EC4B6]/20 px-2 py-0.5 rounded">
                      {filteredItems[fullscreenIdx].category}
                    </span>
                    <span className="text-[10px] font-mono text-[#A7C4B8] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#2EC4B6]" /> {filteredItems[fullscreenIdx].location}
                    </span>
                  </div>
                  <h4 className="text-base font-space font-bold text-white">
                    {filteredItems[fullscreenIdx].title}
                  </h4>
                  <p className="text-xs text-[#A7C4B8] leading-relaxed mt-1 max-w-xl">
                    {filteredItems[fullscreenIdx].description}
                  </p>
                </div>

                <div className="w-full sm:w-auto flex flex-col sm:items-end gap-1.5">
                  <span className="text-[9px] font-mono uppercase text-[#A7C4B8]">RAW RIG CONFIGURATION:</span>
                  <div className="font-mono text-xs text-[#6EE7B7] bg-white/[0.03] px-3 py-1.5 rounded border border-white/5 font-semibold">
                    {filteredItems[fullscreenIdx].cameraSetup || "Sony Custom G-Master"}
                  </div>
                  <button
                    onClick={() => {
                      const selectedType = filteredItems[fullscreenIdx].category;
                      setFullscreenIdx(null);
                      onBookSession(selectedType);
                    }}
                    className="mt-1 px-5 py-2 rounded-lg bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-[10px] transition-all uppercase tracking-wider text-center"
                  >
                    Book Similar Session
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
