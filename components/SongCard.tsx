
import React from 'react';
import { Song, Theme } from '../types';

interface SongCardProps {
  song: Song;
  theme: Theme;
  onClick: (song: Song) => void;
}

const SongCard: React.FC<SongCardProps> = ({ song, theme, onClick }) => {
  const cardBgClasses = theme === Theme.Dark ? 'bg-slate-800 border-slate-700' : theme === Theme.Sepia ? 'bg-[#e9dfc4] border-[#dcd0b3]' : 'bg-white border-slate-100';
  const titleClasses = theme === Theme.Dark ? 'text-white' : theme === Theme.Sepia ? 'text-[#433422]' : 'text-slate-900';
  const subClasses = theme === Theme.Dark ? 'text-slate-400' : theme === Theme.Sepia ? 'text-[#8b6d4d]' : 'text-slate-500';

  return (
    <div 
      onClick={() => onClick(song)}
      className={`group relative rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 cursor-pointer border ${cardBgClasses} hover:-translate-y-2 active:scale-[0.98]`}
    >
      <div className="aspect-[16/10] w-full overflow-hidden relative">
        <img 
          src={song.image} 
          alt={song.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div className="p-7">
        <span className={`text-[10px] uppercase tracking-[0.2em] font-black px-3 py-1 rounded-full ${
            theme === Theme.Dark ? 'bg-indigo-900/30 text-indigo-400' : theme === Theme.Sepia ? 'bg-[#dcd0b3] text-[#5b4636]' : 'bg-indigo-50 text-indigo-600'
        }`}>
          {song.category}
        </span>
        <h3 className={`mt-4 text-xl font-black leading-tight tracking-tight ${titleClasses}`}>
          {song.title}
        </h3>
        <p className={`text-xs mt-2 italic font-medium opacity-60 ${subClasses}`}>{song.reference}</p>
      </div>
    </div>
  );
};

export default SongCard;
