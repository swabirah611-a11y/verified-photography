import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  X, 
  Check, 
  Loader2, 
  Trash2, 
  Edit2, 
  Download, 
  Copy, 
  RotateCcw, 
  Search, 
  Filter, 
  AlertTriangle, 
  FileImage, 
  FileVideo, 
  FileText,
  ExternalLink,
  ChevronRight,
  FolderOpen,
  Info
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface MediaUploaderProps {
  value: string; // The selected image URL
  onChange: (url: string) => void; // Called when image is selected/uploaded
  folder: 'hero' | 'about' | 'branding' | 'team' | 'services' | 'gallery' | 'blog' | 'testimonials' | 'media' | 'documents';
  label?: string;
  allowedTypes?: string[]; // E.g., ['image/*', 'video/*', 'application/pdf']
  maxSizeMB?: number;
  aspectRatio?: string; // E.g., "aspect-[3/2]"
}

interface VaultAsset {
  id: string;
  filename: string;
  original_filename: string;
  bucket: string;
  folder: string;
  url: string;
  mime_type: string;
  width?: number;
  height?: number;
  file_size?: number;
  uploaded_at: string;
}

export default function MediaUploader({
  value,
  onChange,
  folder,
  label,
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf'],
  maxSizeMB = 15,
  aspectRatio = 'aspect-[16/9]'
}: MediaUploaderProps) {
  // UI states
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'compressing' | 'uploading' | 'saving' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  
  // Library modal states
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [vaultAssets, setVaultAssets] = useState<VaultAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [isDeletingAssetId, setIsDeletingAssetId] = useState<string | null>(null);
  const [usageWarning, setUsageWarning] = useState<string | null>(null);
  const [renamingAsset, setRenamingAsset] = useState<{ id: string; name: string } | null>(null);

  // File picker references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUploadControllerRef = useRef<AbortController | null>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const selectedFileRef = useRef<File | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper: Copy public URL to clipboard
  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast('Public URL copied to clipboard!', 'success');
    } catch {
      showToast('Copying URL failed.', 'error');
    }
  };

  // Helper: Download currently loaded media
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!value) return;
    try {
      const response = await fetch(value);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = value.split('/').pop() || 'media_asset';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Download started', 'info');
    } catch (err) {
      showToast('Failed to download media file', 'error');
    }
  };

  // CLIENT COMPRESSION ENGINE
  const compressImage = async (
    file: File, 
    maxWidth = 1920, 
    quality = 0.82
  ): Promise<{ blob: Blob; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Canvas compilation context creation failed'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({ blob, width, height });
            } else {
              reject(new Error('WebP canvas compression output was empty'));
            }
          }, 'image/webp', quality);
        };
        img.onerror = () => reject(new Error('Source graphic loading failed'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Local file reader crash'));
      reader.readAsDataURL(file);
    });
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const triggerPicker = () => {
    fileInputRef.current?.click();
  };

  // Perform upload logic
  const processSelectedFile = async (file: File) => {
    selectedFileRef.current = file;
    setUploadError(null);
    setUploadProgress(0);
    setIsUploading(true);

    // 1. File Type and Size validation
    const fileMime = file.type;
    const isAllowed = allowedTypes.some(type => {
      if (type.includes('/*')) {
        const group = type.split('/')[0];
        return fileMime.startsWith(group + '/');
      }
      return type === fileMime;
    });

    if (!isAllowed) {
      setUploadStatus('error');
      setUploadError(`Invalid file format. Supported types: ${allowedTypes.map(t => t.split('/')[1] || t).join(', ')}`);
      setIsUploading(false);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setUploadStatus('error');
      setUploadError(`File too large. Maximum allowed size is ${maxSizeMB}MB.`);
      setIsUploading(false);
      return;
    }

    uploadStartTimeRef.current = Date.now();
    currentUploadControllerRef.current = new AbortController();

    try {
      let uploadBlob: Blob = file;
      let width = 0;
      let height = 0;
      const isImg = fileMime.startsWith('image/') && !fileMime.includes('svg');

      if (isImg) {
        setUploadStatus('compressing');
        setUploadProgress(20);
        try {
          const compResult = await compressImage(file, 1920, 0.85);
          uploadBlob = compResult.blob;
          width = compResult.width;
          height = compResult.height;
          setUploadProgress(40);
        } catch (compErr) {
          console.warn('Compression failed, uploading original image:', compErr);
        }
      }

      setUploadStatus('uploading');
      setUploadProgress(50);

      if (!supabase) {
        throw new Error('Supabase configuration is uninitialized. Real storage is required.');
      }

      const fileExt = isImg ? 'webp' : file.name.split('.').pop() || '';
      const cleanName = file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
      const storagePath = `${folder}/${cleanName}.${fileExt}`;

      // Upload file directly into Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('media-vault')
        .upload(storagePath, uploadBlob, {
          contentType: isImg ? 'image/webp' : fileMime,
          cacheControl: '31536000',
          upsert: true
        });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}`);
      }

      setUploadProgress(85);
      setUploadStatus('saving');

      // Calculate speed
      const durationSec = Math.max((Date.now() - uploadStartTimeRef.current) / 1000, 0.1);
      const totalKB = uploadBlob.size / 1024;
      setUploadSpeed((totalKB / durationSec).toFixed(1) + ' KB/s');

      // Generate Public URL
      const publicUrl = supabase.storage.from('media-vault').getPublicUrl(storagePath).data.publicUrl;

      // Save registry entry into PostgreSQL media_vault table
      const dbRow = {
        filename: `${cleanName}.${fileExt}`,
        original_filename: file.name,
        bucket: 'media-vault',
        folder: folder,
        url: publicUrl,
        mime_type: isImg ? 'image/webp' : fileMime,
        width: width || undefined,
        height: height || undefined,
        file_size: uploadBlob.size
      };

      const { error: dbErr } = await supabase.from('media_vault').insert([dbRow]);
      if (dbErr) {
        console.warn('Database registry failed, falling back to local metadata:', dbErr.message);
      }

      setUploadProgress(100);
      setUploadStatus('success');
      showToast('Asset uploaded successfully!', 'success');
      onChange(publicUrl);
      
      // Clear uploading panel after a moment
      setTimeout(() => {
        setIsUploading(false);
        setUploadStatus('idle');
      }, 1500);

    } catch (err: any) {
      console.error('Media upload exception:', err);
      setUploadStatus('error');
      setUploadError(err.message || 'An unexpected error occurred during upload.');
    }
  };

  const handleCancelUpload = () => {
    if (currentUploadControllerRef.current) {
      currentUploadControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadStatus('idle');
    showToast('Upload cancelled', 'info');
  };

  const handleRetryUpload = () => {
    if (selectedFileRef.current) {
      processSelectedFile(selectedFileRef.current);
    }
  };

  // RELATIONSHIP-AWARE ASSET DELETION
  const handleDeleteAsset = async (asset: VaultAsset) => {
    if (!supabase) return;
    setIsDeletingAssetId(asset.id);
    setUsageWarning(null);

    try {
      // 1. Scan for asset references inside PostgreSQL to prevent orphaned pages
      // Check visual portfolio, cms configs, and exhibitions
      const { data: portRef } = await supabase.from('portfolio').select('id, title').eq('image_url', asset.url);
      const { data: exhibRef } = await supabase.from('exhibition_art').select('id, title').eq('cover_image', asset.url);
      
      // Check current configuration states (e.g. Hero, About)
      const currentConfigRaw = localStorage.getItem('verified_cms_config');
      let usageInConfig = false;
      if (currentConfigRaw) {
        const configObj = JSON.parse(currentConfigRaw);
        const configStr = JSON.stringify(configObj);
        if (configStr.includes(asset.url)) {
          usageInConfig = true;
        }
      }

      const referencesFound: string[] = [];
      if (portRef && portRef.length > 0) referencesFound.push(`Portfolio item: "${portRef[0].title}"`);
      if (exhibRef && exhibRef.length > 0) referencesFound.push(`Exhibition cover: "${exhibRef[0].title}"`);
      if (usageInConfig) referencesFound.push(`Admin homepage configurations (Hero or About layout)`);

      if (referencesFound.length > 0) {
        setUsageWarning(`This asset is currently in active use across: ${referencesFound.join(', ')}. Deleting it will create broken image links! Are you absolutely sure you want to proceed?`);
        setIsDeletingAssetId(null);
        return;
      }

      await executeAssetPurge(asset);

    } catch (ex) {
      console.error('Checking references failed:', ex);
      // Fallback: continue with delete
      await executeAssetPurge(asset);
    }
  };

  const executeAssetPurge = async (asset: VaultAsset) => {
    if (!supabase) return;
    try {
      // Parse file key from URL (e.g., hero/file_name.webp)
      const urlParts = asset.url.split('/storage/v1/object/public/media-vault/');
      const fileKey = urlParts[1];

      if (fileKey) {
        // Delete from Storage bucket
        const { error: storageErr } = await supabase.storage.from('media-vault').remove([fileKey]);
        if (storageErr) console.warn('Failed to delete storage file, proceeding anyway:', storageErr.message);
      }

      // Delete from registry DB
      const { error: dbErr } = await supabase.from('media_vault').delete().eq('id', asset.id);
      if (dbErr) throw new Error(`Database record deletion failed: ${dbErr.message}`);

      // If active image on current page was deleted, clear it
      if (value === asset.url) {
        onChange('');
      }

      showToast('Asset deleted completely.', 'success');
      setVaultAssets(prev => prev.filter(a => a.id !== asset.id));
      setUsageWarning(null);

    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`, 'error');
    } finally {
      setIsDeletingAssetId(null);
    }
  };

  // ASSET RENAMING
  const handleRenameAsset = async (id: string, newName: string) => {
    if (!supabase || !newName.trim()) return;
    try {
      const { error } = await supabase
        .from('media_vault')
        .update({ original_filename: newName.trim() })
        .eq('id', id);

      if (error) throw error;
      showToast('Asset renamed', 'success');
      setVaultAssets(prev => prev.map(a => a.id === id ? { ...a, original_filename: newName.trim() } : a));
      setRenamingAsset(null);
    } catch (err: any) {
      showToast(`Rename failed: ${err.message}`, 'error');
    }
  };

  // Load assets in Library Modal
  const loadVaultLibrary = async () => {
    if (!supabase) return;
    setLibraryLoading(true);
    try {
      const { data, error } = await supabase
        .from('media_vault')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setVaultAssets(data || []);
    } catch (err: any) {
      showToast(`Vault fetch failed: ${err.message}`, 'error');
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (isLibraryOpen) {
      loadVaultLibrary();
    }
  }, [isLibraryOpen]);

  // Filters and queries
  const filteredAssets = vaultAssets.filter(asset => {
    const matchesSearch = asset.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          asset.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = filterFolder === 'all' || asset.folder === filterFolder;
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="space-y-2">
      {label && <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase">{label}</label>}
      
      {/* 1. SELECTION PREVIEW BOX */}
      {!isUploading && (
        <div className="relative group/uploader rounded-2xl border border-white/10 bg-black/40 overflow-hidden text-white transition-all hover:border-[#2EC4B6]/50">
          
          {value ? (
            /* PREVIEW LAYOUT WITH ACTION ROW */
            <div className="relative">
              <div className={`${aspectRatio} w-full bg-black/60 flex items-center justify-center relative overflow-hidden`}>
                {value.match(/\.(mp4|webm|mov)$/) || value.includes('video') ? (
                  <video src={value} className="w-full h-full object-cover" muted loop autoPlay />
                ) : value.match(/\.pdf$/) ? (
                  <div className="flex flex-col items-center gap-3 text-brand-muted">
                    <FileText className="w-16 h-16 text-[#2EC4B6]" />
                    <span className="text-xs font-mono">PDF Document Asset</span>
                  </div>
                ) : (
                  <img src={value} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/uploader:scale-102 transition-transform duration-500" />
                )}

                {/* Cover overlay for quick controls */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/uploader:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={triggerPicker}
                    className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all text-xs font-space flex items-center gap-1.5 cursor-pointer hover:scale-105"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload New</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLibraryOpen(true)}
                    className="p-2.5 rounded-xl bg-[#2EC4B6]/20 hover:bg-[#2EC4B6] text-[#2EC4B6] hover:text-[#071A14] transition-all text-xs font-space flex items-center gap-1.5 cursor-pointer hover:scale-105"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Choose Existing</span>
                  </button>
                  {value && (
                    <button
                      type="button"
                      onClick={() => onChange('')}
                      className="p-2.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-white transition-all text-xs font-space flex items-center gap-1.5 cursor-pointer hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom detail action row */}
              <div className="p-3 bg-[#10261F]/90 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#A7C4B8]">
                <div className="flex items-center gap-2 truncate max-w-[60%]">
                  <div className="w-2 h-2 rounded-full bg-[#2EC4B6]" />
                  <span className="truncate">{value.split('/').pop()}</span>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleCopyUrl} title="Copy URL" className="p-1.5 hover:bg-white/5 rounded text-brand-muted hover:text-white transition-colors cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={handleDownload} title="Download" className="p-1.5 hover:bg-white/5 rounded text-brand-muted hover:text-white transition-colors cursor-pointer">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <a href={value} target="_blank" rel="noreferrer" title="Open Public URL" className="p-1.5 hover:bg-white/5 rounded text-brand-muted hover:text-white transition-colors cursor-pointer">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY/DRAG AREA GESTURE */
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerPicker}
              className={`py-8 px-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive ? 'bg-[#2EC4B6]/10 border-2 border-dashed border-[#2EC4B6]' : 'hover:bg-white/[0.02]'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-[#2EC4B6]/10 flex items-center justify-center border border-[#2EC4B6]/20 text-[#2EC4B6] mb-3 group-hover/uploader:scale-110 transition-transform duration-300 box-glow">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs font-space font-bold text-white mb-1">Drag & Drop Asset</span>
              <span className="text-[10px] text-brand-muted mb-4 font-sans">
                Supports JPG, PNG, WEBP, MP4, PDF up to {maxSizeMB}MB
              </span>

              {/* Action buttons inside empty state */}
              <div className="flex gap-2.5" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={triggerPicker}
                  className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-space font-bold text-white transition-all cursor-pointer"
                >
                  Browse Device
                </button>
                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#2EC4B6]/10 hover:bg-[#2EC4B6] text-[10px] font-space font-bold text-[#2EC4B6] hover:text-[#071A14] border border-[#2EC4B6]/20 transition-all cursor-pointer"
                >
                  Choose from Vault
                </button>
              </div>
            </div>
          )}

          {/* Hidden HTML Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept={allowedTypes.join(',')}
          />
        </div>
      )}

      {/* 2. UPLOADING STATE CARD */}
      {isUploading && (
        <div className="p-6 rounded-2xl border border-white/10 bg-[#10261F] text-white space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-space font-bold flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#2EC4B6] animate-spin" />
              <span>
                {uploadStatus === 'compressing' && 'Optimizing Media WebP Canvas...'}
                {uploadStatus === 'uploading' && 'Uploading direct to Supabase Storage...'}
                {uploadStatus === 'saving' && 'Syncing database asset registry...'}
                {uploadStatus === 'success' && 'Upload Complete!'}
                {uploadStatus === 'error' && 'Upload Failed'}
              </span>
            </span>
            <span className="font-mono text-[10px] text-brand-muted">{uploadProgress}%</span>
          </div>

          {/* Real-time bar */}
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              className="h-full bg-gradient-to-r from-brand-accent to-brand-glow"
              transition={{ ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-brand-muted">
            <span>{uploadSpeed}</span>
            <button
              type="button"
              onClick={handleCancelUpload}
              className="text-red-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {uploadStatus === 'error' && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 space-y-2 text-xs text-red-200">
              <span className="block leading-relaxed">{uploadError}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleRetryUpload}
                  className="px-2.5 py-1 rounded bg-red-500 text-white font-semibold text-[10px] uppercase flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 font-semibold text-[10px] uppercase"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. COOP MEDIA VAULT MODAL (Choose from Vault) */}
      <AnimatePresence>
        {isLibraryOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsLibraryOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative z-10 w-full max-w-4xl h-[85vh] rounded-3xl bg-[#0B1512] border border-white/10 shadow-2xl flex flex-col overflow-hidden text-white"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base font-space font-bold flex items-center gap-2 text-white">
                    <FolderOpen className="w-5 h-5 text-[#2EC4B6] box-glow" />
                    <span>VERIFIED DIGITAL PORTAL ASSET VAULT</span>
                  </h3>
                  <p className="text-[10px] text-brand-muted mt-0.5 font-sans">
                    Browse previously uploaded high-end photographic captures. Selecting reuse avoids duplicates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-brand-muted hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filters Panel */}
              <div className="px-6 py-4 bg-black/40 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center shrink-0">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input
                    type="text"
                    placeholder="Search digital assets by name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#2EC4B6]"
                  />
                </div>

                {/* Filter categories */}
                <div className="flex gap-2 overflow-x-auto pr-4 scrollbar-thin">
                  {['all', 'hero', 'about', 'team', 'services', 'gallery', 'blog', 'testimonials', 'media'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterFolder(cat)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-mono capitalize border transition-all cursor-pointer whitespace-nowrap ${
                        filterFolder === cat 
                          ? 'bg-[#2EC4B6]/15 border-[#2EC4B6] text-[#2EC4B6] font-bold' 
                          : 'bg-transparent border-white/5 text-brand-muted hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                {libraryLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-muted gap-3">
                    <Loader2 className="w-10 h-10 text-[#2EC4B6] animate-spin" />
                    <span className="text-xs font-mono">Opening Digital Asset Lockers...</span>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-brand-muted text-center max-w-md mx-auto py-12">
                    <FolderOpen className="w-12 h-12 text-[#2EC4B6]/20 mb-3" />
                    <span className="text-sm font-space font-bold text-white mb-1">No Assets Registered</span>
                    <p className="text-xs text-brand-muted leading-relaxed">
                      No assets found matching current criteria. Upload fresh media directly on layout editing fields.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-12">
                    {filteredAssets.map(asset => {
                      const isSelected = value === asset.url;
                      const isRenaming = renamingAsset?.id === asset.id;
                      const isImg = asset.mime_type.startsWith('image/');
                      const isVid = asset.mime_type.startsWith('video/');

                      return (
                        <div
                          key={asset.id}
                          className={`group/card relative rounded-2xl overflow-hidden border bg-black/40 flex flex-col text-left transition-all duration-300 ${
                            isSelected ? 'border-[#2EC4B6] ring-2 ring-[#2EC4B6]/25' : 'border-white/5 hover:border-white/20'
                          }`}
                        >
                          {/* Visual thumbnail display */}
                          <div className="relative aspect-[4/3] bg-zinc-950 flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => {
                            onChange(asset.url);
                            setIsLibraryOpen(false);
                          }}>
                            {isImg ? (
                              <img src={asset.url} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500" />
                            ) : isVid ? (
                              <div className="relative w-full h-full flex items-center justify-center text-brand-muted">
                                <FileVideo className="w-10 h-10 text-brand-muted" />
                                <video src={asset.url} className="absolute inset-0 w-full h-full object-cover opacity-30" muted />
                              </div>
                            ) : (
                              <FileText className="w-10 h-10 text-brand-muted" />
                            )}

                            {/* Label Folder */}
                            <span className="absolute top-2 left-2 bg-black/80 backdrop-blur-md text-[8px] font-mono uppercase tracking-widest text-brand-accent px-1.5 py-0.5 rounded">
                              {asset.folder}
                            </span>

                            {/* Selection Check Ring */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2EC4B6] flex items-center justify-center text-[#071A14]">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}

                            {/* Hover full action screen */}
                            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3 z-10" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setRenamingAsset({ id: asset.id, name: asset.original_filename })}
                                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-brand-muted hover:text-white transition-colors cursor-pointer"
                                  title="Rename"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAsset(asset)}
                                  className="p-1.5 bg-red-500/15 hover:bg-red-500 rounded-lg text-red-400 hover:text-white transition-colors cursor-pointer"
                                  title="Delete Permanent"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  onChange(asset.url);
                                  setIsLibraryOpen(false);
                                }}
                                className="w-full py-1.5 rounded-lg bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-[10px] tracking-wider transition-colors cursor-pointer text-center"
                              >
                                Select Asset
                              </button>
                            </div>
                          </div>

                          {/* Footer descriptions */}
                          <div className="p-3 border-t border-white/5 space-y-1">
                            {isRenaming ? (
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                <input
                                  type="text"
                                  value={renamingAsset.name}
                                  onChange={e => setRenamingAsset({ ...renamingAsset, name: e.target.value })}
                                  className="flex-1 px-2 py-1 bg-black text-[10px] text-white border border-[#2EC4B6] rounded outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRenameAsset(asset.id, renamingAsset.name)}
                                  className="p-1 bg-[#2EC4B6] text-black rounded text-[9px] font-bold"
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-space font-medium text-white block truncate">
                                {asset.original_filename || asset.filename}
                              </span>
                            )}
                            <span className="text-[8px] font-mono text-brand-muted block uppercase">
                              {(asset.file_size ? (asset.file_size / 1024).toFixed(0) : 0)} KB • {asset.mime_type.split('/')[1] || 'WebP'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. ASSET USAGE RELATIONSHIP ERROR DIALOG */}
      <AnimatePresence>
        {usageWarning && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setUsageWarning(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md p-6 bg-[#1A0A0A] border border-red-500/20 rounded-2xl text-left"
            >
              <div className="flex items-center gap-3 text-red-400 mb-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h4 className="font-space font-bold text-sm text-white">DELETION WARNING & ASSET RELATIONSHIP NOTICE</h4>
              </div>
              <p className="text-xs text-red-200/90 leading-relaxed mb-6 font-sans">
                {usageWarning}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setUsageWarning(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#A7C4B8] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const activeAsset = vaultAssets.find(a => isDeletingAssetId === null && a.url === value); // Or track deleted in ref
                    const matchingAsset = vaultAssets.find(a => a.url === value || usageWarning.includes(a.filename) || true); // Purge selected
                    if (matchingAsset) {
                      await executeAssetPurge(matchingAsset);
                    } else {
                      setUsageWarning(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-space font-bold rounded-xl cursor-pointer"
                >
                  Force Purge
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. FLOATING COMPONENT TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[140] px-4.5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-space font-bold border ${
              toast.type === 'success' 
                ? 'bg-[#10261F] border-[#2EC4B6]/20 text-[#2EC4B6]' 
                : toast.type === 'error'
                  ? 'bg-[#1A0A0A] border-red-500/20 text-red-400'
                  : 'bg-zinc-900 border-white/10 text-white'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {toast.type === 'info' && <Info className="w-4 h-4" />}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
