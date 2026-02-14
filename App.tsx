
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BIBLE_SONGS, PRE_CACHED_STUDIES } from './constants';
import { Song, AppTab, UserProfile, SavedStudy, Theme, Message } from './types';
import SongCard from './components/SongCard';
import Reader from './components/Reader';
import { 
  Music, Search, Heart, User, Sparkles, Loader2, BookOpen, LogOut, 
  ShieldCheck, Facebook, Share2, Check, Bookmark, Trash2, 
  ChevronLeft, ChevronRight, CloudOff, X, Moon, Sun, Coffee, 
  Code2, Github, Globe, Linkedin, Mail, Smartphone, Award, Laptop, Wand2, AlertCircle,
  LogIn, Chrome, Settings, UserCircle, Cpu, Layers, Zap, PhoneCall, Camera,
  MessageSquare, Send, Users, Database, History, Filter, Calendar, Maximize2, Eraser,
  Cloud, CloudLightning, Wifi, WifiOff, Type as FontIcon
} from 'lucide-react';
import { fetchSongFromAI, explainVerseStream } from './services/geminiService';
import { subscribeToMessages, sendChatMessage, isFirebaseConnected } from './services/firebaseService';

// Custom hook for debouncing search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

/**
 * A simple custom renderer for Markdown-style explanation text
 * Ensures headers and sections are visually distinct.
 */
