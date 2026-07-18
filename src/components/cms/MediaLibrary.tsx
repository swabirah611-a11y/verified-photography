import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Image as ImageIcon, 
  Search, 
  Copy, 
  Check, 
  Upload, 
  CloudLightning, 
  Filter, 
  Sparkles,
  RefreshCw,
  FolderOpen,
  Grid as GridIcon,
  List as ListIcon,
  Trash2,
  Edit2,
  Sliders,
  Calendar,
  Camera,
  MapPin,
  Tag,
  Download,
  MoreVertical,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Layers,
  FileText,
  Lock,
  Archive,
  Eye,
  EyeOff,
  Copy as DuplicateIcon,
  ArrowUpDown,
  Brain,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { supabase, getExhibitions, saveExhibition, deleteExhibition, Exhibition } from '../../lib/supabase';
import MediaUploader from './MediaUploader';

// Define the interface for the rich assets managed in the DAM system
interface DamAsset {
  id: string;
  filename: string;
  original_filename: string;
  bucket: string;
  folder: string;
  url: string;
  mime_type: string;
  width: number;
  height: number;
  file_size: number;
  uploaded_at: string;
  uploaded_by?: string;
  
  // Custom metadata (stored securely in rich metadata fallback)
  title: string;
  description: string;
  alt_text: string;
  category: 'Weddings' | 'Portraits' | 'Graduations' | 'Events' | 'Commercial' | 'General';
  tags: string[];
  photographer: string;
  location: string;
  event: string;
  camera: string;
  lens: string;
  iso: string;
  shutter_speed: string;
  aperture: string;
  date_taken: string;
  featured: boolean;
  visibility: boolean;
  copyright: string;
  license: string;
  color_palette: string[];
  thumbnail_url?: string;
  aiAnalysis?: {
    id: string;
    confidence: number;
    category: string;
    title: string;
    description: string;
    tags: string[];
    location: string;
    people: string;
    colors: any;
    quality: any;
    seo: any;
    camera: any;
    social: any;
    status: 'pending_review' | 'approved' | 'rejected';
    created_at?: string;
  };
}

interface UploadQueueItem {
  id: string;
  file: File;
  progress: number;
  speed: string; // in KB/s or MB/s
  status: 'idle' | 'compressing' | 'uploading' | 'analyzing' | 'metadata' | 'success' | 'failed';
  error?: string;
  cancelToken?: boolean;
}

