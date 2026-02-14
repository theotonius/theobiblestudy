
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
  Cloud, CloudLightning, Wifi, WifiOff
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
  const [selectedSavedStudy, setSelectedSavedStudy] = useState<SavedStudy | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedLibrarySearch = useDebounce(searchQuery, 300);
  const [studyQuery, setStudyQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', email: '' });

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('sm_theme');
    return (saved as Theme) || Theme.Light;
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
    const deletedList: string[] = deletedIds;
    const combined = [...userStudies];
    PRE_CACHED_STUDIES.forEach(pre => {
      if (!deletedList.includes(pre.id) && !combined.some(s => s.id === pre.id)) {
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

  // Fellowship State
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [firebaseLive, setFirebaseLive] = useState(false);

  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isStudySaved, setIsStudySaved] = useState(false);
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
    document.documentElement.className = theme;
  }, [favorites, savedStudies, deletedIds, theme, user]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast("চ্যাট করতে লগইন করুন।", "error");
      setActiveTab(AppTab.Profile);
      return;
    }
    if (!newMessage.trim()) return;

    try {
      await sendChatMessage({
        text: newMessage,
        senderId: user.email,
        senderName: user.name,
        senderPhoto: user.photo,
        timestamp: Date.now()
      });
      setNewMessage('');
    } catch (err) {
      showToast("মেসেজ পাঠানো সম্ভব হয়নি।", "error");
    }
  };

  const handleStudySearch = async () => {
    if (!studyQuery.trim()) return;
    setIsExplaining(true);
    setVerseExplanation(""); 
    setIsStudySaved(false);
    try {
      await explainVerseStream(studyQuery, (chunk) => {
        setVerseExplanation(chunk);
        if (isExplaining) setIsExplaining(false);
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

  const handleDeleteStudy = (id: string) => {
    if (id.startsWith('pre-')) {
      setDeletedIds(prev => [...prev, id]);
    }
    setSavedStudies(prev => prev.filter(s => s.id !== id));
    if (selectedSavedStudy?.id === id) setSelectedSavedStudy(null);
    showToast("স্টাডি নোটটি মুছে ফেলা হয়েছে।");
  };

  // Clear all studies handler
  const handleClearAllStudies = () => {
    if (confirm("আপনি কি সব স্টাডি নোট মুছে ফেলতে চান?")) {
      const allPreIds = PRE_CACHED_STUDIES.map(s => s.id);
      setDeletedIds(prev => Array.from(new Set([...prev, ...allPreIds])));
      setSavedStudies([]);
      showToast("সব স্টাডি নোট মুছে ফেলা হয়েছে।");
    }
  };

  const handleLogout = () => {
    if (confirm("আপনি কি নিশ্চিত যে আপনি সাইন আউট করতে চান?")) {
      setUser(null);
      setActiveTab(AppTab.Library);
      showToast("আপনি সাইন আউট করেছেন।");
    }
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

  // Study Reader View
  if (selectedSavedStudy) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-500 page-transition ${themeClasses}`}>
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
           <article className={`whitespace-pre-wrap text-xl md:text-3xl font-serif leading-relaxed ${theme === Theme.Dark ? 'text-slate-100' : ''}`}>
             {selectedSavedStudy.content}
           </article>
        </main>
      </div>
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
          <div className="bg-white w-full max-sm rounded-3xl shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="48" height="48"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                </div>
                <div><h3 className="text-xl font-bold text-slate-900">Sign in with Google</h3></div>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                setShowLoginModal(false);
                setTimeout(() => {
                  setUser({ name: loginForm.name, email: loginForm.email, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(loginForm.name)}` });
                  showToast(`স্বাগতম, ${loginForm.name}!`);
                  setActiveTab(AppTab.Library);
                }, 1000);
              }} className="space-y-4">
                <input type="text" required placeholder="Full Name" value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl transition-all text-slate-900 font-medium" />
                <input type="email" required placeholder="Email Address" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl transition-all text-slate-900 font-medium" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">NEXT</button>
              </form>
            </div>
          </div>
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
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-10 h-10 rounded-full border overflow-hidden p-0.5 transition-all ${cardBgClasses}`}>
                 {user ? <img src={user.photo} alt="User" className="w-full h-full object-cover rounded-full" /> : <UserCircle className="w-6 h-6 m-auto opacity-30" />}
              </button>
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
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="গান বা পদের নাম খুঁজুন..." 
                      className={`w-full py-4 pl-14 pr-6 rounded-2xl border transition-all text-sm font-medium shadow-lg animate-focus-glow ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100 focus:border-indigo-500'}`}
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-2">
                    {['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map((cat) => (
                      <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : cardBgClasses}`}>{cat}</button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredSongs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                  {filteredSongs.map(song => (<SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 opacity-40">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto"><CloudOff className="w-10 h-10" /></div>
                  <p className="font-bold text-lg">দুঃখিত, কোনো গান পাওয়া যায়নি।</p>
                </div>
              )}
            </div>
          )}

          {activeTab === AppTab.Chat && (
            <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-220px)] animate-fadeIn">
               <div className={`p-6 border-b flex items-center justify-between rounded-t-[3rem] ${cardBgClasses}`}>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><Users className="w-6 h-6" /></div>
                     <div>
                        <h2 className="font-black text-xl tracking-tight">Public Fellowship</h2>
                        <div className="flex items-center gap-3 mt-1">
                           <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${firebaseLive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                             {firebaseLive ? <Cloud className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                             {firebaseLive ? 'Live Sync' : 'Local Mode'}
                           </div>
                           <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{firebaseLive ? 'Firebase Active' : 'Offline Storage'}</span>
                        </div>
                     </div>
                  </div>
                  <button onClick={() => showToast(firebaseLive ? "You are connected to Global Chat." : "Configure Firebase to chat with everyone.")} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                    <Database className={`w-6 h-6 ${firebaseLive ? 'text-indigo-500' : 'opacity-20'}`} />
                  </button>
               </div>
               <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${theme === Theme.Dark ? 'bg-slate-900/30' : 'bg-slate-50/50'}`}>
                  {messages.length > 0 ? messages.map((msg) => {
                    const isMe = user && msg.senderId === user.email;
                    return (
                      <div key={msg.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} page-transition`}>
                         <img src={msg.senderPhoto} className="w-9 h-9 rounded-xl shadow-md shrink-0" alt={msg.senderName} />
                         <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            {!isMe && <p className="text-[9px] font-black opacity-40 uppercase tracking-widest ml-1">{msg.senderName}</p>}
                            <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm transition-all ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : cardBgClasses + ' rounded-bl-none'}`}>{msg.text}</div>
                            <p className="text-[8px] opacity-30 font-bold uppercase tracking-widest">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}</p>
                         </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 space-y-4">
                      <MessageSquare className="w-12 h-12" />
                      <p className="font-bold uppercase tracking-widest text-xs">No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  <div ref={chatEndRef} />
               </div>
               <div className={`p-6 border-t rounded-b-[3rem] ${cardBgClasses}`}>
                  {user ? (
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                       <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="আপনার অনুভূতি শেয়ার করুন..." className={`flex-1 py-4 px-6 rounded-2xl border transition-all text-sm font-medium outline-none ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:border-indigo-500'}`} />
                       <button type="submit" className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all"><Send className="w-5 h-5" /></button>
                    </form>
                  ) : (
                    <div className="text-center py-2 space-y-3">
                       <p className="text-xs font-bold opacity-60">Fellowship-এ কথা বলতে লগইন করুন</p>
                       <button onClick={() => setActiveTab(AppTab.Profile)} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">LOG IN NOW</button>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-4xl mx-auto space-y-12 py-10 text-center">
                <div className="space-y-6"><div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200"><BookOpen className="w-12 h-12" /></div><div className="space-y-2"><h2 className="text-4xl md:text-5xl font-black tracking-tight">Bible Discovery</h2><p className="opacity-80 text-lg font-medium">পদের ব্যাখ্যা দেখতে সার্চ করুন। এটি এখন আরও দ্রুত!</p></div></div>
                <div className="relative group max-w-2xl mx-auto"><input type="text" placeholder="যোহন ৩:১৬..." value={studyQuery} onChange={(e) => setStudyQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStudySearch()} className={`w-full py-6 px-10 rounded-[3rem] border text-xl transition-all shadow-2xl ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} /><button onClick={handleStudySearch} disabled={isExplaining} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-xl disabled:opacity-50">{isExplaining ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}</button></div>
                {(verseExplanation || isExplaining) && (
                   <div className={`p-8 md:p-14 rounded-[3.5rem] border shadow-2xl text-left page-transition ${cardBgClasses}`}>
                      <div className={`whitespace-pre-wrap text-xl md:text-2xl font-serif leading-relaxed ${theme === Theme.Dark ? 'text-slate-100' : ''}`}>
                        {verseExplanation || (isExplaining && "ব্যাখ্যা তৈরি হচ্ছে...")}
                      </div>
                      {!isExplaining && verseExplanation && (
                        <div className="flex flex-wrap items-center gap-4 pt-8 mt-8 border-t border-slate-100 dark:border-slate-700/50">
                           <button onClick={handleSaveStudy} disabled={isStudySaved} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all ${isStudySaved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:scale-105 active:scale-95'}`}>{isStudySaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}<span className="text-xs font-black uppercase tracking-widest">{isStudySaved ? 'সেভ করা আছে' : 'সেভ করুন'}</span></button>
                        </div>
                      )}
                   </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Reflections && (
            <div className="space-y-12">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="text-center md:text-left">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none">Saved Studies</h2>
                    <p className="text-lg opacity-80 font-medium">আপনার সংরক্ষিত বাইবেল স্টাডি এবং পদের ব্যাখ্যা।</p>
                  </div>
                  {savedStudies.length > 0 && (
                    <button onClick={handleClearAllStudies} className="flex items-center gap-2 px-6 py-3 bg-rose-50 dark:bg-rose-900/10 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-rose-100 dark:border-rose-900/30 hover:bg-rose-100 transition-all"><Eraser className="w-4 h-4" /> CLEAR ALL</button>
                  )}
                </div>

                {savedStudies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {savedStudies.map((study) => (
                      <div key={study.id} onClick={() => setSelectedSavedStudy(study)} className={`p-8 rounded-[2.5rem] border shadow-md flex flex-col page-transition cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all ${cardBgClasses}`}>
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-600/10 text-indigo-600 rounded-xl flex items-center justify-center"><History className="w-5 h-5" /></div>
                              <h3 className={`text-xl font-black tracking-tight ${textTitleClasses}`}>{study.reference}</h3>
                           </div>
                           <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest flex items-center gap-2"><Calendar className="w-3 h-3" /> {new Date(study.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className={`flex-1 font-serif text-lg leading-relaxed mb-8 whitespace-pre-wrap line-clamp-6 opacity-80 ${theme === Theme.Dark ? 'text-slate-200' : ''}`}>
                          {study.content}
                        </div>
                        <div className="flex items-center gap-3 pt-6 border-t border-slate-100 dark:border-slate-700/50">
                           <button onClick={(e) => { e.stopPropagation(); if(confirm("এই স্টাডি নোটটি মুছে ফেলতে চান?")) { handleDeleteStudy(study.id); } }} className="p-3 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all"><Trash2 className="w-5 h-5" /></button>
                           <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">READ FULL <Maximize2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-6 opacity-40">
                    <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto"><Bookmark className="w-10 h-10" /></div>
                    <div className="space-y-2">
                       <p className="font-black text-xl">আপনার কোনো সেভ করা স্টাডি নেই।</p>
                       <p className="text-sm font-medium">Study সেকশনে গিয়ে নতুন কোনো পদ সার্চ করুন এবং সেভ করুন।</p>
                    </div>
                    <button onClick={() => setActiveTab(AppTab.Study)} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200">START DISCOVERY</button>
                  </div>
                )}
            </div>
          )}

          {activeTab === AppTab.Profile && (
             <div className="max-w-4xl mx-auto py-12">
                {user ? (
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                      <div className="text-center md:text-left space-y-8">
                         <div className="relative inline-block md:block"><div className="w-40 h-40 rounded-[3.5rem] p-1.5 border-4 border-indigo-600 shadow-2xl overflow-hidden mx-auto md:mx-0"><img src={user.photo} alt="Avatar" className="w-full h-full object-cover rounded-[3rem]" /></div></div>
                         <div><h2 className={`text-4xl font-black tracking-tight ${textTitleClasses}`}>{user.name}</h2><p className={`opacity-60 font-bold uppercase tracking-[0.2em] text-xs mt-3 ${textMutedClasses}`}>{user.email}</p></div>
                      </div>
                      <div className="md:col-span-2 space-y-4">
                         <button onClick={() => setActiveTab(AppTab.Developer)} className={`w-full p-8 rounded-[3rem] border font-bold flex items-center justify-between group transition-all hover:scale-[1.01] hover:shadow-xl ${cardBgClasses}`}><span className={`flex items-center gap-5 text-lg font-black ${textTitleClasses}`}><Code2 className="w-8 h-8 text-indigo-500" /> Developer Profile</span><ChevronRight className="w-6 h-6 opacity-40 group-hover:opacity-100 group-hover:translate-x-2 transition-all" /></button>
                         <button onClick={handleLogout} className="w-full p-8 bg-rose-50 text-rose-600 rounded-[3rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-rose-100 transition-all"><LogOut className="w-6 h-6" /> সাইন আউট করুন</button>
                      </div>
                   </div>
                ) : (
                  <div className="max-w-md mx-auto space-y-12 py-10 text-center">
                    <div className={`w-28 h-28 mx-auto rounded-[2.5rem] flex items-center justify-center text-white bg-indigo-600 shadow-2xl shadow-indigo-100`}><LogIn className="w-12 h-12" /></div>
                    <div className="space-y-4">
                      <button onClick={() => setShowLoginModal(true)} className={`w-full py-5 px-8 rounded-3xl border font-black text-sm flex items-center justify-center gap-4 transition-all hover:shadow-xl active:scale-95 ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}><Chrome className="w-6 h-6 text-rose-500" /> CONTINUE WITH GMAIL</button>
                    </div>
                  </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Developer && (
            <div className="max-w-3xl mx-auto py-10 px-4">
               <button onClick={() => setActiveTab(AppTab.Profile)} className="flex items-center gap-3 mb-10 group"><div className={`p-3 rounded-2xl transition-all ${cardBgClasses} group-hover:scale-110`}><ChevronLeft className="w-5 h-5" /></div><span className="font-black text-xs uppercase tracking-[0.2em] opacity-60">Back to Profile</span></button>
               <div className={`relative rounded-[3.5rem] border shadow-2xl overflow-hidden page-transition ${cardBgClasses}`}>
                  <div className="relative z-10 px-6 py-12 md:p-16 flex flex-col items-center text-center">
                     <div className="relative mb-8">
                       <div className="w-48 h-48 md:w-56 md:h-56 rounded-[3.5rem] p-1.5 bg-gradient-to-tr from-indigo-600 via-purple-500 to-indigo-400 shadow-2xl overflow-hidden relative">
                         <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Theotonius" className="w-full h-full object-cover rounded-[3rem]" alt="Sobuj Biswas" />
                       </div>
                       <div className="absolute -bottom-3 -right-3 w-14 h-14 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border-4 border-[#fafafa] dark:border-slate-800 shadow-xl"><Zap className="w-6 h-6 text-indigo-600 animate-pulse" /></div>
                     </div>
                     <div className="space-y-4 max-w-lg mb-12">
                       <h2 className={`text-3xl md:text-5xl font-black tracking-tighter leading-tight ${textTitleClasses}`}>SOBUJ THEOTONIUS BISWAS</h2>
                       <div className="flex flex-wrap items-center justify-center gap-2"><span className="px-4 py-1.5 rounded-full bg-indigo-600/10 border border-indigo-600/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest">Fullstack Engineer</span></div>
                       <p className={`text-sm md:text-lg font-medium opacity-60 px-4 mt-6 ${textMutedClasses}`}>Crafting meaningful digital experiences through clean code and spiritual mindfulness.</p>
                     </div>
                     <div className="w-full space-y-6">
                        <a href="tel:+8801614802711" className="relative flex items-center justify-center p-8 rounded-[3rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white shadow-xl hover:scale-[1.03] active:scale-95 transition-all duration-500 group overflow-hidden border border-white/10 ring-4 ring-white/10">
                           <div className="flex flex-col items-center gap-3 relative z-10">
                              <div className="p-5 bg-white/20 backdrop-blur-2xl rounded-[2rem] border border-white/30 shadow-2xl transition-all"><PhoneCall className="w-9 h-9 text-white animate-pulse" /></div>
                              <div className="text-center"><p className="text-[12px] font-black opacity-80 uppercase tracking-[0.4em] mb-2">CALL DIRECTLY</p><p className="text-4xl font-black tracking-tighter leading-none">01614802711</p></div>
                           </div>
                        </a>
                        <div className="grid grid-cols-4 gap-3">
                           <a href="mailto:theotonius2012@gmail.com" className={`p-5 rounded-[2rem] border flex items-center justify-center transition-all hover:bg-rose-500 hover:text-white ${cardBgClasses}`}><Mail className="w-6 h-6" /></a>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="mt-10 text-center space-y-2 opacity-40"><p className="text-[10px] font-black uppercase tracking-[0.3em]">Built with Love & Grace</p></div>
            </div>
          )}
        </div>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 py-4 px-6 border-t backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]'}`}>
        <div className="max-lg mx-auto flex justify-between items-center">
           <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Chat} onClick={() => setActiveTab(AppTab.Chat)} icon={<MessageSquare />} label="Fellowship" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Reflections} onClick={() => setActiveTab(AppTab.Reflections)} icon={<Heart />} label="Saved" activeTheme={theme} />
           <NavButton active={activeTab === AppTab.Profile || activeTab === AppTab.Developer} onClick={() => setActiveTab(AppTab.Profile)} icon={user ? <img src={user.photo} className="w-5 h-5 rounded-full" /> : <UserCircle />} label="Account" activeTheme={theme} />
        </div>
      </nav>
    </div>
  );
};

export default App;
