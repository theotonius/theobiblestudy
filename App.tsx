
import React, { useState, useMemo, useEffect } from 'react';
import { BIBLE_SONGS, PRE_CACHED_STUDIES } from './constants';
import { Song, AppTab, UserProfile, SavedStudy, Theme } from './types';
import SongCard from './components/SongCard';
import Reader from './components/Reader';
import { 
  Music, Search, Heart, User, Sparkles, Loader2, BookOpen, LogOut, 
  ShieldCheck, Facebook, Share2, Check, Bookmark, Trash2, 
  ChevronLeft, ChevronRight, CloudOff, X, Moon, Sun, Coffee, 
  Code2, Github, Globe, Linkedin, Mail, Smartphone, Award, Laptop, Wand2, AlertCircle
} from 'lucide-react';
import { fetchSongFromAI, explainVerse } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [isSearchingAI, setIsSearchingAI] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [verseExplanation, setVerseExplanation] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies));
    localStorage.setItem('sm_theme', theme);
    document.documentElement.className = theme;
  }, [favorites, savedStudies, theme]);

  const allSongs = useMemo(() => BIBLE_SONGS, []);

  const filteredSongs = useMemo(() => {
    let list = allSongs;
    if (activeCategory !== 'All') {
      list = list.filter(s => s.category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.title.toLowerCase().includes(q) || 
        s.reference.toLowerCase().includes(q)
      );
    }
    return list;
  }, [searchQuery, allSongs, activeCategory]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    
    // API Key চেক
    if (!process.env.API_KEY && !(process.env as any).GEMINI_API_KEY) {
      setSearchError("API Key পাওয়া যায়নি। Vercel Settings-এ API_KEY সেট করুন।");
      return;
    }

    setIsSearchingAI(true);
    setSearchError(null);
    try {
      const result = await fetchSongFromAI(searchQuery);
      if (result && result.title && result.lyrics) {
        const newSong: Song = { 
          ...result, 
          id: `ai-${Date.now()}`, 
          image: `https://picsum.photos/seed/${encodeURIComponent(result.title)}/800/600` 
        };
        setSelectedSong(newSong);
        setActiveTab(AppTab.Reader);
        setSearchQuery(''); // সার্চ সফল হলে টেক্সট ক্লিয়ার করুন
      } else {
        setSearchError("দুঃখিত, এই গানটি খুঁজে পাওয়া যায়নি। অন্য কিছু লিখে চেষ্টা করুন।");
      }
    } catch (error) {
      console.error("AI Search Failed:", error);
      setSearchError("সার্ভার সমস্যা। দয়া করে আপনার ইন্টারনেট এবং API Key চেক করুন।");
    } finally {
      setIsSearchingAI(false);
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
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${themeClasses}`}>
      
      {/* Desktop Navigation Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 h-16 border-b backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Music className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tighter hidden sm:block">Sacred Melodies</h1>
           </div>

           {/* Desktop Only Tabs */}
           <nav className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              <button onClick={() => setActiveTab(AppTab.Library)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === AppTab.Library ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-50'}`}>LIBRARY</button>
              <button onClick={() => setActiveTab(AppTab.Study)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === AppTab.Study ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-50'}`}>STUDY</button>
              <button onClick={() => setActiveTab(AppTab.Reflections)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === AppTab.Reflections ? 'bg-white dark:bg-slate-700 shadow-sm' : 'opacity-50'}`}>SAVED</button>
           </nav>
           
           <div className="flex items-center gap-3">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${cardBgClasses}`}>
                {theme === Theme.Dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-10 h-10 rounded-full border overflow-hidden p-0.5 hover:ring-4 transition-all ${cardBgClasses} ${theme === Theme.Dark ? 'ring-slate-700' : 'ring-indigo-50'}`}>
                 {user ? <img src={user.photo} alt="User" className="w-full h-full object-cover rounded-full" /> : <User className="w-5 h-5 m-auto opacity-30" />}
              </button>
           </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="page-transition">
          {activeTab === AppTab.Library && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="max-w-xl text-center md:text-left">
                  <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4 leading-none">Holy Melodies</h2>
                  <p className="text-lg opacity-60 font-medium leading-relaxed">সঙ্গীতের মাধ্যমে ঈশ্বরের আরাধনা এবং আত্মিক শান্তি খুঁজুন।</p>
                </div>
                
                <div className="w-full md:w-auto flex flex-wrap justify-center gap-2">
                  {['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200 scale-105' : cardBgClasses + ' opacity-60 hover:opacity-100'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* SEARCH BAR SECTION */}
              <div className="space-y-3 max-w-2xl mx-auto md:mx-0">
                <div className="relative flex items-center group">
                   <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                     {isSearchingAI ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <Search className="w-5 h-5 opacity-30 group-focus-within:opacity-100 transition-opacity" />}
                   </div>
                   <input 
                      type="text" 
                      placeholder="Search songs or ask AI for any hymn..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (searchError) setSearchError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                      className={`w-full py-5 pl-14 pr-32 rounded-[2rem] border text-lg focus:ring-8 transition-all shadow-sm ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white focus:ring-indigo-900/20' : 'bg-white border-slate-200 focus:ring-indigo-50'}`}
                   />
                   <button 
                      onClick={handleAISearch}
                      disabled={isSearchingAI || !searchQuery.trim()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-black flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-200"
                   >
                      {isSearchingAI ? "FINDING..." : <><Wand2 className="w-4 h-4" /> AI SEARCH</>}
                   </button>
                </div>
                {searchError && (
                  <div className="flex items-center gap-2 px-6 text-rose-500 text-sm font-medium animate-bounce">
                    <AlertCircle className="w-4 h-4" />
                    {searchError}
                  </div>
                )}
              </div>

              {/* Grid System for Multi-Device */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {filteredSongs.map(song => (
                   <SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />
                ))}
                {filteredSongs.length === 0 && !isSearchingAI && (
                  <div className="col-span-full py-20 text-center space-y-4 opacity-40">
                    <CloudOff className="w-16 h-16 mx-auto" />
                    <p className="text-xl font-bold">No songs found locally.</p>
                    <p className="text-sm">Try 'AI SEARCH' to find any Bible song online!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-4xl mx-auto space-y-12 py-10">
                <div className="text-center space-y-6">
                   <div className="w-24 h-24 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200 transition-transform hover:rotate-6">
                      <BookOpen className="w-12 h-12" />
                   </div>
                   <div className="space-y-2">
                     <h2 className="text-4xl md:text-5xl font-black tracking-tight">Bible Discovery</h2>
                     <p className="opacity-60 text-lg md:text-xl font-medium">যেকোনো পদের ব্যাখ্যা জানতে নিচের বক্সে সার্চ করুন।</p>
                   </div>
                </div>
                
                <div className="relative group max-w-2xl mx-auto">
                   <input 
                      type="text" 
                      placeholder="যেমন: যোহন ৩:১৬..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (async () => {
                        setIsExplaining(true);
                        const res = await explainVerse(searchQuery);
                        setVerseExplanation(res);
                        setIsExplaining(false);
                      })()}
                      className={`w-full py-6 px-10 rounded-[3rem] border text-xl focus:ring-8 transition-all shadow-2xl ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white focus:ring-indigo-900/30' : 'bg-white border-slate-200 focus:ring-indigo-50'}`}
                   />
                   <button 
                      onClick={async () => {
                        setIsExplaining(true);
                        const res = await explainVerse(searchQuery);
                        setVerseExplanation(res);
                        setIsExplaining(false);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-xl hover:scale-105 transition-all"
                   >
                      {isExplaining ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                   </button>
                </div>

                {verseExplanation && (
                   <div className={`p-8 md:p-14 rounded-[3.5rem] border shadow-2xl font-serif leading-relaxed text-xl md:text-2xl page-transition ${cardBgClasses}`}>
                      <div className="whitespace-pre-wrap">
                        {verseExplanation}
                      </div>
                   </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Reflections && (
             <div className="space-y-12">
                <div className="text-center md:text-left">
                  <h2 className="text-5xl font-black tracking-tighter mb-4 leading-none">Your Library</h2>
                  <p className="text-lg opacity-60 font-medium">আপনার প্রিয় গান এবং স্টাডি নোটগুলি এখানে সংরক্ষিত আছে।</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {favorites.length > 0 ? (
                      allSongs.filter(s => favorites.includes(s.id)).map(song => (
                        <div key={song.id} className="flex gap-6 items-center p-6 rounded-[2.5rem] border hover:shadow-xl transition-all group bg-white dark:bg-slate-800">
                           <div className="w-24 h-24 rounded-3xl overflow-hidden shrink-0">
                              <img src={song.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                           </div>
                           <div className="flex-1">
                              <h3 className="text-xl font-black">{song.title}</h3>
                              <p className="opacity-50 italic text-sm">{song.reference}</p>
                              <button onClick={() => {setSelectedSong(song); setActiveTab(AppTab.Reader);}} className="mt-3 text-indigo-500 font-bold text-xs uppercase tracking-widest flex items-center gap-1">Read Now <ChevronRight className="w-4 h-4" /></button>
                           </div>
                           <button onClick={() => toggleFavorite(song.id)} className="p-3 bg-rose-50 text-rose-500 rounded-2xl"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      ))
                   ) : (
                      <div className="col-span-full py-20 text-center opacity-30">
                         <CloudOff className="w-16 h-16 mx-auto mb-4" />
                         <p className="text-xl font-bold">No saved items found.</p>
                      </div>
                   )}
                </div>
             </div>
          )}

          {activeTab === AppTab.Profile && (
             <div className="max-w-4xl mx-auto py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                   {/* Profile Header */}
                   <div className="text-center md:text-left space-y-8">
                      <div className="relative inline-block md:block">
                        <div className="w-40 h-40 rounded-[3.5rem] p-1.5 border-4 border-indigo-600 shadow-2xl overflow-hidden mx-auto md:mx-0">
                           <img src={user?.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'} alt="Avatar" className="w-full h-full object-cover rounded-[3rem]" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 md:right-1/4 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-[#fafafa] dark:border-slate-900 shadow-lg">
                           <ShieldCheck className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <h2 className="text-4xl font-black tracking-tight">{user?.name || 'Guest Explorer'}</h2>
                        <p className="opacity-50 font-bold uppercase tracking-[0.2em] text-xs mt-3">{user?.email || 'Login to sync your data'}</p>
                      </div>
                   </div>

                   {/* Quick Stats & Actions */}
                   <div className="md:col-span-2 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                         <div className={`p-8 rounded-[3rem] border shadow-sm flex flex-col items-center justify-center gap-2 ${cardBgClasses}`}>
                            <Heart className="w-8 h-8 text-rose-500 mb-2" />
                            <p className="text-4xl font-black">{favorites.length}</p>
                            <p className="text-xs font-black opacity-30 uppercase tracking-widest">Favorite Songs</p>
                         </div>
                         <div className={`p-8 rounded-[3rem] border shadow-sm flex flex-col items-center justify-center gap-2 ${cardBgClasses}`}>
                            <Bookmark className="w-8 h-8 text-amber-500 mb-2" />
                            <p className="text-4xl font-black">{savedStudies.length}</p>
                            <p className="text-xs font-black opacity-30 uppercase tracking-widest">Insights</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         <button onClick={() => setActiveTab(AppTab.Developer)} className={`w-full p-8 rounded-[3rem] border font-bold flex items-center justify-between group transition-all hover:scale-[1.01] hover:shadow-xl ${cardBgClasses}`}>
                            <span className="flex items-center gap-5 text-lg font-black"><Code2 className="w-8 h-8 text-indigo-500" /> Developer Profile</span>
                            <ChevronRight className="w-6 h-6 opacity-30 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                         </button>
                         <button className="w-full p-8 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-[3rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-rose-100 transition-all">
                            <LogOut className="w-6 h-6" /> Sign Out from Account
                         </button>
                      </div>
                   </div>
                </div>
             </div>
          )}

          {activeTab === AppTab.Developer && (
            <div className="max-w-2xl mx-auto py-12">
               <button onClick={() => setActiveTab(AppTab.Profile)} className="flex items-center gap-2 mb-10 font-black text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                 <ChevronLeft className="w-5 h-5" /> Back to Account
               </button>
               <div className={`p-10 md:p-16 rounded-[4rem] border shadow-2xl relative overflow-hidden transition-all hover:shadow-indigo-100/20 ${cardBgClasses}`}>
                  <div className="relative z-10 flex flex-col items-center">
                     <div className="relative mb-10">
                        <div className="w-64 h-64 rounded-[4.5rem] p-1.5 border-4 border-indigo-600 shadow-2xl overflow-hidden">
                           <img src="https://media.licdn.com/dms/image/v2/C4D03AQH4u2X5M9E83w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1654512403714?e=1746662400&v=beta&t=90Gz0p-C3p-kPIdmK940L638G5XqIeXvYIq40Uq4-uU" className="w-full h-full object-cover rounded-[4rem]" alt="Developer" />
                        </div>
                        <Award className="absolute -bottom-4 -right-4 w-20 h-20 text-white bg-indigo-600 p-5 rounded-[2rem] border-4 border-slate-900 shadow-2xl" />
                     </div>
                     <h2 className="text-4xl font-black tracking-tighter uppercase mb-2 text-center">SOBUJ THEOTONIUS BISWAS</h2>
                     <p className="text-indigo-500 font-black tracking-[0.5em] uppercase text-xs mb-10">Fullstack AI Engineer</p>
                     
                     <div className="w-full space-y-6">
                        <div className="flex items-center justify-between p-8 bg-indigo-600 text-white rounded-[3rem] shadow-2xl shadow-indigo-200">
                           <div className="flex items-center gap-5">
                              <div className="p-4 bg-white/20 rounded-2xl"><Smartphone className="w-8 h-8" /></div>
                              <div className="text-left">
                                 <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1">Direct Connect</p>
                                 <p className="text-2xl font-black tracking-tighter">+8801614802711</p>
                              </div>
                           </div>
                           <a href="tel:+8801614802711" className="p-5 bg-white text-indigo-600 rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg"><Smartphone className="w-6 h-6" /></a>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                           <button className={`p-6 rounded-[2rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses}`}><Github className="w-7 h-7" /></button>
                           <button className={`p-6 rounded-[2rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses} text-blue-500`}><Globe className="w-7 h-7" /></button>
                           <button className={`p-6 rounded-[2rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses} text-indigo-600`}><Linkedin className="w-7 h-7" /></button>
                           <button className={`p-6 rounded-[2rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses} text-rose-500`}><Mail className="w-7 h-7" /></button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation for Mobile and Tablet */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 py-4 px-6 border-t backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]'}`}>
        <div className="max-w-lg mx-auto flex justify-between items-center">
           <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" />
           <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" />
           <NavButton active={activeTab === AppTab.Reflections} onClick={() => setActiveTab(AppTab.Reflections)} icon={<Heart />} label="Saved" />
           <NavButton active={activeTab === AppTab.Profile || activeTab === AppTab.Developer} onClick={() => setActiveTab(AppTab.Profile)} icon={<User />} label="Account" />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactElement<any>; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-40 hover:opacity-70'}`}>
     <div className={`p-3 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : ''}`}>
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
     </div>
     <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
