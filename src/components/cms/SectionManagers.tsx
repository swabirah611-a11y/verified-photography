import React, { useEffect, useState } from 'react';
import { 
  Save, 
  HelpCircle, 
  ChevronRight, 
  MapPin, 
  Plus, 
  Trash2, 
  Eye, 
  RefreshCw,
  Camera,
  Layers,
  Sparkles,
  Link2
} from 'lucide-react';
import { CmsConfig } from '../../lib/supabase';
import MediaUploader from './MediaUploader';

interface SectionManagersProps {
  config: CmsConfig;
  onSave: (updatedConfig: CmsConfig) => void;
  activeSectionTab: 'hero' | 'navigation' | 'about' | 'footer';
}

export default function SectionManagers({ config, onSave, activeSectionTab }: SectionManagersProps) {
  const [formData, setFormData] = useState<CmsConfig>({ ...config });
  const [newLocation, setNewLocation] = useState('');
  const [newStatValue, setNewStatValue] = useState(0);
  const [newStatSuffix, setNewStatSuffix] = useState('+');
  const [newStatLabel, setNewStatLabel] = useState('');
  
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDesc, setNewTimelineDesc] = useState('');
  const [isAboutAiScanning, setIsAboutAiScanning] = useState(false);
  const [aboutAiError, setAboutAiError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(config);
  }, [config, activeSectionTab]);

  // Handle updates locally first
  const handleChange = (section: keyof CmsConfig, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [field]: value
      }
    }));
  };

  const handleNestedChange = (section: keyof CmsConfig, nestedField: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        [nestedField]: {
          ...(prev[section] as any)[nestedField],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Locations manager helpers
  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    const currentLocs = formData.hero.locations || [];
    if (!currentLocs.includes(newLocation.trim())) {
      const updatedLocs = [...currentLocs, newLocation.trim()];
      handleChange('hero', 'locations', updatedLocs);
    }
    setNewLocation('');
  };

  const handleRemoveLocation = (loc: string) => {
    const updatedLocs = (formData.hero.locations || []).filter(l => l !== loc);
    handleChange('hero', 'locations', updatedLocs);
  };

  // Stats manager helpers
  const handleAddStat = () => {
    if (!newStatLabel.trim()) return;
    const currentStats = formData.about.stats || [];
    const updatedStats = [...currentStats, { value: newStatValue, suffix: newStatSuffix, label: newStatLabel }];
    handleChange('about', 'stats', updatedStats);
    setNewStatValue(0);
    setNewStatSuffix('+');
    setNewStatLabel('');
  };

  const handleRemoveStat = (index: number) => {
    const updatedStats = (formData.about.stats || []).filter((_, i) => i !== index);
    handleChange('about', 'stats', updatedStats);
  };

  // Timeline helpers
  const handleAddTimeline = () => {
    if (!newTimelineTitle.trim()) return;
    const currentTimeline = formData.about.timeline || [];
    const updatedTimeline = [...currentTimeline, { title: newTimelineTitle, desc: newTimelineDesc }];
    handleChange('about', 'timeline', updatedTimeline);
    setNewTimelineTitle('');
    setNewTimelineDesc('');
  };

  const handleRemoveTimeline = (index: number) => {
    const updatedTimeline = (formData.about.timeline || []).filter((_, i) => i !== index);
    handleChange('about', 'timeline', updatedTimeline);
  };

  const handleAddGalleryFrame = () => {
    const frames = formData.about.galleryFrames || [];
    const index = frames.length;
    handleChange('about', 'galleryFrames', [
      ...frames,
      {
        title: `Gallery image ${index + 1}`,
        image: '',
        xOffset: index % 2 === 0 ? -120 : 120,
        yOffset: Math.floor(index / 2) * 120 - 100,
        rotate: index % 2 === 0 ? -6 : 6,
        depth: 1,
        borderColor: 'border-[#2EC4B6]/30 hover:border-[#2EC4B6]/80',
        zIndex: 10 + index
      }
    ]);
  };

  const handleUpdateGalleryFrame = (index: number, field: 'title' | 'image', value: string) => {
    const frames = [...(formData.about.galleryFrames || [])];
    frames[index] = { ...frames[index], [field]: value };
    handleChange('about', 'galleryFrames', frames);
  };

  const handleRemoveGalleryFrame = (index: number) => {
    handleChange('about', 'galleryFrames', (formData.about.galleryFrames || []).filter((_, i) => i !== index));
  };

  const handleAboutAiScan = async (imageUrl: string) => {
    if (!imageUrl) return;
    setIsAboutAiScanning(true);
    setAboutAiError(null);
    setFormData((prev) => ({
      ...prev,
      about: { ...prev.about, founderPhoto: imageUrl }
    }));

    try {
      const response = await fetch('/api/ai/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          founderName: formData.about.founderName,
          founderRole: formData.about.founderRole
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'About image analysis failed.');
      const suggestion = payload.analysis || {};

      setFormData((prev) => ({
        ...prev,
        about: {
          ...prev.about,
          founderPhoto: imageUrl,
          title: suggestion.title || prev.about.title,
          heading: suggestion.heading || prev.about.heading,
          headingHighlight: suggestion.headingHighlight || prev.about.headingHighlight,
          description: suggestion.description || prev.about.description,
          founderRole: suggestion.founderRole || prev.about.founderRole,
          founderQuote: suggestion.founderQuote || prev.about.founderQuote
        }
      }));
    } catch (error: any) {
      setAboutAiError(error.message || String(error));
    } finally {
      setIsAboutAiScanning(false);
    }
  };

  // Prefill image URL helper
  const handlePrefillImage = (section: 'hero' | 'about', field: string, url: string) => {
    handleChange(section, field, url);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      
      {/* SECTION TABS */}
      {activeSectionTab === 'hero' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#2EC4B6]" />
              <span>Hero Section Canvas Manager</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1">
              Refine the main cinematic headings, visual backgrounds, service hubs, and call-to-actions displayed immediately upon loading.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Copywriting & Titles</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Business Brand Name</label>
                  <input 
                    type="text" 
                    value={formData.hero.businessName}
                    onChange={(e) => handleChange('hero', 'businessName', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Main Heading Left</label>
                  <input 
                    type="text" 
                    value={formData.hero.mainHeading}
                    onChange={(e) => handleChange('hero', 'mainHeading', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Heading Highlight Right</label>
                  <input 
                    type="text" 
                    value={formData.hero.subheading}
                    onChange={(e) => handleChange('hero', 'subheading', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Hero Description</label>
                  <textarea 
                    rows={4}
                    value={formData.hero.description}
                    onChange={(e) => handleChange('hero', 'description', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Background assets & CTAs</h3>
              
              <div className="space-y-3">
                <div>
                  <MediaUploader
                    value={formData.hero.bgImage}
                    onChange={(url) => handleChange('hero', 'bgImage', url)}
                    folder="hero"
                    label="Cinematic Background Image"
                    aspectRatio="aspect-[16/9]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Background Video Loop URL (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.hero.videoUrl || ''}
                    onChange={(e) => handleChange('hero', 'videoUrl', e.target.value)}
                    placeholder="E.g. direct link to .mp4 or empty to use background image"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Primary CTA Text</label>
                    <input 
                      type="text" 
                      value={formData.hero.ctaText}
                      onChange={(e) => handleChange('hero', 'ctaText', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Primary CTA Target Section</label>
                    <input 
                      type="text" 
                      value={formData.hero.ctaLink}
                      onChange={(e) => handleChange('hero', 'ctaLink', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Secondary CTA Text</label>
                    <input 
                      type="text" 
                      value={formData.hero.secondaryCtaText}
                      onChange={(e) => handleChange('hero', 'secondaryCtaText', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Secondary CTA Target Section</label>
                    <input 
                      type="text" 
                      value={formData.hero.secondaryCtaLink}
                      onChange={(e) => handleChange('hero', 'secondaryCtaLink', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Locations Hub tags editor */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
            <h3 className="font-space font-bold text-sm text-[#2EC4B6] flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Locations Serviced (Tags)</span>
            </h3>

            <div className="flex flex-wrap gap-2.5">
              {(formData.hero.locations || []).map((loc) => (
                <span key={loc} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#10261F] border border-[#2EC4B6]/20 text-xs text-white font-mono">
                  <span>{loc}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveLocation(loc)}
                    className="text-red-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-3 max-w-sm">
              <input 
                type="text" 
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="E.g. Benin City"
                className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
              />
              <button 
                type="button"
                onClick={handleAddLocation}
                className="px-4 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSectionTab === 'navigation' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[#2EC4B6]" />
              <span>Navigation Bar & Social Hub</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1">
              Manage the visual parameters, brand texts, and active social link buttons in the persistent top navigation panel.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Header Brand Display</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Logo Text Major</label>
                  <input 
                    type="text" 
                    value={formData.navigation.logoText}
                    onChange={(e) => handleChange('navigation', 'logoText', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Logo Text Subtitle</label>
                  <input 
                    type="text" 
                    value={formData.navigation.logoSubtext}
                    onChange={(e) => handleChange('navigation', 'logoSubtext', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="text-xs font-space font-bold text-white block">Sticky Navigation</span>
                      <span className="text-[10px] text-brand-muted">Keeps header fixed on scroll</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.navigation.sticky !== false} 
                        onChange={(e) => handleChange('navigation', 'sticky', e.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2EC4B6]"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Social Media Redirects</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Instagram Link</label>
                  <input 
                    type="text" 
                    value={formData.navigation.socialLinks?.instagram || ''}
                    onChange={(e) => handleNestedChange('navigation', 'socialLinks', 'instagram', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Facebook Link</label>
                  <input 
                    type="text" 
                    value={formData.navigation.socialLinks?.facebook || ''}
                    onChange={(e) => handleNestedChange('navigation', 'socialLinks', 'facebook', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">WhatsApp Redirect (wa.me)</label>
                  <input 
                    type="text" 
                    value={formData.navigation.socialLinks?.whatsapp || ''}
                    onChange={(e) => handleNestedChange('navigation', 'socialLinks', 'whatsapp', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Twitter/X Link</label>
                  <input 
                    type="text" 
                    value={formData.navigation.socialLinks?.twitter || ''}
                    onChange={(e) => handleNestedChange('navigation', 'socialLinks', 'twitter', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSectionTab === 'about' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#2EC4B6]" />
              <span>About & Vision Panel</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1">
              Curate the business narrative, leadership profiling (Lead Photographer bio & quote), high-impact statistics, and active workflow roadmap.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Story & Mission</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Section Pre-Title</label>
                  <input 
                    type="text" 
                    value={formData.about.title}
                    onChange={(e) => handleChange('about', 'title', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Heading Prefix</label>
                    <input 
                      type="text" 
                      value={formData.about.heading}
                      onChange={(e) => handleChange('about', 'heading', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Heading Highlight</label>
                    <input 
                      type="text" 
                      value={formData.about.headingHighlight}
                      onChange={(e) => handleChange('about', 'headingHighlight', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Narrative Biography</label>
                  <textarea 
                    rows={4}
                    value={formData.about.description}
                    onChange={(e) => handleChange('about', 'description', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Founder Profiling</h3>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Lead Name</label>
                    <input 
                      type="text" 
                      value={formData.about.founderName}
                      onChange={(e) => handleChange('about', 'founderName', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Designation Role</label>
                    <input 
                      type="text" 
                      value={formData.about.founderRole}
                      onChange={(e) => handleChange('about', 'founderRole', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <MediaUploader
                    value={formData.about.founderPhoto}
                    onChange={(url) => {
                      handleChange('about', 'founderPhoto', url);
                      if (url) void handleAboutAiScan(url);
                    }}
                    folder="about"
                    label="Founder Photo"
                    aspectRatio="aspect-[1/1]"
                  />
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-purple-400/20 bg-purple-500/5 p-3">
                    <div>
                      <p className="text-[11px] font-space font-bold text-white">AI About Assistant</p>
                      <p className="text-[9px] text-[#A7C4B8]">Runs automatically after upload and prepares the narrative for review.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAboutAiScan(formData.about.founderPhoto)}
                      disabled={!formData.about.founderPhoto || isAboutAiScanning}
                      className="shrink-0 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30 text-purple-200 disabled:opacity-40 text-[10px] font-bold flex items-center gap-1.5"
                    >
                      {isAboutAiScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {isAboutAiScanning ? 'Scanning…' : 'Scan Again'}
                    </button>
                  </div>
                  {aboutAiError && <p className="mt-2 text-[10px] font-mono text-red-400">AI scan failed: {aboutAiError}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Inspirational Quote</label>
                  <textarea 
                    rows={3}
                    value={formData.about.founderQuote}
                    onChange={(e) => handleChange('about', 'founderQuote', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-space font-bold text-sm text-[#2EC4B6]">About Collage Media</h3>
                <p className="text-[10px] text-[#A7C4B8] mt-1">Every image below is uploaded to Supabase and rendered in the public About collage.</p>
              </div>
              <button type="button" onClick={handleAddGalleryFrame} className="px-3 py-2 rounded-lg bg-[#2EC4B6] text-[#071A14] text-[10px] font-bold">
                + Add image
              </button>
            </div>

            {(formData.about.galleryFrames || []).length === 0 ? (
              <p className="text-xs text-[#A7C4B8] py-6 text-center border border-dashed border-white/10 rounded-xl">No About collage images have been assigned.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {(formData.about.galleryFrames || []).map((frame, index) => (
                  <div key={`${frame.title}-${index}`} className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                    <div className="flex gap-2">
                      <input
                        value={frame.title}
                        onChange={(e) => handleUpdateGalleryFrame(index, 'title', e.target.value)}
                        placeholder="Image title"
                        className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                      />
                      <button type="button" onClick={() => handleRemoveGalleryFrame(index)} className="p-2 text-red-400 hover:text-white" aria-label={`Remove ${frame.title}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <MediaUploader
                      value={frame.image}
                      onChange={(url) => handleUpdateGalleryFrame(index, 'image', url)}
                      folder="about"
                      label={`Collage image ${index + 1}`}
                      aspectRatio="aspect-[3/2]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core metrics CRUD list */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Impact Statistics List</h3>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 divide-y divide-white/5">
                {(formData.about.stats || []).map((st, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 text-xs">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-white font-bold text-sm">{st.value}{st.suffix}</span>
                      <span className="text-brand-muted">{st.label}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveStat(idx)}
                      className="text-red-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/5 w-full" />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Value</label>
                  <input 
                    type="number" 
                    value={newStatValue}
                    onChange={(e) => setNewStatValue(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Suffix</label>
                  <input 
                    type="text" 
                    value={newStatSuffix}
                    onChange={(e) => setNewStatSuffix(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Label</label>
                  <input 
                    type="text" 
                    value={newStatLabel}
                    onChange={(e) => setNewStatLabel(e.target.value)}
                    placeholder="Clients"
                    className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                  />
                </div>
              </div>

              <button 
                type="button"
                onClick={handleAddStat}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#2EC4B6] border border-white/5 rounded-lg transition-all"
              >
                + Append Statistic
              </button>
            </div>

            {/* Workflow Roadmap timeline list */}
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Workflow Roadmap Timeline</h3>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 divide-y divide-white/5">
                {(formData.about.timeline || []).map((tl, idx) => (
                  <div key={idx} className="flex justify-between items-start py-2.5 gap-4">
                    <div className="text-xs">
                      <span className="font-space font-bold text-white block">{idx + 1}. {tl.title}</span>
                      <span className="text-brand-muted font-sans text-[11px] leading-relaxed block mt-0.5">{tl.desc}</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => handleRemoveTimeline(idx)}
                      className="text-red-400 hover:text-white transition-colors cursor-pointer mt-1 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="h-px bg-white/5 w-full" />

              <div className="space-y-2">
                <input 
                  type="text" 
                  value={newTimelineTitle}
                  onChange={(e) => setNewTimelineTitle(e.target.value)}
                  placeholder="Phase Title (E.g. Creative Retouching)"
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                />
                <input 
                  type="text" 
                  value={newTimelineDesc}
                  onChange={(e) => setNewTimelineDesc(e.target.value)}
                  placeholder="Details (E.g. grading color curves perfectly...)"
                  className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white"
                />
              </div>

              <button 
                type="button"
                onClick={handleAddTimeline}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#2EC4B6] border border-white/5 rounded-lg transition-all"
              >
                + Append Timeline Node
              </button>
            </div>
          </div>
        </div>
      )}

      {activeSectionTab === 'footer' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#2EC4B6]" />
              <span>Persistent Footer configuration</span>
            </h2>
            <p className="text-xs text-[#A7C4B8] mt-1">
              Modify studio location addresses, direct hotlines, official email channels, and copyrights displayed in the bottom page banner.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Footer Brand Narrative</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Logo Text Footer</label>
                  <input 
                    type="text" 
                    value={formData.footer.logoText}
                    onChange={(e) => handleChange('footer', 'logoText', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Copyright Line</label>
                  <input 
                    type="text" 
                    value={formData.footer.copyright}
                    onChange={(e) => handleChange('footer', 'copyright', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Footer Quick Bio</label>
                  <textarea 
                    rows={4}
                    value={formData.footer.aboutText}
                    onChange={(e) => handleChange('footer', 'aboutText', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 space-y-4">
              <h3 className="font-space font-bold text-sm text-[#2EC4B6]">Studio Contact Parameters</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Physical Studio Address</label>
                  <input 
                    type="text" 
                    value={formData.footer.address}
                    onChange={(e) => handleChange('footer', 'address', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Hotline Phone Number</label>
                  <input 
                    type="text" 
                    value={formData.footer.phone}
                    onChange={(e) => handleChange('footer', 'phone', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Official Studio Email</label>
                  <input 
                    type="text" 
                    value={formData.footer.email}
                    onChange={(e) => handleChange('footer', 'email', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENCE BUTTON */}
      <div className="pt-4 border-t border-white/5 flex justify-end">
        <button
          type="submit"
          className="px-6 py-3 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(46,196,182,0.25)] hover:shadow-[0_0_25px_rgba(46,196,182,0.4)] active:scale-98 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration Block</span>
        </button>
      </div>

    </form>
  );
}
