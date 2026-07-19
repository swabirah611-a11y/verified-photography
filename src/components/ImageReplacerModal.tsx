import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Link2, 
  Image as ImageIcon, 
  Search, 
  Check, 
  Sparkles 
} from 'lucide-react';
import MediaUploader from './cms/MediaUploader';
import { supabase } from '../lib/supabase';

interface ImageReplacerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  title: string;
}

export default function ImageReplacerModal({
  isOpen,
  onClose,
  onSelect,
  title
}: ImageReplacerModalProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [mediaAssets, setMediaAssets] = useState<Array<{ title: string; url: string }>>([]);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    let active = true;
    supabase
      .from('media_vault')
      .select('id, original_filename, filename, url')
      .order('uploaded_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('Unable to load Media Vault:', error);
          setMediaAssets([]);
          return;
        }
        setMediaAssets((data || []).map(asset => ({
          title: asset.original_filename || asset.filename,
          url: asset.url
        })));
      });
    return () => { active = false; };
  }, [isOpen]);

  const handleSave = () => {
    if (customUrl.trim()) {
      onSelect(customUrl.trim());
    } else if (selectedPreset) {
      onSelect(selectedPreset);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-xl rounded-2xl bg-[#10261F] border border-white/10 p-6 shadow-2xl overflow-hidden text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-space font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4.5 h-4.5 text-[#2EC4B6]" />
            <span>SWAP PHOTOGRAPHY COMPONENT: {title}</span>
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded bg-white/5 hover:bg-white/10 text-brand-muted hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Real-time Uploader & Asset Lockbox */}
        <div className="mb-6">
          <MediaUploader
            value={customUrl}
            onChange={(url) => {
              setCustomUrl(url);
              setSelectedPreset(null);
            }}
            folder="media"
            label="Provide or Upload Image Asset"
            aspectRatio="aspect-[16/9]"
          />
        </div>

        <div className="h-px bg-white/5 w-full my-4" />

        {/* Presets library */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-[#A7C4B8] uppercase block">Or Choose Studio Curated Preset</label>
            <span className="text-[9px] font-mono text-[#2EC4B6] flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Custom 60fps Optimization
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {mediaAssets.map((preset) => {
              const isSelected = selectedPreset === preset.url;
              return (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => {
                    setSelectedPreset(preset.url);
                    setCustomUrl('');
                  }}
                  className={`relative aspect-[3/2] rounded-xl overflow-hidden border transition-all text-left group cursor-pointer ${
                    isSelected ? 'border-[#2EC4B6] ring-2 ring-[#2EC4B6]/25' : 'border-white/5 hover:border-white/25'
                  }`}
                >
                  <img 
                    src={preset.url} 
                    alt={preset.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                    <span className="text-[9px] font-mono text-white/95 leading-none line-clamp-1">{preset.title}</span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#2EC4B6] flex items-center justify-center text-[#071A14]">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {mediaAssets.length === 0 && (
            <p className="text-[10px] text-[#A7C4B8] py-4 text-center">No uploaded Media Vault images are available.</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 text-xs font-mono pt-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!customUrl.trim() && !selectedPreset}
            className="px-5 py-2 rounded-xl bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-bold disabled:opacity-50 cursor-pointer"
          >
            Apply Asset
          </button>
        </div>
      </motion.div>
    </div>
  );
}
