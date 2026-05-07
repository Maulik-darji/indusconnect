import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Send, Heart, User, Pencil, Trash2, AlertCircle, Image as ImageIcon, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Footer from '../components/Footer';
import { storage, db } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, deleteDoc, getDocs, getDocsFromServer } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { getFunkyAvatar } from '../constants';

const COLORS = [
  'bg-[#fff59d]', // Yellow 200
  'bg-[#b3e5fc]', // Light Blue 100/200
  'bg-[#f8bbd0]', // Pink 100/200
  'bg-[#dcedc8]', // Light Green 100/200
  'bg-[#ffe0b2]', // Light Orange 100/200
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
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasAnonymousPost, setHasAnonymousPost] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const userDataRef = React.useRef(userData);
  const userRef = React.useRef(user);

  useEffect(() => {
    userDataRef.current = userData;
    userRef.current = user;
  }, [userData, user]);

  useEffect(() => {
    const q = query(collection(db, 'wall_thoughts'));
    
    const handleSnapshot = (snapshot) => {
      const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const currentUserData = userDataRef.current;
      const currentUser = userRef.current;
      
      let filteredDocs = [];
      if (!currentUserData) {
        filteredDocs = allDocs;
      } else {
        filteredDocs = allDocs.filter(t => {
          if (currentUserData?.role === 'faculty') {
            return t.authorRole === 'faculty';
          } else {
            return t.authorRole === 'student' || !t.authorRole;
          }
        });
      }

      const sortedDocs = filteredDocs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      
      setThoughts(sortedDocs);
      if (currentUser?.uid) {
        setHasAnonymousPost(sortedDocs.some(t => t.authorId === currentUser.uid && t.isAnonymous));
      }
    };

    if (!user) {
      // One-time fetch for guests
      getDocsFromServer(q).then(handleSnapshot).catch(err => console.error("Guest wall fetch error:", err));
      return;
    } else {
      // Real-time for logged in users
      const unsubscribe = onSnapshot(q, handleSnapshot, (error) => {
        console.error("Wall snapshot error:", error);
      });
      return () => {
        setTimeout(() => unsubscribe(), 0);
      };
    }
  }, [user?.uid]);

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
    let imageUrls = [];

    try {
      // If we are keeping existing previews that are URLs
      const existingUrls = previews.filter(p => p.startsWith('http'));
      
      // Upload new files
      let newUrls = [];
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const uploadPromises = selectedFiles.map(async (file) => {
          const fileName = `${Date.now()}_${file.name}`;
          const storageRef = ref(storage, `wall_thoughts/${user.uid}/${fileName}`);
          const uploadTask = await uploadBytesResumable(storageRef, file);
          return getDownloadURL(uploadTask.ref);
        });
        newUrls = await Promise.all(uploadPromises);
      }

      imageUrls = [...existingUrls, ...newUrls].slice(0, 5);

      if (editingId) {
        await updateDoc(doc(db, 'wall_thoughts', editingId), {
          text: newThought,
          isAnonymous: isAnonymous,
          authorName: isAnonymous ? 'Anonymous' : (userData?.fullName || 'Anonymous'),
          imageUrls: imageUrls,
          isEdited: true,
          updatedAt: serverTimestamp()
        });
        toast.success('Post updated!');
      } else {
        await addDoc(collection(db, 'wall_thoughts'), {
          text: newThought,
          authorId: user.uid,
          authorName: isAnonymous ? 'Anonymous' : (userData?.fullName || 'Anonymous'),
          realAuthorName: userData?.fullName || 'Anonymous',
          authorEmail: user.email,
          authorRole: userData?.role || 'student',
          authorBatch: userData?.batchStart || userData?.year || 'N/A',
          authorCourse: userData?.course || userData?.branch || userData?.primaryBranch || userData?.department || 'N/A',
          authorPhoto: userData?.profileImageUrl || null,
          isAnonymous: isAnonymous,
          imageUrls: imageUrls,
          createdAt: serverTimestamp(),
          likes: [],
          colorIndex: Math.floor(Math.random() * COLORS.length)
        });
        toast.success('Your thought is on the wall!');
      }
      
      setNewThought('');
      setIsAnonymous(false);
      setSelectedFiles([]);
      setPreviews([]);
      setShowModal(false);
      setEditingId(null);
    } catch (error) {
      console.error("Error saving thought:", error);
      toast.error('Failed to save thought');
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + previews.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePreview = (index) => {
    const previewToRemove = previews[index];
    setPreviews(prev => prev.filter((_, i) => i !== index));
    
    if (previewToRemove.startsWith('blob:')) {
      // Find which selected file matches this blob URL (order might be tricky but we can manage)
      // Actually, a simpler way is to filter both by index
      // But we don't know which index in selectedFiles maps to which in previews if we have existing URLs
      // Let's just reset selectedFiles and re-build from remaining blob previews
      // Or better: keep them in a unified array of objects {file: File, url: string}
    }
    
    // Simpler way: just filter selectedFiles by finding the one that matches if it was a file
    // But we'll just filter both and it should be fine if we manage them carefully
    setSelectedFiles(prev => prev.filter((_, i) => {
       // Only filter if it was a new file
       const blobPreviewsCountBefore = previews.slice(0, index).filter(p => p.startsWith('blob:')).length;
       const isBlob = previewToRemove.startsWith('blob:');
       if (isBlob) {
          return i !== blobPreviewsCountBefore;
       }
       return true;
    }));
  };

  const handleEdit = (thought) => {
    setEditingId(thought.id);
    setNewThought(thought.text || '');
    setIsAnonymous(thought.isAnonymous || false);
    setPreviews(thought.imageUrls || (thought.imageUrl ? [thought.imageUrl] : []));
    setSelectedFiles([]);
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setDeletingId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteDoc(doc(db, 'wall_thoughts', deletingId));
      toast.success('Deleted successfully');
      setShowDeleteModal(false);
      setDeletingId(null);
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="dark">
      <div className="min-h-screen flex flex-col bg-[#222222] text-white transition-colors duration-500 grainy">
      <div className="pt-20 sm:pt-24 md:pt-28 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto flex-1 w-full relative z-10">
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
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8">
          {thoughts.map((thought, idx) => (
            <motion.div
              key={thought.id}
              initial={{ opacity: 0, y: 20, rotate: (Math.random() - 0.5) * 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05, rotate: 0, zIndex: 30 }}
              transition={{ delay: idx * 0.05, scale: { duration: 0.2 } }}
              className={`sticky-note group p-8 pt-10 shadow-lg min-h-[160px] flex flex-col justify-between ${COLORS[thought.colorIndex || 0]} rounded-sm relative overflow-hidden break-inside-avoid mb-8`}
              style={{ rotate: `${(Math.random() - 0.5) * 4}deg` }}
            >
              <div className="glue-tape" />

              {/* Edited Tag */}
              {thought.isEdited && (
                <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/15 rounded-full text-[8px] font-bold uppercase tracking-widest opacity-60">
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
                    onClick={() => handleDeleteClick(thought.id)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full transform hover:scale-110 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={14} className="text-red-500/60" />
                  </button>
                </div>
              )}

              <p className="handwritten text-xl leading-relaxed mb-6 text-black">
                "{thought.text}"
              </p>

              <div className="flex flex-wrap justify-center items-start gap-1 mt-4 px-2">
                {(thought.imageUrls || (thought.imageUrl ? [thought.imageUrl] : [])).map((url, i) => (
                  <div 
                    key={i}
                    className="sticky-image-container"
                    style={{ 
                      width: (thought.imageUrls?.length || 1) > 1 ? '42%' : '65%',
                      transform: `rotate(${(i % 2 === 0 ? -1 : 1) * (i + 1) * 3}deg) translateY(${i % 3 === 0 ? '5px' : '-5px'})`,
                      zIndex: 5 + i,
                      margin: '0.25rem'
                    }}
                  >
                    <div className="drawing-pin" />
                    <img src={url} alt="" className="sticky-image" />
                  </div>
                ))}
              </div>
              
              <div className="flex items-center justify-between mt-auto border-t border-black/5 pt-4">
                <div 
                  className={`flex items-center gap-2 ${!thought.isAnonymous ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => !thought.isAnonymous && navigate(`/profile/${thought.authorId}`)}
                >
                  <div className="size-8 rounded-full overflow-hidden bg-black/10 flex items-center justify-center border border-black/5">
                    {!thought.isAnonymous && (thought.authorId === user?.uid ? userData?.profileImageUrl : thought.authorPhoto) ? (
                      <img src={thought.authorId === user?.uid ? userData?.profileImageUrl : thought.authorPhoto} alt="" className="size-full object-cover" />
                    ) : (
                      <img src={getFunkyAvatar(thought.isAnonymous ? thought.id : thought.authorId)} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-60 text-black/60">
                      {thought.isAnonymous ? 'Anonymous' : (thought.authorId === user?.uid ? userData?.fullName : thought.authorName)}
                    </span>
                    {!thought.isAnonymous && (
                      <span className="text-[8px] font-bold uppercase tracking-widest opacity-40 text-black/60 -mt-0.5">
                        {(!thought.isAnonymous && thought.authorId === user?.uid) 
                          ? (userData?.course || userData?.branch || userData?.primaryBranch || thought.authorCourse || 'N/A')
                          : (thought.authorCourse || thought.authorBranch || 'N/A')
                        } • {(!thought.isAnonymous && thought.authorId === user?.uid)
                          ? (userData?.batchStart || userData?.year || thought.authorBatch || 'N/A')
                          : (thought.authorBatch || 'N/A')
                        }
                      </span>
                    )}
                  </div>
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

      <Footer />

      {/* Floating Plus Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (!user) {
            navigate('/signup');
            return;
          }
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
                  className="w-full h-32 bg-black/5 dark:bg-white/5 rounded-xl p-4 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-all handwritten text-xl text-black dark:text-white mb-4"
                  value={newThought}
                  onChange={(e) => setNewThought(e.target.value)}
                  maxLength={280}
                />

                <div className="flex flex-wrap gap-2 mb-4">
                  {previews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-black/10 dark:border-white/10">
                      <img src={url} alt="Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removePreview(i)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {previews.length < 5 && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                      <Plus size={20} className="opacity-20" />
                      <span className="text-[8px] font-bold uppercase opacity-20">Add</span>
                    </label>
                  )}
                </div>

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

                  <label className="flex items-center gap-2 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full cursor-pointer transition-all group" title="Add Image">
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                    <Camera size={20} className={previews.length > 0 ? "text-orange-500" : "opacity-40 group-hover:opacity-100"} />
                  </label>

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

      {/* Custom Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-black/10 dark:border-white/10 p-8 text-center"
            >
              <div className="size-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2">Delete Thought?</h3>
              <p className="text-sm opacity-60 mb-8 leading-relaxed">
                Are you sure you want to remove this memory from the wall? This action cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-6 py-3 bg-black/5 dark:bg-white/5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black/10 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default TheWall;
