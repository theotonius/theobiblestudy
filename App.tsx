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
    
    // Key validation check
    const currentKey = process.env.API_KEY;
    if (!currentKey || currentKey.trim().length < 5) {
      setApiKeyMissing(true);
    } else {
      setApiKeyMissing(false);
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
        showToast("কোনো ফলাফল পাওয়া যায়নি।", "error"); 
      }
    } catch { 
      showToast("সার্ভার সমস্যা।", "error"); 
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
      await explainVerseStream(query, (chunk, sources) => {
        setVerseExplanation(chunk);
        if (sources) setGroundingSources(sources);
      });
    } catch (error) {
      showToast("তথ্য খুঁজতে সমস্যা হচ্ছে।", "error");
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
    const newStudy: SavedStudy = { id: `study-${Date.now()}`, reference: studyQuery, content: verseExplanation, timestamp: Date.now() };
    setSavedStudies(prev => [newStudy, ...prev]);
    setIsStudySaved(true);
    showToast("সেভ করা হয়েছে।");
  };

  const handleGoogleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.name || !loginForm.email) return;
    setShowLoginModal(false);
    setUser({ name: loginForm.name, email: loginForm.email, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(loginForm.name)}` });
    showToast(`স্বাগতম, ${loginForm.name}!`);
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
      { key: '[[VERSE]]', label: 'মূল পাঠ', icon: <Quote className="w-5 h-5" /> },
      { key: '[[CONTEXT]]', label: 'প্রেক্ষাপট', icon: <ScrollText className="w-5 h-5" /> },
      { key: '[[MEANING]]', label: 'গভীর অর্থ', icon: <Gem className="w-5 h-5" /> },
      { key: '[[APPLICATION]]', label: 'প্রয়োগ', icon: <Sprout className="w-5 h-5" /> },
      { key: '[[PRAYER]]', label: 'প্রার্থনা', icon: <HandHelping className="w-5 h-5" /> },
    ];

    const upperText = text.toUpperCase();
    if (!sections.some(s => upperText.includes(s.key))) return <div className="whitespace-pre-wrap text-lg leading-relaxed font-serif p-6">{text}</div>;

    return (
      <div className="space-y-6">
        {sections.map((section, idx) => {
          const startIndex = upperText.indexOf(section.key);
          if (startIndex === -1) return null;
          let nextMarkerIndex = -1;
          sections.forEach((s, i) => {
            if (i > idx) {
              const pos = upperText.indexOf(s.key);
              if (pos !== -1 && (nextMarkerIndex === -1 || pos < nextMarkerIndex)) nextMarkerIndex = pos;
            }
          });
          const content = nextMarkerIndex !== -1 ? text.substring(startIndex + section.key.length, nextMarkerIndex).trim() : text.substring(startIndex + section.key.length).trim();
          return content ? (
            <div key={section.key} className={`p-6 rounded-[2rem] border shadow-sm ${cardBgClasses}`}>
              <div className="flex items-center gap-3 mb-4 text-indigo-500">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-700">{section.icon}</div>
                <h3 className="text-sm font-black uppercase tracking-widest">{section.label}</h3>
              </div>
              <p className="text-lg font-serif leading-relaxed opacity-90">{content}</p>
            </div>
          ) : null;
        })}
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
    <div className={`min-h-screen flex flex-col animate-fadeIn ${themeClasses}`}>
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[150] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp font-bold text-sm bg-indigo-600 text-white`}>
          <Check className="w-5 h-5" />
          {toast.message}
        </div>
      )}

      {/* Header - Desktop version uses structured tabs */}
      <header className={`fixed top-0 left-0 right-0 z-[100] border-b backdrop-blur-xl transition-all duration-300 ${theme === Theme.Dark ? 'bg-slate-900/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <Music className="w-6 h-6 text-indigo-600" />
             <h1 className="text-lg font-black tracking-tighter">Sacred Melodies</h1>
           </div>

           <div className="hidden md:flex items-center gap-2 mx-auto">
              {navigationTabs}
           </div>

           <div className="flex items-center gap-2">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2 rounded-xl border ${cardBgClasses}`}>{theme === Theme.Dark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}</button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className="w-8 h-8 rounded-full border overflow-hidden p-0.5">{user ? <img src={user.photo} className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-6 h-6 m-auto opacity-30" />}</button>
           </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-24 pb-24 md:pb-12">
        {activeTab === AppTab.Library && (
          <div className="space-y-8">
            <div className="relative">
              <input type="text" placeholder="গান খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full py-4 pl-12 pr-4 rounded-2xl border ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredSongs.map(song => (<SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />))}
            </div>
          </div>
        )}

        {activeTab === AppTab.Study && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="relative">
              <input type="text" placeholder="পদের নাম (যেমন: যোহন ৩:১৬)..." value={studyQuery} onChange={(e) => setStudyQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStudySearch()} className={`w-full py-5 px-8 rounded-3xl border text-lg ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`} />
              <button onClick={handleStudySearch} className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-indigo-600 text-white rounded-2xl">
                {isExplaining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </button>
            </div>
            {verseExplanation && (
              <div className={`p-8 rounded-[2.5rem] border shadow-xl ${cardBgClasses}`}>
                {renderFormattedExplanation(verseExplanation)}
                <button onClick={handleSaveStudy} className="mt-8 flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px]">
                  <Bookmark className="w-4 h-4" /> Save Note
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === AppTab.Reflections && (
          <div className="space-y-8">
            <h2 className="text-3xl font-black">Saved Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {savedStudies.map(study => (
                <div key={study.id} className={`p-6 rounded-[2rem] border ${cardBgClasses}`} onClick={() => { setStudyQuery(study.reference); setVerseExplanation(study.content); setActiveTab(AppTab.Study); }}>
                  <h3 className="font-black text-xl mb-2">{study.reference}</h3>
                  <p className="text-sm line-clamp-3 opacity-60 italic">{study.content.replace(/\[\[.*?\]\]/g, '')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === AppTab.Profile && (
          <div className="max-w-md mx-auto text-center space-y-8">
            {user ? (
              <div className="space-y-4">
                <img src={user.photo} className="w-24 h-24 rounded-full mx-auto border-4 border-indigo-600 shadow-xl" />
                <h2 className="text-2xl font-black">{user.name}</h2>
                <button onClick={() => setUser(null)} className="text-rose-500 font-bold hover:underline">Logout</button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg">LOGIN</button>
            )}
          </div>
        )}
      </main>

      {/* Bottom Nav - Mobile version uses structured tabs with labels */}
      <nav className={`fixed bottom-0 left-0 right-0 z-[100] pb-safe border-t backdrop-blur-xl transition-all md:hidden ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'}`}>
        <div className="max-w-md mx-auto flex items-center h-16">
           {mobileNavigationTabs}
        </div>
      </nav>

      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm space-y-4 animate-scaleUp">
            <h2 className="text-xl font-bold text-slate-900">Login</h2>
            <input type="text" placeholder="Name" className="w-full p-4 border rounded-xl bg-slate-50" onChange={e => setLoginForm({...loginForm, name: e.target.value})} />
            <input type="email" placeholder="Email" className="w-full p-4 border rounded-xl bg-slate-50" onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
            <button onClick={handleGoogleLoginSubmit} className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg">Sign In</button>
            <button onClick={() => setShowLoginModal(false)} className="w-full text-slate-400 py-2 font-bold text-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;