
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Song, Theme } from '../types';
import { Play, Pause, Sparkles, ChevronLeft, Heart, Type as FontIcon, Share2, Check, Volume2 } from 'lucide-react';
import { generateReflection, speakLyrics, decodeBase64Audio, decodeAudioData } from '../services/geminiService';

interface ReaderProps {
  song: Song;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  theme: Theme;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Reader: React.FC<ReaderProps> = ({ song, onBack, isFavorite, onToggleFavorite, theme }) => {
  const [reflection, setReflection] = useState<string | null>(null);
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [fontSize, setFontSize] = useState<number>(24);
  const [isShared, setIsShared] = useState(false);
  
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  const themeClasses = useMemo(() => {
    switch (theme) {
      case Theme.Dark: return 'bg-[#0f172a] text-[#f8fafc]';
      case Theme.Sepia: return 'bg-[#f4ecd8] text-[#5b4636]';
      default: return 'bg-[#fafafa] text-slate-900';
    }
  }, [theme]);

  const cardClasses = theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3]' : 'bg-white border-indigo-50';

  const handleGetReflection = async () => {
    setIsLoadingReflection(true);
    const text = await generateReflection(song.title, song.lyrics);
    setReflection(text || "ব্যাখ্যা লোড করা সম্ভব হয়নি।");
    setIsLoadingReflection(false);
  };

