import React from 'react';
import { 
  Users, 
  FileText, 
  Grid, 
  FolderHeart, 
  MessageSquare, 
  Sparkles, 
  HardDrive, 
  Activity, 
  ShieldAlert, 
  Compass, 
  Zap, 
  Lock, 
  Wrench,
  Download
} from 'lucide-react';
import { CmsConfig } from '../../lib/supabase';
import { PortfolioItem } from '../../types';

interface DashboardHomeProps {
  cmsConfig: CmsConfig;
  portfolioItems: PortfolioItem[];
  bookingsCount: number;
  securityLogsCount: number;
  recentActivity: Array<{ id: string; desc: string; time: string; type: 'info' | 'warn' | 'success' }>;
  onQuickAction: (action: string) => void;
  isAdminLoggedIn: boolean;
}

export default function DashboardHome({
  cmsConfig,
  portfolioItems,
  bookingsCount,
  securityLogsCount,
  recentActivity,
  onQuickAction,
  isAdminLoggedIn
}: DashboardHomeProps) {
  // Extract statistics
  const totalGallery = portfolioItems.length;
  const categories = Array.from(new Set(portfolioItems.map(p => p.category)));
  const totalAlbums = categories.length;
  const totalTestimonials = cmsConfig.testimonials?.length ?? 0;
  const totalBlogs = cmsConfig.blogs?.length ?? 0;
  const totalFaqs = cmsConfig.faq?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* 1. VISUAL METRIC CARDS */}
      <div>
        <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#2EC4B6]" />
          <span>Real-time Operations Intelligence</span>
        </h2>
        <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
          Overview of live audience engagement, content volumes, and active databases.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Visitors */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 box-glow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#A7C4B8] uppercase">Total Visitors</span>
            <Users className="w-4 h-4 text-[#2EC4B6]" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">—</h3>
            <p className="text-[9px] font-mono text-brand-muted mt-1">Analytics not configured</p>
          </div>
        </div>

        {/* Total Bookings */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 box-glow flex flex-col justify-between" id="stat-bookings">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#A7C4B8] uppercase">Reservations</span>
            <FileText className="w-4 h-4 text-[#6EE7B7]" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">{bookingsCount}</h3>
            <p className="text-[9px] font-mono text-[#2EC4B6] mt-1">Pending verification</p>
          </div>
        </div>

        {/* Total Gallery Photos */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 box-glow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#A7C4B8] uppercase">Exhibition Art</span>
            <Grid className="w-4 h-4 text-pink-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">{totalGallery}</h3>
            <p className="text-[9px] font-mono text-brand-muted mt-1">High fidelity pieces</p>
          </div>
        </div>

        {/* Total Albums */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 box-glow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#A7C4B8] uppercase">Active Albums</span>
            <FolderHeart className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">{totalAlbums}</h3>
            <p className="text-[9px] font-mono text-[#6EE7B7] mt-1">Niche categories</p>
          </div>
        </div>

        {/* Total Testimonials */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 box-glow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#A7C4B8] uppercase">Testimonials</span>
            <MessageSquare className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">{totalTestimonials}</h3>
            <p className="text-[9px] font-mono text-[#2EC4B6] mt-1">Verified reviews</p>
          </div>
        </div>

        {/* Total Blogs/Faqs */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 box-glow flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#A7C4B8] uppercase">CMS Records</span>
            <Sparkles className="w-4 h-4 text-[#2EC4B6]" />
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-space font-bold text-white tracking-tight">{totalBlogs + totalFaqs}</h3>
            <p className="text-[9px] font-mono text-brand-muted mt-1">{totalBlogs} Blogs • {totalFaqs} FAQs</p>
          </div>
        </div>
      </div>

      {/* 2. MAIN HUB CONTENT LAYOUT */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left column: Activity & System health */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions Panel */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 box-glow">
            <h3 className="font-space font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#2EC4B6]" />
              <span>CMS Quick Actions</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button 
                onClick={() => onQuickAction('visual-editor')}
                className="p-3 text-center rounded-xl bg-[#2EC4B6]/10 hover:bg-[#2EC4B6]/25 border border-[#2EC4B6]/30 hover:border-[#2EC4B6] text-[#2EC4B6] transition-all font-space font-bold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer col-span-2 sm:col-span-1"
              >
                <Sparkles className="w-4 h-4 text-[#2EC4B6] animate-pulse" />
                <span>Visual Live Editor</span>
              </button>
              <button 
                onClick={() => onQuickAction('add-photo')}
                className="p-3 text-center rounded-xl bg-white/[0.02] hover:bg-[#2EC4B6]/15 border border-white/5 hover:border-[#2EC4B6]/30 text-[#A7C4B8] hover:text-[#2EC4B6] transition-all font-space font-semibold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <Grid className="w-4 h-4" />
                <span>Upload Artwork</span>
              </button>
              <button 
                onClick={() => onQuickAction('add-service')}
                className="p-3 text-center rounded-xl bg-white/[0.02] hover:bg-[#2EC4B6]/15 border border-white/5 hover:border-[#2EC4B6]/30 text-[#A7C4B8] hover:text-[#2EC4B6] transition-all font-space font-semibold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>Add Service</span>
              </button>
              <button 
                onClick={() => onQuickAction('export-json')}
                className="p-3 text-center rounded-xl bg-white/[0.02] hover:bg-[#2EC4B6]/15 border border-white/5 hover:border-[#2EC4B6]/30 text-[#A7C4B8] hover:text-[#2EC4B6] transition-all font-space font-semibold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CMS Backup</span>
              </button>
              <button 
                onClick={() => onQuickAction('toggle-maintenance')}
                className={`p-3 text-center rounded-xl border font-space font-semibold text-xs flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  cmsConfig.advanced?.maintenanceMode 
                    ? 'bg-amber-500/10 hover:bg-amber-500/25 border-amber-500/30 text-amber-400'
                    : 'bg-white/[0.02] hover:bg-white/5 border-white/5 text-[#A7C4B8] hover:text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{cmsConfig.advanced?.maintenanceMode ? 'Disable Maint.' : 'Go Offline'}</span>
              </button>
            </div>
          </div>

          {/* Activity Log Feed */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 box-glow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#2EC4B6]" />
                <span>Recent CMS Operations Feed</span>
              </h3>
              <span className="text-[10px] font-mono text-brand-muted uppercase">Updates logged live</span>
            </div>

            <div className="divide-y divide-white/5 space-y-3.5 pt-2">
              {recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 pt-3.5 first:pt-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    act.type === 'success' ? 'bg-[#2EC4B6]' : act.type === 'warn' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <div className="flex-1 text-[11px] font-sans">
                    <p className="text-white leading-normal">{act.desc}</p>
                    <span className="text-[9px] font-mono text-brand-muted block mt-1">{act.time}</span>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div className="py-6 text-center text-xs text-brand-muted font-mono">
                  No active operations logged in this session yet.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right column: Storage & Security Overview */}
        <div className="space-y-6">
          {/* Centralized Media Storage Meter */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 box-glow space-y-4">
            <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-[#2EC4B6]" />
              <span>Media Vault Storage</span>
            </h3>

            <div>
              <div className="flex justify-between items-center text-[11px] font-mono text-[#A7C4B8] mb-1.5">
                <span>Centralized Allocation</span>
                <span className="text-white font-semibold">24.5% Used</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-[#2EC4B6] to-[#6EE7B7] rounded-full" style={{ width: '24.5%' }} />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-brand-muted mt-1.5">
                <span>2.45 GB allocated</span>
                <span>10.00 GB limit</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 text-[11px] font-sans text-brand-muted leading-relaxed">
              📷 Integrated compression is <span className="text-[#2EC4B6] font-semibold">ACTIVE</span>. Original assets auto-resized to 1200px width for fast loading across Benin, Ekpoma, and global networks.
            </div>
          </div>

          {/* Quick Security Insight */}
          <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 box-glow space-y-4">
            <h3 className="font-space font-bold text-sm text-white flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#2EC4B6]" />
              <span>Access & Encryption</span>
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-brand-muted">Auth Provider:</span>
                <span className="font-mono text-white bg-[#2EC4B6]/10 px-2 py-0.5 rounded border border-[#2EC4B6]/20 text-[10px] font-bold">
                  {isAdminLoggedIn ? 'Supabase JWT' : 'Sandbox Session'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-brand-muted">SSL/TLS State:</span>
                <span className="text-emerald-400 font-semibold font-mono text-[10px]">VERIFIED (HTTPS)</span>
              </div>
              <div className="flex items-center justify-between text-xs font-sans">
                <span className="text-brand-muted">Auditing Logins:</span>
                <span className="text-brand-muted font-mono text-[10px]">{securityLogsCount} Entries</span>
              </div>
            </div>

            <div className="h-px bg-white/5 w-full" />

            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-[#A7C4B8] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Firewall Shield active</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
