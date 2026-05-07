import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RefreshCw, Check } from 'lucide-react';
import { getFunkyAvatar } from '../constants';

const AVATAR_STYLES = [
  { id: 'big-smile', name: 'Funky' },
  { id: 'notionists', name: 'Hand-drawn' },
  { id: 'adventurer', name: 'Adventure' },
  { id: 'lorelei', name: 'Premium' },
  { id: 'fun-emoji', name: 'Emoji' },
  { id: 'avataaars', name: 'Human' }
];

const BASE_SEEDS = [
  'Felix', 'Aneka', 'Mia', 'Jack', 'Oliver', 
  'Maya', 'Luna', 'Leo', 'Aria', 'Zoe',
  'Milo', 'Jasper', 'Nova', 'Silas', 'Willow',
  'Finn', 'Hazel', 'Ezra', 'Jade', 'Arlo',
  'Ruby', 'Oscar', 'Iris', 'Hugo', 'Ivy',
  'Nico', 'Clara', 'Enzo', 'Lyra', 'Theo'
];

const AvatarSelectorModal = ({ isOpen, onClose, onSelect, currentAvatarUrl, genderDefault = 'all' }) => {
  const [gender, setGender] = React.useState(genderDefault === 'other' ? 'all' : genderDefault);
  const [activeStyle, setActiveStyle] = React.useState('big-smile');
  const [extraSeeds, setExtraSeeds] = React.useState([]);
  
  const allSeeds = React.useMemo(() => [...BASE_SEEDS, ...extraSeeds], [extraSeeds]);

  const shuffleSeeds = () => {
    const newSeeds = Array.from({ length: 12 }, () => Math.random().toString(36).substring(7));
    setExtraSeeds(prev => [...newSeeds, ...prev].slice(0, 60)); // Keep up to 60 total extra
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-xl"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#121212] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-black/5 dark:border-white/5"
        >
          <div className="p-6 border-b border-black/5 dark:border-white/5 bg-[#fdfdfb] dark:bg-[#121212] sticky top-0 z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Avatar Library</h2>
                <p className="text-xs opacity-40 uppercase tracking-widest mt-1">Explore all characters</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {/* Style Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setActiveStyle(style.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeStyle === style.id 
                        ? 'bg-[#ffb03a] text-black shadow-lg shadow-[#ffb03a]/20' 
                        : 'bg-black/5 dark:bg-white/5 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                {/* Gender Tabs */}
                <div className="flex gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-xl w-fit">
                  {['all', 'male', 'female'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                        gender === g 
                          ? 'bg-white dark:bg-white/10 shadow-sm' 
                          : 'opacity-30 hover:opacity-100'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={shuffleSeeds}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#ffb03a]/10 text-[#ffb03a] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ffb03a]/20 transition-all"
                >
                  <RefreshCw size={12} />
                  Shuffle Avatars
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {allSeeds.map((seed) => {
                const url = getFunkyAvatar(seed, gender, activeStyle);
                const isSelected = currentAvatarUrl === url;
                
                return (
                  <motion.button
                    key={seed}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onSelect(url);
                      onClose();
                    }}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-4 transition-all ${
                      isSelected 
                        ? 'border-[#ffb03a] bg-[#ffb03a]/5 shadow-xl shadow-[#ffb03a]/20' 
                        : 'border-transparent bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <img src={url} alt={seed} className="size-full object-cover" />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-[#ffb03a] text-black rounded-full p-1 shadow-lg">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-t border-black/5 dark:border-white/5 bg-[#fdfdfb] dark:bg-[#121212] text-center">
            <p className="text-xs opacity-40 italic">
              Avatars powered by DiceBear big-smile
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AvatarSelectorModal;