  const handleShareSong = async () => {
    const shareText = `🎶 Sacred Melodies 🎶\n\n📖 ${song.title} (${song.reference})\n\n${song.lyrics.join('\n')}\n\nShared via Sacred Melodies App`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: song.title,
          text: shareText,
          url: window.location.protocol.startsWith('http') ? window.location.href : undefined
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      }
    } catch (err) {
      console.error("Share failed:", err);
      try {
        await navigator.clipboard.writeText(shareText);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      } catch (clipErr) {
        console.error("Clipboard fallback failed:", clipErr);
      }
    }
  };

  const stopAudio = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    sourceNodeRef.current?.stop();
    setIsSpeaking(false);
    setCurrentTime(0);
  };

  const updateProgress = () => {
    if (!audioContextRef.current || !isSpeaking) return;
    const elapsed = audioContextRef.current.currentTime - startTimeRef.current;
    setCurrentTime(Math.min(elapsed, duration));
    if (elapsed < duration) animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  const handlePlayAudio = async () => {
    if (isSpeaking) { stopAudio(); return; }
    setIsSpeaking(true);
    const base64 = await speakLyrics(song.lyrics.join(' '));
    if (!base64) { setIsSpeaking(false); return; }
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioData = decodeBase64Audio(base64);
    const audioBuffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
    setDuration(audioBuffer.duration);
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    source.onended = () => { setIsSpeaking(false); setCurrentTime(0); };
    startTimeRef.current = audioContextRef.current.currentTime;
    source.start();
    sourceNodeRef.current = source;
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  };

  useEffect(() => {
    return () => { 
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); 
      sourceNodeRef.current?.stop(); 
    };
  }, []);

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-500 overflow-hidden relative ${themeClasses}`}>
      
      {/* Dynamic Atmospheric Backgrounds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {theme === Theme.Dark && (
          <div className="absolute inset-0">
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-500/10 blur-[100px] animate-celestial" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 blur-[120px] animate-celestial" style={{ animationDelay: '-5s' }} />
            {/* Stars with twinkling */}
            {[...Array(40)].map((_, i) => (
              <div 
                key={i} 
                className="absolute w-1 h-1 bg-white rounded-full animate-twinkle" 
                style={{ 
                  top: `${Math.random() * 100}%`, 
                  left: `${Math.random() * 100}%`, 
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${2 + Math.random() * 4}s`
                }} 
              />
            ))}
          </div>
        )}
        
        {theme === Theme.Sepia && (
          <div className="absolute inset-0 opacity-40 mix-blend-multiply pointer-events-none overflow-hidden">
            <div 
              className="absolute inset-[-10%] animate-parchment"
              style={{
                backgroundImage: `radial-gradient(circle at 50% 50%, rgba(139, 109, 77, 0.08) 0%, transparent 100%), 
                                  url("https://www.transparenttextures.com/patterns/handmade-paper.png")`,
                backgroundSize: '300px 300px'
              }}
            />
            {/* Additional texture layer */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/parchment.png')] animate-pulse" />
          </div>
        )}

        {theme === Theme.Light && (
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden">
            {/* Slow moving waves */}
            <svg className="absolute bottom-[-10%] left-0 w-[200%] h-full animate-wave" viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path fill="#6366f1" d="M0,192L48,176C96,160,192,128,288,112C384,96,480,96,576,128C672,160,768,224,864,229.3C960,235,1056,181,1152,144C1248,107,1344,85,1392,74.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
            <svg className="absolute bottom-[-5%] left-[-50%] w-[200%] h-full animate-wave" style={{ animationDelay: '-12s', opacity: 0.6 }} viewBox="0 0 1440 320" preserveAspectRatio="none">
              <path fill="#818cf8" d="M0,64L48,80C96,96,192,128,288,122.7C384,117,480,75,576,85.3C672,96,768,160,864,165.3C960,171,1056,117,1152,112C1248,107,1344,149,1392,170.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
            </svg>
          </div>
        )}
      </div>

      <header className="relative z-10 px-6 h-16 md:h-24 flex items-center justify-between">
        <button onClick={onBack} className="p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"><ChevronLeft className="w-6 h-6" /></button>
        <div className="flex items-center gap-2">
          <button onClick={() => setFontSize(prev => Math.max(16, prev - 2))} className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"><FontIcon className="w-4 h-4 opacity-50" /></button>
          <span className="text-[10px] font-black w-8 text-center opacity-40">{fontSize}</span>
          <button onClick={() => setFontSize(prev => Math.min(48, prev + 2))} className="p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all"><FontIcon className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleShareSong} className={`p-3 rounded-2xl transition-all ${isShared ? 'bg-emerald-500 text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}>{isShared ? <Check className="w-6 h-6" /> : <Share2 className="w-6 h-6" />}</button>
          <button onClick={() => onToggleFavorite(song.id)} className={`p-3 rounded-2xl transition-all ${isFavorite ? 'text-rose-500 bg-rose-500/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}><Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} /></button>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-6 md:px-12 pb-32">
        <div className="max-w-3xl mx-auto space-y-12 py-8">
          <div className="text-center space-y-4">
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full border ${theme === Theme.Dark ? 'border-indigo-500/30 text-indigo-400' : 'border-indigo-100 text-indigo-600'}`}>{song.category}</span>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none">{song.title}</h1>
            <p className="opacity-40 italic font-medium">{song.reference}</p>
          </div>

          <article style={{ fontSize: `${fontSize}px` }} className="font-serif leading-relaxed text-center space-y-2 max-w-2xl mx-auto md:px-8">
            {song.lyrics.map((line, i) => (
              <p key={i} className={line === "" ? "h-6" : "animate-fadeIn"} style={{ animationDelay: `${i * 0.05}s` }}>{line}</p>
            ))}
          </article>

          <div className="pt-12">
            {!reflection && !isLoadingReflection ? (
               <button onClick={handleGetReflection} className={`w-full group p-8 rounded-[3rem] border border-dashed transition-all hover:border-solid hover:scale-[1.01] hover:shadow-2xl flex flex-col items-center gap-4 ${cardClasses}`}>
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:rotate-12 transition-transform"><Sparkles className="w-7 h-7" /></div>
                  <div className="text-center">
                    <h3 className="text-lg font-black tracking-tight">AI Reflection</h3>
                    <p className="text-xs opacity-50 font-medium mt-1">এই গানের একটি গভীর ব্যাখ্যা ও প্রার্থনা দেখুন।</p>
                  </div>
               </button>
            ) : (
              <div className={`p-8 md:p-12 rounded-[3.5rem] border shadow-2xl space-y-6 page-transition ${cardClasses}`}>
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Gemini Insights</span>
                </div>
                <div className={`text-xl md:text-2xl font-serif leading-relaxed italic ${isLoadingReflection ? 'animate-pulse' : ''}`}>
                  {isLoadingReflection ? 'ব্যাখ্যা তৈরি হচ্ছে...' : reflection}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className={`fixed bottom-0 left-0 right-0 z-50 p-6 transition-all ${themeClasses} border-t border-black/5`}>
        <div className="max-w-2xl mx-auto bg-indigo-600 rounded-[2.5rem] p-4 flex items-center gap-6 shadow-2xl shadow-indigo-500/40 border border-white/10 ring-8 ring-white/5">
           <button onClick={handlePlayAudio} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl hover:scale-110 active:scale-95 transition-all">
             {isSpeaking ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
           </button>
           
           <div className="flex-1 space-y-2">
              <div className="h-1.5 bg-indigo-800 rounded-full overflow-hidden relative">
                 <div className="absolute inset-y-0 left-0 bg-white transition-all duration-300" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>
              <div className="flex justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                 <span>{formatTime(currentTime)}</span>
                 <span className="flex items-center gap-1"><Volume2 className="w-3 h-3" /> {isSpeaking ? 'Playing Grace' : 'Audio Guide'}</span>
                 <span>{formatTime(duration)}</span>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default Reader;
