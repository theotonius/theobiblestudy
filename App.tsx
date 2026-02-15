
import React, { useState, useMemo, useEffect } from 'react';
import { BIBLE_SONGS, PRE_CACHED_STUDIES } from './constants';
import { Song, AppTab, UserProfile, SavedStudy, Theme } from './types';
import SongCard from './components/SongCard';
import Reader from './components/Reader';
import { 
  Music, Search, Heart, User, Sparkles, Loader2, BookOpen, 
  Share2, Check, Bookmark, Trash2, 
  Moon, Sun, LogIn, UserCircle, 
  ExternalLink, Quote, ScrollText, Gem, Sprout, HandHelping,
  AlertCircle, Globe, ShieldAlert
} from 'lucide-react';
import { fetchSongFromAI, explainVerseStream } from './services/geminiService';

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; activeTheme: Theme; mobile?: boolean }> = ({ active, onClick, icon, label, activeTheme, mobile }) => {
  if (mobile) {
    return (
      <button onClick={onClick} className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-300 ${active ? 'scale-105' : 'opacity-50'}`}>
        <div className={`p-2 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : (activeTheme === Theme.Dark ? 'text-slate-400' : 'text-slate-600')}`}>
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-wider ${active ? (activeTheme === Theme.Dark ? 'text-white' : 'text-indigo-600') : (activeTheme === Theme.Dark ? 'text-slate-400' : 'text-slate-500')}`}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${active ? 'bg-indigo-600/10 scale-105' : 'opacity-60 hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      <div className={`transition-all ${active ? 'text-indigo-600' : (activeTheme === Theme.Dark ? 'text-slate-400' : 'text-slate-600')}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' }) : icon}
      </div>
      <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-indigo-600' : (activeTheme === Theme.Dark ? 'text-slate-400' : 'text-slate-500')}`}>
        {label}
      </span>
    </button>
  );
};

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 4000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] animate-pulse rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] animate-pulse rounded-full" style={{ animationDelay: '1.5s' }} />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center relative animate-scaleUp">
           <Music className="w-16 h-16 md:w-20 md:h-20 text-indigo-600" />
           <div className="absolute -top-2 -right-2 bg-amber-400 p-2 rounded-2xl shadow-lg animate-bounce"><Sparkles className="w-6 h-6 text-white" /></div>
        </div>
        <div className="text-center space-y-3 animate-slideUp" style={{ animationDelay: '0.4s' }}>
           <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Sacred Melodies</h1>
           <p className="text-indigo-300 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs">সঙ্গীতের মাধ্যমে ঈশ্বরের আরাধনা</p>
        </div>
        <div className="mt-12 flex flex-col items-center gap-4 animate-fadeIn" style={{ animationDelay: '1.2s' }}>
          <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-loading-bar" /></div>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Loading Grace...</p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [studyQuery, setStudyQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sm_theme');
    return (saved as Theme) || Theme.Light;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('sm_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [savedStudies, setSavedStudies] = useState<SavedStudy[]>(() => {
    const saved = localStorage.getItem('sm_saved_studies');
    const userStudies: SavedStudy[] = saved ? JSON.parse(saved) : [];
    const combined = [...userStudies];
    PRE_CACHED_STUDIES.forEach(pre => {
      if (!combined.some(s => s.reference.toLowerCase() === pre.reference.toLowerCase())) {
        combined.push(pre);
      }
    });
    return combined;
  });

  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('sm_user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [isStudySaved, setIsStudySaved] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', email: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies.filter(s => !s.id.startsWith('pre-'))));
    localStorage.setItem('sm_theme', theme);
    localStorage.setItem('sm_user', JSON.stringify(user));
    document.documentElement.className = theme;
    
    // Check if API key exists on mount
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      console.warn("API_KEY is missing from process.env");
    }
  }, [favorites, savedStudies, theme, user]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredSongs = useMemo(() => {
    let list = BIBLE_SONGS;
    if (activeCategory !== 'All') list = list.filter(s => s.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q));
    }
    return list;
  }, [searchQuery, activeCategory]);

  const toggleFavorite = (id: string) => {
    if (!user) {
      showToast("দয়া করে লগইন করুন।", "error");
      setActiveTab(AppTab.Profile);
      return;
    }
    const isFav = favorites.includes(id);
    setFavorites(prev => isFav ? prev.filter(fid => fid !== id) : [...prev, id]);
    showToast(isFav ? "লাইব্রেরি থেকে সরানো হয়েছে।" : "লাইব্রেরিতে যুক্ত করা হয়েছে।");
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingAI(true);
    try {
      const result = await fetchSongFromAI(searchQuery);
      if (result && result.title) {
        const newSong: Song = { ...result, id: `ai-${Date.now()}`, image: `https://picsum.photos/seed/${encodeURIComponent(result.title)}/800/600` };
        setSelectedSong(newSong);
        setActiveTab(AppTab.Reader);
        setSearchQuery('');
      } else { 
        showToast("দুঃখিত, কোনো ফলাফল পাওয়া যায়নি। API কী চেক করুন।", "error"); 
      }
    } catch { 
      showToast("সার্ভার সমস্যা। ইন্টারনেট বা API কী চেক করুন।", "error"); 
    }
    finally { setIsSearchingAI(false); }
  };

  const handleStudySearch = async () => {
    const query = studyQuery.trim();
    if (!query) return;
    setIsExplaining(true);
    setVerseExplanation(""); 
    setGroundingSources([]);
    setIsStudySaved(false);
    
    try {
      let firstChunkReceived = false;
      await explainVerseStream(query, (chunk, sources) => {
        if (!firstChunkReceived && chunk.trim().length > 0) {
          firstChunkReceived = true;
        }
        setVerseExplanation(chunk);
        if (sources) setGroundingSources(sources);
      });
      
      if (!verseExplanation && !firstChunkReceived) {
        setVerseExplanation("দুঃখিত, কোনো তথ্য পাওয়া যায়নি। অনুগ্রহ করে পদের নাম পরিষ্কারভাবে লিখুন (যেমন: যোহন ৩:১৬)।");
      }
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "দুঃখিত, তথ্য খুঁজতে সমস্যা হচ্ছে। ইন্টারনেট চেক করে পুনরায় চেষ্টা করুন।";
      setVerseExplanation(msg);
      showToast(msg, "error");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSaveStudy = () => {
    if (!user) {
      showToast("সেভ করতে লগইন করুন।", "error");
      setActiveTab(AppTab.Profile);
      return;
    }
    if (!verseExplanation || !studyQuery) return;
    const isAlreadySaved = savedStudies.some(s => s.reference.toLowerCase() === studyQuery.toLowerCase());
    if (isAlreadySaved) {
        showToast("এটি আগেই সেভ করা হয়েছে।", "error");
        return;
    }
    const newStudy: SavedStudy = { id: `study-${Date.now()}`, reference: studyQuery, content: verseExplanation, timestamp: Date.now() };
    setSavedStudies(prev => [newStudy, ...prev]);
    setIsStudySaved(true);
    showToast("স্টাডি নোটটি সেভ করা হয়েছে।");
  };

  const handleGoogleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.name || !loginForm.email) return;
    setShowLoginModal(false);
    setUser({ name: loginForm.name, email: loginForm.email, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(loginForm.name)}` });
    showToast(`স্বাগতম, ${loginForm.name}!`);
    setActiveTab(AppTab.Library);
  };

  const themeClasses = useMemo(() => {
    switch (theme) {
      case Theme.Dark: return 'bg-[#0f172a] text-[#f8fafc]';
      case Theme.Sepia: return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-[#fafafa] text-slate-900';
    }
  }, [theme]);

  const cardBgClasses = theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3]' : 'bg-white border-slate-100';

  const renderFormattedExplanation = (text: string) => {
    if (!text) return null;
    const sections = [
      { key: '[[VERSE]]', label: 'মূল পাঠ', icon: <Quote className="w-5 h-5" />, color: 'indigo' },
      { key: '[[CONTEXT]]', label: 'প্রেক্ষাপট', icon: <ScrollText className="w-5 h-5" />, color: 'amber' },
      { key: '[[MEANING]]', label: 'গভীর অর্থ', icon: <Gem className="w-5 h-5" />, color: 'emerald' },
      { key: '[[APPLICATION]]', label: 'প্রয়োগ', icon: <Sprout className="w-5 h-5" />, color: 'rose' },
      { key: '[[PRAYER]]', label: 'প্রার্থনা', icon: <HandHelping className="w-5 h-5" />, color: 'purple' },
    ];

    const upperText = text.toUpperCase();
    if (!sections.some(s => upperText.includes(s.key))) return <div className="whitespace-pre-wrap text-lg leading-relaxed font-serif p-6">{text}</div>;

    return (
      <div className="space-y-6">
        {sections.map((section, idx) => {
          const startIndex = upperText.indexOf(section.key);
          if (startIndex === -1) return null;
          let content = '';
          let nextMarkerIndex = -1;
          sections.forEach((s, i) => {
            if (i > idx) {
              const pos = upperText.indexOf(s.key);
              if (pos !== -1 && (nextMarkerIndex === -1 || pos < nextMarkerIndex)) nextMarkerIndex = pos;
            }
          });
          content = nextMarkerIndex !== -1 ? text.substring(startIndex + section.key.length, nextMarkerIndex).trim() : text.substring(startIndex + section.key.length).trim();
          if (!content) return null;
          return (
            <div key={section.key} className={`p-6 rounded-[2rem] border shadow-sm ${cardBgClasses} group transition-all`}>
              <div className="flex items-center gap-3 mb-4 text-indigo-500">
                <div className={`p-2 rounded-xl bg-indigo-50 dark:bg-slate-700`}>{section.icon}</div>
                <h3 className="text-sm font-black uppercase tracking-widest">{section.label}</h3>
              </div>
              <p className="text-lg font-serif leading-relaxed opacity-90">{content}</p>
            </div>
          );
        })}
        {groundingSources.length > 0 && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
             <div className="flex items-center gap-2 opacity-40">
               <Globe className="w-4 h-4" />
               <span className="text-[10px] font-black uppercase tracking-widest">Sources</span>
             </div>
             <div className="flex flex-wrap gap-2">
                {groundingSources.map((src, i) => src.web && (
                  <a key={i} href={src.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/40">
                    <ExternalLink className="w-3 h-3" /> {src.web.title || 'সূত্র'}
                  </a>
                ))}
             </div>
          </div>
        )}
      </div>
    );
  };

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  if (selectedSong && activeTab === AppTab.Reader) {
    return (
      <Reader 
        song={selectedSong} 
        onBack={() => { setSelectedSong(null); setActiveTab(AppTab.Library); }} 
        isFavorite={favorites.includes(selectedSong.id)}
        onToggleFavorite={toggleFavorite}
        theme={theme}
      />
    );
  }

  const navigationTabs = (
    <>
      <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" activeTheme={theme} />
      <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" activeTheme={theme} />
      <NavButton active={activeTab === AppTab.Reflections} onClick={() => setActiveTab(AppTab.Reflections)} icon={<Heart />} label="Saved" activeTheme={theme} />
      <NavButton active={activeTab === AppTab.Profile} onClick={() => setActiveTab(AppTab.Profile)} icon={<UserCircle />} label="Me" activeTheme={theme} />
    </>
  );

  const mobileNavigationTabs = (
    <>
      <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" activeTheme={theme} mobile />
      <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" activeTheme={theme} mobile />
      <NavButton active={activeTab === AppTab.Reflections} onClick={() => setActiveTab(AppTab.Reflections)} icon={<Heart />} label="Saved" activeTheme={theme} mobile />
      <NavButton active={activeTab === AppTab.Profile} onClick={() => setActiveTab(AppTab.Profile)} icon={<UserCircle />} label="Me" activeTheme={theme} mobile />
    </>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 animate-fadeIn ${themeClasses}`}>
      {toast && (
        <div className={`fixed top-24 md:top-28 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp font-bold text-sm border ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* API Key Missing Alert */}
      {apiKeyMissing && (
        <div className="fixed top-20 left-0 right-0 z-[90] px-6 py-2 bg-amber-500 text-white text-xs font-bold text-center flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          API Key (API_KEY) খুঁজে পাওয়া যায়নি। সার্চ কাজ করবে না।
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-2xl text-white shadow-lg"><LogIn className="w-6 h-6" /></div>
                <div><h3 className="text-xl font-bold text-slate-900">Sign in</h3></div>
              </div>
              <form onSubmit={handleGoogleLoginSubmit} className="space-y-4">
                <input type="text" required placeholder="Name" value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900" />
                <input type="email" required placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl">LOG IN</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="w-full text-slate-400 py-2 font-bold text-xs">CANCEL</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HEADER: Brand and Desktop Menu */}
      <header className={`fixed top-0 left-0 right-0 z-[100] border-b backdrop-blur-xl transition-all duration-300 ${theme === Theme.Dark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-1.5 bg-indigo-600 rounded-lg shadow-lg text-white">
               <Music className="w-4 h-4" />
             </div>
             <h1 className="text-lg font-black tracking-tighter">Sacred Melodies</h1>
           </div>

           {/* DESKTOP MENU: Aligned with the theme buttons */}
           <div className="hidden md:flex items-center gap-2 mx-auto">
              {navigationTabs}
           </div>

           <div className="flex items-center gap-2">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2 rounded-xl border transition-all ${cardBgClasses}`}>{theme === Theme.Dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}</button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-8 h-8 rounded-full border overflow-hidden p-0.5 transition-transform active:scale-90 ${cardBgClasses}`}>{user ? <img src={user.photo} className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-5 h-5 m-auto opacity-30" />}</button>
           </div>
        </div>
      </header>

      <main className={`flex-1 w-full max-w-6xl mx-auto px-6 ${apiKeyMissing ? 'pt-28 md:pt-36' : 'pt-24 md:pt-32'} pb-24 md:pb-12`}>
        <div className="page-transition">
          {activeTab === AppTab.Library && (
            <div className="space-y-8">
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-black tracking-tight mb-2">Song Library</h2>
                <p className="opacity-60 text-sm">আরাধনা ও প্রশান্তির বাইবেলীয় সঙ্গীত সংগ্রহ।</p>
              </div>
              
              <div className="flex flex-col gap-4">
                 <div className="relative group w-full">
                    <input type="text" placeholder="গান বা পদের নাম খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAISearch()} className={`w-full py-4 pl-12 pr-28 rounded-2xl border transition-all shadow-sm ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 focus:border-indigo-500'}`} />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                    <button onClick={handleAISearch} disabled={isSearchingAI || !searchQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg">AI SEARCH</button>
                 </div>
                 
                 <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                    {['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : cardBgClasses + ' opacity-70'}`}>
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredSongs.map(song => (<SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />))}
              </div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-4xl mx-auto space-y-8 py-4">
                <div className="text-center space-y-4">
                   <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-xl"><BookOpen className="w-8 h-8" /></div>
                   <h2 className="text-2xl font-black">Bible Discovery</h2>
                </div>
                <div className="relative max-w-lg mx-auto">
                   <input type="text" placeholder="যোহন ৩:১৬..." value={studyQuery} onChange={(e) => setStudyQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStudySearch()} className={`w-full py-5 px-8 rounded-3xl border text-lg ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                   <button onClick={handleStudySearch} disabled={isExplaining} className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-indigo-600 text-white rounded-2xl shadow-lg">
                      {isExplaining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                   </button>
                </div>
                {(verseExplanation || isExplaining) && (
                   <div className={`p-6 md:p-10 rounded-[2.5rem] border shadow-xl ${cardBgClasses}`}>
                      {isExplaining && !verseExplanation ? (
                         <div className="flex flex-col items-center gap-4 py-10 opacity-40">
                            <Loader2 className="w-8 h-8 animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Searching via Google...</p>
                         </div>
                      ) : (
                        <>
                          {renderFormattedExplanation(verseExplanation || '')}
                          {verseExplanation && (
                            <div className="flex flex-wrap items-center gap-3 pt-8 mt-8 border-t border-slate-100 dark:border-slate-800">
                               <button onClick={handleSaveStudy} disabled={isStudySaved} className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all ${isStudySaved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
                                  {isStudySaved ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                  <span className="text-[10px] font-black uppercase tracking-widest">SAVE</span>
                               </button>
                               <button onClick={() => showToast("Text copied to clipboard.")} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-slate-50">
                                  <Share2 className="w-4 h-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">SHARE</span>
                               </button>
                            </div>
                          )}
                        </>
                      )}
                   </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Reflections && (
             <div className="space-y-8">
                <h2 className="text-3xl font-black">Saved Notes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {savedStudies.length > 0 ? savedStudies.map(study => (
                      <div key={study.id} className={`p-6 rounded-[2rem] border hover:shadow-lg transition-all cursor-pointer ${cardBgClasses}`} onClick={() => { setStudyQuery(study.reference); setVerseExplanation(study.content); setActiveTab(AppTab.Study); }}>
                         <div className="flex items-center justify-between mb-2"><h3 className="font-black text-xl">{study.reference}</h3><Trash2 className="w-4 h-4 text-rose-500 opacity-0 group-hover:opacity-100" /></div>
                         <p className="text-sm line-clamp-3 italic opacity-60">{study.content.replace(/\[\[.*?\]\]/g, '')}</p>
                      </div>
                   )) : <div className="col-span-full py-20 text-center opacity-40"><Bookmark className="w-12 h-12 mx-auto mb-4" /><p className="font-bold">No saved notes yet.</p></div>}
                </div>
             </div>
          )}

          {activeTab === AppTab.Profile && (
             <div className="max-w-md mx-auto py-8 text-center space-y-10">
                {user ? (
                   <div className="space-y-6">
                      <div className="w-32 h-32 rounded-[2.5rem] border-4 border-indigo-600 shadow-xl overflow-hidden mx-auto p-1 transition-transform hover:scale-105"><img src={user.photo} className="w-full h-full object-cover rounded-[2rem]" /></div>
                      <div><h2 className="text-3xl font-black">{user.name}</h2><p className="opacity-50 text-xs mt-1">{user.email}</p></div>
                      <button onClick={() => { setUser(null); showToast("Signed out."); }} className="bg-rose-50 text-rose-600 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-rose-100">SIGN OUT</button>
                   </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-xl"><UserCircle className="w-10 h-10" /></div>
                    <h2 className="text-3xl font-black tracking-tight">Account</h2>
                    <button onClick={() => setShowLoginModal(true)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">LOG IN NOW</button>
                  </div>
                )}
             </div>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION: Visible only on small screens */}
      <nav className={`fixed bottom-0 left-0 right-0 z-[100] px-4 pb-safe border-t backdrop-blur-xl transition-all md:hidden ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'}`}>
        <div className="max-w-md mx-auto flex items-center h-16">
           {mobileNavigationTabs}
        </div>
      </nav>
    </div>
  );
};

export default App;
