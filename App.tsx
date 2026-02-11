
import React, { useState, useMemo, useEffect } from 'react';
import { BIBLE_SONGS, PRE_CACHED_STUDIES } from './constants';
import { Song, AppTab, UserProfile, SavedStudy, Theme } from './types';
import SongCard from './components/SongCard';
import Reader from './components/Reader';
// Fix: Added missing 'Github' import from lucide-react
import { Music, Search, Heart, User, Sparkles, Loader2, BookOpen, LogOut, ShieldCheck, Facebook, Share2, Check, Bookmark, Trash2, ChevronLeft, ChevronRight, CloudOff, X, Moon, Sun, Coffee, Code2, Globe, Linkedin, Mail, Smartphone, Shield, Award, Github } from 'lucide-react';
import { fetchSongFromAI, explainVerse } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Library);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [showOnlyFavoritesInLibrary, setShowOnlyFavoritesInLibrary] = useState(false);
  
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

  useEffect(() => {
    localStorage.setItem('sm_favorites', JSON.stringify(favorites));
    localStorage.setItem('sm_saved_studies', JSON.stringify(savedStudies));
    localStorage.setItem('sm_theme', theme);
  }, [favorites, savedStudies, theme]);

  const allSongs = useMemo(() => BIBLE_SONGS, []);

  const filteredSongs = useMemo(() => {
    let list = allSongs;
    if (activeCategory !== 'All') {
      list = list.filter(s => s.category.toLowerCase() === activeCategory.toLowerCase());
    }
    if (showOnlyFavoritesInLibrary) {
      list = list.filter(s => favorites.includes(s.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => s.title.toLowerCase().includes(q) || s.reference.toLowerCase().includes(q));
    }
    return list;
  }, [searchQuery, allSongs, favorites, activeCategory, showOnlyFavoritesInLibrary]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]);
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingAI(true);
    const result = await fetchSongFromAI(searchQuery);
    if (result) {
      const newSong: Song = { ...result, id: `ai-${Date.now()}`, image: `https://picsum.photos/seed/${result.title}/800/600` };
      setSelectedSong(newSong);
      setActiveTab(AppTab.Reader);
    }
    setIsSearchingAI(false);
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
    <div className={`min-h-screen transition-colors duration-500 ${themeClasses}`}>
      {/* Header with Container */}
      <div className={`fixed top-0 left-0 right-0 z-40 border-b backdrop-blur-md ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Music className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-black tracking-tighter hidden sm:block">Sacred Melodies</h1>
           </div>
           
           <div className="flex items-center gap-4">
              <button onClick={() => setTheme(theme === Theme.Dark ? Theme.Light : Theme.Dark)} className={`p-2.5 rounded-xl border transition-all ${cardBgClasses}`}>
                {theme === Theme.Dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button onClick={() => setActiveTab(AppTab.Profile)} className={`w-10 h-10 rounded-full border overflow-hidden ${cardBgClasses}`}>
                 {user ? <img src={user.photo} alt="User" /> : <User className="w-5 h-5 m-auto opacity-30" />}
              </button>
           </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="page-transition">
          {activeTab === AppTab.Library && (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div className="max-w-xl">
                  <h2 className="text-5xl font-black tracking-tighter mb-4">Explore Hymns</h2>
                  <p className="text-lg opacity-60 font-medium">সঙ্গীতের মাধ্যমে ঈশ্বরের আরাধনা এবং আত্মিক শান্তি খুঁজুন।</p>
                </div>
                
                <div className="w-full md:w-auto flex flex-wrap gap-2">
                  {['All', 'Hymn', 'Worship', 'Kids', 'Praise'].map((cat) => (
                    <button 
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border ${activeCategory === cat ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : cardBgClasses + ' opacity-60 hover:opacity-100'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative max-w-2xl">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                 <input 
                    type="text" 
                    placeholder="Search titles or ask AI to find a song..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAISearch()}
                    className={`w-full py-5 pl-14 pr-6 rounded-[2rem] border text-lg focus:ring-4 transition-all shadow-sm ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white focus:ring-slate-700' : 'bg-white border-slate-200 focus:ring-indigo-50'}`}
                 />
                 {isSearchingAI && <Loader2 className="absolute right-6 top-1/2 -translate-y-1/2 w-6 h-6 animate-spin text-indigo-500" />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredSongs.map(song => (
                   <SongCard key={song.id} song={song} theme={theme} onClick={setSelectedSong} />
                ))}
              </div>
            </div>
          )}

          {activeTab === AppTab.Study && (
             <div className="max-w-3xl mx-auto space-y-12 py-10">
                <div className="text-center space-y-4">
                   <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-amber-100/50">
                      <BookOpen className="w-10 h-10" />
                   </div>
                   <h2 className="text-4xl font-black tracking-tight">Bible Insight</h2>
                   <p className="opacity-60 text-lg">যেকোনো পদের ব্যাখ্যা জানতে নিচের বক্সে সার্চ করুন।</p>
                </div>
                
                <div className="relative group">
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
                      className={`w-full py-6 px-8 rounded-[2.5rem] border text-xl focus:ring-8 transition-all shadow-2xl ${theme === Theme.Dark ? 'bg-slate-800 border-slate-700 text-white focus:ring-slate-700/50' : 'bg-white border-slate-200 focus:ring-amber-50'}`}
                   />
                   <button className="absolute right-4 top-1/2 -translate-y-1/2 p-5 bg-indigo-600 text-white rounded-full shadow-xl hover:scale-105 transition-all">
                      {isExplaining ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
                   </button>
                </div>

                {verseExplanation && (
                   <div className={`p-10 rounded-[3rem] border shadow-2xl font-serif leading-relaxed text-xl page-transition ${cardBgClasses}`}>
                      <div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap">
                        {verseExplanation}
                      </div>
                   </div>
                )}
             </div>
          )}

          {activeTab === AppTab.Profile && (
             <div className="max-w-md mx-auto py-12">
                <div className="space-y-10 text-center">
                   <div className="relative inline-block">
                      <div className="w-36 h-36 rounded-[3rem] p-1.5 border-4 border-indigo-600 shadow-2xl overflow-hidden">
                         <img src={user?.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest'} alt="Avatar" className="w-full h-full object-cover rounded-[2.5rem]" />
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center border-4 border-[#fdfbf7] shadow-lg">
                         <ShieldCheck className="w-6 h-6 text-white" />
                      </div>
                   </div>
                   
                   <div>
                      <h2 className="text-3xl font-black">{user?.name || 'Guest User'}</h2>
                      <p className="opacity-50 font-bold uppercase tracking-widest text-xs mt-2">{user?.email || 'Login to save your journey'}</p>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className={`p-6 rounded-[2rem] border ${cardBgClasses}`}>
                         <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
                         <p className="text-2xl font-black">{favorites.length}</p>
                         <p className="text-[10px] font-bold opacity-40 uppercase">Saved Songs</p>
                      </div>
                      <div className={`p-6 rounded-[2rem] border ${cardBgClasses}`}>
                         <Bookmark className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                         <p className="text-2xl font-black">{savedStudies.length}</p>
                         <p className="text-[10px] font-bold opacity-40 uppercase">Bible Studies</p>
                      </div>
                   </div>

                   <button onClick={() => setActiveTab(AppTab.Developer)} className={`w-full p-6 rounded-[2rem] border font-bold flex items-center justify-between group transition-all hover:scale-[1.02] ${cardBgClasses}`}>
                      <span className="flex items-center gap-4"><Code2 className="w-6 h-6 text-indigo-500" /> Developer Profile</span>
                      <ChevronRight className="w-6 h-6 opacity-30 group-hover:opacity-100" />
                   </button>
                   
                   <button className="w-full p-6 bg-rose-50 text-rose-600 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-rose-100 transition-all">
                      <LogOut className="w-5 h-5" /> Sign Out
                   </button>
                </div>
             </div>
          )}

          {activeTab === AppTab.Developer && (
            <div className="max-w-2xl mx-auto py-12">
               <button onClick={() => setActiveTab(AppTab.Profile)} className="flex items-center gap-2 mb-10 font-black text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                 <ChevronLeft className="w-5 h-5" /> Back to Account
               </button>
               <div className={`p-12 rounded-[4rem] border shadow-2xl relative overflow-hidden transition-all hover:shadow-indigo-100/20 ${cardBgClasses}`}>
                  <div className="relative z-10 flex flex-col items-center">
                     <div className="relative mb-10">
                        <div className="w-56 h-56 rounded-[4rem] p-1.5 border-4 border-indigo-600 shadow-2xl overflow-hidden">
                           <img src="https://media.licdn.com/dms/image/v2/C4D03AQH4u2X5M9E83w/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1654512403714?e=1746662400&v=beta&t=90Gz0p-C3p-kPIdmK940L638G5XqIeXvYIq40Uq4-uU" className="w-full h-full object-cover rounded-[3.5rem]" alt="Developer" />
                        </div>
                        <Award className="absolute -bottom-4 -right-4 w-16 h-16 text-white bg-indigo-600 p-4 rounded-[1.5rem] border-4 border-slate-900 shadow-2xl" />
                     </div>
                     <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">SOBUJ THEOTONIUS BISWAS</h2>
                     <p className="text-indigo-500 font-black tracking-[0.4em] uppercase text-xs mb-8">Fullstack AI Engineer</p>
                     
                     <div className="w-full space-y-5">
                        <div className="flex items-center justify-between p-7 bg-indigo-600 text-white rounded-[2.5rem] shadow-2xl shadow-indigo-200">
                           <div className="flex items-center gap-5">
                              <div className="p-3 bg-white/20 rounded-2xl"><Smartphone className="w-7 h-7" /></div>
                              <div className="text-left">
                                 <p className="text-[10px] font-black opacity-60 uppercase tracking-widest">Connect Directly</p>
                                 <p className="text-xl font-black">+8801614802711</p>
                              </div>
                           </div>
                           <a href="tel:+8801614802711" className="p-4 bg-white text-indigo-600 rounded-full hover:scale-110 transition-all shadow-lg"><Smartphone className="w-6 h-6" /></a>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4">
                           <button className={`p-5 rounded-[1.5rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses}`}><Github className="w-6 h-6" /></button>
                           <button className={`p-5 rounded-[1.5rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses} text-blue-500`}><Globe className="w-6 h-6" /></button>
                           <button className={`p-5 rounded-[1.5rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses} text-indigo-600`}><Linkedin className="w-6 h-6" /></button>
                           <button className={`p-5 rounded-[1.5rem] border flex items-center justify-center transition-all hover:scale-110 hover:shadow-xl ${cardBgClasses} text-rose-500`}><Mail className="w-6 h-6" /></button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation for Mobile and Tablet */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 py-4 px-6 border-t backdrop-blur-xl transition-all ${theme === Theme.Dark ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]'}`}>
        <div className="max-w-lg mx-auto flex justify-between items-center">
           <NavButton active={activeTab === AppTab.Library} onClick={() => setActiveTab(AppTab.Library)} icon={<Music />} label="Library" />
           <NavButton active={activeTab === AppTab.Study} onClick={() => setActiveTab(AppTab.Study)} icon={<BookOpen />} label="Study" />
           <NavButton active={activeTab === AppTab.Profile || activeTab === AppTab.Developer} onClick={() => setActiveTab(AppTab.Profile)} icon={<User />} label="Account" />
        </div>
      </nav>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactElement<any>; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'scale-110' : 'opacity-40 hover:opacity-70'}`}>
     <div className={`p-3.5 rounded-2xl transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : ''}`}>
        {React.cloneElement(icon, { className: 'w-6 h-6' })}
     </div>
     <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
