import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Song, Theme } from '../types';
import { Play, Pause, Sparkles, ChevronLeft, Heart, Type as FontIcon, Share2, Check } from 'lucide-react';
import { generateReflection, speakLyrics, decodeBase64Audio, decodeAudioData } from '../services/geminiService';

interface ReaderProps {
  song: Song;
  onBack: void | (() => void);
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
    setReflection(text || "Unable to load reflection.");
    setIsLoadingReflection(false);
  };

  const handleShareSong = async () => {
    const shareText = `Sacred Melodies - ${song.title}\n\n${song.lyrics.join('\n')}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: song.title, text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setIsShared(true);
        setTimeout(() => setIsShared(false), 2000);
      }
    } catch (err) { console.error("Error sharing:", err); }
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
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); sourceNodeRef.current?.stop(); };
  }, []);

  return (
    <div className={`flex flex-col min-h-screen transition-colors duration-500 overflow-x-hidden relative ${themeClasses}`}>
      
      {/* Subtle Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {theme === Theme.Dark && (
          <>
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-500/10 blur-[100px] animate-celestial" />
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/10 blur-[120px] animate-celestial" style={{ animationDelay: '-5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
          </>
        )}
        {theme === Theme.Sepia && (
          <>
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-amber-200/5 to-transparent animate-rays origin-top-right" />
            <div className="absolute top-1/3 -left-10 w-40 h-screen bg-amber-400/5 blur-3xl rotate-12 animate-rays" style={{ animationDelay: '-10s' }} />
          </>
        )}
        {theme === Theme.Light && (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 border-[40px] border-indigo-500/5 rounded-full blur-2xl animate-wave" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 border-[30px] border-indigo-400/5 rounded-full blur-2xl animate-wave" style={{ animationDelay: '-4s' }} />
          </>
        )}
      </div>

      {/* Dynamic Header */}
      <div className={`sticky top-0 z-50 border-b backdrop-blur-xl ${theme === Theme.Dark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-6xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onBack as any} className={`p-3 rounded-2xl transition-all active:scale-90 ${theme === Theme.Dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
               <h1 className="text-sm font-black leading-none">{song.title}</h1>
               <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1">{song.reference}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => onToggleFavorite(song.id)} className={`p-3 rounded-2xl transition-all ${isFavorite ? 'text-rose-500 scale-110 bg-rose-50 dark:bg-rose-900/20' : 'opacity-40 hover:opacity-100'}`}>
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button onClick={handleShareSong} className={`p-3 rounded-2xl transition-all ${theme === Theme.Dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              {isShared ? <Check className="w-6 h-6 text-emerald-500" /> : <Share2 className="w-6 h-6" />}
            </button>
            <button onClick={() => setFontSize(prev => prev >= 48 ? 16 : prev + 4)} className={`p-3 rounded-2xl transition-all ${theme === Theme.Dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
              <FontIcon className="w-6 h-6" />
            </button>
            <button onClick={handlePlayAudio} className={`p-3 rounded-2xl transition-all ${isSpeaking ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' : (theme === Theme.Dark ? 'hover:bg-slate-800' : 'hover:bg-slate-50')}`}>
              {isSpeaking ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isSpeaking && (
          <div className="max-w-6xl mx-auto px-6 pb-2">
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black w-10 opacity-60 tracking-tighter">{formatTime(currentTime)}</span>
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${theme === Theme.Dark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="h-full bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }} />
              </div>
              <span className="text-[10px] font-black w-10 text-right opacity-40 tracking-tighter">{formatTime(duration)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-8 py-12 md:py-20 selection:bg-indigo-100 relative z-10">
        <div className="space-y-10 md:space-y-12">
          {song.lyrics.map((line, idx) => (
            <p 
              key={idx} 
              className={`font-serif leading-relaxed text-center transition-all duration-500 ${line === "" ? "py-6" : ""}`}
              style={{ fontSize: `${fontSize}px`, color: theme === Theme.Dark ? '#f1f5f9' : theme === Theme.Sepia ? '#433422' : '#0f172a' }}
            >
              {line}
            </p>
          ))}
        </div>

        {/* AI Insight Section */}
        <div className="mt-20 max-w-2xl mx-auto relative z-20">
          {!reflection && !isLoadingReflection ? (
            <button onClick={handleGetReflection} className={`w-full py-6 px-8 rounded-3xl border flex items-center justify-center gap-3 transition-all hover:scale-[1.02] hover:shadow-xl font-black text-xs uppercase tracking-widest ${theme === Theme.Dark ? 'bg-indigo-900/20 border-indigo-500/30 text-indigo-400' : 'bg-white border-indigo-100 text-indigo-600 shadow-sm'}`}>
              <Sparkles className="w-5 h-5" /> Generate AI Reflection
            </button>
          ) : (
            <div className={`rounded-[3rem] p-8 md:p-12 shadow-2xl border page-transition ${cardClasses}`}>
              <div className="flex items-center gap-3 mb-6 text-indigo-500">
                <Sparkles className="w-6 h-6" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Spiritual Insight</span>
              </div>
              {isLoadingReflection ? (
                <div className="space-y-4 animate-pulse">
                  <div className={`h-4 rounded-full w-full ${theme === Theme.Dark ? 'bg-slate-700' : 'bg-indigo-50'}`}></div>
                  <div className={`h-4 rounded-full w-5/6 ${theme === Theme.Dark ? 'bg-slate-700' : 'bg-indigo-50'}`}></div>
                  <div className={`h-4 rounded-full w-4/6 ${theme === Theme.Dark ? 'bg-slate-700' : 'bg-indigo-50'}`}></div>
                </div>
              ) : (
                <p className="text-xl md:text-2xl font-serif leading-relaxed italic opacity-80">{reflection}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reader;