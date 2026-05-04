import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Send, Heart, User } from 'lucide-react';
import { toast } from 'react-hot-toast';

const COLORS = [
  'bg-[#fff9c4]', // Yellowish
  'bg-[#e1f5fe]', // Light Blue
  'bg-[#fce4ec]', // Pinkish
  'bg-[#f1f8e9]', // Light Green
  'bg-[#fff3e0]', // Light Orange
];

const TheWall = () => {
  const { user, userData } = useAuth();
  const [thoughts, setThoughts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newThought, setNewThought] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'wall_thoughts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setThoughts(docs);
    }, (error) => {
      console.error("Snapshot error:", error);
      if (error.code === 'permission-denied') {
        toast.error('Access denied. Please check Firestore Rules.');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newThought.trim() || !user?.uid) {
      toast.error('You must be logged in to post');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'wall_thoughts'), {
        text: newThought,
        authorId: user.uid,
        authorEmail: user.email,
        authorName: userData?.fullName || 'Anonymous',
        authorPhoto: userData?.profileImageUrl || null,
        isAnonymous: isAnonymous,
        createdAt: serverTimestamp(),
        colorIndex: Math.floor(Math.random() * COLORS.length),
        likes: 0
      });
      setNewThought('');
      setIsAnonymous(false);
      setShowModal(false);
      toast.success('Thought added to the wall!');
    } catch (error) {
      console.error("Error adding thought:", error);
      if (error.code === 'permission-denied') {
        toast.error('Permission denied. Add "wall_thoughts" to Firestore rules.');
      } else {
        toast.error('Failed to add thought. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#151d2e] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8 overflow-hidden relative">
      {/* Noise Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-16 text-center max-w-2xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 text-white rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-white/20">
             <Heart size={12} fill="currentColor" /> Final Goodbyes
          </div>
          <h1 className="text-6xl sm:text-7xl premium-title tracking-tight mb-4 text-white">Message Wall of Reflection</h1>
          <p className="text-lg text-white/60 font-light leading-relaxed">
            A space to leave your final words, memories, and wishes. These notes will remain here as a testament to our journey.
          </p>
        </header>

        {/* The Wall Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {thoughts.map((thought, idx) => (
            <motion.div
              key={thought.id}
              initial={{ opacity: 0, y: 20, rotate: (Math.random() - 0.5) * 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`sticky-note p-8 pt-10 shadow-lg min-h-[200px] flex flex-col justify-between ${COLORS[thought.colorIndex || 0]} rounded-sm`}
              style={{ rotate: `${(Math.random() - 0.5) * 4}deg` }}
            >
              <div className="glue-tape" />
              <p className="handwritten text-xl leading-relaxed mb-8 text-black">
                "{thought.text}"
              </p>
              
              <div className="flex items-center justify-between mt-auto border-t border-black/5 pt-4">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full overflow-hidden bg-black/10 flex items-center justify-center">
                    {!thought.isAnonymous && thought.authorPhoto ? (
                      <img src={thought.authorPhoto} alt="" className="size-full object-cover" />
                    ) : (
                      <User size={14} className="opacity-40" />
                    )}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60 text-black/60">
                    {thought.isAnonymous ? 'Anonymous' : thought.authorName}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {thoughts.length === 0 && (
          <div className="text-center py-40 opacity-20">
            <p className="text-2xl italic font-serif text-white">The wall is empty. Be the first to leave a message.</p>
          </div>
        )}
      </div>

      {/* Floating Plus Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowModal(true)}
        className="fixed bottom-10 right-10 size-16 bg-black text-white dark:bg-white dark:text-black rounded-full shadow-2xl flex items-center justify-center z-50 border-4 border-white dark:border-black"
      >
        <Plus size={32} />
      </motion.button>

      {/* Add Thought Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-xl overflow-hidden shadow-2xl relative z-10 border border-black/10 dark:border-white/10"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-2xl premium-title">Write your thought</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <textarea
                  autoFocus
                  placeholder="Share a memory, a goodbye, or a wish..."
                  className="w-full h-40 bg-black/5 dark:bg-white/5 rounded-xl p-4 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-all handwritten text-xl text-black dark:text-white"
                  value={newThought}
                  onChange={(e) => setNewThought(e.target.value)}
                  maxLength={280}
                />
                
                <div className="mt-6 flex items-center justify-between">
                  <button 
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className="flex items-center gap-2 group transition-all"
                  >
                    <div className={`size-5 rounded border-2 transition-all flex items-center justify-center ${isAnonymous ? 'bg-black border-black dark:bg-white dark:border-white' : 'border-black/20 dark:border-white/20'}`}>
                      {isAnonymous && <div className="size-2 bg-white dark:bg-black rounded-full" />}
                    </div>
                    <span className="text-sm font-bold opacity-60 group-hover:opacity-100">Post Anonymously</span>
                  </button>

                  <div className="flex items-center gap-4">
                    <span className="text-xs opacity-40 font-bold">{newThought.length}/280</span>
                    <button
                      disabled={!newThought.trim() || isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting ? 'Posting...' : 'Post to Wall'}
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TheWall;
