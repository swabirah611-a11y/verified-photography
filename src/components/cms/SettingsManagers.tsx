import React, { useState } from 'react';
import { 
  Save, 
  Palette, 
  Sliders, 
  Search, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Zap, 
  Trash2,
  Download,
  Upload,
  Lock,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { CmsConfig } from '../../lib/supabase';

interface SettingsManagersProps {
  config: CmsConfig;
  onSave: (updatedConfig: CmsConfig) => void;
  activeSettingsTab: 'theme' | 'animations' | 'seo' | 'security' | 'backup';
}

export default function SettingsManagers({ config, onSave, activeSettingsTab }: SettingsManagersProps) {
  const [formData, setFormData] = useState<CmsConfig>({ ...config });
  
  // Security Form States
  const [adminPassword, setAdminPassword] = useState('VerifiedAdmin2026!');
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const handleChange = (section: keyof CmsConfig, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Preset Theme Loader helper
  const handleApplyPreset = (presetName: string) => {
    const presets: Record<string, typeof DEFAULT_PRESET> = {
      emerald: {
        primaryColor: '#071A14',
        secondaryColor: '#10261F',
        accentColor: '#2EC4B6',
        backgroundColor: '#071A14',
        textColor: '#F8FFF9',
        borderRadius: '12px'
      },
      sapphire: {
        primaryColor: '#030712',
        secondaryColor: '#111827',
        accentColor: '#3B82F6',
        backgroundColor: '#030712',
        textColor: '#F3F4F6',
        borderRadius: '8px'
      },
      charcoal: {
        primaryColor: '#0F0F0F',
        secondaryColor: '#1A1A1A',
        accentColor: '#E5E5E5',
        backgroundColor: '#0F0F0F',
        textColor: '#FFFFFF',
        borderRadius: '4px'
      },
      terracotta: {
        primaryColor: '#1F110D',
        secondaryColor: '#2B1B15',
        accentColor: '#E05A47',
        backgroundColor: '#1F110D',
        textColor: '#FFFBF9',
        borderRadius: '16px'
      }
    };

    const sel = presets[presetName];
    if (sel) {
      setFormData(prev => ({
        ...prev,
        theme: {
          ...prev.theme,
          ...sel
        }
      }));
    }
  };

  // Backup & Restore handlers
  const handleExportConfig = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `verified_cms_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && parsed.hero && parsed.navigation) {
            setFormData(parsed);
            onSave(parsed);
            alert('CMS Configuration Backup restored successfully! Instantly updated.');
          } else {
            alert('Invalid backup file. Ensure it is a valid CMS configuration JSON.');
          }
        } catch {
          alert('Error parsing JSON backup.');
        }
      };
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus('Saving...');
    // Simulate updating mock password in sandbox
    setTimeout(() => {
      setPasswordStatus('Administrative credentials saved in secure sandbox vault!');
      setTimeout(() => setPasswordStatus(null), 4000);
    }, 1000);
  };

  const DEFAULT_PRESET = {
    primaryColor: '#071A14',
    secondaryColor: '#10261F',
    accentColor: '#2EC4B6',
    backgroundColor: '#071A14',
    textColor: '#F8FFF9',
    borderRadius: '12px'
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      
      {/* THEME CUSTOMIZER */}
      {activeSettingsTab === 'theme' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#2EC4B6]" />
              <span>Cinematic Theme Customizer</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
              Instantly alter the color curves, micro-radius, and glass backgrounds across the live public landing page.
            </p>
          </div>

          {/* Theme Presets */}
          <div className="p-5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
            <span className="text-[10px] font-mono text-[#2EC4B6] uppercase block font-bold">One-Click Design Presets</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button type="button" onClick={() => handleApplyPreset('emerald')} className="p-3.5 rounded-xl bg-[#071A14] border border-[#2EC4B6]/25 hover:border-[#2EC4B6] transition-all text-left group cursor-pointer">
                <span className="text-xs font-bold text-white block">Emerald Deep</span>
                <span className="text-[9px] text-[#2EC4B6] font-mono mt-0.5">Verified Standard</span>
              </button>
              <button type="button" onClick={() => handleApplyPreset('sapphire')} className="p-3.5 rounded-xl bg-[#030712] border border-blue-500/20 hover:border-blue-400 transition-all text-left group cursor-pointer">
                <span className="text-xs font-bold text-white block">Sapphire Night</span>
                <span className="text-[9px] text-blue-400 font-mono mt-0.5">High Tech Blue</span>
              </button>
              <button type="button" onClick={() => handleApplyPreset('charcoal')} className="p-3.5 rounded-xl bg-[#0F0F0F] border border-white/10 hover:border-white/30 transition-all text-left group cursor-pointer">
                <span className="text-xs font-bold text-white block">Pure Brutalist</span>
                <span className="text-[9px] text-white font-mono mt-0.5">Minimalist Slate</span>
              </button>
              <button type="button" onClick={() => handleApplyPreset('terracotta')} className="p-3.5 rounded-xl bg-[#1F110D] border border-orange-500/20 hover:border-orange-400 transition-all text-left group cursor-pointer">
                <span className="text-xs font-bold text-white block">Terracotta Clay</span>
                <span className="text-[9px] text-orange-400 font-mono mt-0.5">Warm Editorial</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Color Palette Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Primary Color (Hex)</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.theme.primaryColor} onChange={e => handleChange('theme', 'primaryColor', e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" />
                    <input type="text" value={formData.theme.primaryColor} onChange={e => handleChange('theme', 'primaryColor', e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Secondary Color (Hex)</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.theme.secondaryColor} onChange={e => handleChange('theme', 'secondaryColor', e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" />
                    <input type="text" value={formData.theme.secondaryColor} onChange={e => handleChange('theme', 'secondaryColor', e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Accent Brand Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.theme.accentColor} onChange={e => handleChange('theme', 'accentColor', e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" />
                    <input type="text" value={formData.theme.accentColor} onChange={e => handleChange('theme', 'accentColor', e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Main Background Canvas</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.theme.backgroundColor} onChange={e => handleChange('theme', 'backgroundColor', e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" />
                    <input type="text" value={formData.theme.backgroundColor} onChange={e => handleChange('theme', 'backgroundColor', e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Global Readable Typography Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={formData.theme.textColor || '#F8FFF9'} onChange={e => handleChange('theme', 'textColor', e.target.value)} className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer" />
                    <input type="text" value={formData.theme.textColor || '#F8FFF9'} onChange={e => handleChange('theme', 'textColor', e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Spacing & Radius Style</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Global Border Radius (e.g. 12px or 1.5rem)</label>
                  <input type="text" value={formData.theme.borderRadius || '12px'} onChange={e => handleChange('theme', 'borderRadius', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none" />
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="text-xs font-space font-bold text-white block">Glassmorphism Overlay Effects</span>
                      <span className="text-[10px] text-brand-muted">Applies high-end blur filters</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.theme.glassEffect !== false} 
                        onChange={(e) => handleChange('theme', 'glassEffect', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2EC4B6]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ANIMATIONS SETTINGS */}
      {activeSettingsTab === 'animations' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#2EC4B6]" />
              <span>Animation Engine Settings</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
              Toggle specific Framer Motion, GSAP, or browser effects on the client website to control load speeds and interactivity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Interactivity Features</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-space font-bold text-white block">Custom Cursor Follower Glow</span>
                    <span className="text-[10px] text-brand-muted">Follows user desktop mouse cursor</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.theme.cursorEffect !== false} onChange={(e) => handleChange('theme', 'cursorEffect', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2EC4B6]"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-space font-bold text-white block">Cinematic Floating Backdrops</span>
                    <span className="text-[10px] text-brand-muted">Adds parallax floating bubble elements</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.theme.floatingEffects !== false} onChange={(e) => handleChange('theme', 'floatingEffects', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2EC4B6]"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Motion Foundations</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-space font-bold text-white block">Full Page Transition Fades</span>
                    <span className="text-[10px] text-brand-muted">Smoothly slides layout components in</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={formData.theme.pageTransitions !== false} onChange={(e) => handleChange('theme', 'pageTransitions', e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-white/5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2EC4B6]"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEO & GOOGLE METRICS */}
      {activeSettingsTab === 'seo' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Search className="w-5 h-5 text-[#2EC4B6]" />
              <span>SEO Meta & Analytical Parameters</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
              Optimizes the studio ranking indexes across major web search crawlers and sets Google tracking IDs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Search Engine Snippet</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Global SEO Title Override</label>
                  <input type="text" value={formData.seo?.title || ''} onChange={e => handleChange('seo', 'title', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Meta Description</label>
                  <textarea rows={4} value={formData.seo?.description || ''} onChange={e => handleChange('seo', 'description', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Keywords Tags (comma-separated)</label>
                  <input type="text" value={formData.seo?.keywords || ''} onChange={e => handleChange('seo', 'keywords', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Analytic Integrations</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Google Analytics 4 Measurement ID</label>
                  <input type="text" value={formData.advanced?.googleAnalyticsId || ''} onChange={e => handleChange('advanced', 'googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Contact Email Notifications Receiver</label>
                  <input type="text" value={formData.advanced?.emailNotifications || ''} onChange={e => handleChange('advanced', 'emailNotifications', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Active WhatsApp Mobile Hotline</label>
                  <input type="text" value={formData.advanced?.whatsappPhone || ''} onChange={e => handleChange('advanced', 'whatsappPhone', e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITY CONTROLS */}
      {activeSettingsTab === 'security' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2EC4B6]" />
              <span>Admin Security & Sessions</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
              Review authentication mechanisms, session states, and active security controls protecting the studio.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
            <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#2EC4B6]" />
              <span>Supabase Authentication Engine</span>
            </h3>

            <div className="max-w-xl space-y-4 text-xs text-[#A7C4B8] leading-relaxed">
              <p>
                This administration panel utilizes **Supabase Authentication** with standard JWT tokens. All session metadata, database rows, and access control tokens are fully encrypted and verified server-side using secure Row Level Security (RLS) policies.
              </p>
              
              <div className="p-4 rounded-xl bg-black/40 border border-[#2EC4B6]/20 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-[#2EC4B6] font-bold">
                  Active Access Control Scheme
                </p>
                <ul className="list-disc pl-5 space-y-1 font-sans text-[11px]">
                  <li>JWT Session Token verified automatically on every transition.</li>
                  <li>Authorization verified through corresponding row-lookup in the <code className="font-mono text-white text-[10px] bg-white/5 px-1 py-0.5 rounded">public.profiles</code> table.</li>
                  <li>Role-based access requires <code className="font-mono text-white text-[10px] bg-white/5 px-1 py-0.5 rounded">role = 'admin'</code> to write database rows.</li>
                </ul>
              </div>

              <p className="text-[11px] italic">
                Note: To update administrator passwords, reset passwords, or provision new admins, please log in directly to your official **Supabase Dashboard Console** under the Auth tab.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* BACKUP & RESTORE */}
      {activeSettingsTab === 'backup' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-[#2EC4B6]" />
              <span>Database Backup & High Availability</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
              Export the entire CMS visual configuration array into a lightweight JSON file or upload past backups to perform a full restore.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6] flex items-center gap-1.5">
                <Download className="w-4 h-4" />
                <span>Export Configuration Data</span>
              </h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                Creates a secure, offline, fully compiled metadata backup. Includes all Hero descriptions, colors, services catalog, and pricing options in a portable package.
              </p>
              <button 
                type="button"
                onClick={handleExportConfig}
                className="w-full py-3 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Export JSON Backup File</span>
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6] flex items-center gap-1.5">
                <Upload className="w-4 h-4" />
                <span>Restore Snapshot</span>
              </h3>
              <p className="text-xs text-brand-muted leading-relaxed">
                Select a previously exported `.json` snapshot metadata file to override the current website settings. Warning: Overwrites unsaved settings.
              </p>
              
              <div className="relative">
                <input 
                  type="file" 
                  accept=".json"
                  onChange={handleImportConfig}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="p-4 rounded-xl border border-dashed border-white/10 hover:border-[#2EC4B6]/40 text-center transition-colors">
                  <span className="text-xs font-mono text-[#A7C4B8] block">Select Snapshot File</span>
                  <span className="text-[9px] text-brand-muted block mt-1">Accepts verified_cms_backup_*.json</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENCE BUTTON */}
      {activeSettingsTab !== 'backup' && activeSettingsTab !== 'security' && (
        <div className="pt-4 border-t border-white/5 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(46,196,182,0.25)] hover:shadow-[0_0_25px_rgba(46,196,182,0.4)] active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Configuration Block</span>
          </button>
        </div>
      )}

    </form>
  );
}
