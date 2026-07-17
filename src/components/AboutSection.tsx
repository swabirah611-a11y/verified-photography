import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { CmsConfig } from '../lib/supabase';
import * as Icons from 'lucide-react';
import { Sparkles, CheckCircle } from 'lucide-react';
import EditableText from './EditableText';

// Reusable CountUp component with IntersectionObserver to animate numbers from 0 when visible
function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLSpanElement>(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    let observer: IntersectionObserver;
    let startTimestamp: number | null = null;
    const duration = 2000; // 2 seconds

    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutQuad
      const easeProgress = progress * (2 - progress);
      setCount(Math.floor(easeProgress * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    if (elementRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !animatedRef.current) {
            animatedRef.current = true;
            requestAnimationFrame(animate);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(elementRef.current);
    }

    return () => {
      if (observer) observer.disconnect();
    };
  }, [value]);

  return <span ref={elementRef}>{count.toLocaleString()}{suffix}</span>;
}

interface AboutSectionProps {
  cmsConfig?: CmsConfig;
  isVisualEditMode?: boolean;
  onUpdateAboutField?: (field: string, value: string) => void;
}

export default function AboutSection({
  cmsConfig,
  isVisualEditMode = false,
  onUpdateAboutField,
}: AboutSectionProps) {
  // Parallax mouse position state for Left Column
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const galleryContainerRef = useRef<HTMLDivElement>(null);

  // Active step state for Interactive Timeline
  const [activeTimelineStep, setActiveTimelineStep] = useState(2); // Start with third step highlit for display
  const timelineSectionRef = useRef<HTMLDivElement>(null);

  // Background parallax scroll tracking
  const backgroundRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: backgroundRef,
    offset: ["start end", "end start"]
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const handleGalleryMouseMove = (e: React.MouseEvent) => {
    if (!galleryContainerRef.current) return;
    const rect = galleryContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    setMousePos({ x, y });
  };

  const handleGalleryMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Photography Categories/Frames
  const galleryFrames = [
    {
      title: 'Wedding Photography',
      image: '/src/assets/images/nigerian_traditional_wedding_1784211187352.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800',
      xOffset: -120,
      yOffset: -100,
      rotate: -8,
      depth: 1.4,
      borderColor: 'border-[#2EC4B6]/20 hover:border-[#2EC4B6]/80',
      zIndex: 10
    },
    {
      title: 'Portrait Photography',
      image: '/src/assets/images/fashion_editorial_auchi_1784211215673.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      xOffset: 140,
      yOffset: -140,
      rotate: 10,
      depth: 0.9,
      borderColor: 'border-[#34D399]/20 hover:border-[#34D399]/80',
      zIndex: 5
    },
    {
      title: 'Graduation Photography',
      image: '/src/assets/images/graduation_portrait_ekpoma_1784211201712.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800',
      xOffset: -150,
      yOffset: 110,
      rotate: 6,
      depth: 1.8,
      borderColor: 'border-[#6EE7B7]/20 hover:border-[#6EE7B7]/80',
      zIndex: 12
    },
    {
      title: 'Birthday Photography',
      image: '/src/assets/images/event_celebration_uromi_1784211232313.jpg',
      fallbackImage: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80&w=800',
      xOffset: 150,
      yOffset: 90,
      rotate: -6,
      depth: 1.2,
      borderColor: 'border-[#10B981]/20 hover:border-[#10B981]/80',
      zIndex: 15
    },
    {
      title: 'Event Photography',
      image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800',
      fallbackImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=800',
      xOffset: 0,
      yOffset: -20,
      rotate: 2,
      depth: 2.2,
      borderColor: 'border-[#2EC4B6]/30 hover:border-[#2EC4B6]/90',
      zIndex: 8
    },
    {
      title: 'Commercial Photography',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
      fallbackImage: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=800',
      xOffset: 10,
      yOffset: 180,
      rotate: -4,
      depth: 0.6,
      borderColor: 'border-[#059669]/20 hover:border-[#059669]/80',
      zIndex: 6
    }
  ];

  // Feature Cards
  const featureCards = (cmsConfig?.about?.features || [
    { title: 'Professional Photography', desc: 'Creative storytelling through every photograph.', iconName: 'Camera' },
    { title: 'Professional Editing', desc: 'High-end color grading and cinematic retouching.', iconName: 'Palette' },
    { title: 'Fast Delivery', desc: 'Timely delivery without compromising quality.', iconName: 'Zap' },
    { title: 'Client Satisfaction', desc: 'Every client receives a personalized photography experience.', iconName: 'Heart' }
  ]).map(card => {
    const IconComponent = (Icons as any)[card.iconName] || Icons.Camera;
    return {
      title: card.title,
      desc: card.desc,
      icon: <IconComponent className="w-6 h-6 text-[#2EC4B6]" />
    };
  });

  // Stats Data
  const statsData = cmsConfig?.about?.stats || [
    { value: 500, suffix: '+', label: 'Happy Clients' },
    { value: 1200, suffix: '+', label: 'Projects Completed' },
    { value: 6, suffix: '+', label: 'Years of Experience' },
    { value: 100, suffix: '%', label: 'Client Satisfaction' }
  ];

  // Timeline Steps
  const timelineSteps = cmsConfig?.about?.timeline || [
    { title: 'Consultation', desc: 'Understanding your unique story, goals, and ideal visual vibes.' },
    { title: 'Planning', desc: 'Selecting pristine backdrops, coordinating wardrobes, and crafting moodboards.' },
    { title: 'Photoshoot', desc: 'High-concept execution with state-of-the-art cinematic lighting rigs.' },
    { title: 'Professional Editing', desc: 'Custom color science, micro-retouching, and meticulous grading.' },
    { title: 'Delivery', desc: 'Secure, breathtaking private digital gallery vault & custom legacy frames.' }
  ];

  return (
    <section id="about" ref={backgroundRef} className="relative py-24 md:py-32 overflow-hidden bg-[#071A14]">
      {/* Cinematic Background Elements */}
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] bg-[#2EC4B6] opacity-[0.05] blur-[150px] rounded-full" />
        <div className="absolute bottom-[15%] right-[-10%] w-[500px] h-[500px] bg-[#6EE7B7] opacity-[0.03] blur-[130px] rounded-full" />
        <div className="absolute top-[40%] left-[30%] w-[350px] h-[350px] bg-[#059669] opacity-[0.02] blur-[110px] rounded-full" />
        
        {/* Subtle cinematic light ray simulated lines */}
        <div className="absolute top-20 left-1/4 w-px h-96 bg-gradient-to-b from-transparent via-[#2EC4B6]/10 to-transparent rotate-[25deg]" />
        <div className="absolute bottom-40 right-1/4 w-px h-[500px] bg-gradient-to-b from-transparent via-white/5 to-transparent rotate-[-15deg]" />

        {/* Floating dust particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20 blur-[1px]"
            style={{
              width: `${Math.random() * 3 + 2}px`,
              height: `${Math.random() * 3 + 2}px`,
              top: `${Math.random() * 90 + 5}%`,
              left: `${Math.random() * 95}%`,
              animation: `dust-drift ${15 + Math.random() * 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </motion.div>

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
            <EditableText
              value={cmsConfig?.about?.title || 'Who We Are'}
              isEditable={isVisualEditMode}
              onSave={(val) => onUpdateAboutField?.('title', val)}
              className="text-xs font-mono tracking-widest text-[#2EC4B6] uppercase font-semibold"
            />
          </motion.div>
 
           <motion.h2
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6, delay: 0.1 }}
             className="text-4xl md:text-5xl lg:text-6xl font-space font-bold tracking-tight text-[#F8FFF9]"
           >
             <EditableText
               value={cmsConfig?.about?.heading || 'Every Frame Tells a'}
               isEditable={isVisualEditMode}
               onSave={(val) => onUpdateAboutField?.('heading', val)}
             />{' '}
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-glow">
               <EditableText
                 value={cmsConfig?.about?.headingHighlight || 'Story'}
                 isEditable={isVisualEditMode}
                 onSave={(val) => onUpdateAboutField?.('headingHighlight', val)}
               />
             </span>
           </motion.h2>
 
           <div className="mt-6 max-w-3xl mx-auto">
             <EditableText
               value={cmsConfig?.about?.description || "At VERIFIED PHOTOGRAPHY, we believe every smile, celebration, and milestone deserves to be preserved with creativity and authenticity. We don't simply take pictures, we capture emotions, stories, and memories that last a lifetime."}
               isEditable={isVisualEditMode}
               multiline={true}
               onSave={(val) => onUpdateAboutField?.('description', val)}
               className="text-base md:text-lg text-[#A7C4B8] leading-relaxed"
             />
           </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Interactive 3D layered photography gallery */}
          <div className="lg:col-span-6 flex justify-center items-center h-[520px] md:h-[600px] relative w-full overflow-visible">
            <div
              id="interactive-gallery-container"
              ref={galleryContainerRef}
              onMouseMove={handleGalleryMouseMove}
              onMouseLeave={handleGalleryMouseLeave}
              className="relative w-full h-full flex items-center justify-center cursor-default"
            >
              {/* Central base visual representation anchor */}
              <div className="absolute w-48 h-48 bg-gradient-to-r from-[#2EC4B6]/10 to-[#6EE7B7]/10 rounded-full blur-[80px] pointer-events-none" />

              {/* Layered Floating Glass Photo Frames */}
              {galleryFrames.map((frame, index) => {
                // Calculate dynamic interactive movement based on cursor, custom multiplier (depth)
                const currentX = mousePos.x * 60 * frame.depth;
                const currentY = mousePos.y * 60 * frame.depth;

                return (
                  <motion.div
                    key={frame.title}
                    className="absolute rounded-2xl overflow-hidden glass p-2 w-[160px] h-[210px] md:w-[210px] md:h-[270px] shadow-2xl transition-shadow duration-300 group"
                    style={{
                      transformStyle: 'preserve-3d',
                      zIndex: frame.zIndex || (index + 2)
                    }}
                    initial={{
                      opacity: 0,
                      scale: 0.8,
                      x: frame.xOffset * 0.8,
                      y: frame.yOffset * 0.8,
                      rotate: frame.rotate
                    }}
                    whileInView={{
                      opacity: 1,
                      scale: 1,
                      x: frame.xOffset,
                      y: frame.yOffset,
                      rotate: frame.rotate
                    }}
                    viewport={{ once: true }}
                    animate={{
                      // Interactive shifting combined with gentle floating keyframes
                      x: [
                        frame.xOffset + currentX,
                        frame.xOffset + currentX + (Math.sin(index + Date.now() / 1500) * 6),
                        frame.xOffset + currentX
                      ],
                      y: [
                        frame.yOffset + currentY,
                        frame.yOffset + currentY + (Math.cos(index + Date.now() / 1500) * 8),
                        frame.yOffset + currentY
                      ],
                      rotate: [
                        frame.rotate,
                        frame.rotate + (Math.sin(index + Date.now() / 2000) * 2),
                        frame.rotate
                      ]
                    }}
                    transition={{
                      x: { duration: 4, ease: "linear", repeat: Infinity },
                      y: { duration: 4, ease: "linear", repeat: Infinity },
                      rotate: { duration: 5, ease: "linear", repeat: Infinity },
                      scale: { duration: 0.3 }
                    }}
                    whileHover={{
                      scale: 1.15,
                      zIndex: 40,
                      boxShadow: '0 25px 50px -12px rgba(46, 196, 182, 0.4)'
                    }}
                  >
                    {/* Teal Edge glowing border wrapper */}
                    <div className={`absolute inset-0 rounded-2xl border ${frame.borderColor} transition-colors duration-300 z-30 pointer-events-none`} />

                    {/* Image Container with high quality visuals */}
                    <div className="relative w-full h-full rounded-xl overflow-hidden bg-[#10261F]">
                      <img
                        src={frame.image}
                        alt={frame.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // Fallback in case local file doesn't load
                          const img = e.currentTarget;
                          img.src = frame.fallbackImage;
                        }}
                      />
                      
                      {/* Dark overlay that fades out on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-300" />

                      {/* Cinematic Light Sweep Overlay */}
                      <div className="absolute inset-0 z-20 overflow-hidden pointer-events-none">
                        <motion.div
                          className="absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-25"
                          initial={{ left: '-150%' }}
                          whileHover={{ left: '150%' }}
                          transition={{ duration: 1.2, ease: "easeInOut" }}
                        />
                      </div>

                      {/* Frame Label */}
                      <div className="absolute bottom-3 left-3 right-3 z-10">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#2EC4B6] block mb-0.5">Category</span>
                        <h4 className="text-xs md:text-sm font-space font-bold text-white leading-tight drop-shadow-md">
                          {frame.title}
                        </h4>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Decorative cinematic dust line vectors */}
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[120%] h-px bg-gradient-to-r from-transparent via-[#2EC4B6]/15 to-transparent rotate-[15deg]" />
                <div className="w-[120%] h-px bg-gradient-to-r from-transparent via-white/5 to-transparent rotate-[-15deg]" />
              </div>
            </div>
          </div>

          {/* Right Column: Brand story inside premium glass card */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            
            {/* Main Brand Story Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="p-8 md:p-10 rounded-3xl bg-white/[0.02] border border-white/5 backdrop-blur-md shadow-2xl relative overflow-hidden mb-10"
            >
              {/* Glowing accent border in corner */}
              <div className="absolute top-0 right-0 w-24 h-px bg-gradient-to-l from-[#2EC4B6]/50 to-transparent" />
              <div className="absolute top-0 right-0 h-24 w-px bg-gradient-to-b from-[#2EC4B6]/50 to-transparent" />
              
              <h3 className="text-2xl font-space font-bold text-[#F8FFF9] mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#2EC4B6]" />
                Preserving Heritage and Innovation
              </h3>
              
              <p className="text-sm md:text-base text-[#A7C4B8] leading-relaxed mb-4">
                Operating with state-of-the-art creative hubs in <strong>Uromi</strong>, <strong>Ekpoma</strong>, and <strong>Auchi</strong>, our vision is built on combining raw human emotion with high-contrast cinematic lighting and meticulous color grading.
              </p>
              <p className="text-sm md:text-base text-[#A7C4B8] leading-relaxed">
                Whether capturing the proud strides of an Ambrose Alli University scholar, the traditional elegance of Esan marriage ceremonies, or high-concept commercial portraits, we translate your precious milestones into timeless museum-grade heirloom art.
              </p>
            </motion.div>

            {/* Feature Cards Grid (Animated & Staggered) */}
            <div className="grid sm:grid-cols-2 gap-4">
              {featureCards.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  whileHover={{ y: -5 }}
                  className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#2EC4B6]/30 hover:bg-white/[0.03] transition-all duration-300 relative group overflow-hidden"
                >
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#2EC4B6] opacity-[0.01] group-hover:opacity-[0.03] blur-xl rounded-full transition-all duration-300" />
                  
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 group-hover:bg-[#2EC4B6]/10 group-hover:border-[#2EC4B6]/30 transition-all duration-300">
                      {card.icon}
                    </div>
                    <div>
                      <h4 className="text-sm md:text-base font-space font-bold text-[#F8FFF9] mb-1 group-hover:text-[#2EC4B6] transition-colors">
                        {card.title}
                      </h4>
                      <p className="text-xs md:text-sm text-[#A7C4B8] leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>

        </div>

        {/* Statistics Section */}
        <div className="mt-24 md:mt-32 pt-16 border-t border-white/5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {statsData.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="p-6 md:p-8 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#2EC4B6]/25 backdrop-blur-sm text-center relative overflow-hidden group transition-all duration-300"
              >
                {/* Micro glowing bottom line */}
                <div className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-[#2EC4B6]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="text-3xl md:text-5xl font-space font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] text-glow mb-2">
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs md:text-sm font-mono tracking-wider text-[#A7C4B8] uppercase group-hover:text-[#F8FFF9] transition-colors">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Interactive Timeline Journey */}
        <div ref={timelineSectionRef} className="mt-28 md:mt-36 pt-16 border-t border-white/5">
          <div className="text-center mb-12">
            <motion.h3
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-space font-bold text-[#F8FFF9]"
            >
              The Visual Journey
            </motion.h3>
            <p className="text-xs md:text-sm text-[#A7C4B8] mt-2">
              From initial spark to finalized premium heirloom prints—engineered for perfection.
            </p>
          </div>

          {/* Desktop & Tablet Horizontal Timeline */}
          <div className="hidden md:block relative px-10 py-12">
            {/* Background Line Connector */}
            <div className="absolute top-[48px] left-[10%] right-[10%] h-[3px] bg-white/5 rounded-full z-0" />
            
            {/* Animated Glowing Connector Progress Line */}
            <motion.div
              initial={{ width: "0%" }}
              whileInView={{ width: "80%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute top-[48px] left-[10%] h-[3px] bg-gradient-to-r from-[#2EC4B6] via-[#6EE7B7] to-[#2EC4B6] rounded-full z-0 glow-shadow"
              style={{
                boxShadow: '0 0 10px rgba(46, 196, 182, 0.4)'
              }}
            />

            {/* Timeline Steps Flex */}
            <div className="grid grid-cols-5 relative z-10">
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= activeTimelineStep;
                
                return (
                  <div
                    key={step.title}
                    className="flex flex-col items-center text-center cursor-pointer group px-4"
                    onClick={() => setActiveTimelineStep(idx)}
                  >
                    {/* Node Circle */}
                    <motion.div
                      whileHover={{ scale: 1.2 }}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative ${
                        isCompleted
                          ? 'bg-[#071A14] border-[#2EC4B6] text-[#2EC4B6] shadow-[0_0_15px_rgba(46,196,182,0.4)]'
                          : 'bg-[#10261F] border-white/15 text-[#A7C4B8] group-hover:border-white/40'
                      }`}
                    >
                      {/* Pulse ring for active nodes */}
                      {idx === activeTimelineStep && (
                        <span className="absolute inset-0 rounded-full border border-[#2EC4B6] animate-ping opacity-70" />
                      )}
                      
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 fill-[#2EC4B6]/10" />
                      ) : (
                        <span className="text-xs font-mono font-bold">{idx + 1}</span>
                      )}
                    </motion.div>

                    {/* Step Title */}
                    <h4 className={`mt-5 text-sm md:text-base font-space font-bold transition-colors duration-300 ${
                      idx === activeTimelineStep ? 'text-[#2EC4B6]' : 'text-[#F8FFF9] group-hover:text-[#2EC4B6]'
                    }`}>
                      {step.title}
                    </h4>

                    {/* Micro descriptive popup */}
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{
                        opacity: idx === activeTimelineStep ? 1 : 0.6,
                        y: idx === activeTimelineStep ? 0 : 5
                      }}
                      className={`mt-2 text-xs leading-relaxed max-w-[160px] mx-auto transition-colors duration-300 ${
                        idx === activeTimelineStep ? 'text-[#A7C4B8]' : 'text-[#A7C4B8]/60 group-hover:text-[#A7C4B8]'
                      }`}
                    >
                      {step.desc}
                    </motion.p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical Timeline */}
          <div className="md:hidden space-y-6 px-4">
            {timelineSteps.map((step, idx) => {
              const isCompleted = idx <= activeTimelineStep;
              
              return (
                <div
                  key={step.title}
                  className={`p-5 rounded-2xl border transition-all duration-300 flex gap-4 items-start ${
                    idx === activeTimelineStep
                      ? 'bg-white/[0.03] border-[#2EC4B6]/40 shadow-xl'
                      : 'bg-white/[0.01] border-white/5'
                  }`}
                  onClick={() => setActiveTimelineStep(idx)}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border text-xs font-bold font-mono ${
                    isCompleted
                      ? 'border-[#2EC4B6] bg-[#071A14] text-[#2EC4B6]'
                      : 'border-white/10 bg-white/5 text-[#A7C4B8]'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className={`font-space font-bold text-sm ${
                      idx === activeTimelineStep ? 'text-[#2EC4B6]' : 'text-[#F8FFF9]'
                    }`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-[#A7C4B8] leading-relaxed mt-1">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
}
