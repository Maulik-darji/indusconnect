import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, ArrowUpDown, Plus, X, Loader2, Info, CheckCircle2, ChevronLeft, ChevronRight, MessageSquare, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getFunkyAvatar } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { storage, db } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL, listAll, getMetadata, deleteObject } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, arrayUnion, orderBy, onSnapshot, deleteDoc, limit, startAfter, getDocsFromServer } from 'firebase/firestore';
import Footer from '../components/Footer';

import { COURSES_DATA } from '../constants';

const FILTERS = ['All Memories','1st yr','2nd yr','3rd yr','4th yr','Rhapsody\'24','Rhapsody\'25','Rhapsody\'26'];

const getStoragePathFromUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('gs://')) {
    return url.split('/').slice(3).join('/');
  }

  try {
    const parsed = new URL(url);
    const encodedPath = parsed.pathname.split('/o/')[1];
    return encodedPath ? decodeURIComponent(encodedPath) : null;
  } catch (error) {
    return null;
  }
};

const MemoryImage = ({ memory, className = '', fallbackClassName = '', onImageFail }) => {
  const [displayUrl, setDisplayUrl] = useState(memory?.url || '');
  const [failed, setFailed] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    const url = memory?.url || '';
    setDisplayUrl(url);
    setFailed(false);
    setRefreshed(false);

    if (!url && onImageFail) {
      onImageFail(memory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory?.url]);

  const handleImageError = async () => {
    if (!refreshed) {
      const storagePath = getStoragePathFromUrl(displayUrl);
      if (storagePath) {
        try {
          const freshUrl = await getDownloadURL(ref(storage, storagePath));
          setRefreshed(true);
          setDisplayUrl(freshUrl);
          return;
        } catch (error) {
          // Fall through to the visual fallback if the object cannot be read.
        }
      }
    }

    setFailed(true);
    if (onImageFail) {
      onImageFail(memory);
    }
  };

  if (!displayUrl || failed) {
    return (
      <div className={`flex size-full flex-col items-center justify-center bg-black/5 text-center text-black/30 dark:bg-white/5 dark:text-white/30 ${fallbackClassName}`}>
        <ImageIcon size={42} />
        <p className="mt-3 text-xs font-black uppercase tracking-widest">Image Unavailable</p>
      </div>
    );
  }

  return (
    <img
      src={displayUrl}
      alt={memory.title || 'Archive memory'}
      onError={handleImageError}
      className={className}
      loading="lazy"
    />
  );
};

const toMillis = (value) => {
  if (value?.toMillis) return value.toMillis();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  return 0;
};

const formatBytes = (bytes = 0) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

