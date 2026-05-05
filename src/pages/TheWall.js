import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Send, Heart, User, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const COLORS = [
  'bg-[#fff9c4]', // Yellowish
  'bg-[#e1f5fe]', // Light Blue
  'bg-[#fce4ec]', // Pinkish
  'bg-[#f1f8e9]', // Light Green
  'bg-[#fff3e0]', // Light Orange
];

const TheWall = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const [thoughts, setThoughts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newThought, setNewThought] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [hasAnonymousPost, setHasAnonymousPost] = useState(false);

  useEffect(() => {
    if (!userData) return;
    
    const q = query(
      collection(db, 'wall_thoughts')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter by role: 
      // - Faculty only see faculty thoughts
      // - Students see student thoughts AND legacy thoughts (no authorRole)
      const filteredDocs = allDocs.filter(t => {
        if (userData.role === 'faculty') {
          return t.authorRole === 'faculty';
        } else {
          // Student role (default)
          return t.authorRole === 'student' || !t.authorRole;
        }
      });

      // Sort client-side to avoid index requirement
      const sortedDocs = filteredDocs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setThoughts(sortedDocs);
      
      // Check if current user has an anonymous post
      if (user?.uid) {
        setHasAnonymousPost(sortedDocs.some(t => t.authorId === user.uid && t.isAnonymous));
      }
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

    if (!editingId && isAnonymous && hasAnonymousPost) {
      toast.error("You've already posted anonymously once.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'wall_thoughts', editingId), {
          text: newThought,
          isAnonymous: isAnonymous,
          isEdited: true,
          updatedAt: serverTimestamp()
        });
        toast.success('Post updated!');
      } else {
        await addDoc(collection(db, 'wall_thoughts'), {
          text: newThought,
          authorId: user.uid,
          authorName: isAnonymous ? 'Anonymous' : (userData?.fullName || 'Anonymous'),
          authorRole: userData?.role || 'student',
          authorBatch: userData?.batchStart || 'N/A',
          authorPhoto: userData?.profileImageUrl || null,
          isAnonymous: isAnonymous,
          createdAt: serverTimestamp(),
          likes: [],
          colorIndex: Math.floor(Math.random() * COLORS.length)
        });
        toast.success('Your thought is on the wall!');
      }
      
      setNewThought('');
      setIsAnonymous(false);
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving thought:", error);
      toast.error('Failed to save thought');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (thought) => {
    setEditingId(thought.id);
    setNewThought(thought.text);
    setIsAnonymous(thought.isAnonymous);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this thought?')) {
      try {
        await deleteDoc(doc(db, 'wall_thoughts', id));
        toast.success('Deleted successfully');
      } catch (error) {
        toast.error('Failed to delete');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#e5e5e5] dark:bg-[#121212] grainy transition-colors duration-500 pt-20 sm:pt-24 md:pt-28 pb-20 px-4 sm:px-6 md:px-8 relative">
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-16 text-center max-w-2xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 border border-orange-500/20">
             <Heart size={12} fill="currentColor" /> Final Goodbyes
          </div>
          <h1 className="text-6xl sm:text-7xl premium-title tracking-tight mb-4">Message Wall of Reflection</h1>
          <p className="text-lg opacity-60 font-light leading-relaxed">
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
              className={`sticky-note group p-8 pt-10 shadow-lg min-h-[200px] flex flex-col justify-between ${COLORS[thought.colorIndex || 0]} rounded-sm relative overflow-hidden`}
              style={{ rotate: `${(Math.random() - 0.5) * 4}deg` }}
            >
              <div className="glue-tape" />

              {/* Edited Tag */}
              {thought.isEdited && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/5 rounded-full text-[8px] font-bold uppercase tracking-widest opacity-40">
                  Edited
                </div>
              )}

              {/* Action Buttons */}
              {user?.uid === thought.authorId && (
                <div className="absolute top-10 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <button 
                    onClick={() => handleEdit(thought)}
                    className="p-2 bg-black/5 hover:bg-black/10 rounded-full transform hover:scale-110 transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} className="text-black/60" />
                  </button>
                  <button 
                    onClick={() => handleDelete(thought.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full transform hover:scale-110 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-red-500/60" />
                  </button>
                </div>
              )}

              <p className="handwritten text-xl leading-relaxed mb-8 text-black">
                "{thought.text}"
              </p>
              
              <div className="flex items-center justify-between mt-auto border-t border-black/5 pt-4">
                <div 
                  className={`flex items-center gap-2 ${!thought.isAnonymous ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => !thought.isAnonymous && navigate(`/profile/${thought.authorId}`)}
                >
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
            <p className="text-2xl italic font-serif">The wall is empty. Be the first to leave a message.</p>
          </div>
        )}
      </div>

      {/* Floating Plus Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setEditingId(null);
          setNewThought('');
          setIsAnonymous(false);
          setShowModal(true);
        }}
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
                <h3 className="text-2xl premium-title">
                  {editingId ? 'Edit your thought' : 'Write your thought'}
                </h3>
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
                {!editingId && (
                  <div className={`mt-4 p-3 rounded-xl flex items-start gap-3 transition-all ${isAnonymous ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-black/5 dark:bg-white/5 opacity-40'}`}>
                    <AlertCircle size={16} className={isAnonymous ? 'text-orange-500 mt-0.5' : 'mt-0.5'} />
                    <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                      {hasAnonymousPost 
                        ? "You've already used your one-time anonymous post." 
                        : "Note: You can only post anonymously ONCE. Choose your words wisely."}
                    </p>
                  </div>
                )}
                
                <div className="mt-6 flex items-center justify-between">
                   {!editingId ? (
                    <div 
                      onClick={() => !hasAnonymousPost && setIsAnonymous(!isAnonymous)}
                      className={`flex items-center gap-3 cursor-pointer group ${hasAnonymousPost ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <div className={`w-10 h-5 rounded-full relative transition-all ${isAnonymous ? 'bg-orange-500' : 'bg-black/20 dark:bg-white/20'}`}>
                        <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${isAnonymous ? 'left-6' : 'left-1'}`} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest opacity-60">
                        {isAnonymous ? 'Anonymous ON' : 'Anonymous OFF'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-40">
                      {isAnonymous ? 'Editing Anonymous Post' : 'Editing Public Post'}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <span className="text-xs opacity-40 font-bold">{newThought.length}/280</span>
                    <button
                      disabled={!newThought.trim() || isSubmitting}
                      className="btn-primary"
                    >
                      {isSubmitting ? 'Saving...' : (editingId ? 'Update Thought' : 'Post to Wall')}
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
