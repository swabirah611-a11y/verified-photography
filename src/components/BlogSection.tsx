import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, User, Tag, ArrowRight, X, Sparkles, Search } from 'lucide-react';
import { CmsConfig } from '../lib/supabase';

interface BlogSectionProps {
  cmsConfig: CmsConfig;
}

export default function BlogSection({ cmsConfig }: BlogSectionProps) {
  const blogs = cmsConfig.blogs || [];
  
  const [selectedBlog, setSelectedBlog] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!blogs || blogs.length === 0) return null;

  // Categories extraction
  const categories = ['all', ...Array.from(new Set(blogs.map(b => b.category)))];

  // Filtering
  const filteredBlogs = blogs.filter(blog => {
    const matchesCategory = selectedCategory === 'all' || blog.category === selectedCategory;
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          blog.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="blogs" className="py-24 bg-brand-bg relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center space-y-3 mb-16">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20 text-[10px] font-mono tracking-widest text-brand-accent uppercase font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Photography Chronicles</span>
          </span>
          <h2 className="text-3xl md:text-4xl font-space font-bold tracking-tight text-brand-text">
            Stories, Guides & <span className="text-brand-accent">Behind the Lens</span>
          </h2>
          <p className="text-xs text-brand-muted max-w-lg mx-auto leading-relaxed">
            Discover professional photo tips, traditional wedding color grading secrets, lighting guides, and cinematic insights.
          </p>
        </div>

        {/* Categories and Search bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-10 pb-4 border-b border-white/5">
          {/* Tabs */}
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg border font-mono text-[10px] font-semibold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-brand-accent border-brand-accent text-brand-bg'
                    : 'bg-white/[0.01] border-white/5 text-brand-muted hover:bg-white/5 hover:text-brand-text'
                }`}
              >
                {cat.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:max-w-xs">
            <span className="absolute inset-y-0 left-3 flex items-center text-brand-muted">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-brand-text placeholder-brand-muted focus:border-brand-accent outline-none"
            />
          </div>
        </div>

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {filteredBlogs.map((blog, index) => (
            <motion.div
              key={blog.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              onClick={() => setSelectedBlog(blog)}
              className="group rounded-2xl border border-white/5 bg-white/[0.005] hover:bg-white/[0.015] hover:border-brand-accent/20 transition-all duration-300 overflow-hidden flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="aspect-video relative w-full overflow-hidden bg-black/40">
                  <img
                    src={blog.featuredImage}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-3 left-3 text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand-bg/90 text-brand-accent uppercase border border-brand-accent/20 shadow">
                    {blog.category}
                  </span>
                </div>

                <div className="p-6 space-y-3.5">
                  <div className="flex items-center gap-3 text-[10px] font-mono text-brand-muted">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {blog.date}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> By {blog.author}</span>
                  </div>

                  <h3 className="font-space font-bold text-base text-brand-text group-hover:text-brand-accent transition-colors leading-snug">
                    {blog.title}
                  </h3>

                  <p className="text-xs text-brand-muted font-sans leading-relaxed line-clamp-2">
                    {blog.content}
                  </p>
                </div>
              </div>

              <div className="px-6 pb-6 pt-2 flex justify-between items-center border-t border-white/[0.02]">
                <div className="flex flex-wrap gap-1.5">
                  {blog.tags?.slice(0, 3).map((tag: string, i: number) => (
                    <span key={i} className="text-[9px] font-mono text-brand-muted">#{tag}</span>
                  ))}
                </div>
                
                <span className="text-[10px] font-mono font-bold text-brand-accent group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </motion.div>
          ))}

          {filteredBlogs.length === 0 && (
            <div className="col-span-full py-16 text-center text-xs text-brand-muted font-mono">
              No chronicle articles match your criteria currently.
            </div>
          )}
        </div>

      </div>

      {/* DETAILED ARTICLE READER OVERLAY */}
      <AnimatePresence>
        {selectedBlog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-brand-bg/95 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#10261F] border border-white/5 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedBlog(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/60 hover:bg-brand-accent hover:text-brand-bg border border-white/10 text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="aspect-video w-full overflow-hidden relative">
                <img
                  src={selectedBlog.featuredImage}
                  alt={selectedBlog.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#10261F] via-[#10261F]/30 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6">
                  <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded bg-brand-accent text-brand-bg uppercase">
                    {selectedBlog.category}
                  </span>
                  <h1 className="text-xl md:text-2xl font-space font-bold text-white tracking-tight mt-3 leading-snug">
                    {selectedBlog.title}
                  </h1>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-brand-muted border-b border-white/5 pb-4">
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-brand-accent" /> Published {selectedBlog.date}</span>
                  <span className="text-white/10">•</span>
                  <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-brand-accent" /> By {selectedBlog.author}</span>
                  {selectedBlog.tags && (
                    <>
                      <span className="text-white/10">•</span>
                      <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-brand-accent" /> {selectedBlog.tags.join(', ')}</span>
                    </>
                  )}
                </div>

                <div className="font-sans text-xs md:text-sm text-[#A7C4B8] leading-relaxed space-y-4 whitespace-pre-line">
                  {selectedBlog.content}
                </div>

                {selectedBlog.seoDescription && (
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/5 text-[11px] font-sans text-brand-muted italic">
                    💡 Editorial Meta Abstract: {selectedBlog.seoDescription}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}
