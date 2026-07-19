import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Trash2, 
  Plus, 
  LogOut, 
  Shield, 
  FileText, 
  User, 
  MapPin, 
  Calendar, 
  Terminal, 
  Check, 
  AlertCircle, 
  Database, 
  Layers, 
  Clock, 
  Grid,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Eye,
  Info,
  Activity,
  FolderOpen,
  Image as ImageIcon,
  Link2,
  Wrench,
  TrendingUp,
  HelpCircle,
  Users,
  BookOpen,
  Palette,
  Sliders,
  Search,
  Lock,
  Menu,
  X
} from 'lucide-react';
import { PortfolioItem } from '../types';
import { 
  signOutAdmin, 
  getAdminSession, 
  getBookings, 
  deleteBooking,
  getCmsConfig,
  saveCmsConfig,
  DEFAULT_CMS_CONFIG,
  CmsConfig,
  supabase,
  getPortfolioItems,
  savePortfolioItem,
  deletePortfolioItem,
  getExhibitions,
  saveExhibition,
  deleteExhibition,
  Exhibition
} from '../lib/supabase';

// Modular CMS Section Subcomponents
import DashboardHome from './cms/DashboardHome';
import SectionManagers from './cms/SectionManagers';
import ItemsManagers from './cms/ItemsManagers';
import SettingsManagers from './cms/SettingsManagers';
import MediaLibrary from './cms/MediaLibrary';
import SupabaseSetupCenter from './cms/SupabaseSetupCenter';
import SupabaseCurationPanel from './cms/SupabaseCurationPanel';

interface AdminDashboardProps {
  onLogout: () => void;
}

