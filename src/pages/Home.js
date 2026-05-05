import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Image as ImageIcon, MessageSquare, Layout, ExternalLink, Star, X, Send, MoreHorizontal, Trash2, Edit3 } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

const Home = () => {
  const { userData, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('For You');
  const [posts, setPosts] = useState([]);
  const [connectWith, setConnectWith] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null);

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPosts(feedPosts);
      setLoading(false);
    });

    // Fetch potential connections (random batchmates)
    const fetchConnections = async () => {
      if (!userData) return;
      try {
        const qMates = query(
          collection(db, 'students'),
          where('course', '==', userData.course || ''),
          limit(5)
        );
        const snap = await getDocs(qMates);
        let mates = snap.docs.map(doc => doc.data()).filter(m => m.uid !== user?.uid);

        if (mates.length < 5) {
          const placeholders = [
            { uid: 'm1', fullName: 'Maulik Darji', course: 'COMPUTER SCIENCE ENGINEERING', profileImageUrl: '' },
            { uid: 'y1', fullName: 'Yug Patel', course: 'COMPUTER SCIENCE ENGINEERING', profileImageUrl: '' },
            { uid: 'a1', fullName: 'Aarav Sharma', course: 'COMPUTER SCIENCE ENGINEERING', profileImageUrl: '' },
            { uid: 'i1', fullName: 'Ishani Patel', course: 'COMPUTER SCIENCE ENGINEERING', profileImageUrl: '' },
            { uid: 'r1', fullName: 'Rohan Malhotra', course: 'COMPUTER SCIENCE ENGINEERING', profileImageUrl: '' },
          ];
          mates = [...mates, ...placeholders].slice(0, 5);
        }
        setConnectWith(mates);
      } catch (e) {
        console.error(e);
      }
    };

    fetchConnections();
    return () => unsubscribe();
  }, [userData, user]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingPost) {
        await updateDoc(doc(db, 'home_feed', editingPost.id), {
          title: newPostTitle,
          text: newPostText,
          updatedAt: serverTimestamp()
        });
        toast.success('Post updated!');
      } else {
        await addDoc(collection(db, 'home_feed'), {
          title: newPostTitle,
          text: newPostText,
          authorId: user.uid,
          authorName: userData.fullName,
          authorPhoto: userData.profileImageUrl || null,
          authorCourse: userData.course || 'N/A',
          createdAt: serverTimestamp(),
          stars: 0,
          starredBy: [],
          commentCount: 0
        });
        toast.success('Update posted!');
      }
      setNewPostText('');
      setNewPostTitle('');
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
    setShowCreateModal(true);
    setActiveMenuId(null);
  };

  return (
    <div className="min-h-screen bg-[#fdfdfb] dark:bg-[#181818] transition-colors duration-500">
      <div className="max-w-6xl mx-auto px-4 pt-24 pb-12">
        {/* Top Navigation Tabs */}
        <div className="flex items-center gap-8 border-b border-black/[0.05] dark:border-white/[0.05] mb-12">
          {['For You', 'Batchmates'].map((tab) => (
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

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Main Feed Column */}
          <div className="flex-1 min-w-0">
            {/* Post Creation Area */}
            <div className="flex items-center gap-4 mb-12 group cursor-pointer" onClick={() => { setShowCreateModal(true); setEditingPost(null); setNewPostText(''); setNewPostTitle(''); }}>
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
                What's on your mind?
              </div>
            </div>

            {/* Feed List */}
            <div className="space-y-0">
              {posts.length === 0 && !loading && (
                <div className="py-20 text-center opacity-20 italic">
                  No updates yet. Be the first to share something!
                </div>
              )}
              {posts.map((post, index) => (
                <React.Fragment key={post.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => navigate(`/post/${post.id}`)}
                    className="bg-white dark:bg-white/[0.03] rounded-3xl border border-black/[0.03] dark:border-white/[0.05] p-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.authorId}`); }}>
                        <div className="size-10 rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
                          {post.authorPhoto ? (
                            <img src={post.authorPhoto} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center text-[10px] font-bold opacity-20">
                              {post.authorName?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold tracking-tight leading-none mb-1 group-hover:text-[#ffb03a] transition-colors">{post.authorName}</h4>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-20">
                            {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase() : 'JUST NOW'}
                          </p>
                        </div>
                      </div>
                      
                      {post.authorId === user?.uid && (
                        <div className="relative">
                          <button 
                            className={`p-2 rounded-full transition-colors ${activeMenuId === post.id ? 'bg-black/5 dark:bg-white/5 opacity-100' : 'opacity-10 hover:opacity-100'}`}
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === post.id ? null : post.id); }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenuId === post.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 z-50 overflow-hidden"
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

                    <div className="mb-4">
                      <h2 className="text-xl font-black tracking-tight mb-1.5 leading-tight text-black dark:text-white">{post.title}</h2>
                      <p className="text-[13px] font-light opacity-60 leading-relaxed line-clamp-3">
                        {post.text}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 pt-5 border-t border-black/[0.03] dark:border-white/[0.03]">
                      <div 
                        className="flex items-center gap-2 group/star cursor-pointer"
                        onClick={(e) => handleStarPost(e, post)}
                      >
                        <Star 
                          size={18} 
                          className={`${post.starredBy?.includes(user?.uid) ? 'text-orange-400' : 'opacity-20'} group-hover/star:scale-110 transition-transform`} 
                          fill={post.starredBy?.includes(user?.uid) ? "currentColor" : "none"} 
                        />
                        <span className="text-xs font-bold opacity-40">{post.stars || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-20 hover:opacity-100 transition-opacity">
                        <MessageSquare size={18} />
                        <span className="text-xs font-bold">{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </motion.div>
                  {index < posts.length - 1 && (
                    <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05] my-10" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="w-full lg:w-80 shrink-0">
            <div className="sticky top-32 space-y-12">
              {/* Who to connect with */}
              <div className="bg-black/[0.02] dark:bg-white/[0.02] rounded-3xl p-8 border border-black/[0.03] dark:border-white/[0.05]">
                <h3 className="text-[10px] font-black tracking-[0.2em] opacity-50 uppercase mb-8">Who to connect with</h3>
                <div className="space-y-6">
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
                        className="px-4 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-[10px] font-black uppercase tracking-widest group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black transition-all shadow-sm shrink-0"
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
              className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 border border-black/10 dark:border-white/10"
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
                  placeholder="Update Title"
                  className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-6 py-4 outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all text-lg font-bold mb-4"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                />
                <textarea
                  placeholder="Details..."
                  className="w-full h-40 bg-black/5 dark:bg-white/5 rounded-3xl p-6 outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all text-base font-light mb-6 resize-none"
                  value={newPostText}
                  onChange={(e) => setNewPostText(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold opacity-20 uppercase tracking-widest">
                    {newPostText.length} characters
                  </div>
                  <button
                    disabled={!newPostText.trim() || !newPostTitle.trim() || isSubmitting}
                    className={`px-8 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center gap-3`}
                  >
                    {isSubmitting ? 'Saving...' : (editingPost ? 'Update' : 'Post Update')}
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default Home;
