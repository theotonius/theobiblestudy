
import React, { useState, useMemo, useEffect } from 'react';
import { BIBLE_SONGS, PRE_CACHED_STUDIES } from './constants';
import { Song, AppTab, UserProfile, SavedStudy, Theme } from './types';
import SongCard from './components/SongCard';
import Reader from './components/Reader';
// Added MessageCircle for WhatsApp/Chat feel if needed later
import { Music, Search, Heart, User, Sparkles, Loader2, BookOpen, LogOut, ShieldCheck, Facebook, Share2, Check, Bookmark, Trash2, ChevronLeft, ChevronRight, CloudOff, X, Moon, Sun, Coffee, Code2, Github, Globe, Linkedin, Mail, ExternalLink, Cpu, Phone, Smartphone, MessageCircle } from 'lucide-react';
import { fetchSongFromAI, composeNewSong, explainVerse } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showOnlyFavoritesInLibrary, setShowOnlyFavoritesInLibrary] = useState(false);
  
  // Login States
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

  const [savedTabMode, setSavedTabMode] = useState<'songs' | 'studies'>('songs');
  
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedUser = localStorage.getItem('sm_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isManualSaved, setIsManualSaved] = useState(false);
  
  const [customSongs, setCustomSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('sm_custom_songs');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies));
  }, [savedStudies]);

  useEffect(() => {
    localStorage.setItem('sm_custom_songs', JSON.stringify(customSongs));
  }, [customSongs]);

  useEffect(() => {
    localStorage.setItem('sm_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('sm_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('sm_user');
    }
  }, [user]);

  const allSongs = useMemo(() => [...BIBLE_SONGS, ...customSongs], [customSongs]);

  const filteredSongs = useMemo(() => {
    let list = allSongs;

    if (activeTab === AppTab.Library) {
      if (activeCategory !== 'All') {
        list = list.filter(s => s.category.toLowerCase() === activeCategory.toLowerCase());
      }
      if (showOnlyFavoritesInLibrary) {
        list = list.filter(s => favorites.includes(s.id));
      }
    }
    
    if (activeTab === AppTab.Reflections && savedTabMode === 'songs') {
      list = list.filter(s => favorites.includes(s.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.reference.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, allSongs, activeTab, favorites, savedTabMode, activeCategory, showOnlyFavoritesInLibrary]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const handleLogin = (provider: string) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      const mockUser: UserProfile = {
        name: provider === 'Facebook' ? "Facebook User" : "Google User",
        email: provider === 'Facebook' ? "user@facebook.com" : "user@gmail.com",
        photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${provider}`
      };
      setUser(mockUser);
      setIsLoggingIn(false);
      setActiveTab(AppTab.Library);
    }, 1500);
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab(AppTab.Library);
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingAI(true);
    const result = await fetchSongFromAI(searchQuery);
    if (result) {
      const newSong: Song = {
        ...result,
        id: `ai-${Date.now()}`,
        image: `https://picsum.photos/seed/${result.title}/800/600`
      };
      setCustomSongs(prev => [newSong, ...prev]);
      setSelectedSong(newSong);
      setActiveTab(AppTab.Reader);
    }
    setIsSearchingAI(false);
  };

  const handleVerseExplain = async () => {
    if (!searchQuery.trim()) return;
    const existing = savedStudies.find(s => s.reference.toLowerCase() === searchQuery.toLowerCase());
    if (existing && !navigator.onLine) {
        setVerseExplanation(existing.content);
        return;
    }
    setIsExplaining(true);
    setVerseExplanation(null);
    setIsManualSaved(false);
    const result = await explainVerse(searchQuery);
    setVerseExplanation(result);
    setIsExplaining(false);
  };

  const handleManualSave = () => {
    if (!verseExplanation) return;
    const newStudy: SavedStudy = {
      id: `study-${Date.now()}`,
      reference: searchQuery || "Bible Verse",
      content: verseExplanation,
      timestamp: Date.now()
    };
    setSavedStudies(prev => {
      const filtered = prev.filter(s => s.reference.toLowerCase() !== searchQuery.toLowerCase());
      return [newStudy, ...filtered];
    });
    setIsManualSaved(true);
    setTimeout(() => setIsManualSaved(false), 2000);
  };

  const deleteSavedStudy = (id: string) => {
    setSavedStudies(prev => prev.filter(s => s.id !== id));
  };

  const handleShareExplanation = async (text?: string) => {
    const contentToShare = text || verseExplanation;
    if (!contentToShare) return;
    const shareText = `Sacred Melodies - Bible Study:\n\n${contentToShare}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Bible Verse Study', text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) { console.error("Error sharing:", err); }
  };

  const themeClasses = useMemo(() => {
    switch (theme) {
      case Theme.Dark: return 'bg-[#0f172a] text-[#f8fafc]';
      case Theme.Sepia: return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-[#fafafa] text-slate-900';
    }
  }, [theme]);

  const headerBgClasses = useMemo(() => {
    switch (theme) {
      case Theme.Dark: return 'from-indigo-900/20';
      case Theme.Sepia: return 'from-orange-200/20';
      default: return 'from-amber-100/30';
    }
  }, [theme]);

  const cardBgClasses = theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3]' : 'bg-white border-slate-100';

  if (selectedSong && activeTab === AppTab.Reader) {
    return (
      <Reader 
        song={selectedSong} 
        onBack={() => setActiveTab(AppTab.Library)} 
        isFavorite={favorites.includes(selectedSong.id)}
        onToggleFavorite={toggleFavorite}
        theme={theme}
      />
    );
  }

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto relative overflow-hidden shadow-2xl transition-colors duration-500 ${themeClasses}`}>
      <div className={`absolute top-0 left-0 w-full h-40 bg-gradient-to-b ${headerBgClasses} to-transparent pointer-events-none`}></div>

      {activeTab !== AppTab.Profile && activeTab !== AppTab.Developer && (
        <header className="px-6 pt-10 pb-4 z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tight leading-none">
                {activeTab === AppTab.Study ? 'Bible Study' : activeTab === AppTab.Reflections ? 'Saved Library' : 'Sacred Melodies'}
              </h1>
              <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${theme === Theme.Dark ? 'text-slate-400' : theme === Theme.Sepia ? 'text-[#8b6d4d]' : 'text-slate-500'}`}>
                {activeTab === AppTab.Study ? 'পদের গভীর ব্যাখ্যা' : activeTab === AppTab.Reflections ? 'আপনার প্রিয় সংগ্রহ' : 'গীতিমালা ও আরাধনা'}
              </p>
            </div>
            <button 
              onClick={() => setActiveTab(AppTab.Profile)}
              className={`w-10 h-10 rounded-2xl shadow-sm border flex items-center justify-center transition-colors overflow-hidden ${cardBgClasses}`}
            >
              {user ? (
                <img src={user.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>
          </div>

          {activeTab !== AppTab.Reflections && (
            <div className="relative group mb-4">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === Theme.Dark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input 
                type="text" 
                placeholder={activeTab === AppTab.Study ? "যেমন: যোহন ৩:১৬" : "Search songs, verses or ask AI..."} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    activeTab === AppTab.Study ? handleVerseExplain() : handleAISearch();
                  }
                }}
                className={`w-full border rounded-2xl py-4 pl-11 pr-24 text-sm focus:outline-none focus:ring-4 transition-all shadow-sm font-medium ${
                    theme === Theme.Dark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:ring-slate-700' 
                    : theme === Theme.Sepia 
                    ? 'bg-[#e9dfc4] border-[#dcd0b3] text-[#433422] focus:ring-orange-100' 
                    : 'bg-white border-slate-200 text-slate-900 focus:ring-amber-50'
                }`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSearchingAI || isExplaining ? (
                   <Loader2 className="w-5 h-5 animate-spin text-amber-600 mr-2" />
                ) : (
                  <button 
                    onClick={activeTab === AppTab.Study ? handleVerseExplain : handleAISearch}
                    className={`${theme === Theme.Dark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-900 hover:bg-slate-800'} text-white p-2 rounded-xl transition-colors shadow-sm`}
                  >
                    {activeTab === AppTab.Study ? <BookOpen className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === AppTab.Library && (
            <div className="flex flex-col gap-3 mb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
                {['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map((cat) => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                      activeCategory === cat
                        ? (theme === Theme.Dark ? 'bg-indigo-900/40 border-indigo-700 text-indigo-300' : theme === Theme.Sepia ? 'bg-[#dcd0b3] border-[#cbbd9a] text-[#5b4636]' : 'bg-amber-100 border-amber-200 text-amber-800')
                        : (theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-slate-500' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3] text-[#8b6d4d]' : 'bg-white text-slate-400 border-slate-100')
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setShowOnlyFavoritesInLibrary(!showOnlyFavoritesInLibrary)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                    showOnlyFavoritesInLibrary 
                      ? 'bg-rose-50 border-rose-100 text-rose-600' 
                      : (theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-slate-500' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3] text-[#8b6d4d]' : 'bg-white border-slate-100 text-slate-400')
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${showOnlyFavoritesInLibrary ? 'fill-current' : ''}`} />
                  Favorites Only
                </button>
                
                {(activeCategory !== 'All' || showOnlyFavoritesInLibrary || searchQuery) && (
                  <button 
                    onClick={() => { setActiveCategory('All'); setShowOnlyFavoritesInLibrary(false); setSearchQuery(''); }}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === AppTab.Reflections && (
            <div className={`flex p-1 rounded-2xl mb-4 ${theme === Theme.Dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button 
                onClick={() => setSavedTabMode('songs')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${savedTabMode === 'songs' ? (theme === Theme.Dark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
              >
                <Music className="w-4 h-4" /> সংরক্ষিত গান
              </button>
              <button 
                onClick={() => setSavedTabMode('studies')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${savedTabMode === 'studies' ? (theme === Theme.Dark ? 'bg-slate-700 text-white' : 'bg-white text-slate-900 shadow-sm') : 'text-slate-500'}`}
              >
                <Bookmark className="w-4 h-4" /> বাইবেল স্টাডি
              </button>
            </div>
          )}
        </header>
      )}

      <main className="flex-1 overflow-y-auto px-6 pb-28">
        {activeTab === AppTab.Profile ? (
          <div className="py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {user ? (
              <div className="space-y-8">
                <div className="text-center">
                  <div className={`w-24 h-24 rounded-3xl p-1 shadow-xl mx-auto mb-4 border ${cardBgClasses}`}>
                    <img src={user.photo} alt="Avatar" className="w-full h-full object-cover rounded-[1.2rem]" />
                  </div>
                  <h2 className="text-2xl font-black">{user.name}</h2>
                  <p className="text-slate-500 font-medium">{user.email}</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-amber-600/70">App Settings</h3>
                  <div className={`p-5 rounded-3xl border ${cardBgClasses}`}>
                     <p className="text-xs font-bold mb-4 uppercase tracking-widest opacity-60">Display Theme</p>
                     <div className="grid grid-cols-3 gap-3">
                        <button 
                          onClick={() => setTheme(Theme.Light)} 
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${theme === Theme.Light ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                          <Sun className="w-5 h-5" />
                          <span className="text-[10px] font-bold">Light</span>
                        </button>
                        <button 
                          onClick={() => setTheme(Theme.Sepia)} 
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${theme === Theme.Sepia ? 'bg-[#e1d5b7] border-[#b4a682] text-[#5b4636]' : 'bg-[#e9dfc4] border-[#dcd0b3] text-[#8b6d4d]'}`}
                        >
                          <Coffee className="w-5 h-5" />
                          <span className="text-[10px] font-bold">Sepia</span>
                        </button>
                        <button 
                          onClick={() => setTheme(Theme.Dark)} 
                          className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${theme === Theme.Dark ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                        >
                          <Moon className="w-5 h-5" />
                          <span className="text-[10px] font-bold">Dark</span>
                        </button>
                     </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-2xl border shadow-sm ${cardBgClasses}`}>
                    <Heart className="w-5 h-5 text-rose-500 mb-2" />
                    <div className="text-2xl font-black">{favorites.length}</div>
                    <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Saved Songs</div>
                  </div>
                  <div className={`p-4 rounded-2xl border shadow-sm ${cardBgClasses}`}>
                    <Bookmark className="w-5 h-5 text-amber-500 mb-2" />
                    <div className="text-2xl font-black">{savedStudies.length}</div>
                    <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Saved Studies</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button onClick={() => setActiveTab(AppTab.Developer)} className={`w-full flex items-center justify-between p-4 rounded-2xl border group ${cardBgClasses}`}>
                    <div className="flex items-center gap-3">
                      <Code2 className="w-5 h-5 text-indigo-500" />
                      <span className="text-sm font-bold">Developer Profile</span>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-30 group-hover:opacity-100 transition-all" />
                  </button>
                  <button className={`w-full flex items-center justify-between p-4 rounded-2xl border group ${cardBgClasses}`}>
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-bold">Account Security</span>
                    </div>
                  </button>
                  <button onClick={handleLogout} className="w-full flex items-center justify-center gap-3 p-4 bg-rose-50 text-rose-600 rounded-2xl font-bold">
                    <LogOut className="w-5 h-5" /> Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ${theme === Theme.Dark ? 'bg-slate-800' : 'bg-amber-50'}`}>
                  <User className={`w-12 h-12 ${theme === Theme.Dark ? 'text-slate-600' : 'text-amber-300'}`} />
                </div>
                <h2 className="text-3xl font-black mb-2 tracking-tight">Join Our Community</h2>
                <p className="opacity-60 font-medium mb-12 px-6 leading-relaxed text-sm">লগইন করুন এবং আপনার পছন্দের গান ও ব্যাখ্যাগুলো সংরক্ষণ করে রাখুন।</p>
                <div className="px-4 space-y-3">
                  <button onClick={() => handleLogin('Google')} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 border transition-all shadow-sm ${cardBgClasses}`}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg> Gmail দিয়ে লগইন করুন
                  </button>
                  <button onClick={() => handleLogin('Facebook')} className="w-full bg-[#1877F2] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-md">
                    <Facebook className="w-5 h-5 fill-current" /> Facebook দিয়ে লগইন করুন
                  </button>
                  <button onClick={() => setActiveTab(AppTab.Developer)} className={`w-full mt-8 py-4 px-6 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold transition-all border ${cardBgClasses} opacity-60 hover:opacity-100`}>
                    <Code2 className="w-4 h-4" /> About the Developer
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === AppTab.Developer ? (
          <div className="py-10 animate-in fade-in slide-in-from-right-4 duration-500">
            <button onClick={() => setActiveTab(AppTab.Profile)} className="flex items-center gap-2 mb-8 opacity-60 hover:opacity-100 transition-all">
               <ChevronLeft className="w-5 h-5" />
               <span className="text-xs font-bold uppercase tracking-widest">Back to Profile</span>
            </button>

            <div className={`p-8 rounded-[2.5rem] border shadow-2xl relative overflow-hidden ${cardBgClasses}`}>
               <div className="absolute top-0 right-0 p-8 opacity-[0.05]">
                  <Code2 className="w-32 h-32" />
               </div>

               <div className="relative z-10">
                  <div className="relative mb-6">
                    <div className={`w-28 h-28 rounded-3xl p-1 shadow-2xl border-4 ${theme === Theme.Dark ? 'border-indigo-500/30' : 'border-white'}`}>
                       <img 
                         src="https://media.licdn.com/dms/image/v2/C5103AQG8_249BvL81w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1574512403714?e=1746662400&v=beta&t=90Gz0p-C3p-kPIdmK940L638G5XqIeXvYIq40Uq4-uU" 
                         alt="SOBUJ THEOTONIUS BISWAS" 
                         className="w-full h-full object-cover rounded-[1.4rem]" 
                       />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center border-4 border-slate-900 shadow-lg">
                       <Cpu className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-black mb-1 leading-tight">SOBUJ THEOTONIUS BISWAS</h2>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-6">Fullstack AI Engineer</p>
                  
                  <p className="text-sm leading-relaxed opacity-70 mb-8 font-medium italic">
                    "Creating tools that bridge the gap between faith and technology. Sacred Melodies is a labor of love, designed to bring peace and spiritual growth through music and understanding."
                  </p>

                  <div className="space-y-4">
                     <div className={`p-4 rounded-2xl border flex items-center gap-4 ${theme === Theme.Dark ? 'bg-slate-700/30 border-slate-600' : 'bg-indigo-50/50 border-indigo-100'}`}>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0">
                           <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                           <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40">Direct Contact</h3>
                           <p className="text-sm font-bold tracking-tight">+8801614802711</p>
                        </div>
                     </div>

                     <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3">Connect</h3>
                        <div className="grid grid-cols-4 gap-4">
                           <button className={`p-3 rounded-2xl border flex items-center justify-center transition-all hover:scale-110 ${cardBgClasses}`}><Github className="w-5 h-5" /></button>
                           <button className={`p-3 rounded-2xl border flex items-center justify-center transition-all hover:scale-110 ${cardBgClasses}`}><Globe className="w-5 h-5 text-blue-500" /></button>
                           <button className={`p-3 rounded-2xl border flex items-center justify-center transition-all hover:scale-110 ${cardBgClasses}`}><Linkedin className="w-5 h-5 text-indigo-600" /></button>
                           <button className={`p-3 rounded-2xl border flex items-center justify-center transition-all hover:scale-110 ${cardBgClasses}`}><Mail className="w-5 h-5 text-rose-500" /></button>
                        </div>
                     </div>

                     <button className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 mt-2">
                        <Coffee className="w-5 h-5" /> Buy Me a Coffee
                     </button>
                  </div>
               </div>
            </div>

            <div className="mt-8 text-center opacity-40">
               <p className="text-[10px] font-bold uppercase tracking-widest">Version 2.5.0 • Build 2025</p>
            </div>
          </div>
        ) : activeTab === AppTab.Study ? (
          <div className="mt-4 space-y-6 pb-10">
            {!verseExplanation && !isExplaining && (
              <div className={`text-center py-10 rounded-3xl border p-8 shadow-sm ${cardBgClasses}`}>
                <BookOpen className={`w-12 h-12 mx-auto mb-4 ${theme === Theme.Dark ? 'text-slate-600' : 'text-amber-200'}`} />
                <h3 className="text-lg font-bold mb-2">বাইবেল স্টাডি</h3>
                <p className="text-sm opacity-60 leading-relaxed mb-6">বাইবেলের যেকোনো পদের নাম উপরে লিখুন এবং অফলাইনে পড়ার জন্য সেভ করে রাখুন।</p>
                <div className={`text-left p-4 rounded-2xl ${theme === Theme.Dark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mb-2">Suggested (Offline Pack):</p>
                    <div className="flex flex-wrap gap-2">
                        {PRE_CACHED_STUDIES.map(pre => (
                            <button key={pre.id} onClick={() => { setSearchQuery(pre.reference); handleVerseExplain(); }} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${cardBgClasses} hover:border-amber-300`}>{pre.reference}</button>
                        ))}
                    </div>
                </div>
              </div>
            )}
            {isExplaining && (
              <div className="flex flex-col items-center py-20 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <p className="opacity-40 font-medium animate-pulse">ব্যাখ্যা তৈরি হচ্ছে...</p>
              </div>
            )}
            {verseExplanation && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`rounded-3xl p-6 shadow-sm border relative group ${cardBgClasses}`}>
                  <div className="font-serif leading-relaxed whitespace-pre-wrap selection:bg-amber-100">{verseExplanation}</div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleManualSave} className={`py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${theme === Theme.Dark ? 'bg-indigo-900/20 text-indigo-400 border-indigo-900/40' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                    {isManualSaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                    {isManualSaved ? "সেভ হয়েছে" : "সেভ করুন"}
                  </button>
                  <button onClick={() => handleShareExplanation()} className="bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-200/10">
                    {isCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
                    {isCopied ? "কপি হয়েছে" : "শেয়ার করুন"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === AppTab.Reflections ? (
          <div className="mt-4 pb-10">
            {savedTabMode === 'songs' ? (
              <div className="grid grid-cols-1 gap-5">
                {filteredSongs.length > 0 ? filteredSongs.map(song => <SongCard key={song.id} song={song} theme={theme} onClick={() => { setSelectedSong(song); setActiveTab(AppTab.Reader); }} />) : (
                  <div className="text-center py-20">
                    <Music className="w-12 h-12 opacity-20 mx-auto mb-4" />
                    <p className="opacity-40 font-medium">আপনার প্রিয় কোনো গান এখনো সেভ করা হয়নি।</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {savedStudies.length > 0 ? savedStudies.map(study => (
                  <div key={study.id} className={`rounded-2xl p-5 border shadow-sm transition-all ${cardBgClasses}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                         <h4 className="font-black text-lg">{study.reference}</h4>
                         <span className="bg-emerald-500/10 text-emerald-500 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">Offline</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleShareExplanation(study.content)} className="p-2 opacity-40 hover:opacity-100 transition-opacity"><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteSavedStudy(study.id)} className="p-2 opacity-40 hover:text-rose-500 hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <p className="opacity-70 text-sm line-clamp-3 font-serif mb-4">{study.content}</p>
                    <button onClick={() => { setVerseExplanation(study.content); setSearchQuery(study.reference); setActiveTab(AppTab.Study); }} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:gap-2 transition-all">সম্পূর্ণ পড়ুন <ChevronRight className="w-3 h-3" /></button>
                  </div>
                )) : (
                  <div className="text-center py-20">
                    <CloudOff className="w-12 h-12 opacity-20 mx-auto mb-4" />
                    <p className="opacity-40 font-medium">আপনার সেভ করা স্টাডি এখানে দেখা যাবে।</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 mt-4">
            {filteredSongs.length > 0 ? (
              filteredSongs.map(song => <SongCard key={song.id} song={song} theme={theme} onClick={() => { setSelectedSong(song); setActiveTab(AppTab.Reader); }} />)
            ) : (
              <div className="text-center py-20">
                <Search className="w-8 h-8 opacity-20 mx-auto mb-4" />
                <p className="opacity-40 font-medium">কিছু পাওয়া যায়নি।</p>
                <button onClick={() => { setActiveCategory('All'); setShowOnlyFavoritesInLibrary(false); setSearchQuery(''); }} className="mt-4 text-xs font-bold text-amber-600">রিসেট করুন</button>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className={`fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t py-4 px-8 flex justify-between items-center z-30 shadow-2xl backdrop-blur-xl ${theme === Theme.Dark ? 'bg-slate-900/90 border-slate-800' : theme === Theme.Sepia ? 'bg-[#f4ecd8]/90 border-[#dcd0b3]' : 'bg-white/95 border-slate-100'}`}>
        <NavButton active={activeTab === AppTab.Library} onClick={() => { setActiveTab(AppTab.Library); }} icon={<Music className="w-5 h-5" />} label="Explore" theme={theme} />
        <NavButton active={activeTab === AppTab.Study} onClick={() => { setActiveTab(AppTab.Study); }} icon={<BookOpen className="w-5 h-5" />} label="Study" theme={theme} />
        <NavButton active={activeTab === AppTab.Reflections} onClick={() => { setActiveTab(AppTab.Reflections); }} icon={<Heart className="w-5 h-5" />} label="Saved" theme={theme} />
        <NavButton active={activeTab === AppTab.Profile || activeTab === AppTab.Developer} onClick={() => { setActiveTab(AppTab.Profile); }} icon={<User className="w-5 h-5" />} label="Profile" theme={theme} />
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; theme: Theme }> = ({ active, onClick, icon, label, theme }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-40 hover:opacity-70'}`}>
    <div className={`p-1.5 rounded-xl transition-colors ${active ? (theme === Theme.Dark ? 'bg-indigo-900/40 text-indigo-400' : theme === Theme.Sepia ? 'bg-[#dcd0b3] text-[#5b4636]' : 'bg-amber-50 text-amber-600') : (theme === Theme.Dark ? 'text-slate-500' : 'text-slate-300')}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? '' : ''}`}>{label}</span>
  </button>
);

export default App;
