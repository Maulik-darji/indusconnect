import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, MessageSquare, Send, Trash2, Edit3, MoreHorizontal, X, Image as ImageIcon } from 'lucide-react';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, getDocs, getDocsFromServer, where } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const [editImage, setEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);

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

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!editTitle.trim() || !editText.trim()) return;
    setIsSubmitting(true);
    try {
      let imageUrl = post.imageUrl || null;
      if (editImage) {
        const imageRef = ref(storage, `feed_images/${Date.now()}_${editImage.name}`);
        await uploadBytes(imageRef, editImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      await updateDoc(doc(db, 'home_feed', postId), {
        title: editTitle,
        text: editText,
        imageUrl: imageUrl,
        updatedAt: serverTimestamp()
      });
      setPost({ ...post, title: editTitle, text: editText, imageUrl: imageUrl });
      setIsEditing(false);
      setEditImage(null);
      toast.success('Post updated!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!postId) return;

    const fetchPostAndComments = async () => {
      try {
        const postRef = doc(db, 'home_feed', postId);
        const postSnap = await getDocsFromServer(query(collection(db, 'home_feed'), where('__name__', '==', postId)));
        
        if (!postSnap.empty) {
          const docSnap = postSnap.docs[0];
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          setPost(null);
        }

        const commentsRef = collection(db, 'home_feed', postId, 'comments');
        const qComments = query(commentsRef, orderBy('createdAt', 'asc'));
        const commentsSnap = await getDocsFromServer(qComments);
        setComments(commentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        setLoading(false);
      } catch (err) {
        console.error("Error fetching post detail:", err);
        setLoading(false);
      }
    };

    fetchPostAndComments();
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
          className="bg-white dark:bg-white/[0.03] rounded-lg border border-black/[0.03] dark:border-white/[0.05] p-8 mb-12"
        >
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => navigate(`/profile/${post.authorId}`)}>
              <div className="size-10 rounded-full overflow-hidden bg-black/5 dark:bg-white/5">
                {(post.authorId === user?.uid ? userData?.profileImageUrl : post.authorPhoto) ? (
                  <img src={post.authorId === user?.uid ? userData?.profileImageUrl : post.authorPhoto} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center text-[10px] font-bold opacity-20">
                    {(post.authorId === user?.uid ? userData?.fullName : post.authorName)?.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-tight mb-1 hover:text-[#ffb03a] transition-colors">{post.authorId === user?.uid ? userData?.fullName : post.authorName}</h4>
                <p className="text-[9px] font-black uppercase tracking-widest opacity-20">{post.authorCourse}</p>
              </div>
            </div>

            {post.authorId === user?.uid && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditTitle(post.title || '');
                  setEditText(post.text);
                  setEditImagePreview(post.imageUrl || null);
                  setIsEditing(true);
                }}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors opacity-20 hover:opacity-100"
              >
                <Edit3 size={20} />
              </button>
              <button
                onClick={handleDeletePost}
                className="p-2 hover:bg-red-50 text-red-400 rounded-full transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
          )}
          </div>

          <div className="mb-8">
            <h1 className="text-xl md:text-2xl font-black tracking-tight mb-4 leading-tight text-black dark:text-white">
              {post.title || post.text?.split('\n')[0]}
            </h1>
            <p className="text-[14px] font-medium opacity-50 leading-relaxed whitespace-pre-wrap mb-8">
              {renderTextWithLinks(post.text)}
            </p>
            {post.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-black/5 dark:border-white/10 shadow-lg">
                <img src={post.imageUrl} alt="" className="w-full h-auto object-cover" />
              </div>
            )}
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
          
          {/* Comment Input or Sign In Link */}
          {user ? (
            <form onSubmit={handleAddComment} className="relative mb-12">
              <textarea
                placeholder="Add your thoughts..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full bg-white dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg p-6 pr-16 outline-none focus:border-[#ffb03a]/30 transition-all text-sm font-light resize-none h-24"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSubmitting}
                className="absolute right-6 bottom-6 p-3 bg-black dark:bg-white text-white dark:text-black rounded-full hover:scale-110 transition-all disabled:opacity-20"
              >
                <Send size={18} />
              </button>
            </form>
          ) : (
            <Link 
              to="/signup"
              className="block w-full mb-12 py-6 px-6 bg-white dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] rounded-lg text-center text-sm font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
            >
              Sign in to leave a comment
            </Link>
          )}

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
                <div className="flex-1 bg-gray-200 dark:bg-white/[0.08] rounded-lg p-5 border border-black/[0.03] dark:border-white/[0.05] relative group/comment">
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
      {/* Edit Post Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setIsEditing(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-lg overflow-hidden shadow-2xl relative z-10 border border-black/10 dark:border-white/10"
            >
              <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-2xl font-bold tracking-tight">Edit post</h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdatePost} className="p-8">
                <input
                  autoFocus
                  type="text"
                  placeholder="Post Title"
                  className="w-full bg-black/5 dark:bg-white/5 rounded-2xl px-6 py-4 outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all text-lg font-bold mb-4"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  placeholder="Details..."
                  maxLength={700}
                  className="w-full h-40 bg-black/5 dark:bg-white/5 rounded-lg p-6 outline-none border border-transparent focus:border-[#ffb03a]/30 transition-all text-base font-light mb-6 resize-none"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors text-[#ffb03a]">
                      <ImageIcon size={20} />
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                    </label>
                    <div className="text-xs font-bold opacity-20 uppercase tracking-widest">
                      {editText.length} / 700
                    </div>
                  </div>
                  <button
                    disabled={!editText.trim() || !editTitle.trim() || isSubmitting}
                    className={`px-8 py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-20 flex items-center gap-3`}
                  >
                    {isSubmitting ? 'Saving...' : 'Update'}
                    <Send size={16} />
                  </button>
                </div>

                {editImagePreview && (
                  <div className="mt-6 relative rounded-2xl overflow-hidden group">
                    <img src={editImagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button 
                      type="button"
                      onClick={() => { setEditImage(null); setEditImagePreview(null); }}
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

export default PostDetail;
