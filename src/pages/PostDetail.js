import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, MessageSquare, Send, Trash2, Edit3, MoreHorizontal, X } from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { userData, user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    if (!postId) return;

    const postRef = doc(db, 'home_feed', postId);
    const unsubscribePost = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    const commentsRef = collection(db, 'home_feed', postId, 'comments');
    const qComments = query(commentsRef, orderBy('createdAt', 'asc'));
    const unsubscribeComments = onSnapshot(qComments, (snap) => {
      setComments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribePost();
      unsubscribeComments();
    };
  }, [postId]);

  const handleStar = async () => {
    if (!user || !post) return;
    const postRef = doc(db, 'home_feed', post.id);
    const isStarred = post.starredBy?.includes(user.uid);

    try {
      await updateDoc(postRef, {
        starredBy: isStarred ? arrayRemove(user.uid) : arrayUnion(user.uid),
        stars: isStarred ? (post.stars || 1) - 1 : (post.stars || 0) + 1
      });
    } catch (e) {
      toast.error('Action failed');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting || !user) return;

    setIsSubmitting(true);
    try {
      const commentsRef = collection(db, 'home_feed', postId, 'comments');
      await addDoc(commentsRef, {
        text: commentText,
        authorId: user.uid,
        authorName: userData.fullName,
        authorPhoto: userData.profileImageUrl || null,
        createdAt: serverTimestamp()
      });

      // Update comment count on post
      const postRef = doc(db, 'home_feed', postId);
      await updateDoc(postRef, {
        commentCount: (post.commentCount || 0) + 1
      });

      setCommentText('');
      toast.success('Comment added!');
    } catch (e) {
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Delete this update?')) return;
    try {
      await deleteDoc(doc(db, 'home_feed', postId));
      toast.success('Post deleted');
      navigate('/');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb] dark:bg-[#181818]">
      <div className="size-8 border-2 border-[#ffb03a] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfdfb] dark:bg-[#181818] p-4 text-center">
      <h2 className="text-4xl font-bold tracking-tight mb-6">Update Not Found</h2>
      <button onClick={() => navigate('/')} className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold uppercase tracking-widest text-xs">
        Go Back
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfdfb] dark:bg-[#181818] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity mb-12"
        >
          <ArrowLeft size={16} />
          Back to Feed
        </button>

        {/* Main Post Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-white/[0.03] rounded-[2rem] border border-black/[0.03] dark:border-white/[0.05] p-8 mb-12"
        >
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${post.authorId}`)}>
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
                <h4 className="text-sm font-bold tracking-tight mb-1 hover:text-[#ffb03a] transition-colors">{post.authorName}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-20">{post.authorCourse}</p>
              </div>
            </div>

            {post.authorId === user?.uid && (
              <button 
                onClick={handleDeletePost}
                className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors opacity-30 hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="mb-8">
            <h1 className="text-xl md:text-2xl font-black tracking-tight mb-4 leading-tight text-black dark:text-white">
              {post.title || post.text?.split('\n')[0]}
            </h1>
            <p className="text-[14px] font-medium opacity-50 leading-relaxed whitespace-pre-wrap">
              {post.text?.includes('\n') ? post.text?.split('\n').slice(1).join('\n') : (post.title ? post.text : '')}
            </p>
          </div>

          <div className="flex items-center gap-6 pt-6 border-t border-black/[0.05] dark:border-white/[0.05]">
            <button 
              onClick={handleStar}
              className="flex items-center gap-2.5 group"
            >
              <Star 
                size={20} 
                className={`${post.starredBy?.includes(user?.uid) ? 'text-orange-400' : 'opacity-20'} group-hover:scale-110 transition-transform`} 
                fill={post.starredBy?.includes(user?.uid) ? "currentColor" : "none"} 
              />
              <span className="text-xs font-bold opacity-40">{post.stars || 0}</span>
            </button>
            <div className="flex items-center gap-2.5 opacity-20">
              <MessageSquare size={20} />
              <span className="text-xs font-bold">{post.commentCount || 0}</span>
            </div>
            <div className="ml-auto text-[9px] font-black uppercase tracking-widest opacity-20">
              {post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : ''}
            </div>
          </div>
        </motion.div>

        {/* Comments Section */}
        <div className="space-y-8">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-30 mb-8">Comments</h3>
          
          {/* Comment Input */}
          <form onSubmit={handleAddComment} className="relative mb-12">
            <textarea
              placeholder="Add your thoughts..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-[2rem] p-6 pr-16 outline-none focus:border-[#ffb03a]/30 transition-all text-sm font-light resize-none h-24"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || isSubmitting}
              className="absolute right-6 bottom-6 p-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-110 transition-all disabled:opacity-20"
            >
              <Send size={18} />
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {comments.map((comment) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 group"
              >
                <div className="size-10 rounded-full overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 cursor-pointer" onClick={() => navigate(`/profile/${comment.authorId}`)}>
                  {comment.authorPhoto ? (
                    <img src={comment.authorPhoto} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-[10px] font-bold opacity-20">
                      {comment.authorName?.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 bg-black/[0.02] dark:bg-white/[0.02] rounded-[1.5rem] p-5 border border-black/[0.03] dark:border-white/[0.05] relative group/comment">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[11px] font-bold tracking-tight">{comment.authorName}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-20">
                        {comment.createdAt?.toDate ? new Date(comment.createdAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                      {comment.authorId === user?.uid && (
                        <button 
                          onClick={async () => {
                            if (!window.confirm('Delete this comment?')) return;
                            try {
                              await deleteDoc(doc(db, 'home_feed', postId, 'comments', comment.id));
                              await updateDoc(doc(db, 'home_feed', postId), {
                                commentCount: Math.max(0, (post.commentCount || 1) - 1)
                              });
                              toast.success('Comment deleted');
                            } catch (e) {
                              toast.error('Failed to delete');
                            }
                          }}
                          className="opacity-0 group-hover/comment:opacity-40 hover:!opacity-100 transition-all text-red-500"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-[13px] font-light opacity-60 leading-relaxed">
                    {comment.text}
                  </p>
                </div>
              </motion.div>
            ))}
            
            {comments.length === 0 && (
              <div className="py-12 text-center text-sm font-light opacity-20 italic">
                No comments yet. Start the conversation!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
