
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
  ExternalLink, Quote, ScrollText, Gem, Sprout, HandHelping
} from 'lucide-react';
import { fetchSongFromAI, explainVerseStream } from './services/geminiService';
import { subscribeToMessages, sendChatMessage } from './services/firebaseService';

// Helper to strip markers for clean snippets in the list view
const stripMarkers = (text: string) => {
  return text.replace(/\[\[.*?\]\]/g, '').trim();
};

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

  const [isExplaining, setIsExplaining] = useState(false);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [isStudySaved, setIsStudySaved] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies.filter(s => !s.id.startsWith('pre-'))));
    localStorage.setItem('sm_deleted_studies', JSON.stringify(deletedIds));
    localStorage.setItem('sm_theme', theme);
    localStorage.setItem('sm_user', JSON.stringify(user));
    document.documentElement.className = theme;
  }, [favorites, savedStudies, deletedIds, theme, user]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages((fetchedMessages) => {
      setMessages(fetchedMessages);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === AppTab.Chat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, messages]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredSongs = useMemo(() => {
    const q = debouncedLibrarySearch.toLowerCase().trim();
    return BIBLE_SONGS.filter(s => {
      const categoryMatch = activeCategory === 'All' || s.category.toLowerCase() === activeCategory.toLowerCase();
      if (!categoryMatch) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q);
    });
  }, [debouncedLibrarySearch, activeCategory]);

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
    setGroundingSources([]);
    setIsStudySaved(false);
    try {
      await explainVerseStream(studyQuery, (chunk, sources) => {
        setVerseExplanation(chunk);
        if (sources) setGroundingSources(sources);
        if (isExplaining) setIsExplaining(false);
      });
    } catch (error) {
      setVerseExplanation("দুঃখিত, কোনো তথ্য পাওয়া যায়নি। অনুগ্রহ করে পদের নাম সঠিকভাবে লিখুন।");
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
    if (id.startsWith('pre-')) setDeletedIds(prev => [...prev, id]);
    setSavedStudies(prev => prev.filter(s => s.id !== id));
    if (selectedSavedStudy?.id === id) setSelectedSavedStudy(null);
    showToast("স্টাডি নোটটি মুছে ফেলা হয়েছে।");
  };

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
    if (!sections.some(s => upperText.includes(s.key))) {
      return <div className="p-8 rounded-[2rem] border bg-white dark:bg-slate-800 shadow-sm whitespace-pre-wrap font-serif text-lg leading-relaxed">{text}</div>;
    }

    return (
      <div className="space-y-6 text-left animate-fadeIn">
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

          if (nextMarkerIndex !== -1) {
            content = text.substring(startIndex + section.key.length, nextMarkerIndex).trim();
          } else {
            content = text.substring(startIndex + section.key.length).trim();
          }

          if (!content) return null;

          return (
            <div key={section.key} className="p-8 rounded-[2.5rem] border bg-white dark:bg-slate-800 shadow-sm group">
              <div className="flex items-center gap-4 mb-4">
                 <div className={`p-3 rounded-2xl bg-${section.color}-500/10 text-${section.color}-600`}>{section.icon}</div>
                 <h3 className="text-xl font-black tracking-tight dark:text-white">{section.label}</h3>
              </div>
              <div className="text-lg md:text-xl font-serif leading-relaxed dark:text-slate-200">{content}</div>
            </div>
          );
        })}
        {groundingSources.length > 0 && (
          <div className="p-8 rounded-[2.5rem] border bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2"><Globe className="w-4 h-4" /> সোর্স এবং রেফারেন্স</h4>
            <div className="flex flex-wrap gap-2">
               {groundingSources.map((src, i) => src.web && (
                 <a key={i} href={src.web.uri} target="_blank" rel="noopener" className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl text-[10px] font-bold shadow-sm hover:shadow-md transition-all border dark:border-slate-700">
                    <ExternalLink className="w-3 h-3" /> {src.web.title || 'Source'}
                 </a>
               ))}
            </div>
          </div>
        )}
      </div>
    );
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

  if (showSplash) return <SplashScreen onFinish={() => setShowSplash(false)} />;

  if (selectedSong && activeTab === AppTab.Reader) {
    return (
      <Reader song={selectedSong} onBack={() => { setSelectedSong(null); setActiveTab(AppTab.Library); }} 
              isFavorite={favorites.includes(selectedSong.id)} onToggleFavorite={toggleFavorite} theme={theme} />
    );
  }

  if (selectedSavedStudy) {
    return (
      <div className={`min-h-screen flex flex-col transition-colors duration-500 page-transition ${themeClasses}`}>
        <header className={`sticky top-0 z-50 border-b backdrop-blur-xl h-16 md:h-20 flex items-center justify-between px-6 ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
           <button onClick={() => setSelectedSavedStudy(null)} className="p-3 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><ChevronLeft className="w-6 h-6" /></button>
           <div className="text-center">
              <h2 className="text-sm font-black leading-none">{selectedSavedStudy.reference}</h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Saved Study</p>
           </div>
           <button onClick={() => { if(confirm("মুছে ফেলতে চান?")) handleDeleteStudy(selectedSavedStudy.id); }} className="p-3 text-rose-500 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-900/20"><Trash2 className="w-6 h-6" /></button>
        </header>
        <main className="flex-1 max-w-4xl mx-auto w-full px-8 py-12 md:py-20">
           {renderFormattedExplanation(selectedSavedStudy.content)}
        </main>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 animate-fadeIn ${themeClasses}`}>
      {toast && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-slideUp font-bold text-sm border ${toast.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-500 text-white border-rose-400'}`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />} {toast.message}
        </div>
      )}

      {showLoginModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-sm rounded-3xl shadow-2xl overflow-hidden animate-scaleUp p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><LogIn className="w-8 h-8" /></div>
                <h3 className="text-xl font-bold text-slate-900">Sign in with Google</h3>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); setShowLoginModal(false); setUser({ name: loginForm.name, email: loginForm.email, photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${loginForm.name}` }); }} className="space-y-4">
                <input type="text" required placeholder="Full Name" value={loginForm.name} onChange={(e) => setLoginForm({ ...loginForm, name: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl" />
                <input type="email" required placeholder="Email Address" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl" />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black shadow-xl">LOG IN</button>
              </form>
          </div>
        </div>
      )}

      <header className={`fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
           <h1 className="text-xl font-black tracking-tighter">Sacred Melodies</h1>
           <div className="flex items-center gap-3">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2.5 rounded-xl border transition-all ${cardBgClasses}`}>{theme === Theme.Dark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}</button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-10 h-10 rounded-full border overflow-hidden transition-all ${cardBgClasses}`}>{user ? <img src={user.photo} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 m-auto opacity-30" />}</button>
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
                  <p className="text-lg opacity-80 font-medium">পছন্দের গান বা পদের নাম দিয়ে সার্চ করুন মুহূর্তেই।</p>
                </div>
                <div className="w-full md:w-auto space-y-6">
                  <div className="relative w-full max-w-sm"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="গান খুঁজুন..." className={`w-full py-4 pl-14 pr-6 rounded-2xl border transition-all shadow-lg animate-focus-glow ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-100'}`} /><Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" /></div>
                  <div className="flex flex-wrap justify-center gap-2">{['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map((cat) => (<button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-xl scale-105' : cardBgClasses}`}>{cat}</button>))}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">{filteredSongs.map(song => (<SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />))}</div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-4xl mx-auto space-y-12 py-10 text-center">
                <div className="space-y-6"><div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200"><BookOpen className="w-12 h-12" /></div><h2 className="text-4xl md:text-5xl font-black tracking-tight">Bible Discovery</h2><p className="opacity-80 text-lg font-medium">সার্চ করুন পদের সঠিক টেক্সট এবং ব্যাখ্যা জানতে।</p></div>
                <div className="relative group max-w-2xl mx-auto"><input type="text" placeholder="যোহন ৩:১৬..." value={studyQuery} onChange={(e) => setStudyQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleStudySearch()} className={`w-full py-6 px-10 rounded-[3rem] border text-xl transition-all shadow-2xl ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`} /><button onClick={handleStudySearch} disabled={isExplaining} className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-xl disabled:opacity-50">{isExplaining ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}</button></div>
                {(verseExplanation || isExplaining) && (
                   <div className="space-y-8">
                      {isExplaining && !verseExplanation ? (
                         <div className={`p-16 rounded-[3.5rem] border shadow-2xl ${cardBgClasses} flex flex-col items-center gap-4`}>
                            <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                            <p className="font-black text-[10px] uppercase tracking-[0.3em] opacity-40">Searching Internet via Google...</p>
                         </div>
                      ) : (
                        <>
                          {renderFormattedExplanation(verseExplanation || '')}
                          {verseExplanation && (
                            <div className="flex justify-center gap-4 animate-fadeIn">
                               <button onClick={handleSaveStudy} disabled={isStudySaved} className={`flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all ${isStudySaved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{isStudySaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}<span className="text-xs font-black uppercase tracking-widest">{isStudySaved ? 'সেভ করা আছে' : 'সেভ করুন'}</span></button>
                            </div>
                          )}
                        </>
                      )}
                   </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Chat && (
            <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-220px)] animate-fadeIn">
               <div className={`p-6 border-b flex items-center justify-between rounded-t-[3rem] ${cardBgClasses}`}>
                  <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><Users className="w-6 h-6" /></div><h2 className="font-black text-xl tracking-tight">Public Fellowship</h2></div>
                  <Globe className="w-6 h-6 opacity-30" />
               </div>
               <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${theme === Theme.Dark ? 'bg-slate-900/30' : 'bg-slate-50/50'}`}>
                  {messages.map((msg) => {
                    const isMe = user && msg.senderId === user.email;
                    return (
                      <div key={msg.id} className={`flex items-end gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} page-transition`}>
                         <img src={msg.senderPhoto} className="w-9 h-9 rounded-xl shadow-md" />
                         <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`p-4 rounded-2xl text-sm font-medium shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-br-none' : cardBgClasses + ' rounded-bl-none'}`}>{msg.text}</div>
                         </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
               </div>
               <div className={`p-6 border-t rounded-b-[3rem] ${cardBgClasses}`}>
                  {user ? (
                    <form onSubmit={handleSendMessage} className="relative flex items-center gap-3">
                       <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="কিছু বলুন..." className={`flex-1 py-4 px-6 rounded-2xl border outline-none ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50'}`} />
                       <button type="submit" className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl"><Send className="w-5 h-5" /></button>
                    </form>
                  ) : <div className="text-center py-2"><button onClick={() => setActiveTab(AppTab.Profile)} className="text-indigo-600 font-black text-xs uppercase tracking-widest">লগইন করে চ্যাট শুরু করুন</button></div>}
               </div>
            </div>
          )}

          {activeTab === AppTab.Reflections && (
            <div className="space-y-12">
               <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">Saved Studies</h2>
               {savedStudies.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {savedStudies.map((study) => (
                      <div key={study.id} onClick={() => setSelectedSavedStudy(study)} className={`p-8 rounded-[2.5rem] border shadow-md flex flex-col page-transition cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all ${cardBgClasses}`}>
                        <div className="flex items-center justify-between mb-4"><h3 className={`text-xl font-black tracking-tight ${textTitleClasses}`}>{study.reference}</h3><Calendar className="w-4 h-4 opacity-20" /></div>
                        <div className="flex-1 font-serif text-lg leading-relaxed mb-6 line-clamp-4 opacity-80">{stripMarkers(study.content)}</div>
                        <div className="flex items-center justify-between pt-6 border-t dark:border-slate-700">
                           <button onClick={(e) => { e.stopPropagation(); if(confirm("মুছে ফেলতে চান?")) handleDeleteStudy(study.id); }} className="p-3 text-rose-500 rounded-xl hover:bg-rose-50"><Trash2 className="w-5 h-5" /></button>
                           <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">READ STUDY</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-4 opacity-40">
                    <Bookmark className="w-12 h-12 mx-auto" /><p className="font-bold text-lg">এখনো কোনো স্টাডি সেভ করা হয়নি।</p>
                  </div>
                )}
            </div>
          )}

          {activeTab === AppTab.Profile && (
             <div className="max-w-4xl mx-auto py-12">
                {user ? (
                   <div className="flex flex-col md:flex-row items-center gap-12">
                      <img src={user.photo} className="w-40 h-40 rounded-[3rem] p-1 border-4 border-indigo-600 shadow-2xl" />
                      <div className="text-center md:text-left space-y-4">
                         <h2 className="text-4xl font-black tracking-tight">{user.name}</h2>
                         <p className="opacity-60 font-bold uppercase tracking-widest text-xs">{user.email}</p>
                         <div className="flex flex-wrap gap-4 pt-4">
                            <button onClick={() => setActiveTab(AppTab.Developer)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">DEVELOPER INFO</button>
                            <button onClick={() => { if(confirm("সাইন আউট করতে চান?")) setUser(null); }} className="bg-rose-50 text-rose-600 px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-rose-100">LOGOUT</button>
                         </div>
                      </div>
                   </div>
                ) : (
                  <div className="max-w-md mx-auto py-20 text-center space-y-12">
                    <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto text-white shadow-2xl shadow-indigo-100"><User className="w-10 h-10" /></div>
                    <button onClick={() => setShowLoginModal(true)} className="w-full py-5 bg-white border border-slate-200 rounded-[2rem] font-black text-slate-700 flex items-center justify-center gap-4 shadow-xl hover:shadow-2xl transition-all"><Chrome className="w-6 h-6 text-rose-500" /> CONTINUE WITH GOOGLE</button>
                  </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Developer && (
            <div className="max-w-3xl mx-auto py-10">
               <button onClick={() => setActiveTab(AppTab.Profile)} className="mb-10 flex items-center gap-2 opacity-60 hover:opacity-100 transition-all font-black text-xs uppercase tracking-widest"><ChevronLeft className="w-4 h-4" /> Back to Profile</button>
               <div className={`p-12 rounded-[3.5rem] border shadow-2xl text-center space-y-10 ${cardBgClasses}`}>
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Theotonius" className="w-48 h-48 rounded-[3rem] mx-auto p-1 bg-gradient-to-tr from-indigo-600 to-purple-500 shadow-2xl" />
                  <div className="space-y-4">
                     <h2 className="text-4xl md:text-5xl font-black tracking-tighter">SOBUJ THEOTONIUS BISWAS</h2>
                     <p className="text-lg opacity-60 font-medium">Fullstack Engineer & Spiritual Content Enthusiast</p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-4">
                     <a href="tel:+8801614802711" className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200"><PhoneCall className="w-5 h-5" /> 01614802711</a>
                     <a href="mailto:theotonius2012@gmail.com" className="flex items-center gap-3 px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg"><Mail className="w-5 h-5" /> GMAIL</a>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 py-4 px-6 border-t backdrop-blur-xl ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100'}`}>
        <div className="flex justify-between items-center">
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
