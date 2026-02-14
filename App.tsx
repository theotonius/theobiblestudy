
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BIBLE_SONGS, PRE_CACHED_STUDIES } from './constants';
import { Song, AppTab, UserProfile, SavedStudy, Theme } from './types';
import SongCard from './components/SongCard';
import Reader from './components/Reader';
import { 
  Music, Search, Heart, User, Sparkles, Loader2, BookOpen, LogOut, 
  ShieldCheck, Facebook, Share2, Check, Bookmark, Trash2, 
  ChevronLeft, ChevronRight, CloudOff, X, Moon, Sun, Coffee, 
  Code2, Github, Globe, Linkedin, Mail, Smartphone, Award, Laptop, Wand2, AlertCircle,
  LogIn, Chrome, Settings, UserCircle, Cpu, Layers, Zap, PhoneCall, Camera,
  ExternalLink, Quote, ScrollText, Gem, Sprout, HandHelping
} from 'lucide-react';
import { fetchSongFromAI, explainVerseStream } from './services/geminiService';

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; activeTheme: Theme }> = ({ active, onClick, icon, label, activeTheme }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}>
     <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : (activeTheme === Theme.Dark ? 'text-slate-400' : 'text-slate-600')}`}>
        {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
     </div>
     <span className={`text-[10px] font-black uppercase tracking-widest ${active ? (activeTheme === Theme.Dark ? 'text-white' : 'text-indigo-600') : (activeTheme === Theme.Dark ? 'text-slate-400' : 'text-slate-500')}`}>
       {label}
     </span>
  </button>
);

const SplashScreen: React.FC<{ onFinish: () => void }> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 4000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 blur-[120px] animate-pulse rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] animate-pulse rounded-full" style={{ animationDelay: '1.5s' }} />
      <div className="absolute inset-0 opacity-20">
         {[...Array(20)].map((_, i) => (
           <div key={i} className="absolute w-1 h-1 bg-white rounded-full animate-celestial" style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${10 + Math.random() * 10}s` }} />
         ))}
      </div>
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isStudySaved, setIsStudySaved] = useState(false);
  const [isStudyShared, setIsStudyShared] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState<'google' | 'facebook' | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', email: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies.filter(s => !s.id.startsWith('pre-'))));
    localStorage.setItem('sm_theme', theme);
    localStorage.setItem('sm_user', JSON.stringify(user));
    document.documentElement.className = theme;
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
    setSearchError(null);
    try {
      const result = await fetchSongFromAI(searchQuery);
      if (result && result.title) {
        const newSong: Song = { ...result, id: `ai-${Date.now()}`, image: `https://picsum.photos/seed/${encodeURIComponent(result.title)}/800/600` };
        setSelectedSong(newSong);
        setActiveTab(AppTab.Reader);
        setSearchQuery('');
      } else { setSearchError("গানটি খুঁজে পাওয়া যায়নি।"); }
    } catch { setSearchError("সার্ভার সমস্যা। দয়া করে পরে চেষ্টা করুন।"); }
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
      let dataFound = false;
      await explainVerseStream(query, (chunk, sources) => {
        if (chunk.length > 5 && !dataFound) {
          dataFound = true;
          setIsExplaining(false); // Switch to content view early
        }
        setVerseExplanation(chunk);
        if (sources) setGroundingSources(sources);
      });
      
      if (!dataFound && !verseExplanation) {
        setVerseExplanation("দুঃখিত, কোনো তথ্য পাওয়া যায়নি। অনুগ্রহ করে পদের নাম সঠিকভাবে লিখুন।");
      }
    } catch (error) {
      console.error(error);
      setVerseExplanation("দুঃখিত, সার্ভার সংযোগ বিচ্ছিন্ন হয়েছে। অনুগ্রহ করে ইন্টারনেট চেক করে পুনরায় চেষ্টা করুন।");
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
    showToast("স্টাডি নোটটি সেভ করা হয়েছে।");
  };

  const handleShareStudy = async () => {
    if (!verseExplanation) return;
    const shareText = `Sacred Melodies - Bible Study: ${studyQuery}\n\n${verseExplanation}`;
    try {
      if (navigator.share) await navigator.share({ title: `Bible Study: ${studyQuery}`, text: shareText });
      else {
        await navigator.clipboard.writeText(shareText);
        setIsStudyShared(true);
        showToast("ক্লিপবোর্ডে কপি করা হয়েছে।");
      }
    } catch (err) { console.error(err); }
  };

  const handleGoogleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginForm.name || !loginForm.email) return;
    setIsLoggingIn('google');
    setShowLoginModal(false);
    setTimeout(() => {
      setUser({ name: loginForm.name, email: loginForm.email, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(loginForm.name)}` });
      setIsLoggingIn(null);
      showToast(`স্বাগতম, ${loginForm.name}!`);
      setActiveTab(AppTab.Library);
    }, 2000);
  };

  const themeClasses = useMemo(() => {
    switch (theme) {
      case Theme.Dark: return 'bg-[#0f172a] text-[#f8fafc]';
      case Theme.Sepia: return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-[#fafafa] text-slate-900';
    }
  }, [theme]);

  const cardBgClasses = theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3]' : 'bg-white border-slate-100';
  const textTitleClasses = theme === Theme.Dark ? 'text-white' : theme === Theme.Sepia ? 'text-[#433422]' : 'text-slate-900';
  const textMutedClasses = theme === Theme.Dark ? 'text-slate-300' : theme === Theme.Sepia ? 'text-[#8b6d4d]' : 'text-slate-500';

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
    if (!sections.some(s => upperText.includes(s.key))) return <div className="whitespace-pre-wrap">{text}</div>;

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
            <div key={section.key} className={`p-6 md:p-8 rounded-[2rem] border ${cardBgClasses} group transition-all hover:shadow-lg`}>
              <div className="flex items-center gap-3 mb-4 text-indigo-500">
                {section.icon}
                <h3 className="text-sm font-black uppercase tracking-widest">{section.label}</h3>
              </div>
              <p className="text-lg md:text-xl leading-relaxed opacity-90">{content}</p>
            </div>
          );
        })}
        {groundingSources.length > 0 && (
          <div className="pt-6 flex flex-wrap gap-2">
            {groundingSources.map((src, i) => src.web && (
              <a key={i} href={src.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/40">
                <ExternalLink className="w-3 h-3" /> {src.web.title || 'সূত্র'}
              </a>
            ))}
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

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 animate-fadeIn ${themeClasses}`}>
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp font-bold text-sm border ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-2xl text-white shadow-lg"><LogIn className="w-6 h-6" /></div>
                <div><h3 className="text-xl font-bold text-slate-900">Sign in with Email</h3><p className="text-sm text-slate-500 mt-1">Sacred Melodies-এ স্বাগতম</p></div>
              </div>
              <form onSubmit={handleGoogleLoginSubmit} className="space-y-4">
                <input type="text" required placeholder="আপনার নাম" value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 transition-all text-slate-900 font-medium" />
                <input type="email" required placeholder="ইমেইল" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 transition-all text-slate-900 font-medium" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">SIGN IN</button>
                <button type="button" onClick={() => setShowLoginModal(false)} className="w-full text-slate-400 py-2 font-bold text-xs hover:text-slate-600 transition-colors">CANCEL</button>
              </form>
            </div>
          </div>
        </div>
      )}

      <header className={`fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
           <h1 className="text-lg sm:text-xl font-black tracking-tighter">Sacred Melodies</h1>
           <div className="flex items-center gap-3">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2.5 rounded-xl border transition-all ${cardBgClasses}`}>{theme === Theme.Dark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}</button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-10 h-10 rounded-full border overflow-hidden p-0.5 transition-all ${cardBgClasses}`}>{user ? <img src={user.photo} alt="User" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-6 h-6 m-auto opacity-30" />}</button>
           </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="page-transition">
          {activeTab === AppTab.Library && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 text-center md:text-left">
                <div className="max-w-xl">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none">Sacred Melodies</h2>
                  <p className="text-lg opacity-80 font-medium leading-relaxed">সঙ্গীতের মাধ্যমে ঈশ্বরের আরাধনা করুন।</p>
                </div>
                <div className="w-full md:w-auto flex flex-wrap justify-center gap-2">
                  {['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map(cat => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : cardBgClasses + ' opacity-80'}`}>{cat}</button>))}
                </div>
              </div>
              <div className="relative group max-w-2xl mx-auto md:mx-0">
                 <input type="text" placeholder="গান বা পদের নাম খুঁজুন..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAISearch()} className={`w-full py-5 pl-14 pr-32 rounded-[2rem] border text-lg transition-all shadow-sm animate-focus-glow ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-40" />
                 <button onClick={handleAISearch} disabled={isSearchingAI || !searchQuery.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-[10px] font-black shadow-lg shadow-indigo-200">AI সার্চ</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {filteredSongs.map(song => (<SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />))}
              </div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-4xl mx-auto space-y-12 py-10">
                <div className="text-center space-y-6">
                   <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200"><BookOpen className="w-12 h-12" /></div>
                   <div className="space-y-2"><h2 className="text-4xl md:text-5xl font-black tracking-tight">Bible Discovery</h2><p className="opacity-80 text-lg md:text-xl font-medium">পদের গভীর ব্যাখ্যা দেখতে সার্চ করুন।</p></div>
                </div>
                <div className="relative group max-w-2xl mx-auto">
                   <input type="text" placeholder="যোহন ৩:১৬..." value={studyQuery} onChange={(e) => setStudyQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStudySearch()} className={`w-full py-6 px-10 rounded-[3rem] border text-xl transition-all shadow-2xl ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} />
                   <button onClick={handleStudySearch} disabled={isExplaining} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                      {isExplaining ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                   </button>
                </div>
                {(verseExplanation || isExplaining) && (
                   <div className={`p-8 md:p-12 rounded-[3.5rem] border shadow-2xl page-transition font-serif ${cardBgClasses}`}>
                      {isExplaining && !verseExplanation ? (
                         <div className="flex flex-col items-center gap-4 py-20 opacity-40">
                            <Loader2 className="w-10 h-10 animate-spin" />
                            <p className="text-xs font-black uppercase tracking-[0.3em]">Searching Internet via Google...</p>
                         </div>
                      ) : (
                        <>
                          {renderFormattedExplanation(verseExplanation || '')}
                          {verseExplanation && (
                            <div className="flex flex-wrap items-center gap-4 pt-10 mt-10 border-t border-slate-100 dark:border-slate-800">
                               <button onClick={handleSaveStudy} disabled={isStudySaved} className={`flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all ${isStudySaved ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:text-white'}`}>
                                  {isStudySaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                                  <span className="text-xs font-black uppercase tracking-widest">{isStudySaved ? 'সেভ করা আছে' : 'সেভ করুন'}</span>
                               </button>
                               <button onClick={handleShareStudy} className="flex items-center gap-3 px-8 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-white">
                                  <Share2 className="w-5 h-5" />
                                  <span className="text-xs font-black uppercase tracking-widest">শেয়ার করুন</span>
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
             <div className="space-y-12">
                <h2 className="text-5xl font-black tracking-tighter">সংরক্ষিত স্টাডি</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {savedStudies.length > 0 ? savedStudies.map(study => (
                      <div key={study.id} className={`p-8 rounded-[2.5rem] border hover:shadow-xl transition-all cursor-pointer ${cardBgClasses}`} onClick={() => { setStudyQuery(study.reference); setVerseExplanation(study.content); setActiveTab(AppTab.Study); }}>
                         <div className="flex items-center gap-3 mb-4"><Bookmark className="w-6 h-6 text-indigo-500" /><h3 className={`text-2xl font-black ${textTitleClasses}`}>{study.reference}</h3></div>
                         <p className="text-sm line-clamp-4 italic opacity-70 font-serif">{study.content}</p>
                      </div>
                   )) : <div className="col-span-full py-20 text-center opacity-40"><p className="text-xl font-bold">এখনো কোনো স্টাডি সেভ করেননি।</p></div>}
                </div>
             </div>
          )}

          {activeTab === AppTab.Profile && (
             <div className="max-w-4xl mx-auto py-12 text-center space-y-12">
                {user ? (
                   <div className="space-y-8">
                      <div className="w-40 h-40 rounded-[3.5rem] border-4 border-indigo-600 shadow-2xl overflow-hidden mx-auto p-1.5"><img src={user.photo} className="w-full h-full object-cover rounded-[3rem]" /></div>
                      <div><h2 className="text-4xl font-black tracking-tight">{user.name}</h2><p className="opacity-60 text-xs mt-2 uppercase tracking-widest">{user.email}</p></div>
                      <button onClick={() => { setUser(null); showToast("সাইন আউট করা হয়েছে।"); }} className="bg-rose-50 text-rose-600 px-10 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-rose-100 transition-all">সাইন আউট করুন</button>
                   </div>
                ) : (
                  <div className="max-w-md mx-auto space-y-8">
                    <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-white shadow-2xl"><User className="w-12 h-12" /></div>
                    <h2 className="text-4xl font-black tracking-tight">অ্যাকাউন্ট নেই</h2>
                    <button onClick={() => setShowLoginModal(true)} className="w-full bg-indigo-600 text-white py-5 rounded-3xl font-black text-sm shadow-xl shadow-indigo-200">লগইন করুন</button>
                  </div>
                )}
             </div>
          )}
        </div>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 py-4 px-6 border-t backdrop-blur-xl ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]'}`}>
        <div className="max-w-lg mx-auto flex justify-between items-center">
           <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Reflections} onClick={() => setActiveTab(AppTab.Reflections)} icon={<Heart />} label="Saved" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Profile} onClick={() => setActiveTab(AppTab.Profile)} icon={<UserCircle />} label="Account" activeTheme={theme} />
        </div>
      </nav>
    </div>
  );
};

export default App;