type AdminTab = 
  | 'dashboard' | 'bookings' | 'logs'
  | 'gallery' | 'media'
  | 'hero' | 'navigation' | 'about' | 'footer'
  | 'services' | 'pricing' | 'faq' | 'team' | 'blogs'
  | 'theme' | 'animations' | 'seo' | 'security' | 'backup'
  | 'setup_center'
  | 'supabase';

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Unified CMS config state
  const [cmsConfig, setCmsConfig] = useState<CmsConfig>(DEFAULT_CMS_CONFIG);
  
  // Gallery states
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Gallery Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<'Weddings' | 'Portraits' | 'Graduations' | 'Events' | 'Commercial'>('Portraits');
  const [formLocation, setFormLocation] = useState('Ekpoma');
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formCameraSetup, setFormCameraSetup] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Direct Device Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Bookings state
  const [bookings, setBookings] = useState<any[]>([]);
  
  // Security logs state
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  
  // Session inactivity states
  const [sessionUser, setSessionUser] = useState<any>(null);
  const [inactivityTimer, setInactivityTimer] = useState(600); // 10 minutes in seconds
  const inactivityDeadlineRef = useRef(Date.now() + 600_000);
  const [isAiAutofilling, setIsAiAutofilling] = useState(false);

  // Local activity feed list inside session
  const [recentActivity, setRecentActivity] = useState<Array<{ id: string; desc: string; time: string; type: 'info' | 'warn' | 'success' }>>([
    { id: 'act-1', desc: 'Secure database session mounted successfully', time: 'Just now', type: 'success' }
  ]);

  const addActivityLog = (desc: string, type: 'info' | 'warn' | 'success' = 'info') => {
    const newAct = {
      id: 'act-' + Date.now(),
      desc,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type
    };
    setRecentActivity(prev => [newAct, ...prev.slice(0, 9)]);
  };

  const loadCmsConfigData = async () => {
    const fetched = await getCmsConfig();
    setCmsConfig(fetched);
  };

  const loadBookingsData = async () => {
    const fetched = await getBookings();
    setBookings(fetched);
  };

  const loadPortfolioData = async () => {
    const exhibitions = await getExhibitions();
    const mapped: PortfolioItem[] = exhibitions.map(e => ({
      id: e.id,
      title: e.title,
      category: e.category,
      location: e.tags?.[0] || 'Studio Capture',
      image: e.cover_image,
      description: e.description || '',
      date: e.created_at ? new Date(e.created_at).getFullYear().toString() : '2026',
      cameraSetup: e.tags?.[1] || 'Sony Custom G-Master'
    }));
    setPortfolioItems(mapped);
  };

  // Initialize data
  useEffect(() => {
    // 1. Get active session details asynchronously from Supabase
    const verifySession = async () => {
      if (!supabase) {
        onLogout();
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onLogout();
      } else {
        setSessionUser({
          email: session.user.email || '',
          role: 'admin'
        });
      }
    };
    verifySession();

    // 2. Load CMS dynamic config
    loadCmsConfigData();

    // 3. Load Portfolio items
    loadPortfolioData();

    // 4. Load Bookings
    loadBookingsData();

    // 5. Load Security Logs
    const storedLogs = localStorage.getItem('verified_admin_logs');
    if (storedLogs) {
      try {
        setSecurityLogs(JSON.parse(storedLogs));
      } catch {}
    }
  }, []);

  // Keep every dashboard module synchronized with PostgreSQL changes made in
  // this tab, another tab, or another authenticated CMS session.
  useEffect(() => {
    if (!supabase) return;

    const cmsTables = [
      'hero_canvas', 'about_vision', 'services_offered', 'pricing_packages',
      'faq_modules', 'studio_team', 'editorial_blogs', 'testimonials', 'nav_socials'
    ];
    const channel = supabase.channel('verified_cms_dashboard_live');
    cmsTables.forEach((table) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, loadCmsConfigData);
    });
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, loadBookingsData);
    channel.subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, []);

  // Listen to bookings_updated event
  useEffect(() => {
    window.addEventListener('bookings_updated', loadBookingsData);
    return () => window.removeEventListener('bookings_updated', loadBookingsData);
  }, []);

  // Listen to exhibitions_updated and cross-tab triggers
  useEffect(() => {
    // 1. Local event listener
    window.addEventListener('exhibitions_updated', loadPortfolioData);

    // 2. BroadcastChannel listener
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('exhibitions_sync');
      channel.onmessage = (event) => {
        if (event.data === 'refresh') {
          loadPortfolioData();
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // 3. Supabase Realtime listener
    let realtimeSubscription: any = null;
    if (supabase) {
      try {
        realtimeSubscription = supabase
          .channel('exhibition_art_changes_admin')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'exhibition_art' },
            () => {
              loadPortfolioData();
            }
          )
          .subscribe();
      } catch (err) {
        console.warn('Realtime subscription failed:', err);
      }
    }

    return () => {
      window.removeEventListener('exhibitions_updated', loadPortfolioData);
      if (channel) {
        channel.close();
      }
      if (supabase && realtimeSubscription) {
        supabase.removeChannel(realtimeSubscription);
      }
    };
  }, []);

  // Timestamp-based inactivity tracking avoids interval drift and stale state.
  useEffect(() => {
    const resetTimer = () => {
      inactivityDeadlineRef.current = Date.now() + 600_000;
      setInactivityTimer(600);
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('scroll', resetTimer);

    const countdown = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((inactivityDeadlineRef.current - Date.now()) / 1000));
      setInactivityTimer(remaining);
      if (remaining === 0) {
        clearInterval(countdown);
        void handleSignOut();
      }
    }, 1000);

    return () => {
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      clearInterval(countdown);
    };
  }, []);

  const handleSignOut = async () => {
    await signOutAdmin();
    onLogout();
  };

  // Unified dynamic CMS saver
  const handleSaveCmsConfig = async (updated: CmsConfig) => {
    const success = await saveCmsConfig(updated);
    if (success) {
      setCmsConfig(updated);
      addActivityLog('Cms Configuration block successfully updated', 'success');
      
      // Notify other live React components on the page immediately
      window.dispatchEvent(new Event('cms_config_updated'));
    } else {
      alert('Error updating configuration table');
      addActivityLog('CMS configuration save failed', 'warn');
    }
  };

  const normalizeAiExhibitionCategory = (value: string): typeof formCategory => {
    const category = (value || '').toLowerCase();
    if (category.includes('wedding') || category.includes('traditional')) return 'Weddings';
    if (category.includes('graduation') || category.includes('campus')) return 'Graduations';
    if (category.includes('event') || category.includes('birthday') || category.includes('festival') || category.includes('sports')) return 'Events';
    if (category.includes('commercial') || category.includes('product') || category.includes('corporate')) return 'Commercial';
    return 'Portraits';
  };

  const handleAiAutofillExhibition = async () => {
    setFormError(null);
    setIsAiAutofilling(true);
    let imageUrl = formImage;
    let filename = selectedFile?.name || formImage.split('/').pop() || 'exhibition-image';

    try {
      // Gemini analyzes the durable Supabase URL, never a temporary browser blob.
      if (selectedFile) {
        if (!supabase) throw new Error('Supabase is not connected.');
        setUploading(true);
        setUploadProgress(25);
        const fileExt = selectedFile.name.split('.').pop() || 'jpg';
        const cleanName = selectedFile.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        const storagePath = `portfolio/${cleanName}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('media-vault').upload(storagePath, selectedFile, {
          contentType: selectedFile.type,
          cacheControl: '31536000',
          upsert: false
        });
        if (uploadError) throw new Error(uploadError.message);
        setUploadProgress(75);
        imageUrl = supabase.storage.from('media-vault').getPublicUrl(storagePath).data.publicUrl;
        filename = `${cleanName}.${fileExt}`;
        const { error: registryError } = await supabase.from('media_vault').insert([{
          filename,
          original_filename: selectedFile.name,
          bucket: 'media-vault',
          folder: 'portfolio',
          url: imageUrl,
          mime_type: selectedFile.type,
          file_size: selectedFile.size
        }]);
        if (registryError) throw new Error(registryError.message);
        setFormImage(imageUrl);
        setLocalPreview(imageUrl);
        setSelectedFile(null);
        setUploadProgress(100);
      }

      if (!imageUrl) throw new Error('Upload an image or paste an image URL first.');
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, filename, originalFilename: filename })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'AI analysis failed.');

      const analysis = result.analysis || {};
      setFormTitle(analysis.title || formTitle);
      setFormCategory(normalizeAiExhibitionCategory(analysis.category));
      setFormDescription(analysis.description || formDescription);
      if (analysis.location) setFormLocation(analysis.location);
      const camera = analysis.camera || {};
      const cameraSummary = [camera.camera, camera.lens].filter(Boolean).join(' + ');
      if (cameraSummary) setFormCameraSetup(cameraSummary);
      if (!formDate && camera.date_taken) setFormDate(camera.date_taken);
      addActivityLog(`AI prepared exhibition metadata for review: ${analysis.title || filename}`, 'success');
    } catch (error: any) {
      setFormError(`AI Auto-Fill failed: ${error.message || error}`);
    } finally {
      setUploading(false);
      setIsAiAutofilling(false);
    }
  };

  // Portfolio Exhibition Item save
  const handleSavePortfolioItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle || (!formImage && !selectedFile) || !formDescription || !formDate || !formLocation) {
      setFormError('Please complete all required fields (provide either a direct file upload or a reference URL).');
      return;
    }

    let imageUrlToSave = formImage;

    if (selectedFile) {
      setUploading(true);
      setUploadProgress(20);
      try {
        if (!supabase) {
          throw new Error('Supabase is uninitialized. Real cloud storage is required.');
        }

        setUploadProgress(45);
        const fileExt = selectedFile.name.split('.').pop() || 'png';
        const cleanName = selectedFile.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        const storagePath = `portfolio/${cleanName}.${fileExt}`;

        const { error: uploadErr } = await supabase.storage
          .from('media-vault')
          .upload(storagePath, selectedFile, {
            contentType: selectedFile.type,
            cacheControl: '31536000',
            upsert: true
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        setUploadProgress(85);
        const publicUrl = supabase.storage.from('media-vault').getPublicUrl(storagePath).data.publicUrl;
        imageUrlToSave = publicUrl;

        // Register in media_vault metadata registry
        const dbRow = {
          filename: `${cleanName}.${fileExt}`,
          original_filename: selectedFile.name,
          bucket: 'media-vault',
          folder: 'portfolio',
          url: publicUrl,
          mime_type: selectedFile.type,
          file_size: selectedFile.size
        };
        const { error: dbErr } = await supabase.from('media_vault').insert([dbRow]);
        if (dbErr) {
          throw new Error(`Media vault database registration failed: ${dbErr.message}`);
        }
        // Keep the confirmed cloud URL in the form so a database retry does not
        // upload a duplicate Storage object.
        setFormImage(publicUrl);
        setSelectedFile(null);
        setLocalPreview(publicUrl);

      } catch (err: any) {
        console.error('Image upload failed:', err);
        setFormError(`Image upload failed: ${err.message}`);
        setUploading(false);
        return;
      } finally {
        setUploadProgress(100);
        setUploading(false);
      }
    }

    const cleanExhib: Exhibition = {
      id: editingItemId || 'exh-' + Math.random().toString(36).substr(2, 9),
      title: formTitle,
      category: formCategory,
      description: formDescription,
      cover_image: imageUrlToSave,
      gallery_images: [imageUrlToSave],
      videos: [],
      tags: [formLocation, formCameraSetup || 'Sony Custom G-Master'],
      featured: true,
      published: true,
      display_order: 0
    };

    const result = await saveExhibition(cleanExhib);
    if (!result.error) {
      if (editingItemId) {
        addActivityLog(`Modified masterpiece exhibition: ${formTitle}`, 'info');
      } else {
        addActivityLog(`Added masterpiece exhibition: ${formTitle}`, 'success');
      }
      await loadPortfolioData();
      resetForm();
    } else {
      const errMsg = `${result.error.code ? `[${result.error.code}] ` : ''}${result.error.message}`;
      setFormError(errMsg);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('Portraits');
    setFormLocation('Ekpoma');
    setFormImage('');
    setFormDescription('');
    setFormDate('');
    setFormCameraSetup('');
    setEditingItemId(null);
    setIsAddingItem(false);
    setFormError(null);
    setSelectedFile(null);
    setLocalPreview(null);
    setUploadProgress(0);
    setUploading(false);
  };

  const handleDeletePortfolioItem = async (itemId: string) => {
    const targetItem = portfolioItems.find(i => i.id === itemId);
    if (window.confirm(`Are you sure you want to remove "${targetItem?.title || 'this item'}" from the digital exhibition?`)) {
      const success = await deleteExhibition(itemId);
      if (success) {
        addActivityLog(`Removed exhibition masterpiece: ${targetItem?.title || itemId}`, 'warn');
        await loadPortfolioData();
      } else {
        alert('Failed to delete masterpiece from database.');
      }
    }
  };

  const handleEditPortfolioItem = (item: PortfolioItem) => {
    setEditingItemId(item.id);
    setFormTitle(item.title);
    setFormCategory(item.category as any);
    setFormLocation(item.location);
    setFormImage(item.image);
    setFormDescription(item.description);
    setFormDate(item.date);
    setFormCameraSetup(item.cameraSetup || '');
    setIsAddingItem(true);
  };

  // Booking verification delete
  const handleDeleteBooking = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client reservation? This action is irreversible.')) {
      try {
        await deleteBooking(id);
        addActivityLog('Deleted client reservation request', 'warn');
        loadBookingsData();
      } catch (err: any) {
        alert('Failed to delete reservation: ' + err.message);
      }
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  // Quick actions trigger
  const handleQuickAction = (action: string) => {
    if (action === 'visual-editor') {
      localStorage.setItem('visual_edit_mode', 'true');
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new Event('popstate'));
    } else if (action === 'add-photo') {
      setActiveTab('gallery');
      setIsAddingItem(true);
    } else if (action === 'add-service') {
      setActiveTab('services');
    } else if (action === 'toggle-maintenance') {
      const current = cmsConfig.advanced?.maintenanceMode || false;
      handleSaveCmsConfig({
        ...cmsConfig,
        advanced: {
          ...cmsConfig.advanced,
          maintenanceMode: !current
        }
      });
    } else if (action === 'export-json') {
      setActiveTab('backup');
    }
  };

  // Layout sidebar item builder helper
  const renderSidebarItem = (tab: AdminTab, label: string, icon: React.ReactNode) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => {
          setActiveTab(tab);
          setMobileMenuOpen(false);
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-mono tracking-wider text-left transition-all cursor-pointer ${
          active 
            ? 'bg-[#2EC4B6]/15 text-[#2EC4B6] font-bold border-l-2 border-[#2EC4B6]' 
            : 'text-[#A7C4B8] hover:bg-white/5 hover:text-white'
        }`}
      >
        <span className={active ? 'text-[#2EC4B6]' : 'text-brand-muted'}>{icon}</span>
        <span>{label}</span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#071A14] text-[#F8FFF9] flex flex-col font-sans" style={{ '--primary-color': cmsConfig.theme?.primaryColor || '#071A14', '--accent-color': cmsConfig.theme?.accentColor || '#2EC4B6' } as any}>
      
      {/* PERSISTENT HEADER HUD */}
      <header className="py-4 px-6 bg-[#10261F] border-b border-white/5 sticky top-0 z-50 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white lg:hidden"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-baseline gap-2">
            <h1 className="text-sm font-space font-bold tracking-widest text-white uppercase flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#2EC4B6]" />
              <span>VERIFIED CMS</span>
            </h1>
            <span className="text-[10px] font-mono text-brand-muted hidden sm:inline">v2.1 Stable</span>
          </div>
        </div>

        {/* Access Metrics */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden md:flex items-center gap-2 text-brand-muted">
            <Clock className="w-3.5 h-3.5 text-[#2EC4B6]" />
            <span>Inactivity Timeout:</span>
            <span className={`font-bold ${inactivityTimer < 60 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
              {formatTimer(inactivityTimer)}
            </span>
          </div>
          
          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* User badge */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-[#A7C4B8] max-w-[120px] truncate">
              {sessionUser?.email || 'System Admin'}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/15 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center gap-1"
            title="Sign out of Admin Dashboard"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* BODY SIDEBAR LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* SIDEBAR PANEL */}
        <aside className={`w-[240px] bg-[#10261F] border-r border-white/5 p-4 flex-shrink-0 flex flex-col justify-between overflow-y-auto transition-all lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 absolute inset-y-[68px] left-0 z-40' : '-translate-x-full lg:static absolute'
        }`}>
          
          <div className="space-y-6">
            
            {/* Group 1: Operations */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#2EC4B6]/85 uppercase block px-3">OPERATIONS HUB</span>
              {renderSidebarItem('dashboard', 'Overview Metric', <Activity className="w-3.5 h-3.5" />)}
              <button
                onClick={() => {
                  localStorage.setItem('visual_edit_mode', 'true');
                  window.history.pushState(null, '', '/');
                  window.dispatchEvent(new Event('popstate'));
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-mono tracking-wider text-left transition-all cursor-pointer text-[#2EC4B6] bg-[#2EC4B6]/5 hover:bg-[#2EC4B6]/15 border-l-2 border-[#2EC4B6] mb-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2EC4B6] animate-pulse" />
                <span>Visual Live Editor</span>
              </button>
              {renderSidebarItem('bookings', 'Reservation Vault', <Calendar className="w-3.5 h-3.5" />)}
              {renderSidebarItem('logs', 'Auditing Logs', <Terminal className="w-3.5 h-3.5" />)}
            </div>

            {/* Group 2: Exhibitions */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#2EC4B6]/85 uppercase block px-3">EXHIBITIONS</span>
              {renderSidebarItem('gallery', 'Exhibition Art', <Grid className="w-3.5 h-3.5" />)}
              {renderSidebarItem('media', 'Media Vault', <ImageIcon className="w-3.5 h-3.5" />)}
            </div>

            {/* Group 3: Core Copywriting */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#2EC4B6]/85 uppercase block px-3">PAGE LAYOUT</span>
              {renderSidebarItem('hero', 'Hero Canvas', <Layers className="w-3.5 h-3.5" />)}
              {renderSidebarItem('navigation', 'Nav & Socials', <Link2 className="w-3.5 h-3.5" />)}
              {renderSidebarItem('about', 'About Vision', <User className="w-3.5 h-3.5" />)}
            </div>

            {/* Group 4: Structured Content */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#2EC4B6]/85 uppercase block px-3">STRUCTURED CMS</span>
              {renderSidebarItem('services', 'Services Offered', <Wrench className="w-3.5 h-3.5" />)}
              {renderSidebarItem('pricing', 'Pricing Packages', <TrendingUp className="w-3.5 h-3.5" />)}
              {renderSidebarItem('faq', 'FAQ Modules', <HelpCircle className="w-3.5 h-3.5" />)}
              {renderSidebarItem('team', 'Studio Team', <Users className="w-3.5 h-3.5" />)}
              {renderSidebarItem('blogs', 'Editorial Blogs', <BookOpen className="w-3.5 h-3.5" />)}
            </div>

            {/* Group 5: Visual Customizers */}
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono font-bold tracking-wider text-[#2EC4B6]/85 uppercase block px-3">SYSTEM SETTINGS</span>
              {renderSidebarItem('theme', 'Visual Theme', <Palette className="w-3.5 h-3.5" />)}
              {renderSidebarItem('animations', 'Motion Engine', <Sliders className="w-3.5 h-3.5" />)}
              {renderSidebarItem('seo', 'SEO & Analytics', <Search className="w-3.5 h-3.5" />)}
              {renderSidebarItem('security', 'Cryptography Key', <Lock className="w-3.5 h-3.5" />)}
              {renderSidebarItem('backup', 'System Backup', <Database className="w-3.5 h-3.5" />)}
              {renderSidebarItem('supabase', 'Supabase Curation', <Database className="w-3.5 h-3.5 text-[#D4AF37]" />)}
              {renderSidebarItem('setup_center', 'Supabase Setup Center', <Terminal className="w-3.5 h-3.5" />)}
            </div>

          </div>

          <div className="pt-6 border-t border-white/5 text-[9px] font-mono text-brand-muted text-center mt-6">
            Connected to Supabase DB • Verified
          </div>

        </aside>

        {/* MAIN DISPLAY PORT */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-[#071A14]">
          
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW METRICS TAB */}
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="dashboard">
                <DashboardHome 
                  cmsConfig={cmsConfig}
                  portfolioItems={portfolioItems}
                  bookingsCount={bookings.length}
                  securityLogsCount={securityLogs.length}
                  recentActivity={recentActivity}
                  onQuickAction={handleQuickAction}
                  isAdminLoggedIn={!!sessionUser}
                />
              </motion.div>
            )}

            {/* RESERVATIONS PORTAL */}
            {activeTab === 'bookings' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="bookings">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#2EC4B6]" />
                      <span>Client Reservation Vault</span>
                      <span className="text-xs font-mono text-[#A7C4B8] bg-white/5 px-2.5 py-0.5 rounded-full font-normal">
                        {bookings.length} Records
                      </span>
                    </h2>
                    <p className="text-xs text-[#A7C4B8] mt-1">
                      Verify high-intent photoshoot bookings, update scheduling calendars, and coordinate custom requirements.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {bookings.map((booking) => (
                      <div 
                        key={booking.id}
                        className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-[#2EC4B6]/25 transition-all relative overflow-hidden flex flex-col md:flex-row justify-between gap-6"
                      >
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#2EC4B6]" />
                        
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xs font-space font-bold text-white">{booking.name}</h4>
                            <span className="text-[10px] font-mono text-brand-muted">({booking.email})</span>
                            <span className="text-[9px] font-mono font-bold uppercase bg-[#2EC4B6]/10 text-[#2EC4B6] border border-[#2EC4B6]/15 px-2 py-0.5 rounded ml-2">
                              {booking.category}
                            </span>
                          </div>

                          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-[11px] font-sans text-brand-muted">
                            <div>
                              <span className="text-[9px] font-mono uppercase text-brand-muted block">Phone:</span>
                              <a href={`tel:${booking.phone}`} className="text-white font-semibold block mt-0.5">{booking.phone}</a>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono uppercase text-brand-muted block">Location:</span>
                              <span className="text-white block mt-0.5">{booking.location}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono uppercase text-brand-muted block">Session Date & Time:</span>
                              <span className="text-[#6EE7B7] block font-mono mt-0.5">{booking.date} @ {booking.time}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono uppercase text-brand-muted block">Selected Plan:</span>
                              <span className="text-white font-semibold block mt-0.5">{booking.planName || 'Custom'}</span>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                            <span className="text-[9px] font-mono uppercase text-[#2EC4B6] block">Special Requirements / Notes:</span>
                            <p className="text-[11px] text-[#A7C4B8] font-sans mt-1 leading-relaxed">{booking.notes}</p>
                          </div>
                        </div>

                        <div className="flex md:flex-col justify-end gap-2.5 flex-shrink-0">
                          <button
                            onClick={() => handleDeleteBooking(booking.id)}
                            className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-semibold"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove Reservation</span>
                          </button>
                        </div>
                      </div>
                    ))}

                    {bookings.length === 0 && (
                      <div className="p-12 text-center text-brand-muted text-xs font-mono">
                        No active booking requests detected.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* AUDITING LOGS */}
            {activeTab === 'logs' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="logs">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
                      <Terminal className="w-5 h-5 text-[#2EC4B6]" />
                      <span>Administrative Access Auditing</span>
                      <span className="text-xs font-mono text-[#A7C4B8] bg-white/5 px-2.5 py-0.5 rounded-full font-normal">
                        {securityLogs.length} Records
                      </span>
                    </h2>
                    <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
                      Real-time security logs documenting administrative login attempts, authentication providers, and outcomes.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
                    <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center text-[10px] font-mono text-[#A7C4B8] uppercase tracking-wider">
                      <div className="w-[30%]">TIMESTAMP</div>
                      <div className="w-[30%]">EMAIL ACCOUNT</div>
                      <div className="w-[20%]">METHOD / TYPE</div>
                      <div className="w-[20%]">SECURITY OUTCOME</div>
                    </div>

                    <div className="divide-y divide-white/5 font-mono text-[11px]">
                      {securityLogs.map((log, idx) => {
                        const isSuccess = log.status === 'SUCCESS';
                        return (
                          <div key={idx} className="p-4 flex items-center hover:bg-white/[0.01] transition-colors">
                            <div className="w-[30%] text-[#A7C4B8]">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                            <div className="w-[30%] text-white font-semibold truncate pr-4">
                              {log.email}
                            </div>
                            <div className="w-[20%]">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[9px] text-white">
                                {log.method}
                              </span>
                            </div>
                            <div className="w-[20%]">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                isSuccess
                                  ? 'bg-[#2EC4B6]/10 text-[#2EC4B6] border border-[#2EC4B6]/20'
                                  : log.status === 'ATTEMPT'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isSuccess ? 'bg-[#2EC4B6]' : log.status === 'ATTEMPT' ? 'bg-amber-400' : 'bg-red-400'
                                }`} />
                                <span>{log.status}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {securityLogs.length === 0 && (
                        <div className="p-12 text-center text-brand-muted">
                          No administrative access logs recorded in the system yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PORTFOLIO EXHIBITIONS MASTERPIECES */}
            {activeTab === 'gallery' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="gallery">
                <div className="space-y-6">
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
                        <Grid className="w-5 h-5 text-[#2EC4B6]" />
                        <span>Curated Exhibition Masterpieces</span>
                        <span className="text-xs font-mono text-[#A7C4B8] bg-white/5 px-2.5 py-0.5 rounded-full font-normal">
                          {portfolioItems.length} Artworks
                        </span>
                      </h2>
                      <p className="text-xs text-[#A7C4B8] mt-1">
                        Add, update, or remove physical image assets and gear calibrations loaded in the public landing portfolio.
                      </p>
                    </div>

                    {!isAddingItem && (
                      <button 
                        onClick={() => setIsAddingItem(true)}
                        className="px-4 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Curate Masterpiece</span>
                      </button>
                    )}
                  </div>

                  {/* Curate Form overlay */}
                  {isAddingItem && (
                    <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
                      <h3 className="font-space font-bold text-sm text-[#2EC4B6]">
                        {editingItemId ? 'Re-calibrate Piece' : 'Expose New Exhibition Masterpiece'}
                      </h3>
                      
                      <form onSubmit={handleSavePortfolioItem} className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Piece Title</label>
                            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} required placeholder="Traditional Elegance" className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Image / Masterpiece File</label>
                            <div className="flex flex-col gap-3">
                              {/* File Input and visual state indicator */}
                              <div className="flex items-center gap-3">
                                <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 hover:border-[#2EC4B6]/50 rounded-xl p-3 bg-black/20 cursor-pointer transition-colors group">
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        if (!file.type.startsWith('image/')) {
                                          alert('Please select a valid image file.');
                                          return;
                                        }
                                        setSelectedFile(file);
                                        setLocalPreview(URL.createObjectURL(file));
                                        if (!formTitle) {
                                          const cleanName = file.name.split('.')[0].replace(/[^a-zA-Z0-9 ]/g, '');
                                          setFormTitle(cleanName);
                                        }
                                      }
                                    }}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-[#A7C4B8] group-hover:text-[#2EC4B6] transition-colors" />
                                    <span className="text-xs text-white font-space">Upload Image</span>
                                  </div>
                                  <span className="text-[9px] text-[#A7C4B8] mt-1 font-mono uppercase">Click to select file from device</span>
                                </label>

                                {localPreview && (
                                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 bg-black/30">
                                    <img src={localPreview} alt="Local preview" className="w-full h-full object-cover" />
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        setSelectedFile(null);
                                        setLocalPreview(null);
                                      }}
                                      className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity text-[9px] text-red-400 font-mono font-bold uppercase cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Progress bar / uploading state */}
                              {uploading && (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[9px] font-mono text-[#2EC4B6]">
                                    <span>UPLOADING TO CLOUD VAULT...</span>
                                    <span>{uploadProgress}%</span>
                                  </div>
                                  <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-[#2EC4B6] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                                  </div>
                                </div>
                              )}

                              {/* Paste URL fallback */}
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-mono text-brand-muted uppercase">OR PASTE DIRECT URL:</span>
                                <input 
                                  type="text" 
                                  value={formImage} 
                                  onChange={e => {
                                    setFormImage(e.target.value);
                                    if (selectedFile) {
                                      setSelectedFile(null);
                                      setLocalPreview(null);
                                    }
                                  }} 
                                  placeholder="https://images.unsplash.com..." 
                                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/30 border border-white/10 text-[11px] text-white focus:border-[#2EC4B6]/30 outline-none" 
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Theme Category</label>
                            <select value={formCategory} onChange={e => setFormCategory(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl bg-[#10261F] border border-white/10 text-xs text-white">
                              <option value="Weddings">Weddings</option>
                              <option value="Portraits">Portraits</option>
                              <option value="Graduations">Graduations</option>
                              <option value="Events">Events</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Location Capture</label>
                            <input type="text" value={formLocation} onChange={e => setFormLocation(e.target.value)} required placeholder="Edo Cultural Center" className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Shooting Date</label>
                            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Gear/Camera Setup</label>
                            <input type="text" value={formCameraSetup} onChange={e => setFormCameraSetup(e.target.value)} placeholder="Sony Alpha 7RV + 85mm G-Master" className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Narrative Description</label>
                          <textarea rows={3} value={formDescription} onChange={e => setFormDescription(e.target.value)} required className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#2EC4B6]/20 bg-[#2EC4B6]/5 p-3">
                          <div>
                            <p className="text-xs font-space font-bold text-white">AI Exhibition Assistant</p>
                            <p className="text-[10px] text-[#A7C4B8]">Analyzes the selected image and fills the form. Review every suggestion before saving.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAiAutofillExhibition}
                            disabled={isAiAutofilling || uploading || (!selectedFile && !formImage)}
                            className="shrink-0 px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-400/30 text-purple-200 disabled:opacity-40 font-space font-bold text-xs flex items-center gap-2"
                          >
                            {isAiAutofilling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isAiAutofilling ? 'Analyzing…' : 'AI Auto-Fill'}
                          </button>
                        </div>

                        {formError && <p className="text-xs text-red-400 font-mono">{formError}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                          <button type="button" onClick={resetForm} className="px-4 py-2 text-xs font-mono text-brand-muted">Cancel</button>
                          <button type="submit" className="px-5 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1"><Check className="w-4 h-4" /> Save Masterpiece</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Portfolio grid */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
                    <div className="divide-y divide-white/5">
                      {portfolioItems.map((item) => (
                        <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
                          <div className="flex items-center gap-4">
                            <img src={item.image} alt={item.title} className="w-14 h-14 rounded-xl object-cover border border-white/10 flex-shrink-0" referrerPolicy="no-referrer" />
                            <div>
                              <h4 className="font-space font-bold text-sm text-white">{item.title}</h4>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px] font-mono text-brand-muted">
                                <span className="text-[#2EC4B6] font-bold bg-[#2EC4B6]/10 px-2 py-0.5 rounded uppercase">{item.category}</span>
                                <span className="flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5 text-[#2EC4B6]" /> {item.location}</span>
                                <span>•</span>
                                <span>{item.date}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                            <button onClick={() => handleEditPortfolioItem(item)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6]"><RefreshCw className="w-4 h-4" /></button>
                            <button onClick={() => handleDeletePortfolioItem(item.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* UNIFIED MEDIA VAULT */}
            {activeTab === 'media' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="media">
                <MediaLibrary />
              </motion.div>
            )}

            {/* COOP COPYWRITING & HERO EDITORS */}
            {(activeTab === 'hero' || activeTab === 'navigation' || activeTab === 'about' || activeTab === 'footer') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="sections">
                <SectionManagers 
                  config={cmsConfig}
                  onSave={handleSaveCmsConfig}
                  activeSectionTab={activeTab as any}
                />
              </motion.div>
            )}

            {/* CMS STRUCTURED DATA EDITORS */}
            {(activeTab === 'services' || activeTab === 'pricing' || activeTab === 'faq' || activeTab === 'team' || activeTab === 'blogs') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="items">
                <ItemsManagers 
                  config={cmsConfig}
                  onSave={handleSaveCmsConfig}
                  activeItemTab={activeTab as any}
                />
              </motion.div>
            )}

            {/* SETTINGS AND CUSTOMIZERS */}
            {(activeTab === 'theme' || activeTab === 'animations' || activeTab === 'seo' || activeTab === 'security' || activeTab === 'backup') && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="settings">
                <SettingsManagers 
                  config={cmsConfig}
                  onSave={handleSaveCmsConfig}
                  activeSettingsTab={activeTab as any}
                />
              </motion.div>
            )}

            {/* SUPABASE SETUP CENTER */}
            {activeTab === 'setup_center' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="setup_center">
                <SupabaseSetupCenter />
              </motion.div>
            )}

            {/* SUPABASE CURATION PANEL */}
            {activeTab === 'supabase' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key="supabase_curation">
                <SupabaseCurationPanel />
              </motion.div>
            )}

          </AnimatePresence>

        </main>

      </div>
    </div>
  );
}
