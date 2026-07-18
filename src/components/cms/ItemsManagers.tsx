import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  UserPlus, 
  Wrench, 
  HelpCircle, 
  BookOpen, 
  TrendingUp, 
  Check, 
  Star,
  Users,
  Eye,
  ArrowUpDown
} from 'lucide-react';
import { CmsConfig } from '../../lib/supabase';
import MediaUploader from './MediaUploader';

interface ItemsManagersProps {
  config: CmsConfig;
  onSave: (updatedConfig: CmsConfig) => void;
  activeItemTab: 'services' | 'pricing' | 'faq' | 'team' | 'blogs';
}

export default function ItemsManagers({ config, onSave, activeItemTab }: ItemsManagersProps) {
  const [formData, setFormData] = useState<CmsConfig>({ ...config });
  
  // Selection / Editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Form Field Buffers
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceIcon, setServiceIcon] = useState('Camera');
  const [serviceDesc, setServiceDesc] = useState('');
  const [servicePrice, setServicePrice] = useState('From ₦50,000');
  const [serviceFeatures, setServiceFeatures] = useState('');

  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [packageDuration, setPackageDuration] = useState('1.5 Hours');
  const [packageCategory, setPackageCategory] = useState('Portraits');
  const [packageDesc, setPackageDesc] = useState('');
  const [packageFeatures, setPackageFeatures] = useState('');
  const [packagePopular, setPackagePopular] = useState(false);
  const [packageVisible, setPackageVisible] = useState(true);

  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqOrder, setFaqOrder] = useState(1);

  const [teamName, setTeamName] = useState('');
  const [teamRole, setTeamRole] = useState('');
  const [teamPhoto, setTeamPhoto] = useState('');
  const [teamBio, setTeamBio] = useState('');

  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogCategory, setBlogCategory] = useState('Weddings');
  const [blogTags, setBlogTags] = useState('');
  const [blogImage, setBlogImage] = useState('');
  const [blogDate, setBlogDate] = useState(new Date().toISOString().split('T')[0]);
  const [blogAuthor, setBlogAuthor] = useState('Alhassan Bello');
  const [blogSeoTitle, setBlogSeoTitle] = useState('');
  const [blogSeoDesc, setBlogSeoDesc] = useState('');

  // Save changes wrapper
  const triggerSave = (updated: CmsConfig) => {
    setFormData(updated);
    onSave(updated);
    resetBuffers();
  };

  const resetBuffers = () => {
    setEditingId(null);
    setIsAddingNew(false);

    setServiceTitle('');
    setServiceIcon('Camera');
    setServiceDesc('');
    setServicePrice('From ₦50,000');
    setServiceFeatures('');

    setPackageName('');
    setPackagePrice('');
    setPackageDuration('1.5 Hours');
    setPackageCategory('Portraits');
    setPackageDesc('');
    setPackageFeatures('');
    setPackagePopular(false);
    setPackageVisible(true);

    setFaqQuestion('');
    setFaqAnswer('');
    setFaqOrder(1);

    setTeamName('');
    setTeamRole('');
    setTeamPhoto('');
    setTeamBio('');

    setBlogTitle('');
    setBlogContent('');
    setBlogCategory('Weddings');
    setBlogTags('');
    setBlogImage('');
    setBlogDate(new Date().toISOString().split('T')[0]);
    setBlogAuthor('Alhassan Bello');
    setBlogSeoTitle('');
    setBlogSeoDesc('');
  };

  // 1. SERVICES CRUD
  const handleEditService = (service: any) => {
    setEditingId(service.id);
    setServiceTitle(service.title);
    setServiceIcon(service.iconName || 'Camera');
    setServiceDesc(service.description);
    setServicePrice(service.pricingRange);
    setServiceFeatures(service.features?.join('\n') || '');
    setIsAddingNew(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceTitle.trim()) return;

    const currentServices = formData.services || [];
    const newService = {
      id: editingId || 'ser-' + Date.now(),
      title: serviceTitle,
      iconName: serviceIcon,
      description: serviceDesc,
      pricingRange: servicePrice,
      features: serviceFeatures.split('\n').map(f => f.trim()).filter(Boolean)
    };

    let updatedList;
    if (editingId) {
      updatedList = currentServices.map(s => s.id === editingId ? newService : s);
    } else {
      updatedList = [...currentServices, newService];
    }

    triggerSave({ ...formData, services: updatedList });
  };

  const handleDeleteService = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service option?')) {
      const updatedList = (formData.services || []).filter(s => s.id !== id);
      triggerSave({ ...formData, services: updatedList });
    }
  };

  // 2. PACKAGES CRUD
  const handleEditPackage = (pkg: any) => {
    setEditingId(pkg.id);
    setPackageName(pkg.name);
    setPackagePrice(pkg.price);
    setPackageDuration(pkg.duration);
    setPackageCategory(pkg.category);
    setPackageDesc(pkg.description);
    setPackageFeatures(pkg.features?.join('\n') || '');
    setPackagePopular(!!pkg.popular);
    setPackageVisible(pkg.visible !== false);
    setIsAddingNew(true);
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim()) return;

    const currentPackages = formData.pricing?.packages || [];
    const newPackage = {
      id: editingId || 'price-' + Date.now(),
      name: packageName,
      price: packagePrice,
      duration: packageDuration,
      category: packageCategory,
      description: packageDesc,
      features: packageFeatures.split('\n').map(f => f.trim()).filter(Boolean),
      popular: packagePopular,
      visible: packageVisible
    };

    let updatedList;
    if (editingId) {
      updatedList = currentPackages.map(p => p.id === editingId ? newPackage : p);
    } else {
      updatedList = [...currentPackages, newPackage];
    }

    triggerSave({
      ...formData,
      pricing: { ...formData.pricing, packages: updatedList }
    });
  };

  const handleDeletePackage = (id: string) => {
    if (window.confirm('Delete this package completely from pricing calculations?')) {
      const updatedList = (formData.pricing?.packages || []).filter(p => p.id !== id);
      triggerSave({
        ...formData,
        pricing: { ...formData.pricing, packages: updatedList }
      });
    }
  };

  // 3. FAQ CRUD
  const handleEditFaq = (f: any) => {
    setEditingId(f.id);
    setFaqQuestion(f.question);
    setFaqAnswer(f.answer);
    setFaqOrder(f.order || 1);
    setIsAddingNew(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;

    const currentFaq = formData.faq || [];
    const newFaq = {
      id: editingId || 'faq-' + Date.now(),
      question: faqQuestion,
      answer: faqAnswer,
      order: Number(faqOrder)
    };

    let updatedList;
    if (editingId) {
      updatedList = currentFaq.map(f => f.id === editingId ? newFaq : f);
    } else {
      updatedList = [...currentFaq, newFaq];
    }

    // Auto sort FAQ by order property
    updatedList.sort((a, b) => a.order - b.order);

    triggerSave({ ...formData, faq: updatedList });
  };

  const handleDeleteFaq = (id: string) => {
    if (window.confirm('Remove this FAQ item?')) {
      const updatedList = (formData.faq || []).filter(f => f.id !== id);
      triggerSave({ ...formData, faq: updatedList });
    }
  };

  // 4. TEAM CRUD
  const handleEditTeam = (tm: any) => {
    setEditingId(tm.id);
    setTeamName(tm.name);
    setTeamRole(tm.role);
    setTeamPhoto(tm.photo);
    setTeamBio(tm.bio);
    setIsAddingNew(true);
  };

  const handleSaveTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const currentTeam = formData.team || [];
    const newTeam = {
      id: editingId || 'team-' + Date.now(),
      name: teamName,
      role: teamRole,
      photo: teamPhoto || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      bio: teamBio
    };

    let updatedList;
    if (editingId) {
      updatedList = currentTeam.map(t => t.id === editingId ? newTeam : t);
    } else {
      updatedList = [...currentTeam, newTeam];
    }

    triggerSave({ ...formData, team: updatedList });
  };

  const handleDeleteTeam = (id: string) => {
    if (window.confirm('Remove this core team member?')) {
      const updatedList = (formData.team || []).filter(t => t.id !== id);
      triggerSave({ ...formData, team: updatedList });
    }
  };

  // 5. BLOG CRUD
  const handleEditBlog = (bl: any) => {
    setEditingId(bl.id);
    setBlogTitle(bl.title);
    setBlogContent(bl.content);
    setBlogCategory(bl.category);
    setBlogTags(bl.tags?.join(', ') || '');
    setBlogImage(bl.featuredImage);
    setBlogDate(bl.date);
    setBlogAuthor(bl.author);
    setBlogSeoTitle(bl.seoTitle || '');
    setBlogSeoDesc(bl.seoDescription || '');
    setIsAddingNew(true);
  };

  const handleSaveBlog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blogTitle.trim() || !blogContent.trim()) return;

    const currentBlogs = formData.blogs || [];
    const newBlog = {
      id: editingId || 'blog-' + Date.now(),
      title: blogTitle,
      content: blogContent,
      category: blogCategory,
      tags: blogTags.split(',').map(t => t.trim()).filter(Boolean),
      featuredImage: blogImage || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
      date: blogDate,
      author: blogAuthor,
      seoTitle: blogSeoTitle || blogTitle,
      seoDescription: blogSeoDesc || blogContent.slice(0, 150)
    };

    let updatedList;
    if (editingId) {
      updatedList = currentBlogs.map(b => b.id === editingId ? newBlog : b);
    } else {
      updatedList = [newBlog, ...currentBlogs];
    }

    triggerSave({ ...formData, blogs: updatedList });
  };

  const handleDeleteBlog = (id: string) => {
    if (window.confirm('Delete this blog article permanently?')) {
      const updatedList = (formData.blogs || []).filter(b => b.id !== id);
      triggerSave({ ...formData, blogs: updatedList });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. SECTION TITLES AND FORM TRIGGER */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-space font-bold text-white flex items-center gap-2">
            {activeItemTab === 'services' && <Wrench className="w-5 h-5 text-[#2EC4B6]" />}
            {activeItemTab === 'pricing' && <TrendingUp className="w-5 h-5 text-[#2EC4B6]" />}
            {activeItemTab === 'faq' && <HelpCircle className="w-5 h-5 text-[#2EC4B6]" />}
            {activeItemTab === 'team' && <Users className="w-5 h-5 text-[#2EC4B6]" />}
            {activeItemTab === 'blogs' && <BookOpen className="w-5 h-5 text-[#2EC4B6]" />}
            <span>
              {activeItemTab === 'services' && 'Services Offered'}
              {activeItemTab === 'pricing' && 'Pricing Packages'}
              {activeItemTab === 'faq' && 'Frequently Asked Questions'}
              {activeItemTab === 'team' && 'Studio Team Members'}
              {activeItemTab === 'blogs' && 'SEO Editorial Blogs'}
            </span>
          </h2>
          <p className="text-xs text-[#A7C4B8] mt-1 font-sans">
            Add, modify, or exclude entries in this module block instantly. Updates compile to database on save.
          </p>
        </div>

        {!isAddingNew && (
          <button 
            onClick={() => setIsAddingNew(true)}
            className="px-4 py-2 bg-[#2EC4B6]/15 hover:bg-[#2EC4B6] text-[#2EC4B6] hover:text-[#071A14] border border-[#2EC4B6]/35 font-space font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </button>
        )}
      </div>

      {/* 2. DYNAMIC INPUT FORMS (AnimatePresence style) */}
      {isAddingNew && (
        <div className="p-6 rounded-2xl bg-white/[0.01] border border-[#2EC4B6]/30 box-glow relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-[#2EC4B6]" />
          
          <h3 className="font-space font-bold text-sm text-white mb-6">
            {editingId ? 'Edit Existing Record' : 'Create New Record'}
          </h3>

          {/* SERVICE FORM */}
          {activeItemTab === 'services' && (
            <form onSubmit={handleSaveService} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Service Title</label>
                  <input type="text" value={serviceTitle} onChange={e => setServiceTitle(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Lucide Icon Name</label>
                  <input type="text" value={serviceIcon} onChange={e => setServiceIcon(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Pricing Range Tag (e.g. From ₦250,000)</label>
                  <input type="text" value={servicePrice} onChange={e => setServicePrice(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Bullet Point Features (one per line)</label>
                  <textarea rows={3} value={serviceFeatures} onChange={e => setServiceFeatures(e.target.value)} placeholder="High-end studio strobe rigs&#10;Framed digital deliveries" className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Service Description</label>
                <textarea rows={3} value={serviceDesc} onChange={e => setServiceDesc(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetBuffers} className="px-4 py-2 text-xs font-mono text-[#A7C4B8]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1.5"><Save className="w-4 h-4" /> Save Service</button>
              </div>
            </form>
          )}

          {/* PACKAGE FORM */}
          {activeItemTab === 'pricing' && (
            <form onSubmit={handleSavePackage} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Package Name</label>
                  <input type="text" value={packageName} onChange={e => setPackageName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Price tag (e.g. ₦180,000)</label>
                  <input type="text" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Duration text (e.g. 4 Hours)</label>
                  <input type="text" value={packageDuration} onChange={e => setPackageDuration(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Matching Categories (Portraits, Weddings, etc.)</label>
                  <input type="text" value={packageCategory} onChange={e => setPackageCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Features (one per line)</label>
                  <textarea rows={3} value={packageFeatures} onChange={e => setPackageFeatures(e.target.value)} placeholder="1 premium photoframe included" className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Short Description</label>
                <textarea rows={2} value={packageDesc} onChange={e => setPackageDesc(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
              </div>

              <div className="flex gap-6 items-center">
                <label className="flex items-center gap-2 text-xs text-white font-mono cursor-pointer select-none">
                  <input type="checkbox" checked={packagePopular} onChange={e => setPackagePopular(e.target.checked)} className="rounded border-white/10 text-[#2EC4B6] focus:ring-0" />
                  <span>Highlight as POPULAR Badge</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-white font-mono cursor-pointer select-none">
                  <input type="checkbox" checked={packageVisible} onChange={e => setPackageVisible(e.target.checked)} className="rounded border-white/10 text-[#2EC4B6] focus:ring-0" />
                  <span>Visible on public site</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetBuffers} className="px-4 py-2 text-xs font-mono text-[#A7C4B8]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1.5"><Save className="w-4 h-4" /> Save Package</button>
              </div>
            </form>
          )}

          {/* FAQ FORM */}
          {activeItemTab === 'faq' && (
            <form onSubmit={handleSaveFaq} className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Faq Question</label>
                  <input type="text" value={faqQuestion} onChange={e => setFaqQuestion(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Display Sort Order</label>
                  <input type="number" value={faqOrder} onChange={e => setFaqOrder(parseInt(e.target.value) || 1)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Faq Answer Description</label>
                <textarea rows={3} value={faqAnswer} onChange={e => setFaqAnswer(e.target.value)} required className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetBuffers} className="px-4 py-2 text-xs font-mono text-[#A7C4B8]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1.5"><Save className="w-4 h-4" /> Save FAQ</button>
              </div>
            </form>
          )}

          {/* TEAM FORM */}
          {activeItemTab === 'team' && (
            <form onSubmit={handleSaveTeam} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Team Member Name</label>
                  <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Role Designation</label>
                  <input type="text" value={teamRole} onChange={e => setTeamRole(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
              <div>
                <MediaUploader
                  value={teamPhoto}
                  onChange={setTeamPhoto}
                  folder="team"
                  label="Team Member Portrait"
                  aspectRatio="aspect-[1/1]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Short Biography Description</label>
                <textarea rows={3} value={teamBio} onChange={e => setTeamBio(e.target.value)} className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetBuffers} className="px-4 py-2 text-xs font-mono text-[#A7C4B8]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1.5"><Save className="w-4 h-4" /> Save Member</button>
              </div>
            </form>
          )}

          {/* BLOG FORM */}
          {activeItemTab === 'blogs' && (
            <form onSubmit={handleSaveBlog} className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Article Title</label>
                  <input type="text" value={blogTitle} onChange={e => setBlogTitle(e.target.value)} required className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Category Category</label>
                  <input type="text" value={blogCategory} onChange={e => setBlogCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Tags (comma-separated)</label>
                  <input type="text" value={blogTags} onChange={e => setBlogTags(e.target.value)} placeholder="Retouching, Traditional, Benin" className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Publish Date</label>
                  <input type="date" value={blogDate} onChange={e => setBlogDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white" />
                </div>
              </div>

              <div>
                <MediaUploader
                  value={blogImage}
                  onChange={setBlogImage}
                  folder="blog"
                  label="Featured Article Cover"
                  aspectRatio="aspect-[16/9]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-[#A7C4B8] mb-1">Editorial Content Body (Markdown supported)</label>
                <textarea rows={6} value={blogContent} onChange={e => setBlogContent(e.target.value)} required className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white resize-none font-mono leading-relaxed" />
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <span className="text-[10px] font-mono text-[#2EC4B6] uppercase block">Search Engine Optimization (SEO) Overrides</span>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">SEO Meta Title</label>
                    <input type="text" value={blogSeoTitle} onChange={e => setBlogSeoTitle(e.target.value)} placeholder="E.g. Dynamic grading guide..." className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-[#A7C4B8] mb-1">SEO Meta Description</label>
                    <input type="text" value={blogSeoDesc} onChange={e => setBlogSeoDesc(e.target.value)} placeholder="Short excerpt for Google search..." className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetBuffers} className="px-4 py-2 text-xs font-mono text-[#A7C4B8]">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#2EC4B6] hover:bg-[#6EE7B7] text-[#071A14] font-space font-bold text-xs rounded-xl flex items-center gap-1.5"><Save className="w-4 h-4" /> Save Article</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 3. RECORDS LIST VIEW */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden">
        <div className="divide-y divide-white/5">
          
          {/* SERVICES LIST */}
          {activeItemTab === 'services' && (formData.services || []).map((s) => (
            <div key={s.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
              <div className="space-y-1 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#2EC4B6]/15 text-[#2EC4B6] font-bold text-xs font-mono">
                    {s.iconName || 'Camera'}
                  </span>
                  <h4 className="font-space font-bold text-sm text-white">{s.title}</h4>
                  <span className="text-[10px] font-mono text-[#6EE7B7]">{s.pricingRange}</span>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed font-sans">{s.description}</p>
                {s.features && s.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {s.features.map((f: string, i: number) => (
                      <span key={i} className="text-[9px] font-mono bg-white/5 text-white px-2 py-0.5 rounded-md">✓ {f}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button onClick={() => handleEditService(s)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteService(s.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {/* PACKAGES LIST */}
          {activeItemTab === 'pricing' && (formData.pricing?.packages || []).map((p) => (
            <div key={p.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-space font-bold text-sm text-white">{p.name}</h4>
                  <span className="text-[10px] font-mono text-[#2EC4B6] bg-[#2EC4B6]/10 px-2.5 py-0.5 rounded border border-[#2EC4B6]/15 uppercase font-bold">{p.price}</span>
                  <span className="text-[9px] font-mono text-brand-muted">({p.duration} • {p.category})</span>
                  {p.popular && <span className="text-[8px] font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/25 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-400" /> POPULAR</span>}
                  {p.visible === false && <span className="text-[8px] font-mono font-bold bg-white/5 text-brand-muted px-2 py-0.5 rounded border border-white/5">HIDDEN</span>}
                </div>
                <p className="text-xs text-brand-muted leading-relaxed font-sans">{p.description}</p>
                {p.features && p.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.features.map((f: string, i: number) => (
                      <span key={i} className="text-[9px] font-mono text-brand-muted">• {f}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button onClick={() => handleEditPackage(p)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeletePackage(p.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {/* FAQs LIST */}
          {activeItemTab === 'faq' && (formData.faq || []).map((f) => (
            <div key={f.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-[#2EC4B6] bg-[#2EC4B6]/10 px-2 py-0.5 rounded-full">Order {f.order}</span>
                  <h4 className="font-space font-bold text-sm text-white">Q: {f.question}</h4>
                </div>
                <p className="text-xs text-brand-muted leading-relaxed font-sans pl-4">A: {f.answer}</p>
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button onClick={() => handleEditFaq(f)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteFaq(f.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {/* TEAM LIST */}
          {activeItemTab === 'team' && (formData.team || []).map((tm) => (
            <div key={tm.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
              <div className="flex items-center gap-4 max-w-xl">
                <img src={tm.photo} alt={tm.name} className="w-12 h-12 rounded-xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                <div className="space-y-1">
                  <h4 className="font-space font-bold text-sm text-white">{tm.name}</h4>
                  <span className="text-[10px] font-mono text-[#2EC4B6] block">{tm.role}</span>
                  <p className="text-xs text-brand-muted leading-relaxed font-sans mt-1">{tm.bio}</p>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button onClick={() => handleEditTeam(tm)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteTeam(tm.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {/* BLOG LIST */}
          {activeItemTab === 'blogs' && (formData.blogs || []).map((bl) => (
            <div key={bl.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.01]">
              <div className="flex gap-4 max-w-xl">
                <img src={bl.featuredImage} alt={bl.title} className="w-16 h-12 rounded-lg object-cover border border-white/10 flex-shrink-0" referrerPolicy="no-referrer" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-[#2EC4B6] bg-[#2EC4B6]/10 px-2 py-0.5 rounded">{bl.category}</span>
                    <span className="text-[9px] font-mono text-brand-muted">{bl.date} • {bl.author}</span>
                  </div>
                  <h4 className="font-space font-bold text-sm text-white leading-snug">{bl.title}</h4>
                  <p className="text-[11px] text-brand-muted leading-normal font-sans line-clamp-1">{bl.content}</p>
                  {bl.tags && bl.tags.length > 0 && (
                    <div className="flex gap-1.5 pt-1.5">
                      {bl.tags.map((t, idx) => (
                        <span key={idx} className="text-[9px] font-mono text-brand-muted">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-auto flex-shrink-0">
                <button onClick={() => handleEditBlog(bl)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-[#2EC4B6]"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteBlog(bl.id)} className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}

          {/* NO RECORDS STATE */}
          {((activeItemTab === 'services' && !formData.services?.length) ||
            (activeItemTab === 'pricing' && !formData.pricing?.packages?.length) ||
            (activeItemTab === 'faq' && !formData.faq?.length) ||
            (activeItemTab === 'team' && !formData.team?.length) ||
            (activeItemTab === 'blogs' && !formData.blogs?.length)) && (
            <div className="p-12 text-center text-xs text-brand-muted font-mono">
              No entries recorded in this category. Click "Add Entry" to build content!
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