export default function MediaLibrary() {
  // -------------------------------------------------------------
  // CORE STATES
  // -------------------------------------------------------------
  const [activeTab, setActiveTab] = useState<'vault' | 'exhibitions'>('vault');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [assets, setAssets] = useState<DamAsset[]>([]);
  const [exhibitions, setExhibitions] = useState<Exhibition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection and Bulk Operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  // Upload Queue
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterFileType, setFilterFileType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, active, archived, featured
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Modals & Popups
  const [previewAsset, setPreviewAsset] = useState<DamAsset | null>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'dossier' | 'ai'>('dossier');
  const [isRegeneratingAI, setIsRegeneratingAI] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; assetId: string } | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; msg: string; type: 'success' | 'info' | 'warn' }>>([]);

  // Exhibition Builder buffers
  const [isCreatingExhibition, setIsCreatingExhibition] = useState(false);
  const [exhibFormTitle, setExhibFormTitle] = useState('');
  const [exhibFormCategory, setExhibFormCategory] = useState<'Weddings' | 'Portraits' | 'Graduations' | 'Events' | 'Commercial'>('Portraits');
  const [exhibFormDesc, setExhibFormDesc] = useState('');
  const [exhibFormCover, setExhibFormCover] = useState('');
  const [exhibEditingId, setExhibEditingId] = useState<string | null>(null);

  // Camera settings options for filtering
  const [cameraOptions, setCameraOptions] = useState<string[]>([]);

  // -------------------------------------------------------------
  // INITIALIZATION & REAL-TIME LOADERS
  // -------------------------------------------------------------
  const showToast = (msg: string, type: 'success' | 'info' | 'warn' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const loadMediaAndExhibitions = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch DB records from media_vault table
      let fetchedAssets: DamAsset[] = [];
      if (supabase) {
        // Fetch AI analysis results
        let aiResultsMap: Record<string, any> = {};
        const { data: aiData, error: aiError } = await supabase
          .from('ai_analysis_results')
          .select('*');
        if (!aiError && aiData) {
          aiData.forEach((row: any) => {
            aiResultsMap[row.image_url] = row;
          });
        }

        const { data, error } = await supabase
          .from('media_vault')
          .select('*')
          .order('uploaded_at', { ascending: false });

        if (error) {
          console.warn('Database select on media_vault failed:', error.message);
        } else if (data) {
          // Sync database files with our rich metadata fallback stored in localStorage
          const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
          
          fetchedAssets = data.map((item: any) => {
            const extra = richMetadataMap[item.url] || {};
            const aiDataRow = aiResultsMap[item.url] || null;
            return {
              id: item.id,
              filename: item.filename,
              original_filename: item.original_filename || item.filename,
              bucket: item.bucket || 'media-vault',
              folder: item.folder || 'general',
              url: item.url,
              mime_type: item.mime_type || 'image/webp',
              width: item.width || 1200,
              height: item.height || 800,
              file_size: item.file_size || 0,
              uploaded_at: item.uploaded_at || new Date().toISOString(),
              
              // Rich metadata bindings with robust fallbacks
              title: extra.title || aiDataRow?.title || item.original_filename?.split('.')[0].replace(/[-_]/g, ' ') || item.filename.split('.')[0].replace(/[-_]/g, ' ') || 'Untitled Frame',
              description: extra.description || aiDataRow?.description || '',
              alt_text: extra.alt_text || aiDataRow?.seo?.alt_text || extra.title || 'Verified photography capture asset',
              category: extra.category || aiDataRow?.category || 'General',
              tags: extra.tags || aiDataRow?.tags || ['Verified', 'Edo Capture'],
              photographer: extra.photographer || 'Alhassan Bello',
              location: extra.location || aiDataRow?.location || 'Ekpoma, Edo State',
              event: extra.event || aiDataRow?.seo?.caption || '',
              camera: extra.camera || aiDataRow?.camera?.camera || 'Sony Alpha 7R V',
              lens: extra.lens || aiDataRow?.camera?.lens || 'Sony FE 85mm f/1.4 GM',
              iso: extra.iso || aiDataRow?.camera?.iso || '100',
              shutter_speed: extra.shutter_speed || aiDataRow?.camera?.shutter_speed || '1/250s',
              aperture: extra.aperture || aiDataRow?.camera?.aperture || 'f/1.4',
              date_taken: extra.date_taken || aiDataRow?.camera?.date_taken || item.uploaded_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              featured: !!extra.featured,
              visibility: extra.visibility !== false,
              copyright: extra.copyright || '© VERIFIED PHOTOGRAPHY',
              license: extra.license || 'Standard Professional Portrait Use',
              color_palette: extra.color_palette || aiDataRow?.colors?.dominant_colors || ['#071A14', '#10261F', '#2EC4B6', '#A7C4B8'],
              thumbnail_url: extra.thumbnail_url || item.url,
              
              // AI Intelligence parameters
              aiAnalysis: aiDataRow ? {
                id: aiDataRow.id,
                confidence: aiDataRow.confidence,
                category: aiDataRow.category,
                title: aiDataRow.title,
                description: aiDataRow.description,
                tags: aiDataRow.tags,
                location: aiDataRow.location,
                people: aiDataRow.people,
                colors: aiDataRow.colors,
                quality: aiDataRow.quality,
                seo: aiDataRow.seo,
                camera: aiDataRow.camera,
                social: aiDataRow.social,
                status: aiDataRow.status,
                created_at: aiDataRow.created_at
              } : undefined
            };
          });
        }
      }

      setAssets(fetchedAssets);

      // Extract unique cameras for filtering options
      const cameras = Array.from(new Set(fetchedAssets.map(a => a.camera).filter(Boolean)));
      setCameraOptions(cameras);

      // 2. Fetch Exhibitions from database
      const fetchedExhibs = await getExhibitions();
      setExhibitions(fetchedExhibs);

    } catch (err: any) {
      console.error('Failed loading Digital Asset Management files:', err);
      showToast('Error syncing with database', 'warn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMediaAndExhibitions();
    
    // Listen for portfolio/exhibition triggers
    window.addEventListener('exhibitions_updated', loadMediaAndExhibitions);
    return () => {
      window.removeEventListener('exhibitions_updated', loadMediaAndExhibitions);
    };
  }, []);

  // -------------------------------------------------------------
  // WEB-SAFE CLIENT COMPRESSION & OPTIMIZATION ENGINE
  // -------------------------------------------------------------
  const compressAndWebpEngine = async (
    file: File, 
    maxWidth = 1920, 
    quality = 0.85
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

  // -------------------------------------------------------------
  // MULTIPLE STORAGE UPLOAD HANDLERS
  // -------------------------------------------------------------
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
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadQueueItem[] = files.map(file => ({
      id: 'upl-' + Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      speed: '0 KB/s',
      status: 'idle'
    }));
    setUploadQueue(prev => [...prev, ...newItems]);
  };

  // Run the sequential upload controller
  useEffect(() => {
    const processQueue = async () => {
      const nextItem = uploadQueue.find(item => item.status === 'idle');
      if (!nextItem) return;

      updateQueueItemStatus(nextItem.id, 'compressing', 15);
      
      const startTime = Date.now();
      
      try {
        // Step 1: Compress and Optimize into WebP client-side
        const compressed = await compressAndWebpEngine(nextItem.file, 1920, 0.85);
        updateQueueItemStatus(nextItem.id, 'compressing', 50);

        // Step 2: Generate optimized thumbnail WebP client-side
        const thumbnail = await compressAndWebpEngine(nextItem.file, 400, 0.65);
        updateQueueItemStatus(nextItem.id, 'uploading', 70);

        if (!supabase) {
          throw new Error('Supabase integration missing. Real cloud uploads required.');
        }

        const cleanName = nextItem.file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
        const mainPath = `assets/${cleanName}.webp`;
        const thumbPath = `thumbnails/${cleanName}_thumb.webp`;

        // Upload main file
        const { error: mainUploadErr } = await supabase.storage
          .from('media-vault')
          .upload(mainPath, compressed.blob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true
          });

        if (mainUploadErr) throw new Error(`Main storage failed: ${mainUploadErr.message}`);

        // Upload thumbnail file
        const { error: thumbUploadErr } = await supabase.storage
          .from('media-vault')
          .upload(thumbPath, thumbnail.blob, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true
          });

        // Speed calculation
        const timeSpentSec = Math.max((Date.now() - startTime) / 1000, 0.1);
        const totalSizeKB = (compressed.blob.size + thumbnail.blob.size) / 1024;
        const uploadSpeed = (totalSizeKB / timeSpentSec).toFixed(1) + ' KB/s';

        updateQueueItemStatus(nextItem.id, 'uploading', 90, uploadSpeed);

        // Get public URLs
        const mainUrl = supabase.storage.from('media-vault').getPublicUrl(mainPath).data.publicUrl;
        const thumbUrl = thumbPath ? supabase.storage.from('media-vault').getPublicUrl(thumbPath).data.publicUrl : mainUrl;

        // Step 3: Insert asset registry entry into media_vault table
        const dbRow = {
          filename: `${cleanName}.webp`,
          original_filename: nextItem.file.name,
          bucket: 'media-vault',
          folder: 'general',
          url: mainUrl,
          mime_type: 'image/webp',
          width: compressed.width,
          height: compressed.height,
          file_size: compressed.blob.size
        };

        const { error: dbErr } = await supabase.from('media_vault').insert([dbRow]);
        if (dbErr) {
          console.warn('Database registry failed, utilizing local fallback metadata:', dbErr.message);
          showToast(`⚠ Database sync skipped: ${dbErr.message}`, 'warn');
        }

        // Update queue item status to 'analyzing'
        updateQueueItemStatus(nextItem.id, 'analyzing', 92, uploadSpeed);

        // Fetch AI analysis
        let aiResult: any = null;
        try {
          const aiResponse = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              imageUrl: mainUrl,
              filename: `${cleanName}.webp`,
              originalFilename: nextItem.file.name,
              fileSize: compressed.blob.size
            })
          });

          if (!aiResponse.ok) {
            const errData = await aiResponse.json();
            if (errData.code === 'MISSING_GEMINI_KEY') {
              console.warn("Gemini API key is unconfigured on the server. Defaulting to local fallback metadata.");
              showToast("✓ File uploaded (AI key missing)", "info");
            } else if (errData.code === 'SAFETY_REJECTION') {
              throw new Error(`Rejected by Content Safety rules: ${errData.error}`);
            } else {
              throw new Error(errData.error || 'Server-side AI analysis failed.');
            }
          } else {
            const resultData = await aiResponse.json();
            if (resultData.success === false) {
              console.warn("AI analysis was skipped or failed on server:", resultData.error);
              showToast("✓ File uploaded (Offline metadata used)", "info");
            } else {
              aiResult = resultData.analysis;
              if (resultData.isDuplicate) {
                showToast(`⚠ Warning: Possible duplicate detected (${resultData.duplicateFilename})`, 'warn');
              }
            }
          }
        } catch (aiEx: any) {
          console.warn("[AI Vision automatic analysis failed, using fallback]", aiEx);
          showToast(`⚠ AI: ${aiEx.message || 'Key unconfigured'}`, 'warn');
        }

        updateQueueItemStatus(nextItem.id, 'metadata', 97, uploadSpeed);

        // Write custom metadata maps (synced with AI generated attributes if available)
        const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
        richMetadataMap[mainUrl] = {
          title: aiResult?.title || nextItem.file.name.split('.')[0].replace(/[-_]/g, ' '),
          description: aiResult?.description || `Bespoke visual frame uploaded via Verified Digital Asset Management. Originally named ${nextItem.file.name}.`,
          alt_text: aiResult?.seo?.alt_text || aiResult?.title || nextItem.file.name.split('.')[0].replace(/[-_]/g, ' '),
          category: aiResult?.category || 'General',
          tags: aiResult?.tags || ['Verified', 'Dynamic Upload'],
          photographer: 'Alhassan Bello',
          location: aiResult?.location || 'Ekpoma capture venue',
          event: aiResult?.seo?.caption || 'Premium Shoot Session',
          camera: aiResult?.camera?.camera || 'Sony Alpha 7R V',
          lens: aiResult?.camera?.lens || 'Sony FE 85mm f/1.4 GM',
          iso: aiResult?.camera?.iso || '100',
          shutter_speed: aiResult?.camera?.shutter_speed || '1/200s',
          aperture: aiResult?.camera?.aperture || 'f/1.8',
          date_taken: aiResult?.camera?.date_taken || new Date().toISOString().split('T')[0],
          featured: false,
          visibility: true,
          copyright: '© VERIFIED PHOTOGRAPHY',
          license: 'Standard Commercial License',
          color_palette: aiResult?.colors?.dominant_colors || ['#071A14', '#10261F', '#2EC4B6', '#A7C4B8'],
          thumbnail_url: thumbUrl
        };
        localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));

        updateQueueItemStatus(nextItem.id, 'success', 100, uploadSpeed);
        showToast(`✓ Uploaded and analyzed ${nextItem.file.name} successfully!`, 'success');
        
        // Reload asset matrix
        loadMediaAndExhibitions();

      } catch (err: any) {
        console.error('Queue item upload failure:', err);
        updateQueueItemStatus(nextItem.id, 'failed', 0, '0 KB/s', err.message || 'Unknown network error');
        showToast(`✗ Failed to upload ${nextItem.file.name}`, 'warn');
      }
    };

    processQueue();
  }, [uploadQueue]);

  const updateQueueItemStatus = (
    id: string, 
    status: UploadQueueItem['status'], 
    progress: number, 
    speed = '0 KB/s',
    error?: string
  ) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, status, progress, speed, error } : item));
  };

  const cancelUploadQueueItem = (id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
    showToast('Upload canceled', 'info');
  };

  const retryUploadQueueItem = (id: string) => {
    setUploadQueue(prev => prev.map(item => item.id === id ? { ...item, status: 'idle', progress: 0, error: undefined } : item));
  };

  const clearCompletedQueue = () => {
    setUploadQueue(prev => prev.filter(item => item.status !== 'success' && item.status !== 'failed'));
  };

  // -------------------------------------------------------------
  // SELECTION & MULTI-SELECT HANDLERS
  // -------------------------------------------------------------
  const handleAssetSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (e.shiftKey && lastSelectedId) {
      const activeIds = filteredAssets.map(a => a.id);
      const startIdx = activeIds.indexOf(lastSelectedId);
      const endIdx = activeIds.indexOf(id);
      
      if (startIdx >= 0 && endIdx >= 0) {
        const rangeIds = activeIds.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
        setSelectedIds(prev => Array.from(new Set([...prev, ...rangeIds])));
        return;
      }
    }

    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setLastSelectedId(id);
  };

  const handleSelectAll = () => {
    const filteredIds = filteredAssets.map(a => a.id);
    if (selectedIds.length === filteredIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIds);
    }
  };

  // -------------------------------------------------------------
  // SINGLE ASSET CRUD MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const handleEditAssetMetadata = (asset: DamAsset) => {
    setPreviewAsset(asset);
    setIsEditingMetadata(true);
  };

  const handleSaveMetadataChanges = async (updatedAsset: DamAsset) => {
    try {
      const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
      
      // Update rich local storage mapping
      richMetadataMap[updatedAsset.url] = {
        title: updatedAsset.title,
        description: updatedAsset.description,
        alt_text: updatedAsset.alt_text,
        category: updatedAsset.category,
        tags: updatedAsset.tags,
        photographer: updatedAsset.photographer,
        location: updatedAsset.location,
        event: updatedAsset.event,
        camera: updatedAsset.camera,
        lens: updatedAsset.lens,
        iso: updatedAsset.iso,
        shutter_speed: updatedAsset.shutter_speed,
        aperture: updatedAsset.aperture,
        date_taken: updatedAsset.date_taken,
        featured: updatedAsset.featured,
        visibility: updatedAsset.visibility,
        copyright: updatedAsset.copyright,
        license: updatedAsset.license,
        color_palette: updatedAsset.color_palette,
        thumbnail_url: updatedAsset.thumbnail_url || updatedAsset.url
      };

      localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));

      // Also save to standard public portfolio table so it synchronizes on public gallery
      if (updatedAsset.featured && supabase) {
        const portfolioRow = {
          title: updatedAsset.title,
          category: updatedAsset.category === 'General' ? 'Portraits' : updatedAsset.category,
          image_url: updatedAsset.url,
          location: updatedAsset.location,
          year: updatedAsset.date_taken?.split('-')[0] || '2026',
          description: updatedAsset.description,
          camera_setup: `${updatedAsset.camera} + ${updatedAsset.lens}`
        };

        // Check if there's an existing item with the same image url in portfolio table
        const { data: exist } = await supabase
          .from('portfolio')
          .select('id')
          .eq('image_url', updatedAsset.url)
          .limit(1)
          .maybeSingle();

        if (exist) {
          await supabase.from('portfolio').update(portfolioRow).eq('id', exist.id);
        } else {
          await supabase.from('portfolio').insert([portfolioRow]);
        }
        window.dispatchEvent(new Event('portfolio_items_updated'));
      }

      showToast('✓ Asset metadata updated successfully!', 'success');
      setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
      if (previewAsset?.id === updatedAsset.id) {
        setPreviewAsset(updatedAsset);
      }
      setIsEditingMetadata(false);
    } catch (err: any) {
      console.error('Error saving asset metadata:', err);
      showToast('Error updating metadata', 'warn');
    }
  };

  const handleRegenerateAI = async (asset: DamAsset) => {
    setIsRegeneratingAI(true);
    showToast(`🤖 Regenerating AI analysis for ${asset.title}...`, 'info');
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: asset.url,
          filename: asset.filename,
          originalFilename: asset.original_filename,
          fileSize: asset.file_size
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Regeneration request failed.');
      }

      const resultData = await response.json();
      const aiResult = resultData.analysis;

      showToast(`✓ AI analysis regenerated successfully!`, 'success');
      
      // Reload assets
      await loadMediaAndExhibitions();
      
      // Update preview asset with new AI data
      const updatedAiAnalysis = {
        id: aiResult.id || 'new-ai-id',
        confidence: aiResult.confidence,
        category: aiResult.category,
        title: aiResult.title,
        description: aiResult.description,
        tags: aiResult.tags,
        location: aiResult.location,
        people: aiResult.people,
        colors: aiResult.colors,
        quality: aiResult.quality,
        seo: aiResult.seo,
        camera: aiResult.camera,
        social: aiResult.social,
        status: 'pending_review' as const
      };

      if (previewAsset?.id === asset.id) {
        const updatedAsset = {
          ...asset,
          aiAnalysis: updatedAiAnalysis
        };
        setPreviewAsset(updatedAsset as any);
      }
    } catch (err: any) {
      console.error("[Manual AI Regen failed]", err);
      showToast(`✗ Failed: ${err.message || err}`, 'warn');
    } finally {
      setIsRegeneratingAI(false);
    }
  };

  const handleApproveAI = async (asset: DamAsset) => {
    if (!asset.aiAnalysis) return;
    showToast('Applying AI Visual Intelligence...', 'info');

    try {
      // 1. Copy AI fields into asset's main fields
      const approvedAsset: DamAsset = {
        ...asset,
        title: asset.aiAnalysis.title || asset.title,
        description: asset.aiAnalysis.description || asset.description,
        category: (asset.aiAnalysis.category === 'Weddings' || asset.aiAnalysis.category === 'Portraits' || asset.aiAnalysis.category === 'Graduations' || asset.aiAnalysis.category === 'Events' || asset.aiAnalysis.category === 'Commercial') 
          ? asset.aiAnalysis.category as any
          : 'General',
        tags: asset.aiAnalysis.tags || asset.tags,
        location: asset.aiAnalysis.location || asset.location,
        camera: asset.aiAnalysis.camera?.camera || asset.camera,
        lens: asset.aiAnalysis.camera?.lens || asset.lens,
        iso: asset.aiAnalysis.camera?.iso || asset.iso,
        shutter_speed: asset.aiAnalysis.camera?.shutter_speed || asset.shutter_speed,
        aperture: asset.aiAnalysis.camera?.aperture || asset.aperture,
        date_taken: asset.aiAnalysis.camera?.date_taken || asset.date_taken,
        color_palette: asset.aiAnalysis.colors?.dominant_colors || asset.color_palette,
        alt_text: asset.aiAnalysis.seo?.alt_text || asset.alt_text
      };

      // 2. Update status of the AI record to approved in Supabase
      if (supabase) {
        const { error: updateErr } = await supabase
          .from('ai_analysis_results')
          .update({ status: 'approved' })
          .eq('image_url', asset.url);

        if (updateErr) {
          console.error("Failed to approve AI record in Supabase:", updateErr);
        }
      }

      // Update rich local storage mapping
      const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
      richMetadataMap[asset.url] = {
        title: approvedAsset.title,
        description: approvedAsset.description,
        alt_text: approvedAsset.alt_text,
        category: approvedAsset.category,
        tags: approvedAsset.tags,
        photographer: approvedAsset.photographer,
        location: approvedAsset.location,
        event: approvedAsset.event,
        camera: approvedAsset.camera,
        lens: approvedAsset.lens,
        iso: approvedAsset.iso,
        shutter_speed: approvedAsset.shutter_speed,
        aperture: approvedAsset.aperture,
        date_taken: approvedAsset.date_taken,
        featured: approvedAsset.featured,
        visibility: approvedAsset.visibility,
        copyright: approvedAsset.copyright,
        license: approvedAsset.license,
        color_palette: approvedAsset.color_palette,
        thumbnail_url: approvedAsset.thumbnail_url || approvedAsset.url
      };
      localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));

      showToast('✓ AI suggestions approved and applied!', 'success');
      
      // Update states
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...approvedAsset, aiAnalysis: asset.aiAnalysis ? { ...asset.aiAnalysis, status: 'approved' } : undefined } : a));
      if (previewAsset?.id === asset.id) {
        setPreviewAsset({ ...approvedAsset, aiAnalysis: asset.aiAnalysis ? { ...asset.aiAnalysis, status: 'approved' } : undefined } as any);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Error applying AI suggestions', 'warn');
    }
  };

  const handleRejectAI = async (asset: DamAsset) => {
    if (!asset.aiAnalysis) return;
    try {
      if (supabase) {
        await supabase
          .from('ai_analysis_results')
          .update({ status: 'rejected' })
          .eq('image_url', asset.url);
      }
      showToast('✓ AI suggestions dismissed', 'info');
      setAssets(prev => prev.map(a => a.id === asset.id ? { ...a, aiAnalysis: a.aiAnalysis ? { ...a.aiAnalysis, status: 'rejected' } : undefined } : a));
      if (previewAsset?.id === asset.id) {
        setPreviewAsset({ ...previewAsset, aiAnalysis: previewAsset.aiAnalysis ? { ...previewAsset.aiAnalysis, status: 'rejected' } : undefined } as any);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateAsset = (asset: DamAsset) => {
    const duplicated: DamAsset = {
      ...asset,
      id: 'dup-' + Math.random().toString(36).substr(2, 9),
      title: `${asset.title} (Copy)`,
      filename: `copy_${asset.filename}`,
      uploaded_at: new Date().toISOString()
    };

    setAssets(prev => [duplicated, ...prev]);
    showToast(`Duplicated ${asset.title}`, 'success');
  };

  const handleDownloadAsset = (url: string, filename: string) => {
    // Force direct file download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Download triggered', 'info');
  };

  const handleDeleteAsset = async (asset: DamAsset) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${asset.title}"? Deletion is permanent and removes the original storage file and database rows.`)) return;

    try {
      setIsLoading(true);
      
      // Step 1: Remove from Supabase Storage
      if (supabase) {
        const fileKey = asset.url.split('/storage/v1/object/public/media-vault/')[1];
        if (fileKey) {
          await supabase.storage.from('media-vault').remove([fileKey]);
          
          // Also remove thumbnail if any
          const thumbKey = asset.thumbnail_url?.split('/storage/v1/object/public/media-vault/')[1];
          if (thumbKey && thumbKey !== fileKey) {
            await supabase.storage.from('media-vault').remove([thumbKey]);
          }
        }

        // Step 2: Remove from media_vault Database Table
        await supabase.from('media_vault').delete().eq('id', asset.id);

        // Also remove from portfolio table if featured
        await supabase.from('portfolio').delete().eq('image_url', asset.url);
      }

      // Step 3: Delete local rich metadata cache
      const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
      delete richMetadataMap[asset.url];
      localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));

      setAssets(prev => prev.filter(a => a.id !== asset.id));
      setSelectedIds(prev => prev.filter(id => id !== asset.id));
      
      if (previewAsset?.id === asset.id) {
        setPreviewAsset(null);
      }

      showToast('✓ Asset and storage objects permanently deleted.', 'success');
      window.dispatchEvent(new Event('portfolio_items_updated'));

    } catch (err: any) {
      console.error('Delete asset exception:', err);
      showToast('Failed to delete asset', 'warn');
    } finally {
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------
  // BULK WORKFLOW OPERATIONS
  // -------------------------------------------------------------
  const handleBulkDelete = async () => {
    if (!window.confirm(`Permanently delete ${selectedIds.length} selected assets from the system?`)) return;
    
    setIsLoading(true);
    let successCount = 0;
    
    try {
      const selectedAssets = assets.filter(a => selectedIds.includes(a.id));
      
      for (const asset of selectedAssets) {
        if (supabase) {
          const fileKey = asset.url.split('/storage/v1/object/public/media-vault/')[1];
          if (fileKey) {
            await supabase.storage.from('media-vault').remove([fileKey]);
            const thumbKey = asset.thumbnail_url?.split('/storage/v1/object/public/media-vault/')[1];
            if (thumbKey && thumbKey !== fileKey) {
              await supabase.storage.from('media-vault').remove([thumbKey]);
            }
          }
          await supabase.from('media_vault').delete().eq('id', asset.id);
          await supabase.from('portfolio').delete().eq('image_url', asset.url);
        }
        
        const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
        delete richMetadataMap[asset.url];
        localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));
        
        successCount++;
      }
      
      setAssets(prev => prev.filter(a => !selectedIds.includes(a.id)));
      setSelectedIds([]);
      showToast(`✓ Bulk deleted ${successCount} assets successfully!`, 'success');
      window.dispatchEvent(new Event('portfolio_items_updated'));
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      showToast('Bulk deletion encountered issues', 'warn');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDownload = () => {
    const selectedAssets = assets.filter(a => selectedIds.includes(a.id));
    selectedAssets.forEach(a => handleDownloadAsset(a.url, a.filename));
    showToast(`Downloading ${selectedAssets.length} files...`, 'info');
  };

  const handleBulkCategoryChange = (category: DamAsset['category']) => {
    const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
    
    const updatedAssets = assets.map(asset => {
      if (selectedIds.includes(asset.id)) {
        const extra = richMetadataMap[asset.url] || {};
        richMetadataMap[asset.url] = { ...extra, category };
        return { ...asset, category };
      }
      return asset;
    });

    localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));
    setAssets(updatedAssets);
    showToast(`✓ Moved ${selectedIds.length} assets to ${category}`, 'success');
  };

  const handleBulkArchive = (archive: boolean) => {
    const richMetadataMap = JSON.parse(localStorage.getItem('verified_dam_rich_metadata') || '{}');
    
    const updatedAssets = assets.map(asset => {
      if (selectedIds.includes(asset.id)) {
        const extra = richMetadataMap[asset.url] || {};
        richMetadataMap[asset.url] = { ...extra, visibility: !archive };
        return { ...asset, visibility: !archive };
      }
      return asset;
    });

    localStorage.setItem('verified_dam_rich_metadata', JSON.stringify(richMetadataMap));
    setAssets(updatedAssets);
    showToast(`✓ ${archive ? 'Archived' : 'Activated'} ${selectedIds.length} assets`, 'success');
  };

  // -------------------------------------------------------------
  // EXHIBITIONS DYNAMIC CRUD BUILDER
  // -------------------------------------------------------------
  const handleSaveExhibitionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exhibFormTitle.trim() || !exhibFormCover.trim()) {
      showToast('Please specify a Title and Cover Image', 'warn');
      return;
    }

    try {
      setIsLoading(true);
      const isNew = !exhibEditingId;
      const cleanExhib: Exhibition = {
        id: exhibEditingId || 'exh-' + Math.random().toString(36).substr(2, 9),
        title: exhibFormTitle,
        category: exhibFormCategory,
        description: exhibFormDesc,
        cover_image: exhibFormCover,
        gallery_images: isNew ? [] : (exhibitions.find(x => x.id === exhibEditingId)?.gallery_images || []),
        published: true,
        display_order: isNew ? exhibitions.length : (exhibitions.find(x => x.id === exhibEditingId)?.display_order || 0)
      };

      const success = await saveExhibition(cleanExhib);
      if (success) {
        showToast(isNew ? '✓ Exhibition created!' : '✓ Exhibition updated!', 'success');
        
        // Reset buffers
        setExhibFormTitle('');
        setExhibFormDesc('');
        setExhibFormCover('');
        setExhibEditingId(null);
        setIsCreatingExhibition(false);
        
        loadMediaAndExhibitions();
      } else {
        showToast('Error persisting exhibition to Database', 'warn');
      }
    } catch (err: any) {
      console.error('Save exhibition exception:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditExhibitionClick = (exh: Exhibition) => {
    setExhibEditingId(exh.id);
    setExhibFormTitle(exh.title);
    setExhibFormCategory(exh.category);
    setExhibFormDesc(exh.description);
    setExhibFormCover(exh.cover_image);
    setIsCreatingExhibition(true);
  };

  const handleDeleteExhibitionClick = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the exhibition "${title}"?`)) return;
    
    try {
      setIsLoading(true);
      const success = await deleteExhibition(id);
      if (success) {
        showToast('✓ Exhibition permanently deleted.', 'success');
        loadMediaAndExhibitions();
      } else {
        showToast('Error deleting exhibition row.', 'warn');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleExhibitionPublish = async (exh: Exhibition) => {
    const updated = { ...exh, published: !exh.published };
    const success = await saveExhibition(updated);
    if (success) {
      showToast(updated.published ? '✓ Exhibition published!' : '✓ Exhibition set to Draft', 'success');
      loadMediaAndExhibitions();
    }
  };

  const handleAssignAssetToExhibition = async (exh: Exhibition, assetUrl: string) => {
    if (exh.gallery_images.includes(assetUrl)) {
      showToast('Image is already in this exhibition', 'info');
      return;
    }
    const updated = {
      ...exh,
      gallery_images: [...exh.gallery_images, assetUrl]
    };
    const success = await saveExhibition(updated);
    if (success) {
      showToast(`✓ Added to "${exh.title}"!`, 'success');
      loadMediaAndExhibitions();
    }
  };

  const handleRemoveAssetFromExhibition = async (exh: Exhibition, index: number) => {
    const updatedImages = [...exh.gallery_images];
    updatedImages.splice(index, 1);
    const updated = {
      ...exh,
      gallery_images: updatedImages
    };
    const success = await saveExhibition(updated);
    if (success) {
      showToast('Removed from exhibition portfolio', 'success');
      loadMediaAndExhibitions();
    }
  };

  const handleMoveExhibitionAssetOrder = async (exh: Exhibition, index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === exh.gallery_images.length - 1) return;

    const updatedImages = [...exh.gallery_images];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    const temp = updatedImages[index];
    updatedImages[index] = updatedImages[targetIdx];
    updatedImages[targetIdx] = temp;

    const updated = {
      ...exh,
      gallery_images: updatedImages
    };
    const success = await saveExhibition(updated);
    if (success) {
      loadMediaAndExhibitions();
    }
  };

  // -------------------------------------------------------------
  // ADVANCED ALGORITHMS: FILTERING & SEARCH
  // -------------------------------------------------------------
  const filteredAssets = assets.filter(asset => {
    // 1. Search Term matching
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch = 
      asset.title.toLowerCase().includes(normalizedSearch) ||
      asset.filename.toLowerCase().includes(normalizedSearch) ||
      asset.description.toLowerCase().includes(normalizedSearch) ||
      asset.alt_text.toLowerCase().includes(normalizedSearch) ||
      asset.photographer.toLowerCase().includes(normalizedSearch) ||
      asset.tags.some(t => t.toLowerCase().includes(normalizedSearch));

    // 2. Category matching
    const matchesCategory = filterCategory === 'all' || asset.category.toLowerCase() === filterCategory.toLowerCase();

    // 3. Status matching
    let matchesStatus = true;
    if (filterStatus === 'archived') {
      matchesStatus = !asset.visibility;
    } else if (filterStatus === 'active') {
      matchesStatus = asset.visibility;
    } else if (filterStatus === 'featured') {
      matchesStatus = asset.featured;
    }

    // 4. Camera matching
    const matchesCamera = filterCamera === 'all' || asset.camera === filterCamera;

    return matchesSearch && matchesCategory && matchesStatus && matchesCamera;
  });

  // Keyboard Navigation & Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!previewAsset) return;

      if (e.key === 'Escape') {
        setPreviewAsset(null);
        setIsEditingMetadata(false);
      } else if (e.key === 'ArrowRight') {
        const currentIdx = filteredAssets.findIndex(a => a.id === previewAsset.id);
        if (currentIdx >= 0 && currentIdx < filteredAssets.length - 1) {
          setPreviewAsset(filteredAssets[currentIdx + 1]);
        }
      } else if (e.key === 'ArrowLeft') {
        const currentIdx = filteredAssets.findIndex(a => a.id === previewAsset.id);
        if (currentIdx > 0) {
          setPreviewAsset(filteredAssets[currentIdx - 1]);
        }
      } else if (e.key === 'Delete' && selectedIds.includes(previewAsset.id)) {
        handleDeleteAsset(previewAsset);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewAsset, filteredAssets, selectedIds]);

  // Context Menu listener click blocker
  useEffect(() => {
    const closeContext = () => setContextMenu(null);
    window.addEventListener('click', closeContext);
    return () => window.removeEventListener('click', closeContext);
  }, []);

  const handleContextMenuOpen = (e: React.MouseEvent, assetId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      assetId
    });
  };

  return (
    <div className="space-y-6 text-white pb-12">
      
      {/* Dynamic Sliding Toasts */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`px-4 py-3 rounded-xl border flex items-center gap-2 text-xs font-mono font-semibold shadow-lg backdrop-blur-md ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/90 border-emerald-500/20 text-emerald-400' 
                  : toast.type === 'warn' 
                    ? 'bg-red-950/90 border-red-500/20 text-red-400' 
                    : 'bg-zinc-900/90 border-zinc-700/20 text-zinc-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{toast.msg}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-space font-bold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#2EC4B6]" />
            <span>Digital Asset Management (DAM) System</span>
          </h2>
          <p className="text-xs text-[#A7C4B8] mt-1">
            Studio-grade media vault mapping cloud-optimized asset point indices, EXIF blueprints, and rich metadata.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 self-start md:self-auto shrink-0">
          <button 
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-2 text-xs font-space font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'vault' 
                ? 'bg-[#2EC4B6] text-[#071A14] shadow-md' 
                : 'text-[#A7C4B8] hover:text-white'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Media Vault Assets</span>
          </button>
          <button 
            onClick={() => setActiveTab('exhibitions')}
            className={`px-4 py-2 text-xs font-space font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'exhibitions' 
                ? 'bg-[#2EC4B6] text-[#071A14] shadow-md' 
                : 'text-[#A7C4B8] hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Exhibitions Curation</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* WORKSPACE MODE: MEDIA VAULT */}
      {/* ============================================================== */}
      {activeTab === 'vault' && (
        <div className="space-y-6">
          
          {/* DRAG AND DROP CLOUD STORAGE UPLOAD PANEL */}
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`p-6 rounded-2xl border transition-all relative overflow-hidden bg-white/[0.005] ${
              dragActive 
                ? 'border-[#2EC4B6] bg-[#2EC4B6]/5 shadow-[0_0_20px_rgba(46,196,182,0.15)]' 
                : 'border-white/5 hover:border-[#2EC4B6]/20'
            }`}
          >
            <div className="flex flex-col md:flex-row items-center gap-6">
              
              {/* Upload Drop target */}
              <div className="flex-1 text-center py-6 border border-dashed border-white/10 rounded-xl w-full">
                <Upload className="w-8 h-8 text-[#2EC4B6] mx-auto mb-2 animate-pulse" />
                <span className="text-xs font-mono text-white block font-bold">Drag & Drop visual assets here</span>
                <span className="text-[10px] text-[#A7C4B8] block mt-1">or click below to browse computer</span>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileSelect} 
                  className="hidden" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-[#2EC4B6] border border-white/5 rounded-lg transition-all cursor-pointer"
                >
                  Browse Files
                </button>
              </div>

              {/* Upload Active Queue / Log */}
              {uploadQueue.length > 0 && (
                <div className="w-full md:w-96 p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-[#2EC4B6]">UPLOAD QUEUE ({uploadQueue.length})</span>
                    <button 
                      onClick={clearCompletedQueue}
                      className="text-[9px] font-mono text-brand-muted hover:text-white"
                    >
                      Clear Done
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {uploadQueue.map((item) => (
                      <div key={item.id} className="p-2 rounded-lg bg-white/[0.01] border border-white/5 flex flex-col gap-1.5 text-[10px] font-mono">
                        <div className="flex justify-between items-center gap-2">
                          <span className="truncate max-w-[150px] text-white font-semibold">{item.file.name}</span>
                          <span className="text-brand-muted">{(item.file.size/1024/1024).toFixed(2)} MB</span>
                        </div>

                        <div className="flex items-center justify-between gap-4">
                          {/* Progress Line */}
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                item.status === 'failed' 
                                  ? 'bg-red-500' 
                                  : item.status === 'success' 
                                    ? 'bg-emerald-500' 
                                    : 'bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7]'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>

                          <span className="text-brand-muted font-bold shrink-0">{item.progress}%</span>
                        </div>

                        <div className="flex justify-between items-center text-[9px] text-brand-muted">
                          <div className="flex items-center gap-1">
                            {item.status === 'compressing' && <span className="text-amber-400 font-bold animate-pulse">⚙ Compress WebP...</span>}
                            {item.status === 'uploading' && <span className="text-cyan-400 font-bold animate-pulse">🖧 Uploading Storage...</span>}
                            {item.status === 'analyzing' && <span className="text-indigo-400 font-bold animate-pulse">🧠 AI Analyzing Image...</span>}
                            {item.status === 'metadata' && <span className="text-purple-400 font-bold animate-pulse">✍ Generating Metadata...</span>}
                            {item.status === 'success' && <span className="text-emerald-400 font-bold">✓ Complete</span>}
                            {item.status === 'failed' && <span className="text-red-400 font-bold">✗ Failed</span>}
                            {(item.status === 'uploading' || item.status === 'analyzing' || item.status === 'metadata') && item.speed && (
                              <span className="text-white/60">({item.speed})</span>
                            )}
                          </div>

                          <div className="flex gap-1.5">
                            {item.status === 'failed' && (
                              <button onClick={() => retryUploadQueueItem(item.id)} className="text-[#2EC4B6] hover:underline">Retry</button>
                            )}
                            {item.status !== 'success' && item.status !== 'failed' && (
                              <button onClick={() => cancelUploadQueueItem(item.id)} className="text-red-400 hover:underline">Cancel</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ADVANCED MATRIX FILTERS & REAL-TIME SEARCH */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              
              {/* Dynamic search bar */}
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                <input 
                  type="text" 
                  placeholder="Search assets by title, file key, photographer or tag..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-white focus:border-[#2EC4B6] outline-none placeholder-brand-muted transition-colors"
                />
              </div>

              {/* Toolbars and presets */}
              <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button 
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`px-3 py-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer ${
                    showAdvancedFilters 
                      ? 'bg-[#2EC4B6]/10 border-[#2EC4B6] text-[#2EC4B6]' 
                      : 'bg-white/[0.01] border-white/5 text-[#A7C4B8] hover:bg-white/5'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Advanced filters</span>
                </button>

                {/* View Mode toggles */}
                <div className="flex rounded-xl bg-black/40 border border-white/5 p-1 shrink-0">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[#2EC4B6]/20 text-[#2EC4B6]' : 'text-brand-muted hover:text-white'}`}
                  >
                    <GridIcon className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[#2EC4B6]/20 text-[#2EC4B6]' : 'text-brand-muted hover:text-white'}`}
                  >
                    <ListIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Refresh Database button */}
                <button 
                  onClick={loadMediaAndExhibitions}
                  disabled={isLoading}
                  className="p-2 bg-white/5 hover:bg-white/10 text-[#A7C4B8] rounded-xl border border-white/5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Expandable Advanced Filters Accordion */}
            <AnimatePresence>
              {showAdvancedFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-5 rounded-2xl bg-black/40 border border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    {/* Category Filter */}
                    <div>
                      <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1.5">Asset Theme Category</label>
                      <select 
                        value={filterCategory} 
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#10261F] border border-white/10 text-xs text-white"
                      >
                        <option value="all">ALL CATEGORIES</option>
                        <option value="weddings">Weddings</option>
                        <option value="portraits">Portraits</option>
                        <option value="graduations">Graduations</option>
                        <option value="events">Events</option>
                        <option value="commercial">Commercial</option>
                        <option value="general">General</option>
                      </select>
                    </div>

                    {/* Status filter */}
                    <div>
                      <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1.5">Visibility Status</label>
                      <select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#10261F] border border-white/10 text-xs text-white"
                      >
                        <option value="all">ALL FILES</option>
                        <option value="active">ACTIVE ONLY</option>
                        <option value="archived">ARCHIVED ONLY</option>
                        <option value="featured">FEATURED IN PORTFOLIO</option>
                      </select>
                    </div>

                    {/* Camera Model Filter */}
                    <div>
                      <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1.5">Camera Hardware</label>
                      <select 
                        value={filterCamera} 
                        onChange={(e) => setFilterCamera(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#10261F] border border-white/10 text-xs text-white"
                      >
                        <option value="all">ALL CAMERAS</option>
                        {cameraOptions.map(cam => (
                          <option key={cam} value={cam}>{cam.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="flex flex-col justify-end">
                      <div className="p-3 rounded-lg bg-white/[0.01] border border-white/5 flex justify-between items-center">
                        <span className="text-[10px] font-mono text-brand-muted">Filtered Size:</span>
                        <span className="text-xs font-mono font-bold text-white">
                          {(filteredAssets.reduce((acc, curr) => acc + curr.file_size, 0) / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* BULK SELECTION ACTION WORKFLOW BAR */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-xl bg-gradient-to-r from-[#10261F] to-black border border-[#2EC4B6]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(46,196,182,0.1)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white flex items-center gap-1.5 font-bold">
                    <Check className="w-4 h-4 text-[#2EC4B6]" />
                    <span>{selectedIds.length} Assets Selected</span>
                  </span>
                  <button 
                    onClick={() => setSelectedIds([])}
                    className="text-[10px] font-mono text-brand-muted hover:text-white underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Bulk change category */}
                  <div className="relative group shrink-0">
                    <button className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-[#A7C4B8] border border-white/5 rounded-lg flex items-center gap-1 cursor-pointer">
                      <span>Category</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 p-1.5 w-36 bg-zinc-950 border border-white/10 rounded-lg shadow-xl text-[10px] font-mono text-left">
                      {['Weddings', 'Portraits', 'Graduations', 'Events', 'Commercial', 'General'].map(cat => (
                        <button 
                          key={cat} 
                          onClick={() => handleBulkCategoryChange(cat as any)}
                          className="w-full text-left px-2 py-1 rounded hover:bg-white/5 text-white block"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bulk Archive / Unarchive */}
                  <button 
                    onClick={() => handleBulkArchive(true)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-[#A7C4B8] border border-white/5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Archive className="w-3 h-3 text-amber-400" />
                    <span>Archive</span>
                  </button>

                  <button 
                    onClick={() => handleBulkArchive(false)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-[#A7C4B8] border border-white/5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3 h-3 text-emerald-400" />
                    <span>Publish</span>
                  </button>

                  {/* Bulk Download */}
                  <button 
                    onClick={handleBulkDownload}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-[10px] font-mono text-[#A7C4B8] border border-white/5 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>

                  {/* Bulk Delete */}
                  <button 
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-red-950/80 hover:bg-red-950 text-[10px] font-mono text-red-400 border border-red-500/10 rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete Permanent</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ASSET INDEX GRID & LISTS */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-white/[0.01] border border-white/5 animate-pulse flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-white/10 animate-spin" />
                </div>
              ))}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              {filteredAssets.map((asset) => {
                const isSelected = selectedIds.includes(asset.id);
                return (
                  <div 
                    key={asset.id} 
                    onContextMenu={(e) => handleContextMenuOpen(e, asset.id)}
                    onDoubleClick={() => handleEditAssetMetadata(asset)}
                    onClick={(e) => handleAssetSelect(e, asset.id)}
                    className={`group rounded-xl border overflow-hidden relative cursor-pointer select-none transition-all flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#2EC4B6] bg-[#2EC4B6]/5 shadow-[0_0_15px_rgba(46,196,182,0.1)]' 
                        : 'border-white/5 bg-white/[0.005] hover:border-white/10 hover:bg-white/[0.01]'
                    }`}
                  >
                    {/* Visual Thumb */}
                    <div className="aspect-video w-full overflow-hidden bg-black/40 relative">
                      <img 
                        src={asset.thumbnail_url || asset.url} 
                        alt={asset.title} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />

                      {/* Select state indicator checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={(e) => {}} // Block manual events since matrix click handles selection
                          className="w-3.5 h-3.5 rounded accent-[#2EC4B6] border-white/20 text-[#071A14]"
                        />
                      </div>

                      {/* Badges */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10 text-[8px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-black/80 text-white border border-white/5 uppercase font-bold">
                          {asset.category}
                        </span>
                        {asset.featured && (
                          <span className="px-1.5 py-0.5 rounded bg-[#2EC4B6]/80 text-[#071A14] font-bold">
                            ★ Featured
                          </span>
                        )}
                        {!asset.visibility && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/80 text-black font-bold">
                            Archived
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata summary footer */}
                    <div className="p-3 space-y-1 bg-black/20">
                      <h4 className="text-[11px] font-space font-bold text-white truncate">{asset.title}</h4>
                      
                      <div className="flex justify-between items-center text-[9px] font-mono text-brand-muted">
                        <span>{asset.width} × {asset.height}</span>
                        <span>{(asset.file_size/1024).toFixed(0)} KB</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredAssets.length === 0 && (
                <div className="col-span-full py-20 text-center text-xs text-brand-muted font-mono bg-white/[0.005] border border-white/5 rounded-2xl">
                  No matching visual assets loaded in this category. Upload files above to get started.
                </div>
              )}

            </div>
          ) : (
            /* LIST VIEW MODE */
            <div className="rounded-2xl border border-white/5 bg-white/[0.005] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-brand-muted uppercase text-[9px]">
                      <th className="p-3 w-8">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.length === filteredAssets.length && filteredAssets.length > 0} 
                          onChange={handleSelectAll}
                          className="accent-[#2EC4B6]"
                        />
                      </th>
                      <th className="p-3">Asset Thumbnail</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Camera Setup</th>
                      <th className="p-3">File Size</th>
                      <th className="p-3">Dimensions</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredAssets.map(asset => {
                      const isSelected = selectedIds.includes(asset.id);
                      return (
                        <tr 
                          key={asset.id}
                          className={`hover:bg-white/[0.01] transition-colors cursor-pointer ${isSelected ? 'bg-[#2EC4B6]/5' : ''}`}
                          onClick={(e) => handleAssetSelect(e, asset.id)}
                        >
                          <td className="p-3" onClick={e => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={isSelected}
                              onChange={(e) => handleAssetSelect(e as any, asset.id)}
                              className="accent-[#2EC4B6]"
                            />
                          </td>
                          <td className="p-3">
                            <img src={asset.thumbnail_url || asset.url} alt="" className="w-10 h-7 rounded object-cover border border-white/10" referrerPolicy="no-referrer" />
                          </td>
                          <td className="p-3 font-semibold text-white">{asset.title}</td>
                          <td className="p-3">
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[9px] uppercase font-bold text-white border border-white/5">{asset.category}</span>
                          </td>
                          <td className="p-3 text-[#A7C4B8]">{asset.camera} ({asset.iso})</td>
                          <td className="p-3 text-brand-muted">{(asset.file_size/1024).toFixed(0)} KB</td>
                          <td className="p-3 text-brand-muted">{asset.width}×{asset.height}</td>
                          <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1.5 justify-end">
                              <button onClick={() => handleEditAssetMetadata(asset)} className="p-1.5 rounded bg-white/5 hover:bg-[#2EC4B6]/10 text-brand-muted hover:text-[#2EC4B6]" title="Edit EXIF Metadata"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDuplicateAsset(asset)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-brand-muted" title="Duplicate Asset"><DuplicateIcon className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDownloadAsset(asset.url, asset.filename)} className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-brand-muted" title="Download Asset"><Download className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDeleteAsset(asset)} className="p-1.5 rounded bg-red-500/5 hover:bg-red-500/20 text-red-400" title="Delete Asset"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredAssets.length === 0 && (
                <div className="py-20 text-center text-brand-muted font-mono">
                  No matching visual assets loaded in this category.
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ============================================================== */}
      {/* WORKSPACE MODE: EXHIBITIONS */}
      {/* ============================================================== */}
      {activeTab === 'exhibitions' && (
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Create/Edit Exhibition side-panel */}
          <div className="p-6 rounded-2xl bg-white/[0.005] border border-white/5 space-y-4 h-fit">
            <h3 className="font-space font-bold text-sm text-[#2EC4B6] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>{exhibEditingId ? 'Re-calibrate Exhibition' : 'Expose New Exhibition Gallery'}</span>
            </h3>

            <form onSubmit={handleSaveExhibitionForm} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Exhibition Title</label>
                <input 
                  type="text" 
                  value={exhibFormTitle}
                  onChange={e => setExhibFormTitle(e.target.value)}
                  placeholder="E.g. Edo Cultural Heritage"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:border-[#2EC4B6] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Theme Category</label>
                <select 
                  value={exhibFormCategory}
                  onChange={e => setExhibFormCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#10261F] border border-white/10 text-xs text-white"
                >
                  <option value="Weddings">Weddings</option>
                  <option value="Portraits">Portraits</option>
                  <option value="Graduations">Graduations</option>
                  <option value="Events">Events</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] uppercase mb-1">Narrative Description</label>
                <textarea 
                  rows={3}
                  value={exhibFormDesc}
                  onChange={e => setExhibFormDesc(e.target.value)}
                  placeholder="Tell the cinematic story behind this curated exhibition..."
                  className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none"
                />
              </div>

              <div>
                <MediaUploader
                  value={exhibFormCover}
                  onChange={setExhibFormCover}
                  folder="gallery"
                  label="Exhibition Cover Image"
                  aspectRatio="aspect-[16/9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                {exhibEditingId && (
                  <button 
                    type="button" 
                    onClick={() => {
                      setExhibEditingId(null);
                      setExhibFormTitle('');
                      setExhibFormDesc('');
                      setExhibFormCover('');
                    }}
                    className="px-4 py-2 text-xs font-mono text-brand-muted"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{exhibEditingId ? 'Update Exhibition' : 'Create Exhibition'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Curated Exhibitions matrix / Accordions */}
          <div className="col-span-2 space-y-4">
            
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-brand-muted font-bold tracking-wider">CURATED EXHIBITION INDEX ({exhibitions.length})</span>
            </div>

            <div className="space-y-4">
              {exhibitions.map((exh) => (
                <div key={exh.id} className="p-5 rounded-2xl bg-white/[0.005] border border-white/5 space-y-4 hover:border-white/10 transition-colors">
                  
                  {/* Top Bar info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                      <img src={exh.cover_image} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="font-space font-bold text-base text-white flex items-center gap-2">
                          <span>{exh.title}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#A7C4B8] border border-white/5 uppercase">
                            {exh.category}
                          </span>
                        </h4>
                        <span className="text-[10px] font-mono text-brand-muted mt-1 block">
                          {exh.gallery_images?.length || 0} Curated assets • {exh.published ? '● Published' : '○ Draft'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button 
                        onClick={() => handleToggleExhibitionPublish(exh)} 
                        className={`p-2 rounded-lg border text-xs font-mono transition-colors ${
                          exh.published 
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 hover:bg-emerald-900/30' 
                            : 'bg-zinc-900/20 border-zinc-700/20 text-zinc-400 hover:bg-zinc-800'
                        }`}
                        title={exh.published ? 'Unpublish' : 'Publish'}
                      >
                        {exh.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>

                      <button onClick={() => handleEditExhibitionClick(exh)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6] border border-white/5" title="Edit Metadata"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteExhibitionClick(exh.id, exh.title)} className="p-2 rounded-lg bg-red-500/5 hover:bg-red-500/20 text-red-400 border border-white/5" title="Delete Exhibition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {/* Curated Gallery Assets inside Exhibition */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-brand-muted">EXHIBITION IMAGES & DISPLAY SEQUENCE</span>
                      
                      {/* Asset Quick Assigner group */}
                      <div className="relative group shrink-0">
                        <button className="px-2.5 py-1 bg-[#2EC4B6]/10 text-[#2EC4B6] border border-[#2EC4B6]/20 text-[9px] font-mono rounded flex items-center gap-1 cursor-pointer">
                          <span>+ Assign Asset</span>
                        </button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 z-50 p-2 w-64 max-h-48 overflow-y-auto bg-zinc-950 border border-white/10 rounded-lg shadow-2xl grid grid-cols-4 gap-1">
                          {assets.map(a => (
                            <button 
                              key={a.id} 
                              type="button"
                              onClick={() => handleAssignAssetToExhibition(exh, a.url)}
                              className="aspect-square w-full rounded overflow-hidden border border-white/5 hover:border-[#2EC4B6] relative"
                            >
                              <img src={a.thumbnail_url || a.url} alt="" className="w-full h-full object-cover" />
                              {exh.gallery_images.includes(a.url) && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-mono">Added</div>
                              )}
                            </button>
                          ))}
                          {assets.length === 0 && <span className="col-span-full text-[9px] text-brand-muted text-center py-2">No assets available</span>}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {exh.gallery_images?.map((url, idx) => (
                        <div key={idx} className="group relative aspect-video rounded-lg overflow-hidden border border-white/5 bg-black/40">
                          <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          
                          {/* Hover display controls for reordering and removing */}
                          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 text-[9px] font-mono">
                            <span className="text-white">Sequence: #{idx+1}</span>
                            
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => handleMoveExhibitionAssetOrder(exh, idx, 'up')} className="p-1 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30" disabled={idx === 0} title="Move Left">
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleMoveExhibitionAssetOrder(exh, idx, 'down')} className="p-1 rounded bg-white/5 hover:bg-white/10 text-white disabled:opacity-30" disabled={idx === exh.gallery_images.length - 1} title="Move Right">
                                <ChevronRight className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleRemoveAssetFromExhibition(exh, idx)} className="p-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white" title="Remove Asset">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!exh.gallery_images || exh.gallery_images.length === 0) && (
                        <div className="col-span-full py-6 text-center text-[10px] font-mono text-brand-muted bg-white/[0.005] border border-white/5 border-dashed rounded-lg">
                          This exhibition gallery is empty. Pick assets from the picker above to curate.
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              ))}

              {exhibitions.length === 0 && (
                <div className="py-20 text-center text-xs text-brand-muted font-mono bg-white/[0.005] border border-white/5 rounded-2xl">
                  No digital exhibitions curated yet. Use the sidebar constructor to create your first themed public gallery!
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FLOATING RIGHT-CLICK CONTEXT MENU */}
      {/* ============================================================== */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[10000] w-48 p-1.5 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl flex flex-col gap-1 text-[11px] font-mono"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {assets.find(a => a.id === contextMenu.assetId) && (() => {
              const asset = assets.find(a => a.id === contextMenu.assetId)!;
              return (
                <>
                  <button 
                    onClick={() => handleEditAssetMetadata(asset)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white flex items-center gap-2"
                  >
                    <Info className="w-3.5 h-3.5 text-[#2EC4B6]" />
                    <span>Metadata details</span>
                  </button>
                  <button 
                    onClick={() => handleDuplicateAsset(asset)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white flex items-center gap-2"
                  >
                    <DuplicateIcon className="w-3.5 h-3.5 text-brand-muted" />
                    <span>Duplicate Asset</span>
                  </button>
                  <button 
                    onClick={() => handleDownloadAsset(asset.url, asset.filename)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-white flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5 text-brand-muted" />
                    <span>Direct Download</span>
                  </button>
                  <div className="h-px bg-white/5 my-1" />
                  <button 
                    onClick={() => handleDeleteAsset(asset)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Delete Permanent</span>
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* LARGE PREVIEW MODAL / EDITING LIGHTROOM */}
      {/* ============================================================== */}
      <AnimatePresence>
        {previewAsset && (
          <div className="fixed inset-0 z-[9990] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-6xl h-[90vh] bg-zinc-950 border border-white/5 rounded-3xl overflow-hidden flex flex-col md:flex-row relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setPreviewAsset(null);
                  setIsEditingMetadata(false);
                }}
                className="absolute top-4 right-4 z-50 p-2.5 bg-black/80 hover:bg-white/10 rounded-full text-[#A7C4B8] hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* LEFT SIDE: FULL CINEMATIC FRAME PREVIEW */}
              <div className="flex-1 bg-black/85 flex flex-col justify-between p-6 relative">
                
                {/* Image display */}
                <div className="flex-1 flex items-center justify-center overflow-hidden">
                  <img 
                    src={previewAsset.url} 
                    alt={previewAsset.title} 
                    className="max-h-[60vh] max-w-full object-contain rounded-xl border border-white/5 shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Left/Right carousel markers */}
                <div className="absolute inset-y-0 left-4 flex items-center">
                  <button 
                    onClick={() => {
                      const idx = filteredAssets.findIndex(a => a.id === previewAsset.id);
                      if (idx > 0) setPreviewAsset(filteredAssets[idx - 1]);
                    }}
                    disabled={filteredAssets.findIndex(a => a.id === previewAsset.id) === 0}
                    className="p-2.5 bg-black/60 hover:bg-white/10 text-[#A7C4B8] hover:text-white border border-white/5 rounded-full disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="absolute inset-y-0 right-4 flex items-center">
                  <button 
                    onClick={() => {
                      const idx = filteredAssets.findIndex(a => a.id === previewAsset.id);
                      if (idx >= 0 && idx < filteredAssets.length - 1) setPreviewAsset(filteredAssets[idx + 1]);
                    }}
                    disabled={filteredAssets.findIndex(a => a.id === previewAsset.id) === filteredAssets.length - 1}
                    className="p-2.5 bg-black/60 hover:bg-white/10 text-[#A7C4B8] hover:text-white border border-white/5 rounded-full disabled:opacity-20 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Histogram & Color Palette simulation */}
                <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/40 p-4 border border-white/5 rounded-2xl">
                  {/* Dynamic extracted palette simulation */}
                  <div>
                    <span className="text-[9px] font-mono text-brand-muted uppercase block mb-1.5">Cinematic Palette extract</span>
                    <div className="flex gap-1">
                      {previewAsset.color_palette.map((color, idx) => (
                        <span 
                          key={idx} 
                          className="w-5 h-5 rounded-md border border-white/5" 
                          style={{ backgroundColor: color }} 
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tech specs readout */}
                  <div className="flex items-center gap-4 text-[9px] font-mono text-brand-muted">
                    <div className="text-right">
                      <span className="text-white font-bold block">{previewAsset.width} × {previewAsset.height} px</span>
                      <span>Resolution</span>
                    </div>
                    <div className="h-6 w-px bg-white/5" />
                    <div className="text-right">
                      <span className="text-white font-bold block">{(previewAsset.file_size/1024).toFixed(0)} KB</span>
                      <span>WebP Compressed</span>
                    </div>
                    <div className="h-6 w-px bg-white/5" />
                    <div className="text-right">
                      <span className="text-white font-bold block uppercase">{previewAsset.category}</span>
                      <span>Asset Tag</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* RIGHT SIDE: SCROLLABLE EXIF METADATA AND LEGAL BLUEPRINTS */}
              <div className="w-full md:w-[420px] bg-zinc-950 border-t md:border-t-0 md:border-l border-white/5 p-6 flex flex-col justify-between h-full">
                
                <div className="flex-1 overflow-y-auto pr-1 space-y-5 select-none">
                  {/* TAB SWITCHER */}
                  <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-xl">
                    <button
                      onClick={() => setSidebarTab('dossier')}
                      className={`flex-1 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer text-center ${
                        sidebarTab === 'dossier'
                          ? 'bg-[#2EC4B6]/10 text-[#2EC4B6] border border-[#2EC4B6]/20'
                          : 'text-brand-muted hover:text-white border border-transparent'
                      }`}
                    >
                      Dossier
                    </button>
                    <button
                      onClick={() => setSidebarTab('ai')}
                      className={`flex-1 py-1.5 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                        sidebarTab === 'ai'
                          ? 'bg-[#2EC4B6]/10 text-[#2EC4B6] border border-[#2EC4B6]/20'
                          : 'text-brand-muted hover:text-white border border-transparent'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-[#2EC4B6]" />
                      <span>AI Insights</span>
                      {previewAsset.aiAnalysis && previewAsset.aiAnalysis.status === 'pending_review' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                      )}
                    </button>
                  </div>

                  {sidebarTab === 'dossier' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] font-mono font-bold text-white/40 uppercase">1. Creative curation</span>
                        <button 
                          onClick={() => setIsEditingMetadata(!isEditingMetadata)}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] font-mono text-[#2EC4B6] rounded-md transition-colors cursor-pointer"
                        >
                          {isEditingMetadata ? 'Dossier locked' : 'Edit Dossier'}
                        </button>
                      </div>

                      {/* General segment */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Asset Display Title</label>
                          <input 
                            type="text" 
                            value={previewAsset.title}
                            disabled={!isEditingMetadata}
                            onChange={e => handleSaveMetadataChanges({ ...previewAsset, title: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Description / Curation Notes</label>
                          <textarea 
                            rows={2}
                            value={previewAsset.description}
                            disabled={!isEditingMetadata}
                            onChange={e => handleSaveMetadataChanges({ ...previewAsset, description: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Theme Category</label>
                            <select 
                              value={previewAsset.category}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, category: e.target.value as any })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-[#10261F] border border-white/5 disabled:opacity-60 text-white"
                            >
                              <option value="General">General</option>
                              <option value="Weddings">Weddings</option>
                              <option value="Portraits">Portraits</option>
                              <option value="Graduations">Graduations</option>
                              <option value="Events">Events</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Photographer Account</label>
                            <input 
                              type="text" 
                              value={previewAsset.photographer}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, photographer: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Capture Location</label>
                            <input 
                              type="text" 
                              value={previewAsset.location}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, location: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Alt Text (SEO)</label>
                            <input 
                              type="text" 
                              value={previewAsset.alt_text}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, alt_text: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                        </div>

                        {/* Interactive Tags generator */}
                        <div>
                          <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Asset Tag Chips (Comma separated)</label>
                          <input 
                            type="text" 
                            value={previewAsset.tags.join(', ')}
                            disabled={!isEditingMetadata}
                            onChange={e => handleSaveMetadataChanges({ ...previewAsset, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                            placeholder="wedding, royal, coral beads"
                            className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                          />
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {previewAsset.tags.map((tag, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[8px] font-mono text-white flex items-center gap-1">
                                <Tag className="w-2.5 h-2.5 text-[#2EC4B6]" />
                                <span>{tag}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/5 w-full my-2" />

                      {/* Technical EXIF blueprints */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-mono text-brand-muted uppercase tracking-wider block font-bold">2. TECHNICAL EXIF BLOCK</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Camera Chassis</label>
                            <input 
                              type="text" 
                              value={previewAsset.camera}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, camera: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Optics / Prime Lens</label>
                            <input 
                              type="text" 
                              value={previewAsset.lens}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, lens: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Shutter Speed</label>
                            <input 
                              type="text" 
                              value={previewAsset.shutter_speed}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, shutter_speed: e.target.value })}
                              className="w-full px-2 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Aperture</label>
                            <input 
                              type="text" 
                              value={previewAsset.aperture}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, aperture: e.target.value })}
                              className="w-full px-1 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">ISO</label>
                            <input 
                              type="text" 
                              value={previewAsset.iso}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, iso: e.target.value })}
                              className="w-full px-1 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white text-center"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-white/5 w-full my-2" />

                      {/* Legal metadata */}
                      <div className="space-y-3">
                        <span className="text-[9px] font-mono text-brand-muted uppercase tracking-wider block font-bold">3. LEGAL INTELLECTUAL PROPERTY</span>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Copyright Line</label>
                            <input 
                              type="text" 
                              value={previewAsset.copyright}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, copyright: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">Usage License</label>
                            <input 
                              type="text" 
                              value={previewAsset.license}
                              disabled={!isEditingMetadata}
                              onChange={e => handleSaveMetadataChanges({ ...previewAsset, license: e.target.value })}
                              className="w-full px-3 py-2 text-xs rounded-lg bg-black/40 border border-white/5 disabled:opacity-60 text-white"
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/5">
                            <div>
                              <span className="text-xs font-bold text-white block">Exhibition Portfolio Feature</span>
                              <span className="text-[9px] text-brand-muted">Publish directly to landing page</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={previewAsset.featured} 
                                disabled={!isEditingMetadata}
                                onChange={e => handleSaveMetadataChanges({ ...previewAsset, featured: e.target.checked })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2EC4B6]"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* AI INSIGHTS TAB */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-[10px] font-mono font-bold text-white/40 uppercase">AI Visual Intelligence</span>
                        <button 
                          onClick={() => handleRegenerateAI(previewAsset)}
                          disabled={isRegeneratingAI}
                          className="px-2.5 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-50 border border-white/5 text-[9px] font-mono text-[#2EC4B6] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRegeneratingAI ? 'animate-spin' : ''}`} />
                          <span>{isRegeneratingAI ? 'Analyzing...' : 'Regenerate'}</span>
                        </button>
                      </div>

                      {!previewAsset.aiAnalysis ? (
                        <div className="p-6 text-center bg-black/40 border border-white/5 rounded-2xl space-y-3">
                          <Brain className="w-8 h-8 text-brand-muted mx-auto animate-pulse" />
                          <div className="space-y-1">
                            <span className="text-white text-xs font-semibold block">No AI Intelligence dossier yet</span>
                            <p className="text-[10px] text-brand-muted leading-relaxed">
                              Run the Gemini Computer Vision engine to unlock automatic classifications, technical scores, and SEO metadata.
                            </p>
                          </div>
                          <button
                            onClick={() => handleRegenerateAI(previewAsset)}
                            disabled={isRegeneratingAI}
                            className="px-4 py-2 bg-[#2EC4B6] hover:bg-[#2EC4B6]/90 disabled:opacity-50 text-black font-mono text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Analyze with Gemini
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 text-xs">
                          {/* DUP WARNING */}
                          {previewAsset.aiAnalysis.status === 'pending_review' && (
                            <div className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-2xl flex gap-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <span className="text-amber-400 font-bold block text-[10px] uppercase font-mono">Dossier Pending Review</span>
                                <p className="text-[9px] text-amber-400/80 leading-normal font-mono">
                                  AI metadata has been drafted but is not live. Approve to copy and publish details to public landing.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* CONFIDENCE & CLASSIFICATION */}
                          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono text-brand-muted uppercase">Image Classification</span>
                              <span className={`px-2 py-0.5 text-[9px] font-mono rounded-md font-bold ${
                                previewAsset.aiAnalysis.confidence >= 70 
                                  ? 'bg-[#2EC4B6]/10 text-[#2EC4B6]' 
                                  : 'bg-amber-400/10 text-amber-400'
                              }`}>
                                {previewAsset.aiAnalysis.confidence}% Match
                              </span>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xl font-black text-white">{previewAsset.aiAnalysis.category}</span>
                              <span className="text-brand-muted text-[10px] font-mono">({previewAsset.aiAnalysis.people} • {previewAsset.aiAnalysis.location})</span>
                            </div>

                            {/* LOW CONFIDENCE PROMPT */}
                            {previewAsset.aiAnalysis.confidence < 70 && (
                              <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex gap-2">
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                                <span className="text-[9px] text-red-400 font-mono leading-normal">
                                  Confidence is below 70%. Please verify this category before applying the metadata.
                                </span>
                              </div>
                            )}
                          </div>

                          {/* STORY AND DESCRIPTION DRAFT */}
                          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2">
                            <span className="text-[9px] font-mono text-brand-muted uppercase block">AI Crafted Title & Narrative</span>
                            <span className="text-white font-bold block">{previewAsset.aiAnalysis.title}</span>
                            <p className="text-[10px] text-brand-muted leading-relaxed font-mono">
                              {previewAsset.aiAnalysis.description}
                            </p>
                          </div>

                          {/* TECHNICAL QUALITY GAUGES */}
                          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                            <span className="text-[9px] font-mono text-brand-muted uppercase block">Technical Quality Audit</span>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[10px]">
                              {[
                                { label: 'Sharpness', val: previewAsset.aiAnalysis.quality?.sharpness || 80 },
                                { label: 'Exposure', val: previewAsset.aiAnalysis.quality?.exposure || 80 },
                                { label: 'Composition', val: previewAsset.aiAnalysis.quality?.composition || 80 },
                                { label: 'Lighting', val: previewAsset.aiAnalysis.quality?.lighting || 80 },
                                { label: 'Framing', val: previewAsset.aiAnalysis.quality?.framing || 80 },
                                { label: 'Color Contrast', val: previewAsset.aiAnalysis.quality?.depth || 80 }
                              ].map((gauge, idx) => (
                                <div key={idx} className="space-y-1">
                                  <div className="flex justify-between text-[9px]">
                                    <span className="text-brand-muted">{gauge.label}</span>
                                    <span className="text-white font-bold">{gauge.val}%</span>
                                  </div>
                                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full ${gauge.val >= 85 ? 'bg-emerald-500' : gauge.val >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                                      style={{ width: `${gauge.val}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {previewAsset.aiAnalysis.quality?.suggestions?.length > 0 && (
                              <div className="pt-2 border-t border-white/5 space-y-1.5">
                                <span className="text-[8px] text-brand-muted uppercase block font-mono">Editing recommendations:</span>
                                <ul className="space-y-1 font-mono text-[9px] text-[#A7C4B8]">
                                  {previewAsset.aiAnalysis.quality.suggestions.slice(0, 2).map((sug: string, sIdx: number) => (
                                    <li key={sIdx} className="flex gap-1.5 items-start">
                                      <span className="text-[#2EC4B6]">•</span>
                                      <span>{sug}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* SPECTRAL BUBBLES */}
                          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                            <span className="text-[9px] font-mono text-brand-muted uppercase block">AI Spectral Palette</span>
                            <div className="flex gap-2">
                              {(previewAsset.aiAnalysis.colors?.dominant_colors || []).map((color: string, cIdx: number) => (
                                <div key={cIdx} className="flex flex-col items-center gap-1 flex-1 font-mono text-[8px]">
                                  <div 
                                    className="w-full h-7 rounded border border-white/10"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span className="text-brand-muted uppercase truncate w-full text-center">{color}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* SEO & META ACCENTS */}
                          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2 font-mono text-[10px]">
                            <span className="text-[9px] text-brand-muted uppercase block">Search Engine Optimization (SEO)</span>
                            <div className="space-y-2">
                              <div>
                                <span className="text-brand-muted block text-[8px]">Meta Title</span>
                                <span className="text-white block truncate">{previewAsset.aiAnalysis.seo?.seo_title || previewAsset.aiAnalysis.title}</span>
                              </div>
                              <div>
                                <span className="text-brand-muted block text-[8px]">Alt Description (Accessibility)</span>
                                <span className="text-white block leading-relaxed text-[9px]">{previewAsset.aiAnalysis.seo?.alt_text || previewAsset.aiAnalysis.description}</span>
                              </div>
                              <div>
                                <span className="text-brand-muted block text-[8px]">Search Keywords</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(previewAsset.aiAnalysis.seo?.keywords || []).map((kw: string, kwIdx: number) => (
                                    <span key={kwIdx} className="px-1.5 py-0.5 bg-white/5 rounded text-[8px] text-[#A7C4B8]">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* SOCIAL NETWORKS CONTENT & COPY BUTTONS */}
                          <div className="p-3.5 bg-black/40 border border-white/5 rounded-2xl space-y-2.5 font-mono text-[10px]">
                            <span className="text-[9px] text-brand-muted uppercase block">Social Media Copywriter</span>
                            
                            <div className="space-y-3">
                              {[
                                { name: 'Instagram Caption', key: 'instagram' },
                                { name: 'Facebook Copy', key: 'facebook' },
                                { name: 'WhatsApp Update', key: 'whatsapp' }
                              ].map((sc, scIdx) => {
                                const captionText = previewAsset.aiAnalysis?.social?.[sc.key] || '';
                                return (
                                  <div key={scIdx} className="space-y-1 bg-white/[0.01] p-2 border border-white/5 rounded-xl">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] text-brand-muted">{sc.name}</span>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(captionText);
                                          showToast('Copied to clipboard!', 'success');
                                        }}
                                        className="text-[8px] text-[#2EC4B6] hover:underline cursor-pointer"
                                      >
                                        Copy Text
                                      </button>
                                    </div>
                                    <p className="text-[9px] text-white line-clamp-2 leading-relaxed font-sans">{captionText}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* CURATION ACTION FOOTER */}
                          {previewAsset.aiAnalysis.status === 'pending_review' && (
                            <div className="grid grid-cols-2 gap-3.5 pt-2">
                              <button
                                onClick={() => handleRejectAI(previewAsset)}
                                className="py-2.5 border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-mono rounded-xl transition-all font-bold cursor-pointer text-center"
                              >
                                Reject AI Draft
                              </button>
                              <button
                                onClick={() => handleApproveAI(previewAsset)}
                                className="py-2.5 bg-[#2EC4B6] hover:bg-[#2EC4B6]/90 text-black text-xs font-mono rounded-xl font-black transition-all cursor-pointer text-center"
                              >
                                Approve & Publish
                              </button>
                            </div>
                          )}

                          {previewAsset.aiAnalysis.status === 'approved' && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-2.5 items-center">
                              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400 font-bold text-[10px] font-mono">
                                AI Dossier Approved & Applied Successfully!
                              </span>
                            </div>
                          )}

                          {previewAsset.aiAnalysis.status === 'rejected' && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex justify-between items-center">
                              <div className="flex gap-2.5 items-center">
                                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                                <span className="text-red-400 font-bold text-[10px] font-mono">
                                  AI Dossier Dismissed
                                </span>
                              </div>
                              <button
                                onClick={() => handleApproveAI(previewAsset)}
                                className="text-[9px] font-mono text-[#2EC4B6] hover:underline cursor-pointer"
                              >
                                Approve Anyway
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Bottom Action group in drawer */}
                <div className="pt-4 border-t border-white/5 flex gap-2.5">
                  <button 
                    onClick={() => handleDownloadAsset(previewAsset.url, previewAsset.filename)}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#A7C4B8] border border-white/5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Original</span>
                  </button>

                  <button 
                    onClick={() => handleDeleteAsset(previewAsset)}
                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-xs font-mono rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