const renderCommentText = (text, navigate) => {
  if (!text) return null;
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const username = part.slice(1);
      return (
        <span 
          key={i} 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/batchmates?search=${username}`);
          }}
          className="text-blue-500 font-medium cursor-pointer hover:underline"
        >
          {part}
        </span>
      );
    }
    return part;
  });
};

const CustomSelect = ({ value, options, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between bg-black/[0.04] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 rounded-3xl px-6 py-4 text-xs font-black uppercase tracking-widest outline-none transition-all cursor-pointer hover:bg-black/[0.08] dark:hover:bg-white/[0.08] ${disabled ? 'opacity-20 cursor-not-allowed' : ''}`}
      >
        <span className="truncate">{value}</span>
        <ArrowUpDown size={14} className="opacity-30" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute top-full left-0 right-0 mt-3 z-[70] max-h-[350px] overflow-y-auto rounded-3xl shadow-[0_30px_100px_-20px_rgba(0,0,0,0.25)] border backdrop-blur-3xl custom-scrollbar p-2 ${
                theme === 'light' 
                  ? 'bg-white/40 border-black/5' 
                  : 'bg-black/40 border-white/10'
              }`}
            >
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-5 py-3.5 rounded-2xl text-sm font-medium transition-all ${
                    value === opt
                      ? 'bg-[#ffb03a] text-black shadow-lg shadow-[#ffb03a]/20'
                      : theme === 'light' 
                        ? 'hover:bg-black/[0.03] text-black/70 hover:text-black' 
                        : 'hover:bg-white/[0.03] text-white/70 hover:text-white'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Archive = () => {
  const { userData, user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState(() => {
    return localStorage.getItem('archive_selected_filter') || 'All Memories';
  });

  useEffect(() => {
    localStorage.setItem('archive_selected_filter', selectedFilter);
  }, [selectedFilter]);

  const [selectedDegree, setSelectedDegree] = useState('All Degrees');
  const [selectedBranch, setSelectedBranch] = useState('All Branches');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [sortOrder, setSortOrder] = useState('Newest First');
  const [isUploading, setIsUploading] = useState(false);
  const [memories, setMemories] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isSealing, setIsSealing] = useState(false);
  const [uploadYear, setUploadYear] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 20;
  const [newMemoryTitle, setNewMemoryTitle] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMemory, setSelectedMemoryState] = useState(null);

  // Sync state with URL
  const setSelectedMemory = (memory) => {
    if (memory) {
      searchParams.set('view', memory.id);
    } else {
      searchParams.delete('view');
    }
    setSearchParams(searchParams);
    setSelectedMemoryState(memory);
  };

  // Handle URL on mount and change
  useEffect(() => {
    const memoryId = searchParams.get('view');
    if (memoryId && memories.length > 0) {
      const memory = memories.find(m => m.id === memoryId);
      if (memory) {
        setSelectedMemoryState(memory);
      }
    } else if (!memoryId) {
      setSelectedMemoryState(null);
    }
  }, [searchParams, memories]);
  const visibleMemories = memories.filter(m => {
    const yearMatch = selectedFilter === 'All Memories' || m.year === selectedFilter;
    
    // Strict matching with smart fallback for author's own legacy memories
    const isAuthorLegacy = !m.degree && m.authorId === userData?.uid;
    const degreeMatch = selectedDegree === 'All Degrees' || m.degree === selectedDegree || (isAuthorLegacy && userData?.degree === selectedDegree);
    
    const branchMatch = selectedBranch === 'All Branches' || m.branch === selectedBranch || m.course === selectedBranch || (isAuthorLegacy && (userData?.course === selectedBranch || userData?.branch === selectedBranch));
    
    return yearMatch && degreeMatch && branchMatch;
  });

  useEffect(() => {
    if (userData) {
      if (userData.degree) setSelectedDegree(userData.degree);
      if (userData.course || userData.branch) setSelectedBranch(userData.course || userData.branch);
    }
  }, [userData?.uid]);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const q = query(
            collection(db, 'media_vault'),
            orderBy('timestamp', 'desc'),
            limit(PAGE_SIZE)
          );
        
        const snapshot = await getDocsFromServer(q);
        const allFirestoreMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastDoc = snapshot.docs[snapshot.docs.length - 1];
        setLastVisible(lastDoc);
        setHasMore(snapshot.docs.length === PAGE_SIZE);

        let firestoreMemories = [];
        if (!userData) {
          // Guests see all
          firestoreMemories = allFirestoreMemories;
        } else {
          firestoreMemories = allFirestoreMemories.filter(m => {
            if (userData?.role === 'faculty') {
              return m.authorRole === 'faculty';
            } else {
              return m.authorRole === 'student' || !m.authorRole;
            }
          });
        }

        setMemories(firestoreMemories);
      } catch (err) {
        console.error('Error fetching memories:', err);
      }
    };
    fetchMemories();
  }, [userData?.uid, userData?.role]);

  const loadMore = async () => {
    if (!hasMore || isLoadingMore || !lastVisible) return;
    
    setIsLoadingMore(true);
    try {
      const q = query(
        collection(db, 'media_vault'),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(PAGE_SIZE)
      );
      
      const snapshot = await getDocs(q);
      const allFirestoreMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      setLastVisible(lastDoc);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      let firestoreMemories = [];
      if (!userData) {
        firestoreMemories = allFirestoreMemories;
      } else {
        firestoreMemories = allFirestoreMemories.filter(m => {
          if (userData?.role === 'faculty') {
            return m.authorRole === 'faculty';
          } else {
            return m.authorRole === 'student' || !m.authorRole;
          }
        });
      }

      setMemories(prev => [...prev, ...firestoreMemories]);
    } catch (err) {
      console.error('Error fetching more memories:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedMemory) return;
      
      if (e.key === 'Escape') {
        setSelectedMemory(null);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = visibleMemories.findIndex(m => m.id === selectedMemory.id);
        const prevIndex = (currentIndex - 1 + visibleMemories.length) % visibleMemories.length;
        setSelectedMemory(visibleMemories[prevIndex]);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = visibleMemories.findIndex(m => m.id === selectedMemory.id);
        const nextIndex = (currentIndex + 1) % visibleMemories.length;
        setSelectedMemory(visibleMemories[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMemory, visibleMemories]);

  // Real-time comments listener
  useEffect(() => {
    if (!selectedMemory?.id) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, 'comments'),
      where('memoryId', '==', selectedMemory.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return timeA - timeB;
      });
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [selectedMemory?.id]);

  const handlePostComment = async () => {
    if (!commentText.trim() || !selectedMemory || !userData || isPosting) return;

    setIsPosting(true);
    try {
      if (!selectedMemory.id) throw new Error("Invalid memory ID");

      const commentData = {
        text: commentText.trim(),
        authorName: userData.fullName || 'Anonymous',
        authorId: userData.uid,
        authorImage: userData.profileImageUrl || '',
        memoryId: selectedMemory.id,
        timestamp: serverTimestamp(),
        parentId: replyingTo?.id || null,
        replyToName: replyingTo?.authorName || null
      };

      await addDoc(collection(db, 'comments'), commentData);
      
      setCommentText('');
      setReplyingTo(null);
      toast.success('Comment posted!');
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error('Failed to post comment. Check your Firestore rules.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      await deleteDoc(doc(db, 'comments', commentId));
      toast.success('Comment deleted');
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error('Failed to delete comment');
    }
  };

  const handleDeleteMemory = async (memory) => {
    setDeleteTarget({ type: 'memory', data: memory });
  };

  const confirmDeleteMemory = async (memory) => {
    try {
      // 1. Delete from Firestore
      await deleteDoc(doc(db, 'media_vault', memory.id));
      
      // 2. Delete from Storage if storagePath exists
      if (memory.storagePath) {
        try {
          const imageRef = ref(storage, memory.storagePath);
          await deleteObject(imageRef);
        } catch (storageErr) {
          console.error("Error deleting image from storage:", storageErr);
        }
      }
      
      // 3. Update local state
      setMemories(prev => prev.filter(m => m.id !== memory.id));
      setSelectedMemory(null);
      setDeleteTarget(null);
      toast.success('Memory deleted successfully');
    } catch (error) {
      console.error("Error deleting memory:", error);
      toast.error('Failed to delete memory');
    }
  };

  const handleUpdateComment = async (commentId) => {
    if (!editedCommentText.trim()) return;
    try {
      await updateDoc(doc(db, 'comments', commentId), {
        text: editedCommentText.trim(),
        isEdited: true,
        updatedAt: serverTimestamp()
      });
      setEditingCommentId(null);
      setEditedCommentText('');
      toast.success('Comment updated');
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error('Failed to update comment');
    }
  };

  const handleUpload = async () => {
    if (!uploadYear || selectedFiles.length === 0 || !userData) return;
    
    setIsSealing(true);
    const filesToUpload = [...selectedFiles];
    const targetYear = uploadYear;
    const targetTitle = newMemoryTitle.trim();
    const totalFiles = filesToUpload.length;
    const totalBytes = filesToUpload.reduce((sum, fileObj) => sum + (fileObj.file?.size || 0), 0);
    const uploadedBytesByFile = Array(totalFiles).fill(0);
    const startUploadTime = Date.now();

    setUploadStatus({
      progress: 0,
      total: totalFiles,
      current: 0,
      uploadedBytes: 0,
      totalBytes,
      status: 'uploading'
    });

    // Let the disabled grey button state register before closing the modal.
    await new Promise(resolve => setTimeout(resolve, 220));
    setIsUploading(false);

    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const fileObj = filesToUpload[i];
        
        // Optimize image resolution (Client-side resizing to 1920x1080 max)
        const resizeImage = (file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
              const img = new Image();
              img.src = e.target.result;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1920;

                if (width > height) {
                  if (width > maxDim) {
                    height *= maxDim / width;
                    width = maxDim;
                  }
                } else {
                  if (height > maxDim) {
                    width *= maxDim / height;
                    height = maxDim;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                  resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                }, 'image/jpeg', 0.85); // 85% quality for optimization
              };
            };
          });
        };

        const optimizedFile = await resizeImage(fileObj.file);
        const fileName = `${Date.now()}_${optimizedFile.name}`;
        const storageRef = ref(storage, `media_vault/${userData.uid}/${fileName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, optimizedFile);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              uploadedBytesByFile[i] = snapshot.bytesTransferred;
              const uploadedBytes = uploadedBytesByFile.reduce((sum, bytes) => sum + bytes, 0);
              const progress = totalBytes > 0 ? Math.min(100, (uploadedBytes / totalBytes) * 100) : 0;
              const elapsedSeconds = Math.max(0.1, (Date.now() - startUploadTime) / 1000);
              const bytesPerSecond = uploadedBytes / elapsedSeconds;
              const remainingBytes = Math.max(0, totalBytes - uploadedBytes);
              const remainingSeconds = bytesPerSecond > 0 ? Math.ceil(remainingBytes / bytesPerSecond) : null;
              const remainingTime = remainingSeconds == null
                ? 'Calculating...'
                : remainingSeconds >= 60
                  ? `${Math.floor(remainingSeconds / 60)}m ${remainingSeconds % 60}s`
                  : `${remainingSeconds}s`;

              setUploadStatus(prev => ({
                ...prev,
                progress,
                current: i + 1,
                uploadedBytes,
                totalBytes,
                remainingTime,
                status: 'uploading'
              }));
            }, 
            (error) => {
              console.error(error);
              reject(error);
            }, 
            async () => {
              try {
                uploadedBytesByFile[i] = uploadTask.snapshot.totalBytes;
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const newMemory = {
                  url: downloadURL,
                  storagePath: uploadTask.snapshot.ref.fullPath,
                  title: targetTitle || fileObj.file.name.split('.')[0],
                  year: targetYear,
                  author: userData.fullName || 'Anonymous',
                  authorId: userData.uid,
                  authorImage: userData.profileImageUrl || '',
                  authorRole: userData.role || 'student',
                  degree: userData.degree || '',
                  branch: userData.course || userData.branch || '',
                  timestamp: serverTimestamp()
                };
                const docRef = await addDoc(collection(db, 'media_vault'), newMemory);
                setMemories(prev => [{ id: docRef.id, ...newMemory, timestamp: Date.now() }, ...prev]);
                resolve();
              } catch (err) {
                console.error("Error adding to firestore:", err);
                reject(err);
              }
            }
          );
        });
      }
    } catch (error) {
      setIsSealing(false);
      setUploadStatus(prev => prev ? { ...prev, status: 'error' } : null);
      return;
    }

    setIsSealing(false);
    setSelectedFiles([]);
    setUploadYear('');
    setNewMemoryTitle('');
    setUploadStatus(prev => prev ? {
      ...prev,
      progress: 100,
      uploadedBytes: totalBytes,
      totalBytes,
      status: 'complete',
      remainingTime: '0s'
    } : null);
    setTimeout(() => setUploadStatus(null), 2800);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5ee] dark:bg-[#181818] transition-colors duration-500 pt-20 sm:pt-24 md:pt-28 px-4 sm:px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex-1 w-full">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-6xl sm:text-7xl md:text-8xl premium-title tracking-tight">The Archive</h1>
              <p className="text-base sm:text-lg opacity-60 font-light leading-relaxed">
                A cinematic collection of fleeting moments, frozen in time. <br className="hidden sm:block" />
                From the first lecture to the final goodbye.
              </p>
            </div>
            
            <button 
              className="flex items-center gap-2 px-6 py-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group"
              onClick={() => setSortOrder(prev => prev === 'Newest First' ? 'Oldest First' : 'Newest First')}
            >
              <ArrowUpDown size={16} className="opacity-40 group-hover:opacity-100" />
              <span className="text-xs font-bold uppercase tracking-widest">{sortOrder}</span>
            </button>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="space-y-6 mb-12">
          {/* Degree and Branch Filters */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-8 border-t border-black/5 dark:border-white/5">
            <div className="w-full sm:w-72 group">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 mb-3 block text-center sm:text-left transition-opacity group-hover:opacity-50">Degree Type</label>
              <CustomSelect 
                value={selectedDegree}
                options={['All Degrees', ...Object.keys(COURSES_DATA)]}
                onChange={(val) => {
                  setSelectedDegree(val);
                  setSelectedBranch('All Branches');
                }}
              />
            </div>

            <div className="w-full sm:w-96 group">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 mb-3 block text-center sm:text-left transition-opacity group-hover:opacity-50">Department / Branch</label>
              <CustomSelect 
                value={selectedBranch}
                options={['All Branches', ...(selectedDegree !== 'All Degrees' ? COURSES_DATA[selectedDegree]?.branches.map(b => typeof b === 'string' ? b : b.name) : [])]}
                onChange={setSelectedBranch}
                disabled={selectedDegree === 'All Degrees'}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-y border-black/5 dark:border-white/5">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {FILTERS.map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                    selectedFilter === filter
                      ? 'bg-[#ffb03a] text-black shadow-xl shadow-[#ffb03a]/30 scale-105'
                      : 'bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10 hover:scale-105'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <button 
              onClick={() => {
                if (!userData) {
                  navigate('/signup');
                  return;
                }
                setIsUploading(true);
              }}
              className="flex items-center gap-4 px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] shadow-2xl hover:scale-[1.02] active:scale-[0.95] transition-all duration-500 w-full sm:w-auto justify-center group"
            >
              <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="font-black uppercase tracking-[0.1em] text-sm">Add Memory</span>
            </button>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {visibleMemories.map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative aspect-video overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 cursor-pointer"
              onClick={() => setSelectedMemory(memory)}
            >
              <MemoryImage
                memory={memory}
                className="absolute inset-0 size-full object-cover object-[center_25%] grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
                fallbackClassName="absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 p-8 transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffb03a] mb-2">{memory.year}</p>
                <h3 className="text-2xl font-bold text-white tracking-tight">{memory.title}</h3>
              </div>

              <div className="absolute top-6 right-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMemory(memory);
                  }}
                  className="size-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                >
                  <Info size={18} />
                </button>

                {(userData?.uid === memory.authorId || userData?.role === 'admin') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMemory(memory);
                    }}
                    className="size-10 bg-red-500/20 backdrop-blur-md rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          </div>

        {/* Empty State */}
        {visibleMemories.length === 0 && (
          <div className="py-40 text-center">
            <ImageIcon size={64} className="mx-auto opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic opacity-30">No memories in this collection yet.</h3>
          </div>
        )}

        {/* Load More Button */}
        {hasMore && visibleMemories.length > 0 && (
          <div className="mt-24 flex justify-center">
            <button 
              onClick={loadMore}
              disabled={isLoadingMore}
              className="group relative flex items-center gap-4 px-12 py-5 border border-[#ffb03a] rounded-full text-[#ffb03a] font-black text-[10px] uppercase tracking-[0.25em] hover:bg-[#ffb03a] hover:text-black transition-all duration-500 disabled:opacity-30 disabled:pointer-events-none shadow-[0_0_40px_rgba(255,176,58,0.05)]"
            >
              {isLoadingMore ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <span>Unlock More Vault Items</span>
                  <div className="absolute inset-0 bg-[#ffb03a]/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </div>
        )}

        <Footer />
      </div>




      {/* Floating Action Button */}
      <button 
        onClick={() => {
          if (!userData) {
            navigate('/signup');
            return;
          }
          setIsUploading(true);
        }}
        className="fixed bottom-8 right-8 size-16 bg-[#ffb03a] text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <Plus size={32} />
        <span className="absolute right-full mr-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Add Memories
        </span>
      </button>

      {/* High-Fidelity Full-Screen Viewer */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex backdrop-blur-sm overflow-hidden ${theme === 'light' ? 'bg-[#fdfdfb]/95' : 'bg-black/95'}`}
            onClick={() => setSelectedMemory(null)}
          >
            {/* Main Image Area */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
              <div className="absolute top-8 left-8 z-[110] flex items-center gap-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedMemory(null); }}
                  className={`p-2 transition-colors ${theme === 'light' ? 'text-black/40 hover:text-black' : 'text-white/40 hover:text-white'}`}
                >
                  <X size={32} />
                </button>

                {(userData?.uid === selectedMemory.authorId || userData?.role === 'admin') && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      handleDeleteMemory(selectedMemory); 
                    }}
                    className="p-2 text-red-500/40 hover:text-red-500 transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
              </div>

              {/* Blurred Background to fill space */}
              <div className="absolute inset-0 z-0">
                <MemoryImage 
                  memory={selectedMemory} 
                  className="size-full object-cover blur-3xl opacity-20 scale-110" 
                />
                <div className={`absolute inset-0 ${theme === 'light' ? 'bg-white/40' : 'bg-black/40'}`} />
              </div>

              {/* Navigation Arrows (Z-index 20) */}
              <div className="absolute inset-y-0 left-4 sm:left-8 flex items-center z-20">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = visibleMemories.findIndex(m => m.id === selectedMemory.id);
                    const prevIndex = (currentIndex - 1 + visibleMemories.length) % visibleMemories.length;
                    setSelectedMemory(visibleMemories[prevIndex]);
                  }}
                  className={`p-4 transition-all hover:scale-110 active:scale-95 ${theme === 'light' ? 'text-black/30 hover:text-black' : 'text-white/30 hover:text-white'}`}
                >
                  <ChevronLeft size={48} strokeWidth={1} />
                </button>
              </div>

              <div className="absolute inset-y-0 right-4 sm:right-8 flex items-center z-20">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const currentIndex = visibleMemories.findIndex(m => m.id === selectedMemory.id);
                    const nextIndex = (currentIndex + 1) % visibleMemories.length;
                    setSelectedMemory(visibleMemories[nextIndex]);
                  }}
                  className={`p-4 transition-all hover:scale-110 active:scale-95 ${theme === 'light' ? 'text-black/30 hover:text-black' : 'text-white/30 hover:text-white'}`}
                >
                  <ChevronRight size={48} strokeWidth={1} />
                </button>
              </div>

              {/* The Image & Caption Area (Z-index 10) */}
              <motion.div 
                key={selectedMemory.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 sm:p-12 gap-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex-1 flex items-center justify-center min-h-0 w-full">
                  <MemoryImage memory={selectedMemory} className="max-w-full max-h-full object-contain shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] rounded-lg w-auto h-auto" />
                </div>
                
                {/* Mobile/Floating Caption (Visible below image) */}
                <div className={`flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-700`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 ${theme === 'light' ? 'text-black/40' : 'text-[#ffb03a]'}`}>
                    {selectedMemory.year}
                  </p>
                  <h3 className={`text-xl sm:text-2xl font-bold tracking-tight mb-3 ${theme === 'light' ? 'text-black' : 'text-white'}`}>
                    {selectedMemory.title}
                  </h3>
                  <div className={`flex items-center gap-3 px-4 py-2 rounded-full border ${
                    theme === 'light' ? 'bg-black/5 border-black/5 text-black' : 'bg-white/5 border-white/5 text-white'
                  }`}>
                    {selectedMemory.authorId === user?.uid ? (
                      <img src={userData?.profileImageUrl || getFunkyAvatar(user.uid)} className="size-6 rounded-full object-cover" alt="" />
                    ) : selectedMemory.authorImage ? (
                      <img src={selectedMemory.authorImage} className="size-6 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="size-6 bg-[#ffb03a]/20 rounded-full flex items-center justify-center text-[#ffb03a] font-bold text-[10px]">
                        {selectedMemory.author?.charAt(0)}
                      </div>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-40">Uploaded By</span>
                    <span className="text-xs font-bold">{selectedMemory.authorId === user?.uid ? userData?.fullName : selectedMemory.author}</span>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar (Details & Comments) */}
            <div 
              className={`hidden lg:flex w-[400px] backdrop-blur-2xl flex-col h-full ${
                theme === 'light' 
                  ? 'bg-white/40 border-l border-black/10' 
                  : 'bg-black/40 border-l border-white/10'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-8 flex-1 flex flex-col min-h-0">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>
                    Comments
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full bg-[#ffb03a] animate-pulse`} />
                    <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest">Live Feed</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar -mx-4 px-4 py-2">
                  {comments.length > 0 ? (
                    <div className="space-y-6">
                      {comments.map((comment) => (
                        <div key={comment.id} className={`flex gap-4 ${comment.parentId ? 'ml-8 scale-95 opacity-80' : ''}`}>
                          <div 
                            className={`shrink-0 size-8 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold cursor-pointer hover:ring-2 hover:ring-[#ffb03a] transition-all border border-black/5 dark:border-white/5 shadow-sm ${theme === 'light' ? 'bg-black/5 text-black' : 'bg-white/10 text-white'}`}
                            onClick={() => navigate(`/profile/${comment.authorId}`)}
                          >
                            {comment.authorId === user?.uid ? (
                              <img src={userData?.profileImageUrl || getFunkyAvatar(user.uid)} className="size-full object-cover" alt="" />
                            ) : comment.authorImage ? (
                              <img src={comment.authorImage} className="size-full object-cover" alt="" />
                            ) : (
                              <img src={getFunkyAvatar(comment.authorId)} className="size-full object-cover" alt="" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className={`text-[11px] font-bold truncate cursor-pointer hover:text-[#ffb03a] transition-colors ${theme === 'light' ? 'text-black' : 'text-white'}`}
                                onClick={() => navigate(`/profile/${comment.authorId}`)}
                              >
                                {comment.authorName}
                              </span>
                              <span className="text-[9px] opacity-30 uppercase tracking-widest shrink-0">
                                {comment.timestamp?.toDate ? new Date(comment.timestamp.toDate()).toLocaleDateString() : 'Just now'}
                              </span>
                              {!comment.parentId && (
                                <button 
                                  onClick={() => {
                                    setReplyingTo(comment);
                                    setCommentText(`@${comment.authorName.replace(/\s+/g, '')} `);
                                  }}
                                  className="text-[9px] font-black text-[#ffb03a] uppercase tracking-widest hover:underline ml-auto"
                                >
                                  Reply
                                </button>
                              )}
                              {userData?.uid === comment.authorId && (
                                <div className="flex gap-2 ml-2">
                                  <button 
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditedCommentText(comment.text);
                                    }}
                                    className="text-[9px] font-black text-black/30 dark:text-white/30 uppercase tracking-widest hover:text-black dark:hover:text-white transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteComment(comment.id)}
                                    className="text-[9px] font-black text-red-500/30 uppercase tracking-widest hover:text-red-500 transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                            {comment.replyToName && (
                              <p className="text-[10px] font-bold text-blue-500 mb-1">
                                Replying to {comment.replyToName}
                              </p>
                            )}
                            {editingCommentId === comment.id ? (
                              <div className="mt-2">
                                <textarea 
                                  value={editedCommentText}
                                  onChange={(e) => setEditedCommentText(e.target.value)}
                                  className={`w-full p-2 text-sm border-2 rounded-lg outline-none focus:border-[#ffb03a] transition-all ${
                                    theme === 'light' ? 'bg-white border-black/5 text-black' : 'bg-black/20 border-white/5 text-white'
                                  }`}
                                  rows={2}
                                />
                                <div className="flex gap-2 mt-2">
                                  <button 
                                    onClick={() => handleUpdateComment(comment.id)}
                                    className="px-3 py-1 bg-[#ffb03a] text-black text-[10px] font-black uppercase tracking-widest rounded-md"
                                  >
                                    Save
                                  </button>
                                  <button 
                                    onClick={() => setEditingCommentId(null)}
                                    className="px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest rounded-md"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className={`text-sm leading-relaxed break-words ${theme === 'light' ? 'text-black/70' : 'text-white/70'}`}>
                                {renderCommentText(comment.text, navigate)}
                                {comment.isEdited && <span className="text-[9px] opacity-20 ml-2 italic">(edited)</span>}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                      <div className={`p-6 rounded-full mb-4 ${theme === 'light' ? 'bg-black/5' : 'bg-white/5'}`}>
                        <MessageSquare size={32} strokeWidth={1.5} className="text-[#ffb03a]" />
                      </div>
                      <p className={`text-sm italic font-serif ${theme === 'light' ? 'text-black/60' : 'text-white/60'}`}>No comments yet.</p>
                      <p className={`text-xs mt-1 ${theme === 'light' ? 'text-black/40' : 'text-white/40'}`}>Be the first to share a memory.</p>
                    </div>
                  )}
                </div>

                <div className={`pt-6 border-t ${theme === 'light' ? 'border-black/5' : 'border-white/5'}`}>
                  {replyingTo && (
                    <div className="mb-4 flex items-center justify-between px-4 py-2 bg-[#ffb03a]/10 rounded-lg">
                      <p className="text-[10px] font-bold text-[#ffb03a]">
                        Replying to <span className="text-black dark:text-white">{replyingTo.authorName}</span>
                      </p>
                      <button onClick={() => setReplyingTo(null)} className="text-[#ffb03a] hover:text-black dark:hover:text-white">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {userData ? (
                    <div className="relative mt-6">
                      <input 
                        type="text" 
                        placeholder="Add a comment..." 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                        className={`w-full py-4 px-6 border-2 rounded-xl text-xs outline-none transition-all font-black ${
                          theme === 'light' 
                            ? 'bg-white border-[#ffb03a] text-[#000000] placeholder:text-black/30' 
                            : 'bg-black/40 border-[#ffb03a] text-white placeholder:text-white/30'
                        }`}
                      />
                      <button 
                        onClick={handlePostComment}
                        disabled={isPosting || !commentText.trim()}
                        className={`absolute right-4 top-1/2 -translate-y-1/2 font-black text-[10px] uppercase tracking-widest hover:scale-110 transition-transform disabled:opacity-30 disabled:pointer-events-none ${
                          theme === 'light' ? 'text-[#000000]' : 'text-white'
                        }`}
                      >
                        {isPosting ? '...' : 'Post'}
                      </button>
                    </div>
                  ) : (
                    <Link 
                      to="/signup"
                      className={`block w-full mt-6 py-4 px-6 border rounded-xl text-xs font-bold uppercase tracking-widest text-center transition-all ${
                        theme === 'light'
                          ? 'border-black/10 text-black/40 hover:text-black hover:bg-black/5'
                          : 'border-white/10 text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Sign in to leave a comment
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal (Multiple Support) */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/45 p-4 backdrop-blur-xl dark:bg-black/45"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl p-10 border border-black/5 dark:border-white/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl premium-title">Deposit Memories</h2>
                <button onClick={() => { setIsUploading(false); setUploadYear(''); setSelectedFiles([]); setNewMemoryTitle(''); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4">Select Year / Collection</p>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.filter(f => f !== 'All Memories').map(year => (
                    <button
                      key={year}
                      onClick={() => setUploadYear(year)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        uploadYear === year
                          ? 'bg-[#ffb03a] text-black shadow-lg shadow-[#ffb03a]/20'
                          : 'bg-black/10 dark:bg-white/10 opacity-70 hover:opacity-100 hover:bg-black/20 dark:hover:bg-white/20'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedFiles.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={file.preview} className="size-full object-cover" alt="" />
                      <button 
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer hover:border-[#ffb03a] transition-colors">
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        const newFiles = files.map(file => ({
                          file,
                          preview: URL.createObjectURL(file)
                        }));
                        setSelectedFiles(prev => [...prev, ...newFiles]);
                      }}
                    />
                    <Plus size={20} className="opacity-20" />
                  </label>
                </div>
              ) : (
                <label className="border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl p-12 text-center space-y-4 hover:border-[#ffb03a] transition-colors cursor-pointer group block mb-8">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const newFiles = files.map(file => ({
                        file,
                        preview: URL.createObjectURL(file)
                      }));
                      setSelectedFiles(newFiles);
                    }}
                  />
                  <div className="size-16 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Plus size={32} className="opacity-20" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold">Select multiple images</p>
                    <p className="text-sm opacity-40 italic">Drop your memories here or click to browse</p>
                  </div>
                </label>
              )}

              <div className="space-y-4">
                <input type="text" placeholder="Add a title (optional)..." className="w-full bg-black/5 dark:bg-white/5 p-4 rounded-xl outline-none border border-transparent focus:border-[#ffb03a] transition-all" value={newMemoryTitle} onChange={(e) => setNewMemoryTitle(e.target.value)} />
                <button 
                  onClick={handleUpload}
                  disabled={isSealing}
                  className={`w-full py-4 rounded-xl font-bold transition-all duration-300 ${
                    isSealing
                      ? 'cursor-not-allowed bg-black/20 text-black/40 dark:bg-white/15 dark:text-white/40'
                      : 'btn-primary bg-black text-white hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {isSealing ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sealing Memories...</span>
                    </div>
                  ) : (
                    <span>Seal {selectedFiles.length || ''} Memories in {uploadYear || '...'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Upload Progress */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-8 left-8 right-8 z-[110] overflow-hidden rounded-2xl border border-black/5 bg-white p-6 shadow-2xl dark:border-white/5 dark:bg-[#121212] sm:left-auto sm:w-96"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#ffb03a]/10 rounded-xl flex items-center justify-center">
                  {uploadStatus.status === 'complete' ? (
                    <CheckCircle2 size={20} className="text-[#ffb03a]" />
                  ) : uploadStatus.status === 'error' ? (
                    <X size={20} className="text-red-500" />
                  ) : (
                    <Loader2 size={20} className="text-[#ffb03a] animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                    {uploadStatus.status === 'complete'
                      ? 'Vault Sealed'
                      : uploadStatus.status === 'error'
                        ? 'Upload Failed'
                        : `Uploading ${uploadStatus.current}/${uploadStatus.total}`}
                  </p>
                  <p className="font-bold text-sm tracking-tight">
                    {uploadStatus.status === 'complete'
                      ? 'Memories Deposited!'
                      : uploadStatus.status === 'error'
                        ? 'Please try again'
                        : `Uploading... ${formatBytes(uploadStatus.uploadedBytes)} of ${formatBytes(uploadStatus.totalBytes)}`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black font-mono">{Math.round(uploadStatus.progress)}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#ffb03a]"
                initial={{ width: 0 }}
                animate={{ width: `${uploadStatus.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`relative w-full max-w-md p-8 rounded-3xl border shadow-2xl text-center ${
                theme === 'light' ? 'bg-white border-black/10' : 'bg-[#1a1a1a] border-white/10'
              }`}
            >
              <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight mb-3">Delete memory?</h2>
              <p className="text-sm opacity-60 mb-8 leading-relaxed">
                Are you sure you want to delete <span className="font-bold">"{deleteTarget.data.title}"</span>? <br />
                This cinematic moment will be lost forever.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteTarget(null)}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                    theme === 'light' ? 'bg-black/5 hover:bg-black/10' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => confirmDeleteMemory(deleteTarget.data)}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Archive;