const FormattedExplanation: React.FC<{ text: string; theme: Theme }> = ({ text, theme }) => {
  if (!text) return null;

  // Split text by lines to identify structure
  const lines = text.split('\n');
  
  return (
    <div className="space-y-6 font-solaiman">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-2" />;

        // Detect Main Headers (Emojis at start)
        const isHeader = /^📖|📜|💎|🌱|🙏/.test(trimmed);
        
        if (isHeader) {
          return (
            <h3 key={idx} className={`text-2xl md:text-3xl font-black mt-10 mb-6 flex items-center gap-3 ${theme === Theme.Dark ? 'text-indigo-400' : 'text-indigo-700'}`}>
              <span className="shrink-0">{trimmed.slice(0, 2)}</span>
              <span className="border-b-2 border-indigo-500/20 pb-1">{trimmed.slice(2)}</span>
            </h3>
          );
        }

        // Process bold markers **...**
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <p key={idx} className={`text-lg md:text-xl leading-relaxed mb-4 ${theme === Theme.Dark ? 'text-slate-200' : 'text-slate-800'}`}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} className="font-black text-indigo-600 dark:text-indigo-400">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

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

const BENGALI_FONTS = [
  { name: 'SolaimanLipi', class: 'font-solaiman' },
  { name: 'Kalpurush', class: 'font-kalpurush' },
  { name: 'Siyam Rupali', class: 'font-siyam' },
  { name: 'Mukti', class: 'font-mukti' },
  { name: 'Lohit', class: 'font-lohit' },
  { name: 'BenSen', class: 'font-bensen' },
];

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedSavedStudy, setSelectedSavedStudy] = useState<SavedStudy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedLibrarySearch = useDebounce(searchQuery, 300);
  const [studyQuery, setStudyQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState<'google' | 'facebook' | null>(null);

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sm_theme');
    return (saved as Theme) || Theme.Light;
  });

  const [activeFont, setActiveFont] = useState<string>(() => {
    return localStorage.getItem('sm_font') || 'font-solaiman';
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('sm_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [deletedIds, setDeletedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('sm_deleted_studies');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedStudies, setSavedStudies] = useState<SavedStudy[]>(() => {
    const saved = localStorage.getItem('sm_saved_studies');
    const userStudies: SavedStudy[] = saved ? JSON.parse(saved) : [];
    const combined = [...userStudies];
    PRE_CACHED_STUDIES.forEach(pre => {
      // Fix: Corrected variable name from 'deletedList' to 'deletedIds'
      if (!deletedIds.includes(pre.id) && !combined.some(s => s.id === pre.id)) {
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

  // Chat State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [firebaseLive, setFirebaseLive] = useState(false);

  const [isExplaining, setIsExplaining] = useState(false);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [isStudySaved, setIsStudySaved] = useState(false);
  const [isStudyShared, setIsStudyShared] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtered songs logic
  const filteredSongs = useMemo(() => {
    return BIBLE_SONGS.filter(song => {
      const matchesSearch = song.title.toLowerCase().includes(debouncedLibrarySearch.toLowerCase()) || 
                           song.reference.toLowerCase().includes(debouncedLibrarySearch.toLowerCase());
      const matchesCategory = activeCategory === 'All' || song.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [debouncedLibrarySearch, activeCategory]);

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies.filter(s => !s.id.startsWith('pre-'))));
    localStorage.setItem('sm_deleted_studies', JSON.stringify(deletedIds));
    localStorage.setItem('sm_theme', theme);
    localStorage.setItem('sm_user', JSON.stringify(user));
    localStorage.setItem('sm_font', activeFont);
    document.documentElement.className = `${theme} ${activeFont}`;
  }, [favorites, savedStudies, deletedIds, theme, user, activeFont]);

  // Firebase Message Subscription
  useEffect(() => {
    setFirebaseLive(isFirebaseConnected());
    const unsubscribe = subscribeToMessages((fetchedMessages) => {
      setMessages(fetchedMessages);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === AppTab.Chat) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [activeTab, messages]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStudySearch = async () => {
    if (!studyQuery.trim()) return;
    setIsExplaining(true);
    setVerseExplanation(""); 
    setIsStudySaved(false);
    setIsStudyShared(false);
    try {
      await explainVerseStream(studyQuery, (chunk) => {
        setVerseExplanation(chunk);
      });
    } catch (error) {
      setVerseExplanation("দুঃখিত, ব্যাখ্যা লোড করা সম্ভব হয়নি।");
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
        showToast("এই পদটি আগেই সেভ করা হয়েছে।", "error");
        return;
    }
    const newStudy: SavedStudy = { id: `study-${Date.now()}`, reference: studyQuery, content: verseExplanation, timestamp: Date.now() };
    setSavedStudies(prev => [newStudy, ...prev]);
    setIsStudySaved(true);
    showToast("স্টাডি নোটটি সেভ করা হয়েছে।");
  };

  // Fix: Added missing toggleFavorite implementation
  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };

  // Fix: Added missing handleDeleteStudy implementation
  const handleDeleteStudy = (id: string) => {
    if (id.startsWith('pre-')) {
      setDeletedIds(prev => [...prev, id]);
    }
    setSavedStudies(prev => prev.filter(s => s.id !== id));
    if (selectedSavedStudy?.id === id) {
      setSelectedSavedStudy(null);
    }
    showToast("স্টাডি নোটটি মুছে ফেলা হয়েছে।");
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

  if (selectedSavedStudy) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-500 page-transition ${themeClasses} ${activeFont}`}>
        <header className={`sticky top-0 z-50 border-b backdrop-blur-xl h-16 md:h-20 flex items-center justify-between px-6 ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
           <button onClick={() => setSelectedSavedStudy(null)} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><ChevronLeft className="w-6 h-6" /></button>
           <div className="text-center">
              <h2 className="text-sm font-black leading-none">{selectedSavedStudy.reference}</h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Saved Reflection</p>
           </div>
           <div className="flex items-center gap-2">
              <button onClick={() => { if(confirm("এই স্টাডি নোটটি মুছে ফেলতে চান?")) { handleDeleteStudy(selectedSavedStudy.id); } }} className="p-3 rounded-2xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"><Trash2 className="w-6 h-6" /></button>
           </div>
        </header>
        <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-12 md:py-20">
           <FormattedExplanation text={selectedSavedStudy.content} theme={theme} />
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 animate-fadeIn ${themeClasses} ${activeFont}`}>
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp font-bold text-sm border ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      <header className={`fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
           <div className="flex items-center"><h1 className="text-lg sm:text-xl font-black tracking-tighter">Sacred Melodies</h1></div>
           <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800 p-1 rounded-xl">
              {[AppTab.Library, AppTab.Study, AppTab.Chat, AppTab.Reflections].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 opacity-80 hover:opacity-100'}`}>{tab === AppTab.Reflections ? 'SAVED' : tab.toUpperCase()}</button>
              ))}
           </nav>
           <div className="flex items-center gap-3">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2.5 rounded-xl border transition-all ${cardBgClasses}`}>{theme === Theme.Dark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}</button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-10 h-10 rounded-full border overflow-hidden p-0.5 transition-all ${cardBgClasses}`}>{user ? <img src={user.photo} alt="User" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-6 h-6 m-auto opacity-30" />}</button>
           </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="page-transition h-full">
          {activeTab === AppTab.Library && (
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="max-w-xl text-center md:text-left">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none">Music Library</h2>
                  <p className="text-lg opacity-80 font-medium">আপনার পছন্দের গানের সংগ্রহ। সার্চ করুন মুহূর্তেই।</p>
                </div>
                <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-6">
                  <div className="relative w-full max-sm">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="গান বা পদের নাম খুঁজুন..." className={`w-full py-4 pl-14 pr-6 rounded-2xl border transition-all text-sm font-medium shadow-lg animate-focus-glow ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 focus:border-indigo-500'}`} />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {filteredSongs.map(song => (<SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />))}
              </div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-4xl mx-auto space-y-12 py-10 text-center">
                <div className="space-y-6"><div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200"><BookOpen className="w-12 h-12" /></div><div className="space-y-2"><h2 className="text-4xl md:text-5xl font-black tracking-tight">Bible Discovery</h2><p className="opacity-80 text-lg font-medium">পদের গভীর ও আধ্যাত্মিক ব্যাখ্যা দেখুন।</p></div></div>
                <div className="relative group max-w-2xl mx-auto"><input type="text" placeholder="যোহন ৩:১৬..." value={studyQuery} onChange={(e) => setStudyQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStudySearch()} className={`w-full py-6 px-10 rounded-[3rem] border text-xl transition-all shadow-2xl ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} /><button onClick={handleStudySearch} disabled={isExplaining} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-xl disabled:opacity-50">{isExplaining ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}</button></div>
                {(verseExplanation || isExplaining) && (
                   <div className={`p-8 md:p-14 rounded-[3.5rem] border shadow-2xl text-left page-transition ${cardBgClasses}`}>
                      {isExplaining && !verseExplanation ? (
                         <div className="flex flex-col items-center justify-center py-20 space-y-4 text-indigo-600">
                           <Loader2 className="w-12 h-12 animate-spin" />
                           <p className="font-black text-xs uppercase tracking-widest animate-pulse">ব্যাখ্যা জেনারেট হচ্ছে...</p>
                         </div>
                      ) : (
                        <>
                          <FormattedExplanation text={verseExplanation || ""} theme={theme} />
                          <div className="flex flex-wrap items-center gap-4 pt-8 mt-12 border-t border-slate-100 dark:border-slate-700/50">
                             <button onClick={handleSaveStudy} disabled={isStudySaved} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${isStudySaved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95'}`}>{isStudySaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}<span className="text-xs font-black uppercase tracking-widest">{isStudySaved ? 'সেভ করা আছে' : 'সংরক্ষণ করুন'}</span></button>
                             <button onClick={() => {}} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all bg-slate-50 border-slate-200 text-slate-600 hover:scale-105 active:scale-95`}><Share2 className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">শেয়ার করুন</span></button>
                          </div>
                        </>
                      )}
                   </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Reflections && (
            <div className="space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6"><div className="text-center md:text-left"><h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none">Saved Studies</h2><p className="text-lg opacity-80 font-medium">সংরক্ষিত পদ ও সেগুলোর ব্যাখ্যা।</p></div></div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {savedStudies.map((study) => (
                   <div key={study.id} onClick={() => setSelectedSavedStudy(study)} className={`p-8 rounded-[2.5rem] border shadow-md flex flex-col page-transition cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all ${cardBgClasses}`}>
                     <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center"><History className="w-5 h-5" /></div><h3 className={`text-xl font-black tracking-tight ${textTitleClasses}`}>{study.reference}</h3></div>
                     </div>
                     <div className={`flex-1 text-lg leading-relaxed mb-8 whitespace-pre-wrap line-clamp-6 opacity-70 ${theme === Theme.Dark ? 'text-slate-200' : ''}`}>
                       {study.content.slice(0, 300)}...
                     </div>
                     <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteStudy(study.id); }} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                        <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">পড়ুন <Maximize2 className="w-4 h-4" /></button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 py-4 px-6 border-t backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]'}`}>
        <div className="max-lg mx-auto flex justify-between items-center">
           <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Chat} onClick={() => setActiveTab(AppTab.Chat)} icon={<MessageSquare />} label="Chat" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Reflections} onClick={() => setActiveTab(AppTab.Reflections)} icon={<Heart />} label="Saved" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Profile || activeTab === AppTab.Developer} onClick={() => setActiveTab(AppTab.Profile)} icon={user ? <img src={user.photo} className="w-5 h-5 rounded-full" /> : <UserCircle />} label="Account" activeTheme={theme} />
        </div>
      </nav>
    </div>
  );
};

export default App;
