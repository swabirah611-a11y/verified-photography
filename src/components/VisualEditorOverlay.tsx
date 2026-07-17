import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Smartphone, 
  Tablet, 
  Monitor, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  ArrowUp, 
  ArrowDown, 
  Palette, 
  Layers, 
  Wrench,
  HelpCircle,
  Undo2,
  Image as ImageIcon,
  Sliders,
  CloudLightning,
  ChevronRight,
  Menu
} from 'lucide-react';
import { CmsConfig } from '../lib/supabase';

interface VisualEditorOverlayProps {
  config: CmsConfig;
  onSaveConfig: (newConfig: CmsConfig) => void;
  onExit: () => void;
  deviceView: 'desktop' | 'tablet' | 'mobile';
  setDeviceView: (view: 'desktop' | 'tablet' | 'mobile') => void;
  sectionsOrder: string[];
  setSectionsOrder: (order: string[]) => void;
  sectionsVisibility: Record<string, boolean>;
  setSectionsVisibility: (vis: Record<string, boolean>) => void;
}

export default function VisualEditorOverlay({
  config,
  onSaveConfig,
  onExit,
  deviceView,
  setDeviceView,
  sectionsOrder,
  setSectionsOrder,
  sectionsVisibility,
  setSectionsVisibility,
}: VisualEditorOverlayProps) {
  const [editorConfig, setEditorConfig] = useState<CmsConfig>({ ...config });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sections' | 'style' | 'seo'>('sections');
  const [isPublishing, setIsPublishing] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // Sync state when config updates externally
  React.useEffect(() => {
    setEditorConfig({ ...config });
  }, [config]);

  const handleColorChange = (key: keyof CmsConfig['theme'], color: string) => {
    const updated = {
      ...editorConfig,
      theme: {
        ...editorConfig.theme,
        [key]: color
      }
    };
    setEditorConfig(updated);
    // Instant live preview
    onSaveConfig(updated);
  };

  const handleToggleVisibility = (section: string) => {
    const updatedVis = {
      ...sectionsVisibility,
      [section]: !sectionsVisibility[section]
    };
    setSectionsVisibility(updatedVis);
    
    // Save to configuration visibility map
    const updated = {
      ...editorConfig,
      advanced: {
        ...editorConfig.advanced,
        sectionsVisibility: updatedVis
      } as any
    };
    setEditorConfig(updated);
    onSaveConfig(updated);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...sectionsOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      // Swap elements
      const temp = newOrder[index];
      newOrder[index] = newOrder[targetIndex];
      newOrder[targetIndex] = temp;
      
      setSectionsOrder(newOrder);
      
      const updated = {
        ...editorConfig,
        advanced: {
          ...editorConfig.advanced,
          sectionsOrder: newOrder
        } as any
      };
      setEditorConfig(updated);
      onSaveConfig(updated);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    // Simulate API database submission delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsPublishing(false);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <>
      {/* 1. STICKY TOP EDITOR STATUS BAR */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-[#10261F]/90 backdrop-blur-md border-b border-white/10 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl text-white">
        
        {/* Left Side: Brand branding and state indicator */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2EC4B6]/20 border border-[#2EC4B6]/30 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#2EC4B6] animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-space font-bold tracking-widest text-white uppercase flex items-center gap-1.5">
              <span>VISUAL EDITOR MODE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            </h1>
            <p className="text-[9px] font-mono text-[#A7C4B8] uppercase">
              Click text directly to edit copywriting • Hover images to swap
            </p>
          </div>
        </div>

        {/* Center: Device previews simulator selectors */}
        <div className="flex items-center bg-black/40 rounded-xl p-1 border border-white/5 gap-1">
          <button 
            onClick={() => setDeviceView('desktop')}
            className={`p-1.5 rounded-lg transition-all ${deviceView === 'desktop' ? 'bg-[#2EC4B6] text-[#071A14]' : 'text-[#A7C4B8] hover:text-white'}`}
            title="Desktop view"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setDeviceView('tablet')}
            className={`p-1.5 rounded-lg transition-all ${deviceView === 'tablet' ? 'bg-[#2EC4B6] text-[#071A14]' : 'text-[#A7C4B8] hover:text-white'}`}
            title="Tablet view"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setDeviceView('mobile')}
            className={`p-1.5 rounded-lg transition-all ${deviceView === 'mobile' ? 'bg-[#2EC4B6] text-[#071A14]' : 'text-[#A7C4B8] hover:text-white'}`}
            title="Mobile view"
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Right Side: Action CTA buttons */}
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Customize Outline</span>
          </button>

          <button
            onClick={onExit}
            className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/15 text-red-400 flex items-center gap-1 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Exit Editor</span>
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="px-4 py-1.5 rounded-lg bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-bold flex items-center gap-1.5 cursor-pointer hover:shadow-[0_0_15px_rgba(46,196,182,0.4)] transition-all disabled:opacity-50"
          >
            {isPublishing ? (
              <>
                <div className="w-3 h-3 border-2 border-[#071A14] border-t-transparent rounded-full animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Publish Instantly</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. SIDEBAR OUTLINE DRAWER */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0, x: 260 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 260 }}
            className="fixed right-4 top-20 bottom-4 w-72 z-50 rounded-2xl bg-[#10261F]/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden flex flex-col text-white"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs font-space font-bold text-[#2EC4B6] tracking-widest flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                <span>STUDIO DESIGN HUB</span>
              </span>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 text-brand-muted hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div className="grid grid-cols-3 border-b border-white/5 text-[9px] font-mono uppercase text-center">
              <button onClick={() => setActiveTab('sections')} className={`py-2 border-b-2 ${activeTab === 'sections' ? 'border-[#2EC4B6] text-white' : 'border-transparent text-[#A7C4B8] hover:text-white'}`}>Sections</button>
              <button onClick={() => setActiveTab('style')} className={`py-2 border-b-2 ${activeTab === 'style' ? 'border-[#2EC4B6] text-white' : 'border-transparent text-[#A7C4B8] hover:text-white'}`}>Theme</button>
              <button onClick={() => setActiveTab('seo')} className={`py-2 border-b-2 ${activeTab === 'seo' ? 'border-[#2EC4B6] text-white' : 'border-transparent text-[#A7C4B8] hover:text-white'}`}>SEO</button>
            </div>

            {/* Sidebar Main Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* SECTIONS TAB */}
              {activeTab === 'sections' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-mono text-[#A7C4B8] uppercase">Section Layout & Order</div>
                  
                  <div className="space-y-2">
                    {sectionsOrder.map((sec, idx) => {
                      const isVisible = sectionsVisibility[sec] !== false;
                      return (
                        <div 
                          key={sec} 
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                            isVisible 
                              ? 'bg-white/[0.02] border-white/10' 
                              : 'bg-black/40 border-white/5 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[#A7C4B8]">#{idx + 1}</span>
                            <span className="text-xs font-space capitalize">{sec}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Reorder Arrows */}
                            <button 
                              onClick={() => handleMoveSection(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#A7C4B8] hover:text-[#2EC4B6] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => handleMoveSection(idx, 'down')}
                              disabled={idx === sectionsOrder.length - 1}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-[#A7C4B8] hover:text-[#2EC4B6] disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>

                            {/* Visibility Switch */}
                            <button 
                              onClick={() => handleToggleVisibility(sec)}
                              className={`p-1 rounded ${isVisible ? 'bg-[#2EC4B6]/10 text-[#2EC4B6]' : 'bg-red-500/10 text-red-400'} cursor-pointer`}
                              title={isVisible ? "Hide section" : "Show section"}
                            >
                              {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* THEME TAB */}
              {activeTab === 'style' && (
                <div className="space-y-4 text-xs font-sans">
                  <div className="text-[10px] font-mono text-[#A7C4B8] uppercase">Color Scheme Palette</div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block mb-1">Primary Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={editorConfig.theme.primaryColor} 
                          onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" 
                        />
                        <input 
                          type="text" 
                          value={editorConfig.theme.primaryColor} 
                          onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                          className="flex-1 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block mb-1">Accent Glow</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={editorConfig.theme.accentColor} 
                          onChange={(e) => handleColorChange('accentColor', e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" 
                        />
                        <input 
                          type="text" 
                          value={editorConfig.theme.accentColor} 
                          onChange={(e) => handleColorChange('accentColor', e.target.value)}
                          className="flex-1 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block mb-1">Background Canvas</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={editorConfig.theme.backgroundColor} 
                          onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" 
                        />
                        <input 
                          type="text" 
                          value={editorConfig.theme.backgroundColor} 
                          onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                          className="flex-1 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block mb-1">Readable Text Color</label>
                      <div className="flex gap-2">
                        <input 
                          type="color" 
                          value={editorConfig.theme.textColor || '#F8FFF9'} 
                          onChange={(e) => handleColorChange('textColor', e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" 
                        />
                        <input 
                          type="text" 
                          value={editorConfig.theme.textColor || '#F8FFF9'} 
                          onChange={(e) => handleColorChange('textColor', e.target.value)}
                          className="flex-1 px-3 py-1 bg-black/40 border border-white/10 rounded-lg text-white font-mono text-xs" 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SEO TAB */}
              {activeTab === 'seo' && (
                <div className="space-y-4 text-xs font-sans">
                  <div className="text-[10px] font-mono text-[#A7C4B8] uppercase">Metadata Settings</div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block mb-1">Meta Title Tag</label>
                      <input 
                        type="text" 
                        value={editorConfig.seo?.title} 
                        onChange={(e) => {
                          const updated = { ...editorConfig, seo: { ...editorConfig.seo, title: e.target.value } };
                          setEditorConfig(updated);
                          onSaveConfig(updated);
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white" 
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block mb-1">Meta Description</label>
                      <textarea 
                        rows={4}
                        value={editorConfig.seo?.description} 
                        onChange={(e) => {
                          const updated = { ...editorConfig, seo: { ...editorConfig.seo, description: e.target.value } };
                          setEditorConfig(updated);
                          onSaveConfig(updated);
                        }}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-lg text-white resize-none" 
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Sidebar Footer */}
            <div className="p-4 bg-black/20 border-t border-white/5 text-[9px] font-mono text-brand-muted text-center leading-normal">
              Changes auto-applied to preview viewport.<br />Click Publish to deploy.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. TOAST SUCCESS NOTIFICATION */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl bg-[#10261F] border border-[#2EC4B6]/30 text-white flex items-center gap-3 shadow-2xl font-sans"
          >
            <div className="w-8 h-8 rounded-full bg-[#2EC4B6]/25 border border-[#2EC4B6]/40 flex items-center justify-center text-[#2EC4B6] flex-shrink-0">
              <CloudLightning className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h4 className="font-space font-bold text-xs tracking-wide">CMS SAVED SUCCESSFULLY</h4>
              <p className="text-[10px] text-[#A7C4B8] mt-0.5">Live changes published immediately without code redeployments.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
