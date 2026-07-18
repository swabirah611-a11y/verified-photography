import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ArrowRight, Camera, Sparkles, ChevronDown, Award, Shield, CheckCircle2 } from 'lucide-react';

// Modular Sub-components
import Navbar from './components/Navbar';
import HeroCamera3D from './components/HeroCamera3D';
import AboutSection from './components/AboutSection';
import ServicesSection from './components/ServicesSection';
import PortfolioSection from './components/PortfolioSection';
import PricingSection from './components/PricingSection';
import FaqSection from './components/FaqSection';
import TeamSection from './components/TeamSection';
import BlogSection from './components/BlogSection';
import ContactSection from './components/ContactSection';
import FloatingWhatsApp from './components/FloatingWhatsApp';

// Administrative Sub-components
import AdminLoginModal from './components/AdminLoginModal';
import AdminDashboard from './components/AdminDashboard';
import { getAdminSession, getCmsConfig, DEFAULT_CMS_CONFIG, CmsConfig, supabase } from './lib/supabase';

// Visual Website Editor Components
import EditableText from './components/EditableText';
import VisualEditorOverlay from './components/VisualEditorOverlay';
import ImageReplacerModal from './components/ImageReplacerModal';
import CustomSection from './components/CustomSection';

export default function App() {
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(DEFAULT_CMS_CONFIG);
  const [activeSection, setActiveSection] = useState('home');
  const [prefilledCategory, setPrefilledCategory] = useState('');
  const [prefilledPlan, setPrefilledPlan] = useState('');

  // Visual Website Editor States
  const [isVisualEditMode, setIsVisualEditMode] = useState(false);
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [sectionsOrder, setSectionsOrder] = useState<string[]>([
    'home',
    'about',
    'services',
    'portfolio',
    'pricing',
    'faq',
    'team',
    'blogs',
    'contact'
  ]);
  const [sectionsVisibility, setSectionsVisibility] = useState<Record<string, boolean>>({
    home: true,
    about: true,
    services: true,
    portfolio: true,
    pricing: true,
    faq: true,
    team: true,
    blogs: true,
    contact: true
  });
  const [imageReplacerField, setImageReplacerField] = useState<{ section: string; field: string } | null>(null);

  // Undo / Redo engine stacks
  const [undoStack, setUndoStack] = useState<CmsConfig[]>([]);
  const [redoStack, setRedoStack] = useState<CmsConfig[]>([]);

  // Hidden Administrative Gateway Routing States
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Load CMS Config
  useEffect(() => {
    const loadCms = async () => {
      const config = await getCmsConfig();
      setCmsConfig(config);
    };

    loadCms();

    // Listen for real-time config updates (e.g. when saved from Admin Panel)
    window.addEventListener('cms_config_updated', loadCms);
    return () => {
      window.removeEventListener('cms_config_updated', loadCms);
    };
  }, []);

  // Load section order and visibility from cmsConfig
  useEffect(() => {
    if (cmsConfig?.advanced) {
      if ((cmsConfig.advanced as any).sectionsOrder) {
        let order = (cmsConfig.advanced as any).sectionsOrder;
        if (!order.includes('home') && !order.includes('hero')) {
          order = ['home', ...order];
        }
        setSectionsOrder(order);
      }
      if ((cmsConfig.advanced as any).sectionsVisibility) {
        setSectionsVisibility({
          home: true,
          ...((cmsConfig.advanced as any).sectionsVisibility || {})
        });
      }
    }
  }, [cmsConfig]);

  // Synchronize visual edit mode toggle
  useEffect(() => {
    const checkVisualEditMode = () => {
      const isEdit = localStorage.getItem('visual_edit_mode') === 'true';
      setIsVisualEditMode(!!isEdit && isAdminLoggedIn);
    };
    checkVisualEditMode();
    window.addEventListener('popstate', checkVisualEditMode);
    return () => window.removeEventListener('popstate', checkVisualEditMode);
  }, [isAdminLoggedIn]);

  // General config updater helper with undo/redo capabilities
  const handleUpdateConfigValue = async (newConfig: CmsConfig, skipHistory = false) => {
    if (!skipHistory) {
      setUndoStack(prev => [...prev, cmsConfig]);
      setRedoStack([]); // reset redo on new edits
    }
    setCmsConfig(newConfig);
    const { saveCmsConfig } = await import('./lib/supabase');
    await saveCmsConfig(newConfig);
    window.dispatchEvent(new Event('cms_config_updated'));
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(prevStack => prevStack.slice(0, -1));
    setRedoStack(prevRedo => [...prevRedo, cmsConfig]);
    handleUpdateConfigValue(prev, true);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prevRedo => prevRedo.slice(0, -1));
    setUndoStack(prevStack => [...prevStack, cmsConfig]);
    handleUpdateConfigValue(next, true);
  };

  const updateField = (section: keyof CmsConfig, field: string, value: string) => {
    const sectionData = cmsConfig[section];
    if (typeof sectionData === 'object' && sectionData !== null) {
      const updated = {
        ...cmsConfig,
        [section]: {
          ...sectionData,
          [field]: value
        }
      };
      handleUpdateConfigValue(updated);
    }
  };

  const handleTriggerImageReplacer = (section: string, field: string) => {
    setImageReplacerField({ section, field });
  };

  const handleSelectImageReplacement = (url: string) => {
    if (imageReplacerField) {
      const { section, field } = imageReplacerField;
      const sectionData = cmsConfig[section as keyof CmsConfig];
      if (typeof sectionData === 'object' && sectionData !== null) {
        const updated = {
          ...cmsConfig,
          [section]: {
            ...sectionData,
            [field]: url
          }
        };
        handleUpdateConfigValue(updated);
      }
      setImageReplacerField(null);
    }
  };
  
  // Particle Canvas for Cinematic background dust
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync session and handle location/route states
  useEffect(() => {
    const checkAuthAndRoute = async () => {
      if (!supabase) {
        setIsAdminLoggedIn(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const path = window.location.pathname;
      setCurrentPath(path);
      
      if (session) {
        setIsAdminLoggedIn(true);
      } else {
        setIsAdminLoggedIn(false);
        if (path === '/admin' || path === '/admin/dashboard' || path === '/admin/login') {
          setIsAdminModalOpen(true);
          // Redirect unauthenticated clients to safety login
          window.history.replaceState(null, '', '/admin/login');
          setCurrentPath('/admin/login');
        }
      }
    };

    checkAuthAndRoute();

    const handleLocationChange = () => {
      checkAuthAndRoute();
    };

    window.addEventListener('popstate', handleLocationChange);
    // Custom trigger for programmatically pushed locations
    window.addEventListener('pushstate_changed', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate_changed', handleLocationChange);
    };
  }, []);

  // Keyboard shortcut trigger: Ctrl+Shift+A (Windows/Linux) or ⌘+Shift+A (macOS)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      if (isCmdOrCtrl && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setIsAdminModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active section tracker via scroll / Intersection Observer
  useEffect(() => {
    const sections = ['home', 'about', 'services', 'portfolio', 'pricing', 'contact'];
    
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Particle Engine: Animated glowing dust in background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;
      fadeSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.3; // drift upwards slightly
        this.opacity = Math.random() * 0.5 + 0.2;
        this.fadeSpeed = Math.random() * 0.003 + 0.001;
        this.color = Math.random() > 0.4 ? '#6EE7B7' : '#2EC4B6'; // glow/accent colors
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wrap around boundaries
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Subtle opacity pulsing
        this.opacity -= this.fadeSpeed;
        if (this.opacity <= 0.1 || this.opacity >= 0.8) {
          this.fadeSpeed = -this.fadeSpeed;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.shadowBlur = 6;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    const particlesArray: Particle[] = Array.from({ length: 65 }, () => new Particle());

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particlesArray.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Navigation action: smoothly scroll to element
  const handleNavigate = (sectionId: string) => {
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Direct booking session shortcut
  const handleBookShortcut = (categoryName: string, planName: string = '') => {
    setPrefilledCategory(categoryName);
    setPrefilledPlan(planName);
    handleNavigate('contact');
  };

  // Render administrative dashboard if the user is authenticated and navigating the admin path
  const showAdminDashboard = isAdminLoggedIn && (currentPath === '/admin' || currentPath === '/admin/dashboard' || currentPath === '/admin/login');

  if (showAdminDashboard) {
    return (
      <div className="relative min-h-screen bg-[#051410] overflow-x-hidden selection:bg-[#2EC4B6] selection:text-[#071A14]">
        <AdminDashboard 
          onLogout={() => {
            setIsAdminLoggedIn(false);
            window.history.pushState(null, '', '/');
            window.dispatchEvent(new Event('popstate'));
          }} 
        />
        <AnimatePresence>
          {isAdminModalOpen && (
            <AdminLoginModal
              isOpen={isAdminModalOpen}
              onClose={() => {
                setIsAdminModalOpen(false);
                if (!isAdminLoggedIn) {
                  window.history.pushState(null, '', '/');
                  window.dispatchEvent(new Event('popstate'));
                }
              }}
              onLoginSuccess={(user) => {
                setIsAdminLoggedIn(true);
                setIsAdminModalOpen(false);
                window.history.pushState(null, '', '/admin/dashboard');
                window.dispatchEvent(new Event('popstate'));
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 3. Maintenance Mode protection block
  if (cmsConfig?.advanced?.maintenanceMode && !isAdminLoggedIn) {
    return (
      <div className="relative min-h-screen bg-[#071A14] flex flex-col items-center justify-center p-6 text-center">
        {/* Fog Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] rounded-full bg-gradient-to-br from-[#2EC4B6]/10 to-transparent blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 p-8 md:p-12 rounded-3xl bg-white/[0.02] border border-white/5 box-glow max-w-xl"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#2EC4B6]/10 flex items-center justify-center border border-[#2EC4B6]/20 mx-auto mb-6">
            <Camera className="w-8 h-8 text-[#2EC4B6] animate-pulse" />
          </div>

          <h1 className="text-3xl md:text-4xl font-space font-bold text-white mb-4">
            Under Scheduled Maintenance
          </h1>
          
          <p className="text-sm text-[#A7C4B8] leading-relaxed mb-8">
            We are currently optimizing our digital exhibition vaults to provide you with a faster, higher-fidelity experience. We will be back online shortly.
          </p>

          <div className="h-px bg-white/5 w-full my-6" />

          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#2EC4B6] rounded-xl border border-white/5 hover:border-[#2EC4B6]/40 transition-all duration-300 active:scale-98 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Admin Gateway</span>
          </button>
        </motion.div>

        {/* Admin Login Modal for Login trigger in maintenance screen */}
        <AnimatePresence>
          {isAdminModalOpen && (
            <AdminLoginModal
              isOpen={isAdminModalOpen}
              onClose={() => setIsAdminModalOpen(false)}
              onLoginSuccess={(user) => {
                setIsAdminLoggedIn(true);
                setIsAdminModalOpen(false);
                window.history.pushState(null, '', '/admin/dashboard');
                window.dispatchEvent(new Event('popstate'));
              }}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Wrap main app if in Visual Edit Mode and previewing tablet/mobile
  const getContainerWidthStyles = () => {
    if (!isVisualEditMode) return 'w-full relative min-h-screen';
    if (deviceView === 'tablet') return 'max-w-[768px] mx-auto border-x border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[100vh] bg-brand-bg relative mt-16 transition-all duration-300';
    if (deviceView === 'mobile') return 'max-w-[390px] mx-auto border-x border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] min-h-[100vh] bg-brand-bg relative mt-16 transition-all duration-300';
    return 'w-full transition-all duration-300 mt-16 relative min-h-screen'; // desktop
  };

  const renderSection = (sectionId: string) => {
    const baseId = sectionId.split('_')[0];
    
    // Retrieve custom section data if it's a duplicated section
    let activeConfig = cmsConfig;
    if (sectionId !== baseId) {
      const customData = cmsConfig.advanced?.sectionData?.[sectionId];
      if (customData) {
        activeConfig = {
          ...cmsConfig,
          [baseId]: customData
        };
      }
    }

    const handleUpdateSectionField = (field: string, val: string) => {
      if (sectionId === baseId) {
        updateField(baseId as any, field, val);
      } else {
        const currentData = cmsConfig.advanced?.sectionData?.[sectionId] || { ...cmsConfig[baseId as keyof CmsConfig] };
        const updatedData = {
          ...currentData,
          [field]: val
        };
        const updated = {
          ...cmsConfig,
          advanced: {
            ...cmsConfig.advanced,
            sectionData: {
              ...(cmsConfig.advanced as any).sectionData,
              [sectionId]: updatedData
            }
          } as any
        };
        handleUpdateConfigValue(updated);
      }
    };

    // If it's a user-created custom section
    if (sectionId.startsWith('custom_')) {
      const customData = cmsConfig.customSections?.[sectionId];
      return (
        <CustomSection
          sectionId={sectionId}
          sectionData={customData}
          isVisualEditMode={isVisualEditMode}
          onUpdateField={(field, val) => {
            const currentSections = cmsConfig.customSections || {};
            const currentSec = currentSections[sectionId] || { title: '', heading: '', description: '' };
            const updatedSec = { ...currentSec, [field]: val };
            const updated = {
              ...cmsConfig,
              customSections: {
                ...currentSections,
                [sectionId]: updatedSec
              }
            };
            handleUpdateConfigValue(updated);
          }}
          onTriggerImageReplacer={() => handleTriggerImageReplacer('customSections', sectionId + '.bgImage')}
        />
      );
    }

    switch (baseId) {
      case 'home':
      case 'hero':
        return (
          <section
            id="home"
            className="relative min-h-screen w-full flex items-center justify-center pt-24 pb-12 lg:py-0 z-10"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[calc(100vh-140px)]">
                
                {/* Left Side Info and Action */}
                <div className="lg:col-span-6 flex flex-col justify-center text-left">
                  
                  {/* Brand Indicator */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="flex items-center gap-2 mb-4"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-accent box-glow animate-pulse" />
                    <EditableText
                      value={activeConfig?.hero?.businessName || 'VERIFIED PHOTOGRAPHY'}
                      isEditable={isVisualEditMode}
                      onSave={(val) => handleUpdateSectionField('businessName', val)}
                      className="font-space font-bold tracking-[0.25em] text-xs text-brand-glow uppercase"
                    />
                  </motion.div>

                  {/* Majestic Headline */}
                  <motion.h1
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
                    className="text-4xl sm:text-5xl lg:text-6xl font-space font-bold text-brand-text leading-tight tracking-tight mb-6"
                  >
                    <EditableText
                      value={activeConfig?.hero?.mainHeading || activeConfig?.hero?.heading || 'Capturing Stories'}
                      isEditable={isVisualEditMode}
                      onSave={(val) => handleUpdateSectionField('heading', val)}
                    /> <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-brand-glow to-brand-text">
                      <EditableText
                        value={activeConfig?.hero?.subheading || activeConfig?.hero?.headingHighlight || 'Beyond the Lens'}
                        isEditable={isVisualEditMode}
                        onSave={(val) => handleUpdateSectionField('headingHighlight', val)}
                      />
                    </span>
                  </motion.h1>

                  {/* Supporting Copy */}
                  <div className="mb-8 max-w-xl">
                    <EditableText
                      value={activeConfig?.hero?.description || 'Professional photography that transforms moments into timeless memories. Weddings, portraits, graduations, birthdays, events, and commercial photography with creativity, precision, and passion.'}
                      isEditable={isVisualEditMode}
                      multiline={true}
                      onSave={(val) => handleUpdateSectionField('description', val)}
                      className="text-sm md:text-base text-brand-muted leading-relaxed"
                    />
                  </div>

                  {/* Interactive Location Badges */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-wrap gap-4 items-center mb-10"
                  >
                    <span className="text-xs text-brand-muted uppercase font-mono tracking-wider font-semibold">Service Hubs:</span>
                    <div className="flex gap-2">
                      {(activeConfig?.hero?.locations || ['Uromi', 'Ekpoma', 'Auchi']).map((loc) => (
                        <motion.div
                           key={loc}
                           whileHover={{ scale: 1.05, y: -2 }}
                           className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#10261F] border border-[#2EC4B6]/25 text-xs text-brand-text box-glow font-space"
                        >
                          <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                          <span>{loc}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Premium Button CTAs */}
                  <motion.div
                    initial={{ opacity: 0, y: 25 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
                  >
                    {/* Primary Button */}
                    <button
                      onClick={() => handleNavigate('contact')}
                      className="group px-8 py-4 bg-gradient-to-r from-brand-accent to-brand-glow hover:from-brand-glow hover:to-brand-accent text-brand-bg font-space font-bold text-sm rounded-xl transition-all duration-500 hover:shadow-[0_0_25px_rgba(46,196,182,0.5)] active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <EditableText
                        value={activeConfig?.hero?.ctaText || 'Book a Session'}
                        isEditable={isVisualEditMode}
                        onSave={(val) => handleUpdateSectionField('ctaText', val)}
                      />
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
                    </button>

                    {/* Secondary Button */}
                    <button
                      onClick={() => handleNavigate('portfolio')}
                      className="px-8 py-4 bg-white/5 hover:bg-[#10261F] text-brand-text hover:text-brand-glow font-space font-semibold text-sm rounded-xl transition-all duration-300 border border-white/5 hover:border-brand-accent/40 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-brand-accent" />
                      <EditableText
                        value={activeConfig?.hero?.secondaryCtaText || 'Explore Portfolio'}
                        isEditable={isVisualEditMode}
                        onSave={(val) => handleUpdateSectionField('secondaryCtaText', val)}
                      />
                    </button>
                  </motion.div>

                </div>

                {/* Right Side: Immersive 3D Experience (Floating DSLR and floating accessories) */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                  className="lg:col-span-6 flex items-center justify-center relative"
                >
                  <HeroCamera3D />
                </motion.div>

              </div>
            </div>

            {/* Scroll down indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-brand-muted/50 hover:text-brand-accent cursor-pointer transition-colors" onClick={() => handleNavigate('about')}>
              <span className="text-[10px] font-mono uppercase tracking-widest">Scroll Down</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>
          </section>
        );
      case 'about':
        return (
          <AboutSection 
            cmsConfig={activeConfig} 
            isVisualEditMode={isVisualEditMode} 
            onUpdateAboutField={(field, val) => handleUpdateSectionField(field, val)} 
          />
        );
      case 'services':
        return (
          <ServicesSection 
            onBookService={(serviceName) => handleBookShortcut(serviceName)} 
            cmsConfig={activeConfig} 
          />
        );
      case 'portfolio':
        return (
          <PortfolioSection 
            onBookSession={(categoryName) => handleBookShortcut(categoryName)} 
          />
        );
      case 'pricing':
        return (
          <PricingSection 
            onSelectPlan={(planName, category) => handleBookShortcut(category, planName)} 
            cmsConfig={activeConfig} 
          />
        );
      case 'faq':
        return <FaqSection cmsConfig={activeConfig} />;
      case 'team':
        return <TeamSection cmsConfig={activeConfig} />;
      case 'blogs':
        return <BlogSection cmsConfig={activeConfig} />;
      case 'contact':
        return (
          <ContactSection 
            prefilledCategory={prefilledCategory} 
            prefilledPlan={prefilledPlan} 
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-brand-bg text-brand-text font-sans overflow-x-hidden selection:bg-brand-accent selection:text-brand-bg">
      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --color-brand-bg: ${cmsConfig?.theme?.backgroundColor || '#071A14'};
          --color-brand-secondary: ${cmsConfig?.theme?.secondaryColor || '#10261F'};
          --color-brand-accent: ${cmsConfig?.theme?.primaryColor || '#2EC4B6'};
          --color-brand-glow: ${cmsConfig?.theme?.accentColor || '#6EE7B7'};
          --color-brand-text: ${cmsConfig?.theme?.textColor || '#F8FFF9'};
        }
      `}} />
      
      {/* 1. VISUAL WEBSITE EDITOR TOOLBAR */}
      {isVisualEditMode && (
        <VisualEditorOverlay
          config={cmsConfig}
          onSaveConfig={handleUpdateConfigValue}
          onExit={() => {
            localStorage.removeItem('visual_edit_mode');
            setIsVisualEditMode(false);
          }}
          deviceView={deviceView}
          setDeviceView={setDeviceView}
          sectionsOrder={sectionsOrder}
          setSectionsOrder={(order) => {
            setSectionsOrder(order);
            const updated = {
              ...cmsConfig,
              advanced: {
                ...cmsConfig.advanced,
                sectionsOrder: order
              } as any
            };
            handleUpdateConfigValue(updated);
          }}
          sectionsVisibility={sectionsVisibility}
          setSectionsVisibility={(vis) => {
            setSectionsVisibility(vis);
            const updated = {
              ...cmsConfig,
              advanced: {
                ...cmsConfig.advanced,
                sectionsVisibility: vis
              } as any
            };
            handleUpdateConfigValue(updated);
          }}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
        />
      )}

      {/* Main Container wrapping preview viewport */}
      <div className={getContainerWidthStyles()}>

        {/* 1. CINEMATIC LAYERED BACKGROUND */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Layer A: Base deep emerald gradient map */}
          <div className="absolute inset-0 bg-[#071A14]" />
          
          {/* Layer B: Animated Soft Fog and spotlight flares */}
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-brand-accent/10 to-transparent blur-[150px] mix-blend-screen" />
          <div className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full bg-gradient-to-tr from-[#10261F]/80 via-brand-accent/5 to-transparent blur-[160px]" />
          
          {/* Layer C: Moving volumetric light rays */}
          <div className="absolute top-[5%] left-[20%] w-[150px] h-[600px] volumetric-cone -rotate-12 transform origin-top opacity-60 animate-pulse duration-[8000ms]" />
          <div className="absolute top-[-5%] left-[50%] w-[220px] h-[800px] volumetric-cone rotate-12 transform origin-top opacity-40 animate-pulse duration-[12000ms]" />

          {/* Layer D: Fluid blurred floating light streaks */}
          <div className="absolute top-[40%] left-[-20%] w-[400px] h-[120px] bg-brand-accent/5 rounded-full blur-[90px] rotate-[25deg]" />
          <div className="absolute bottom-[30%] right-[-10%] w-[350px] h-[100px] bg-brand-glow/5 rounded-full blur-[80px] -rotate-[15deg]" />

          {/* Layer E: HTML5 Canvas for real-time drifting ambient particles and glowing dust */}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-80" />
        </div>

        {/* 2. FLOATING GLASS NAVIGATION BAR */}
        <Navbar 
          onNavigate={handleNavigate} 
          activeSection={activeSection} 
          onAdminTrigger={() => setIsAdminModalOpen(true)}
          cmsConfig={cmsConfig}
        />

        {/* 4. DYNAMIC MODULAR WEBSITE CONTENT SECTIONS */}
        {sectionsOrder.map((sectionId) => {
          const isVisible = sectionsVisibility[sectionId] !== false;
          const isDraft = cmsConfig.advanced?.sectionsDraftState?.[sectionId] === true;
          
          if (!isVisible && !isVisualEditMode) return null;
          if (isDraft && !isVisualEditMode) return null;

          return (
            <div 
              key={sectionId} 
              className={`relative ${!isVisible ? 'opacity-30 border-2 border-dashed border-red-500/20' : ''} ${isDraft ? 'opacity-50 border-2 border-dashed border-yellow-500/20' : ''}`}
            >
              {!isVisible && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-red-500/80 backdrop-blur-md text-[9px] font-mono font-bold tracking-widest text-white flex items-center gap-1 shadow-lg">
                  <span>●</span> <span>HIDDEN FROM PUBLIC VIEW</span>
                </div>
              )}
              {isDraft && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-yellow-600/80 backdrop-blur-md text-[9px] font-mono font-bold tracking-widest text-white flex items-center gap-1 shadow-lg">
                  <span>●</span> <span>DRAFT MODE (UNPUBLISHED)</span>
                </div>
              )}
              {renderSection(sectionId)}
            </div>
          );
        })}

        {/* 5. METICULOUS BRAND FOOTER */}
        <footer className="bg-[#040E0B] border-t border-white/5 py-12 md:py-16 relative z-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-4 gap-8 md:gap-12 mb-12">
              
              {/* Branding Column */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
                    <Camera className="w-4.5 h-4.5 text-brand-accent" />
                  </div>
                  <span className="font-space font-bold tracking-wider text-sm text-brand-text">
                    <EditableText
                      value={cmsConfig?.hero?.businessName || 'VERIFIED PHOTOGRAPHY'}
                      isEditable={isVisualEditMode}
                      onSave={(val) => updateField('hero', 'businessName', val)}
                    />
                  </span>
                </div>
                <div className="text-xs text-brand-muted leading-relaxed max-w-sm mb-4 font-sans">
                  <EditableText
                    value={cmsConfig?.footer?.aboutText || 'A premium digital art and commercial photography studio based in Edo State, Nigeria. We preserve real, cultural, and triumphant stories beyond the physical lens.'}
                    isEditable={isVisualEditMode}
                    multiline={true}
                    onSave={(val) => updateField('footer', 'aboutText', val)}
                  />
                </div>
                <div className="text-[10px] font-mono text-brand-glow">
                  📍 Serving {(cmsConfig?.hero?.locations || ['Uromi', 'Ekpoma', 'Auchi']).join(' • ')}
                </div>
              </div>

              {/* Quick Links Column */}
              <div>
                <h5 className="text-xs font-space font-bold text-brand-text uppercase tracking-wider mb-4">Explore Studio</h5>
                <ul className="space-y-2.5 text-xs">
                  {['home', 'about', 'services', 'portfolio', 'pricing', 'contact'].map((section) => (
                    <li key={section}>
                      <button
                        onClick={() => handleNavigate(section)}
                        className="text-brand-muted hover:text-brand-accent capitalize transition-colors font-sans cursor-pointer"
                      >
                        {section}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Safeguards & Assurance Column */}
              <div>
                <h5 className="text-xs font-space font-bold text-brand-text uppercase tracking-wider mb-4">Assurance</h5>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-brand-muted font-sans">
                    <Award className="w-4 h-4 text-brand-accent flex-shrink-0" />
                    <span>Verified 60fps Experience</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-brand-muted font-sans">
                    <Shield className="w-4 h-4 text-brand-accent flex-shrink-0" />
                    <span>Durable Local Scheduling</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-brand-muted font-sans">
                    <CheckCircle2 className="w-4 h-4 text-brand-accent flex-shrink-0" />
                    <span>Premium Hardware Kits</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Copyright line */}
            <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-brand-muted font-sans">
                <EditableText
                  value={cmsConfig?.footer?.copyright || `© ${new Date().getFullYear()} Verified Photography. All rights reserved.`}
                  isEditable={isVisualEditMode}
                  onSave={(val) => updateField('footer', 'copyright', val)}
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] font-mono text-brand-muted">
                <span>Designed & Crafted with Passion in Nigeria</span>
                <span className="text-white/10">•</span>
                <button 
                  onClick={() => setIsAdminModalOpen(true)}
                  className="hover:text-brand-accent transition-colors duration-200 cursor-pointer flex items-center gap-1.5"
                  title="Admin Gateway"
                >
                  <Shield className="w-3 h-3 text-brand-accent" />
                  <span>Admin Login</span>
                </button>
              </div>
            </div>
          </div>
        </footer>

        {/* FLOATING WHATSAPP BUTTON */}
        <FloatingWhatsApp />

      </div>

      {/* GLOBAL IMAGE REPLACER POPUP MODAL */}
      <AnimatePresence>
        {imageReplacerField && (
          <ImageReplacerModal
            isOpen={!!imageReplacerField}
            onClose={() => setImageReplacerField(null)}
            onSelect={handleSelectImageReplacement}
            title={`${imageReplacerField.section} - ${imageReplacerField.field}`}
          />
        )}
      </AnimatePresence>

      {/* ADMIN PORTAL GATEWAY MODAL */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <AdminLoginModal
            isOpen={isAdminModalOpen}
            onClose={() => {
              setIsAdminModalOpen(false);
              if (window.location.pathname.startsWith('/admin')) {
                window.history.pushState(null, '', '/');
                window.dispatchEvent(new Event('popstate'));
              }
            }}
            onLoginSuccess={(user) => {
              setIsAdminLoggedIn(true);
              setIsAdminModalOpen(false);
              window.history.pushState(null, '', '/admin/dashboard');
              window.dispatchEvent(new Event('popstate'));
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
