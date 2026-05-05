import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Image as ImageIcon, MessageSquare, Layout, ExternalLink, Star, X, Send, MoreHorizontal, Trash2, Edit3, Search, Filter } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, getDocsFromServer } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';

const Home = () => {
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Global');
  const [posts, setPosts] = useState([]);
  const [connectWith, setConnectWith] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [postImage, setPostImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    degree: '',
    course: '',
    year: ''
  });

  const [expandedPosts, setExpandedPosts] = useState(new Set());

  const toggleExpand = (e, postId) => {
    e.stopPropagation();
    setExpandedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const checkDailyQuota = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userPostsToday = posts.filter(p => 
      p.authorId === user?.uid && 
      p.createdAt?.toDate && 
      p.createdAt.toDate() >= today
    );

    return userPostsToday.length < 5;
  };

  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // Filtered posts based on search and tab and global filters
  const filteredPosts = posts.filter(post => {
    // Tab filtering
    if (activeTab === 'Batchmates') {
      if (!userData || post.authorCourse !== userData?.course) return false;
    }

    // Global Filters (only apply when not searching or as secondary layer)
    if (filters.degree && post.authorDegree !== filters.degree) return false;
    if (filters.course && post.authorCourse !== filters.course) return false;
    if (filters.year && post.authorBatchStart?.toString() !== filters.year) return false;

    // Search filtering
    const q = searchQuery.toLowerCase();
    return (
      post.title?.toLowerCase().includes(q) ||
      post.text?.toLowerCase().includes(q) ||
      post.authorName?.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    // Fetch latest updates for the home feed
    const q = query(
      collection(db, 'home_feed'),
      orderBy('createdAt', 'desc'),
      limit(10)
    );

    const handleSnapshot = (snapshot) => {
      const feedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(feedPosts);
      setLoading(false);
    };

    if (!user) {
      getDocsFromServer(q).then(handleSnapshot).catch(err => console.error("Guest home feed fetch error:", err));
    } else {
      const unsubscribe = onSnapshot(q, handleSnapshot, (err) => {
        console.error("Home feed snapshot error:", err);
      });
      return () => {
        setTimeout(() => unsubscribe(), 0);
      };
    }

    // Fetch potential connections (random batchmates across all departments)
    const fetchConnections = async () => {
      try {
        const qMates = query(
          collection(db, 'students'),
          limit(10)
        );
        const snap = await getDocs(qMates);
        let mates = snap.docs.map(doc => doc.data()).filter(m => m.uid !== user?.uid);

        setConnectWith(mates);
      } catch (e) {
        console.error(e);
      }
    };

    fetchConnections();
  }, [user?.uid]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() || (editingPost ? false : !newPostTitle.trim()) || isSubmitting) return;

    // Quota check (only for new posts, not edits)
    if (!editingPost) {
      const canPost = await checkDailyQuota();
      if (!canPost) {
        toast.error('Daily limit reached (5 posts per day)');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let imageUrl = editingPost?.imageUrl || null;

      if (postImage) {
        const imageRef = ref(storage, `feed_images/${Date.now()}_${postImage.name}`);
        await uploadBytes(imageRef, postImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      if (editingPost) {
        await updateDoc(doc(db, 'home_feed', editingPost.id), {
          title: newPostTitle,
          text: newPostText,
          imageUrl: imageUrl,
          updatedAt: serverTimestamp()
        });
        toast.success('Post updated!');
      } else {
        await addDoc(collection(db, 'home_feed'), {
          title: newPostTitle,
          text: newPostText,
          imageUrl: imageUrl,
          authorId: user.uid,
          authorName: userData.fullName,
          authorPhoto: userData.profileImageUrl || null,
          authorCourse: userData.course || 'N/A',
          authorDegree: userData.degree || 'N/A',
          authorBatchStart: userData.batchStart || 'N/A',
          createdAt: serverTimestamp(),
          stars: 0,
          starredBy: [],
          commentCount: 0
        });
        toast.success('Update posted!');
      }
      setNewPostText('');
      setNewPostTitle('');
      setPostImage(null);
      setImagePreview(null);
      setShowCreateModal(false);
      setEditingPost(null);
    } catch (error) {
      console.error("Error saving post:", error);
      toast.error('Failed to save post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStarPost = async (e, post) => {
    e.stopPropagation();
    if (!user) return;

    const postRef = doc(db, 'home_feed', post.id);
    const isStarred = post.starredBy?.includes(user.uid);

    try {
      await updateDoc(postRef, {
        starredBy: isStarred ? arrayRemove(user.uid) : arrayUnion(user.uid),
        stars: isStarred ? (post.stars || 1) - 1 : (post.stars || 0) + 1
      });
    } catch (error) {
      console.error("Error starring post:", error);
      toast.error('Action failed');
    }
  };

  const handleDeletePost = async (e, postId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await deleteDoc(doc(db, 'home_feed', postId));
      toast.success('Post deleted');
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error('Failed to delete');
    }
  };

  const startEditing = (e, post) => {
    e.stopPropagation();
    setEditingPost(post);
    setNewPostTitle(post.title || '');
    setNewPostText(post.text);
    setImagePreview(post.imageUrl || null);
    setShowCreateModal(true);
    setActiveMenuId(null);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPostImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#181818] transition-colors duration-500">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        {/* Top Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.05] mb-12">
          <div className="flex items-center gap-8">
            {['Global', 'Batchmates'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold tracking-tight transition-all relative ${activeTab === tab ? 'text-black dark:text-white' : 'text-black/30 dark:text-white/30 hover:text-black/50'
                  }`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black dark:bg-white"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 pb-4">
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`p-2 rounded-full transition-all ${isFilterOpen ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white hover:opacity-70'} ${(filters.degree || filters.course || filters.year) ? 'ring-2 ring-[#ffb03a]' : ''}`}
              >
                <Filter size={18} />
              </button>

              <AnimatePresence>
                {isFilterOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-4 w-72 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-black/5 dark:border-white/10 z-[110] p-6"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold">Feed Filters</h3>
                      <button 
                        onClick={() => setFilters({ degree: '', course: '', year: '' })}
                        className="text-[10px] font-black uppercase tracking-widest text-[#ffb03a]"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.1em] opacity-30 mb-2 block">Degree</label>
                        <select 
                          className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-4 py-2 text-xs font-bold outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all"
                          value={filters.degree}
                          onChange={(e) => setFilters({...filters, degree: e.target.value})}
                        >
                          <option value="">All Degrees</option>
                          <option value="B.Tech">B.Tech</option>
                          <option value="M.Tech">M.Tech</option>
                          <option value="MBA">MBA</option>
                          <option value="BCA">BCA</option>
                          <option value="MCA">MCA</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.1em] opacity-30 mb-2 block">Department</label>
                        <select 
                          className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-4 py-2 text-xs font-bold outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all"
                          value={filters.course}
                          onChange={(e) => setFilters({...filters, course: e.target.value})}
                        >
                          <option value="">All Departments</option>
                          <option value="COMPUTER SCIENCE ENGINEERING">Computer Science</option>
                          <option value="INFORMATION TECHNOLOGY">Information Technology</option>
                          <option value="MECHANICAL ENGINEERING">Mechanical Engineering</option>
                          <option value="ELECTRICAL ENGINEERING">Electrical Engineering</option>
                          <option value="CIVIL ENGINEERING">Civil Engineering</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.1em] opacity-30 mb-2 block">Start Year</label>
                        <select 
                          className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-4 py-2 text-xs font-bold outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all"
                          value={filters.year}
                          onChange={(e) => setFilters({...filters, year: e.target.value})}
                        >
                          <option value="">All Years</option>
                          {Array.from({length: 10}, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <AnimatePresence>
                {isSearchOpen && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 240, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="relative"
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search title, user, content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSearchQuery('');
                          setIsSearchOpen(false);
                        }
                      }}
                      className="w-full bg-black/[0.03] dark:bg-white/[0.05] border-none rounded-full py-2 px-4 text-xs font-medium outline-none focus:ring-1 ring-black/10 dark:ring-white/10"
                    />
                    
                    {/* Suggestions Dropdown */}
                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-black/5 dark:border-white/10 z-[100] overflow-hidden max-h-60 overflow-y-auto">
                        <div className="p-3 border-b border-black/5 dark:border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-30">Suggestions</p>
                        </div>
                        {filteredPosts.slice(0, 5).map(post => (
                          <button
                            key={post.id}
                            onClick={() => {
                              navigate(`/post/${post.id}`);
                              setSearchQuery('');
                              setIsSearchOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors border-b border-black/[0.02] dark:border-white/[0.02] last:border-0"
                          >
                            <p className="text-[11px] font-bold truncate mb-0.5">{post.title || post.text.slice(0, 30)}</p>
                            <p className="text-[9px] opacity-40 uppercase tracking-widest">by {post.authorName}</p>
                          </button>
                        ))}
                        {filteredPosts.length === 0 && (
                          <div className="p-4 text-center text-[10px] opacity-30 italic">No matches found</div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                if (isSearchOpen) setSearchQuery('');
              }}
              className={`p-2 rounded-full transition-all ${isSearchOpen ? 'bg-black text-white dark:bg-white dark:text-black' : 'hover:bg-black/5 dark:hover:bg-white/5 text-black dark:text-white opacity-100'}`}
            >
              {isSearchOpen ? <X size={18} /> : <Search size={18} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Feed Column */}
          <div className="flex-1 min-w-0">
            {/* Post Creation Area */}
            <div 
              className="flex items-center gap-4 mb-12 group cursor-pointer" 
              onClick={() => { 
                if (!user) {
                  navigate('/signup');
                  return;
                }
                setShowCreateModal(true); 
                setEditingPost(null); 
                setNewPostText(''); 
                setNewPostTitle(''); 
              }}
            >
              <div className="size-12 rounded-full overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                {userData?.profileImageUrl ? (
                  <img src={userData.profileImageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-black/20 dark:text-white/20">
                    <Users size={20} />
                  </div>
                )}
              </div>
              <div className="text-xl font-light opacity-30 group-hover:opacity-50 transition-opacity">
                {user ? "What's on your mind?" : "Sign in to share an update"}
              </div>
            </div>

            {/* Feed List */}
            <div className="space-y-0">
              {filteredPosts.length === 0 && !loading && (
                <div className="py-20 text-center opacity-20 italic">
                  {searchQuery ? 'No updates match your search.' : 'No updates yet. Be the first to share something!'}
                </div>
              )}
              {filteredPosts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="bg-white dark:bg-white/[0.03] rounded-lg border border-black/[0.03] dark:border-white/[0.05] p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-8">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="size-5 rounded-full overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
                            {(post.authorId === user?.uid ? userData?.profileImageUrl : post.authorPhoto) ? (
                              <img src={post.authorId === user?.uid ? userData?.profileImageUrl : post.authorPhoto} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="size-full flex items-center justify-center text-[6px] font-bold opacity-30">
                                {(post.authorId === user?.uid ? userData?.fullName : post.authorName)?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40">
                            In {post.authorCourse} by <span className="hover:text-[#ffb03a] cursor-pointer transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.authorId}`); }}>{post.authorId === user?.uid ? userData?.fullName : post.authorName}</span>
                          </p>
                        </div>

                        <div className="mb-4">
                          <h2 className="text-xl font-black tracking-tight mb-2 leading-tight text-black dark:text-white group-hover:text-[#ffb03a] transition-colors">{post.title}</h2>
                          <div className="relative">
                            <p className={`text-[14px] font-light opacity-60 leading-relaxed whitespace-pre-wrap ${expandedPosts.has(post.id) ? '' : 'line-clamp-3'}`}>
                              {renderTextWithLinks(post.text)}
                            </p>
                            {post.text?.length > 150 && (
                              <button 
                                onClick={(e) => toggleExpand(e, post.id)}
                                className="mt-2 text-[10px] font-black uppercase tracking-widest text-[#ffb03a] hover:opacity-70 transition-all"
                              >
                                {expandedPosts.has(post.id) ? 'Read Less' : 'Read More'}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white opacity-40">
                            {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : 'JUST NOW'}
                          </p>
                          <div 
                            className="flex items-center gap-2 group/star cursor-pointer"
                            onClick={(e) => handleStarPost(e, post)}
                          >
                            <Star 
                              size={16} 
                              className={`${post.starredBy?.includes(user?.uid) ? 'text-orange-400' : 'opacity-20'} group-hover/star:scale-110 transition-transform`} 
                              fill={post.starredBy?.includes(user?.uid) ? "currentColor" : "none"} 
                            />
                            <span className="text-[11px] font-bold opacity-40">{post.stars || 0}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
                            <MessageSquare size={16} />
                            <span className="text-[11px] font-bold">{post.commentCount || 0}</span>
                          </div>

                          {post.authorId === user?.uid && (
                            <div className="relative">
                              <button 
                                className={`p-2 rounded-full transition-colors ${activeMenuId === post.id ? 'bg-black/5 dark:bg-white/5 opacity-100' : 'opacity-20 hover:opacity-100'}`}
                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === post.id ? null : post.id); }}
                              >
                                <MoreHorizontal size={16} />
                              </button>
                              
                              <AnimatePresence>
                                {activeMenuId === post.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
                                  >
                                    <button 
                                      onClick={(e) => startEditing(e, post)}
                                      className="w-full px-5 py-4 text-left text-xs font-bold uppercase tracking-widest hover:bg-black/[0.03] dark:hover:bg-white/[0.03] flex items-center gap-3 transition-colors"
                                    >
                                      <Edit3 size={14} className="opacity-40" />
                                      Edit Post
                                    </button>
                                    <button 
                                      onClick={(e) => handleDeletePost(e, post.id)}
                                      className="w-full px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/[0.05] flex items-center gap-3 transition-colors"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </div>

                      {post.imageUrl && (
                        <div className="w-32 sm:w-56 h-24 sm:h-36 rounded-lg overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border border-black/5 dark:border-white/5 shadow-sm">
                          <img src={post.imageUrl} alt="" className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                  {index < filteredPosts.length - 1 && (
                    <div className="h-px w-full bg-black/10 dark:bg-white/20 my-10" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-32 space-y-12">
              {/* Who to connect with */}
              <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-lg p-8 border border-black/[0.03] dark:border-white/[0.05]">
                <h3 className="text-[10px] font-black tracking-[0.2em] opacity-50 uppercase mb-8">Who to connect with</h3>
                <div className="space-y-3">
                  {connectWith.map((person) => (
                    <div 
                      key={person.uid} 
                      onClick={() => navigate(`/profile/${person.uid}`)}
                      className="flex items-center justify-between group cursor-pointer gap-4"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="size-10 rounded-full overflow-hidden bg-black/[0.04] dark:bg-white/[0.04] flex items-center justify-center shrink-0">
                          {person.profileImageUrl ? (
                            <img src={person.profileImageUrl} alt="" className="size-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                          ) : (
                            <div className="text-xs font-bold opacity-20">{person.fullName?.charAt(0)}</div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[13px] font-bold tracking-tight truncate group-hover:text-[#ffb03a] transition-colors">{person.fullName}</h4>
                          <p className="text-[9px] font-black uppercase tracking-[0.1em] opacity-20 truncate">{person.course}</p>
                        </div>
                      </div>
                      <button 
                        className="px-4 py-2 rounded-lg bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-black uppercase tracking-widest group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all shadow-sm shrink-0"
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => navigate('/batchmates')}
                  className="mt-8 text-[10px] font-black uppercase tracking-widest text-[#ffb03a] hover:opacity-70 transition-all"
                >
                  See all batchmates
                </button>
              </div>

              {/* Sidebar Footer */}
              <div className="pt-12 border-t border-black/[0.05] dark:border-white/[0.05]">
                <div className="flex flex-wrap gap-x-4 gap-y-2 mb-8">
                  {['HELP', 'STATUS', 'PRIVACY', 'TERMS', 'TEAMS'].map((link) => (
                    <Link key={link} to="#" className="text-[10px] font-bold opacity-40 hover:opacity-100 transition-opacity tracking-widest">
                      {link}
                    </Link>
                  ))}
                </div>
                <div className="text-[10px] font-black tracking-widest opacity-30">
                  © 2026 INDUSCONNECT
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-lg overflow-hidden shadow-2xl relative z-10 border border-black/10 dark:border-white/10"
            >
              <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight">{editingPost ? 'Edit Update' : 'Share an update'}</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="p-8">
                <input
                  autoFocus
                  type="text"
                  placeholder="Post Title"
                  className="w-full bg-black/5 dark:bg-white/5 rounded-lg px-6 py-4 outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all text-lg font-bold mb-4"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
                <textarea
                  placeholder="Details..."
                  maxLength={700}
                  className="w-full h-40 bg-black/5 dark:bg-white/5 rounded-lg p-6 outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all text-base font-light mb-6 resize-none"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#ffb03a]">
                      <ImageIcon size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </label>
                    <div className="text-xs font-bold opacity-20 uppercase tracking-widest">
                      {newPostText.length} / 700
                    </div>
                  </div>
                  <button
                    disabled={!newPostText.trim() || !newPostTitle.trim() || isSubmitting}
                    className={`px-8 py-4 rounded-lg bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center gap-3`}
                  >
                    {isSubmitting ? 'Saving...' : (editingPost ? 'Update' : 'Post Update')}
                    <Send size={16} />
                  </button>
                </div>
                
                {imagePreview && (
                  <div className="mt-6 relative rounded-lg overflow-hidden group">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setPostImage(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Home;
