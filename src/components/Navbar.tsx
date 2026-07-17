import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Menu, X, Phone } from 'lucide-react';

import { CmsConfig } from '../lib/supabase';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  activeSection: string;
  onAdminTrigger?: () => void;
  cmsConfig?: CmsConfig;
}

export default function Navbar({ onNavigate, activeSection, onAdminTrigger, cmsConfig }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hidden admin click tracking using refs for synchronous checks (prevents React state lag)
  const clickCountRef = React.useRef(0);
  const lastClickTimeRef = React.useRef(0);
  const clickTimeoutRef = React.useRef<any>(null);

  // Hidden admin long-press and touch tracking refs
  const touchTimerRef = React.useRef<any>(null);
  const lastTouchTimeRef = React.useRef(0);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  const handleLogoClick = () => {
    // Regular action
    handleItemClick('home');

    // Admin click sequence / Double-tap checker
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    // Double tap/click detection: if clicked twice within 450ms, trigger admin panel immediately
    if (timeSinceLastClick > 0 && timeSinceLastClick < 450) {
      onAdminTrigger?.();
      clickCountRef.current = 0;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      return;
    }

    // Sequence detection: 5 successive clicks within 3 seconds
    clickCountRef.current += 1;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

    if (clickCountRef.current >= 5) {
      onAdminTrigger?.();
      clickCountRef.current = 0;
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 3000);
    }
  };

  const handleLogoTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTouch = now - lastTouchTimeRef.current;
    lastTouchTimeRef.current = now;

    // Double tap detection for mobile/touch screens
    if (timeSinceLastTouch > 0 && timeSinceLastTouch < 350) {
      e.preventDefault(); // Stop default browser double-tap-to-zoom and duplicate clicks
      onAdminTrigger?.();
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
      return;
    }

    // Long press detection
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    
    touchTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        try {
          navigator.vibrate(100);
        } catch {}
      }
      onAdminTrigger?.();
    }, 1500); // 1.5 seconds is more responsive and natural
  };

  const handleLogoTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'services', label: 'Services' },
    { id: 'portfolio', label: 'Portfolio' },
    { id: 'pricing', label: 'Pricing' },
    ...(cmsConfig?.faq?.length ? [{ id: 'faq', label: 'FAQ' }] : []),
    ...(cmsConfig?.team?.length ? [{ id: 'team', label: 'Team' }] : []),
    ...(cmsConfig?.blogs?.length ? [{ id: 'blogs', label: 'Blog' }] : []),
    { id: 'contact', label: 'Contact' },
  ];

  const handleItemClick = (id: string) => {
    setIsMobileMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header
      id="main-navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out px-4 md:px-8 py-4 ${
        isScrolled
          ? 'bg-brand-bg/85 backdrop-blur-md shadow-lg border-b border-white/5 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-2 cursor-pointer group select-none"
          onClick={handleLogoClick}
          onDoubleClick={onAdminTrigger}
          onTouchStart={handleLogoTouchStart}
          onTouchEnd={handleLogoTouchEnd}
        >
          <div className="w-10 h-10 rounded-xl bg-brand-accent/10 flex items-center justify-center border border-brand-accent/30 group-hover:border-brand-accent/80 transition-all duration-300">
            <Camera className="w-5 h-5 text-brand-accent group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="font-space font-bold tracking-wider text-sm md:text-base text-brand-text">
              {cmsConfig?.navigation?.logoText || 'VERIFIED'}
            </span>
            <span className="text-[10px] tracking-widest text-brand-glow font-mono uppercase font-semibold">
              {cmsConfig?.navigation?.logoSubtext || 'PHOTOGRAPHY'}
            </span>
          </div>
        </motion.div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-white/5 border border-white/5 shadow-inner">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => handleItemClick(item.id)}
                  className={`relative px-4 py-1.5 rounded-full text-xs font-medium font-sans tracking-wide transition-all duration-300 ${
                    isActive ? 'text-brand-bg' : 'text-brand-muted hover:text-brand-text'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-brand-accent rounded-full -z-10 box-glow"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* CTA & Mobile Toggle */}
        <div className="flex items-center gap-3">
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onClick={() => handleItemClick('contact')}
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-accent to-brand-glow hover:from-brand-glow hover:to-brand-accent text-brand-bg font-space font-semibold text-xs rounded-xl transition-all duration-300 hover:shadow-[0_0_20px_rgba(46,196,182,0.4)] active:scale-95 cursor-pointer"
          >
            Book Now
          </motion.button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-brand-text hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden absolute top-full left-0 right-0 bg-brand-bg/95 backdrop-blur-lg border-b border-white/5 shadow-xl px-6 py-6"
          >
            <div className="flex flex-col gap-4">
              {navItems.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`flex items-center justify-between py-2 text-sm font-space font-medium tracking-wide border-b border-white/5 transition-colors ${
                      isActive ? 'text-brand-accent font-bold' : 'text-brand-muted'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-accent box-glow" />
                    )}
                  </button>
                );
              })}
              <button
                onClick={() => handleItemClick('contact')}
                className="w-full mt-2 py-3 bg-brand-accent hover:bg-brand-glow text-brand-bg text-center font-space font-bold rounded-xl transition-all text-sm shadow-md"
              >
                Book Session Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
