import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc, writeBatch, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { Send, Image as ImageIcon, User as UserIcon, Loader2, MessageSquare, CheckCheck, Search, MoreVertical, Trash2, Edit2, Reply, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Messages = () => {
  const { recipientId } = useParams();
  const navigate = useNavigate();
  const { user, userData, userCache, saveToCache } = useAuth();
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [conversations, setConversations] = useState(() => {
    try {
      // Use a generic key or handle null user for initial state
      const cached = localStorage.getItem('indus_convos_last');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMenuId, setShowMenuId] = useState(null);
  
  const messagesEndRef = useRef();
  const prevMessagesCount = useRef(0);

  // Load user-specific cache once user is available
  useEffect(() => {
    if (user?.uid) {
      try {
        const cached = localStorage.getItem(`indus_convos_${user.uid}`);
        if (cached) setConversations(JSON.parse(cached));
      } catch (e) {}
    }
  }, [user?.uid]);

  // Optimized Fetch Conversations
  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;

    const fallback = setTimeout(() => setLoading(false), 5000);

    const q = query(
      collection(db, 'messages'), 
      where('participants', 'array-contains', uid), 
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      clearTimeout(fallback);
      const messagesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const participantStats = {};
      const userIdsSet = new Set();

      messagesData.forEach(m => {
        const otherId = m.participants?.find(id => id !== uid);
        if (!otherId) return;
        userIdsSet.add(otherId);
        
        if (!participantStats[otherId]) {
          participantStats[otherId] = {
            lastMsg: m,
            unreadCount: 0
          };
        }
        
        if (m.senderId === otherId && m.recipientId === uid && !m.read) {
          participantStats[otherId].unreadCount++;
        }
      });

      const userIds = Array.from(userIdsSet);
      
      const updateUI = () => {
        const convos = userIds.map(id => {
          const stats = participantStats[id];
          const lastMsg = stats.lastMsg;
          const cachedUser = userCache[id];
          return { 
            id,
            fullName: cachedUser?.fullName || 'Loading...',
            profileImageUrl: cachedUser?.profileImageUrl,
            course: cachedUser?.course,
            lastMessage: lastMsg?.deleted ? 'Message was deleted' : (lastMsg?.text || (lastMsg?.imageUrl ? 'Sent an image' : '')),
            unreadCount: stats.unreadCount,
            lastMsgTime: lastMsg?.createdAt?.toMillis() || 0
          };
        }).filter(Boolean).sort((a, b) => b.lastMsgTime - a.lastMsgTime);
        
        setConversations(convos);
        if (user?.uid) {
          try {
            localStorage.setItem(`indus_convos_${user.uid}`, JSON.stringify(convos));
            localStorage.setItem('indus_convos_last', JSON.stringify(convos));
          } catch (e) {}
        }
      };

      updateUI();
      setLoading(false);

      const missingIds = userIds.filter(id => !userCache[id]);
      if (missingIds.length > 0) {
        const fetchMissing = async () => {
          try {
            await Promise.all(missingIds.map(async (id) => {
              const [sDoc, fDoc, uDoc] = await Promise.all([
                getDoc(doc(db, 'students', id)),
                getDoc(doc(db, 'faculties', id)),
                getDoc(doc(db, 'users', id))
              ]);
              const foundDoc = sDoc.exists() ? sDoc : (fDoc.exists() ? fDoc : (uDoc.exists() ? uDoc : null));
              if (foundDoc) saveToCache(id, { id: foundDoc.id, ...foundDoc.data() });
            }));
            updateUI();
          } catch (err) {
            console.error("Error fetching background profiles:", err);
          }
        };
        fetchMissing();
      }
    }, (err) => {
      clearTimeout(fallback);
      console.error("Inbox snapshot error:", err);
      setLoading(false);
    });
    
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [user?.uid, userCache, saveToCache]);

  // Fetch active recipient
  useEffect(() => {
    if (!recipientId) { setRecipient(null); return; }
    if (userCache[recipientId]) { setRecipient(userCache[recipientId]); return; }
    const fetchRecipient = async () => {
      const [sDoc, fDoc, uDoc] = await Promise.all([
        getDoc(doc(db, 'students', recipientId)),
        getDoc(doc(db, 'faculties', recipientId)),
        getDoc(doc(db, 'users', recipientId))
      ]);
      const foundDoc = sDoc.exists() ? sDoc : (fDoc.exists() ? fDoc : (uDoc.exists() ? uDoc : null));
      if (foundDoc) {
        const data = { id: foundDoc.id, ...foundDoc.data() };
        saveToCache(recipientId, data);
        setRecipient(data);
      }
    };
    fetchRecipient();
  }, [recipientId, userCache, saveToCache]);

  // Fetch messages + Real-time Mark as Read
  useEffect(() => {
    if (!recipientId || !user?.uid) return;
    
    // Fetch all messages for the current user and filter by recipient in client
    // This ensures compatibility with older messages that might not have a 'chatId'
    const q = query(
      collection(db, 'messages'), 
      where('participants', 'array-contains', user.uid),
      orderBy('createdAt', 'desc'),
      limit(500) // Reasonable limit for a single conversation's context
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMsgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter for messages between these two specific participants
      const chatMsgs = allMsgs.filter(m => 
        m.participants && m.participants.includes(recipientId)
      );

      // Sort chronological for the UI
      const sortedMsgs = chatMsgs.sort((a, b) => 
        (a.createdAt?.toMillis?.() || Date.now()) - (b.createdAt?.toMillis?.() || Date.now())
      );
      
      setMessages(sortedMsgs);
      
      if (sortedMsgs.length > prevMessagesCount.current) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
      }
      prevMessagesCount.current = sortedMsgs.length;

      const unreadMsgs = sortedMsgs.filter(m => m.recipientId === user.uid && m.read === false);
      if (unreadMsgs.length > 0) {
        const batch = writeBatch(db);
        unreadMsgs.forEach(m => {
          batch.update(doc(db, 'messages', m.id), { read: true });
        });
        batch.commit().catch(err => console.error("Error marking messages as read:", err));
      }
    }, (err) => {
      console.error("Messages snapshot error:", err);
    });
    return () => unsubscribe();
  }, [recipientId, user?.uid]);

  // Aggressive clear unread for THIS recipient
  useEffect(() => {
    if (!recipientId || !user?.uid) return;
    const clearUnread = async () => {
      const q = query(
        collection(db, 'messages'), 
        where('senderId', '==', recipientId), 
        where('recipientId', '==', user.uid), 
        where('read', '==', false)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach(d => batch.update(d.ref, { read: true }));
        await batch.commit();
      }
    };
    clearUnread();
  }, [recipientId, user?.uid]);

  const sendMessage = async (e, imageUrl = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageUrl) return;
    if (editingMessage) {
      await updateDoc(doc(db, 'messages', editingMessage.id), { text: newMessage, edited: true, updatedAt: serverTimestamp() });
      setEditingMessage(null); setNewMessage(''); return;
    }
    const chatId = [user.uid, recipientId].sort().join('_');
    const msgData = {
      chatId, participants: [user.uid, recipientId], senderId: user.uid, recipientId,
      text: newMessage, imageUrl, read: false, createdAt: serverTimestamp(),
      replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, senderId: replyingTo.senderId } : null
    };
    setNewMessage(''); setReplyingTo(null);
    await addDoc(collection(db, 'messages'), msgData);
  };

  const handleDeleteMessage = async (msgId) => {
    await updateDoc(doc(db, 'messages', msgId), { deleted: true, text: '', imageUrl: null });
    setShowMenuId(null);
  };

  const handleEditMessage = (msg) => {
    setEditingMessage(msg); setNewMessage(msg.text); setShowMenuId(null);
  };

  const handleReplyMessage = (msg) => {
    setReplyingTo(msg); setShowMenuId(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const imageRef = ref(storage, `chats/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      await sendMessage(null, url);
    } catch (e) { console.error(e); } finally { setUploading(false); }
  };

  const filteredConversations = useMemo(() => 
    conversations.filter(c => c.fullName?.toLowerCase().includes(searchTerm.toLowerCase())),
    [conversations, searchTerm]
  );

  const getDateLabel = (date) => {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date.toMillis ? date.toMillis() : date);
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="relative min-h-screen">
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 z-[100] bg-black/60 backdrop-blur-xl flex flex-col items-center justify-center text-center p-6">
        <div className="size-24 bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mb-8 animate-pulse">
          <MessageSquare size={48} />
        </div>
        <h1 className="text-5xl font-black tracking-tight mb-4 text-white">Inbox Coming Soon</h1>
        <p className="text-lg text-white/60 max-w-md mx-auto leading-relaxed font-light">
          We're polishing the messaging experience to ensure it's lightning fast and private. Stay tuned for the update!
        </p>
        <button 
          onClick={() => navigate('/')}
          className="mt-10 px-8 py-3 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl"
        >
          Back to Home
        </button>
      </div>

      <div className="opacity-20 pointer-events-none grayscale flex flex-col h-screen bg-[#f5f5ee] dark:bg-[#050505] overflow-hidden pt-20 sm:pt-24 md:pt-28">
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-[350px] flex flex-col border-r border-black/[0.05] dark:border-white/[0.05] bg-[#f5f5ee] dark:bg-[#0a0a0a] shrink-0 h-full overflow-hidden">
          <div className="p-6 shrink-0">
            <h2 className="text-2xl premium-title mb-6">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30 dark:text-white/30" size={18} />
              <input 
                type="text" placeholder="Search chats..." 
                className="w-full bg-white/50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none focus:ring-1 ring-black/20 dark:ring-white/20 transition-all"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-6 min-h-0 custom-scrollbar">
            {loading && conversations.length === 0 ? (
              <div className="p-3 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl animate-pulse flex items-center px-4 gap-4" />)}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((convo) => {
                  const displayUnread = (recipientId && convo.id && recipientId.toString() === convo.id.toString()) ? 0 : convo.unreadCount;
                  return (
                    <button
                      key={convo.id} onClick={() => navigate(`/messages/${convo.id}`)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${recipientId === convo.id ? 'bg-white dark:bg-white/[0.08] shadow-sm' : 'bg-black/[0.04] dark:bg-white/[0.03] hover:bg-black/[0.07] dark:hover:bg-white/[0.07]'}`}
                    >
                      <div className="size-11 shrink-0 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
                        {convo.profileImageUrl ? <img src={convo.profileImageUrl} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center opacity-20 font-bold">{convo.fullName?.charAt(0)}</div>}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-center gap-2">
                           <h3 className={`font-bold text-sm truncate ${recipientId === convo.id ? 'text-black dark:text-white' : 'text-black/70 dark:text-white/70'}`}>{convo.fullName}</h3>
                          {displayUnread > 0 && <span className="size-5 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center font-bold">{displayUnread}</span>}
                        </div>
                        <p className="text-xs truncate opacity-40">{convo.lastMessage}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#f5f5ee] dark:bg-[#0a0a0a] h-full overflow-hidden min-h-0">
          <AnimatePresence mode="wait">
            {!recipientId ? (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="size-20 bg-black/[0.03] dark:bg-white/[0.03] rounded-2xl flex items-center justify-center mb-6 text-black/10 dark:text-white/10"><MessageSquare size={40} strokeWidth={1} /></div>
                <h2 className="text-3xl premium-title mb-2">Select a Conversation</h2>
                <p className="max-w-md text-sm opacity-40 font-light">Choose a chat from the sidebar to start messaging.</p>
              </motion.div>
            ) : (
              <motion.div key={recipientId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
                <header className="h-20 shrink-0 flex items-center justify-between px-8 border-b border-black/[0.05] dark:border-white/[0.05] bg-[#f5f5ee]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl z-20">
                  <Link to={`/profile/${recipientId}`} className="flex items-center gap-4 group cursor-pointer">
                    <div className="size-10 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 group-hover:scale-105 transition-transform">
                      {recipient?.profileImageUrl ? <img src={recipient.profileImageUrl} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center opacity-20 font-bold">{recipient?.fullName?.charAt(0)}</div>}
                    </div>
                    <div>
                      <h2 className="font-bold text-base leading-none mb-1 group-hover:text-primary transition-colors">{recipient?.fullName || 'Loading...'}</h2>
                      <p className="text-[9px] font-bold uppercase opacity-30 tracking-widest">{recipient?.course}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link to={`/profile/${recipientId}`} className="p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all"><UserIcon size={18} className="opacity-40" /></Link>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-1.5 bg-[#f5f5ee] dark:bg-[#050505] min-h-0 relative scroll-smooth custom-scrollbar">
                  {messages.map((msg, index) => {
                    const isMe = msg.senderId === user?.uid;
                    const dateLabel = getDateLabel(msg.createdAt);
                    const prevDateLabel = index > 0 ? getDateLabel(messages[index-1].createdAt) : null;
                    const showDateLabel = dateLabel !== prevDateLabel;

                    return (
                      <React.Fragment key={msg.id}>
                        {showDateLabel && (
                          <div className="flex justify-center my-6">
                            <span className="px-4 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] text-[10px] font-bold uppercase tracking-widest opacity-40">{dateLabel}</span>
                          </div>
                        )}
                        <div className={`flex group items-end gap-2 relative ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className="relative flex items-end gap-2 group">
                            {!msg.deleted && (
                              <div className={`absolute top-0 ${isMe ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                                <button onClick={() => setShowMenuId(showMenuId === msg.id ? null : msg.id)} className="size-7 flex items-center justify-center bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full"><MoreVertical size={14} className="opacity-40" /></button>
                                <AnimatePresence>{showMenuId === msg.id && (
                                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`absolute top-8 ${isMe ? 'left-0' : 'right-0'} w-32 bg-white dark:bg-[#1a1a1a] border border-black/5 shadow-2xl rounded-xl p-1 z-30`}>
                                    <button onClick={() => handleReplyMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-black/5 rounded-lg transition-colors"><Reply size={14}/> Reply</button>
                                    {isMe && <button onClick={() => handleEditMessage(msg)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-black/5 rounded-lg transition-colors"><Edit2 size={14}/> Edit</button>}
                                    {isMe && <button onClick={() => handleDeleteMessage(msg.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"><Trash2 size={14}/> Delete</button>}
                                  </motion.div>
                                )}</AnimatePresence>
                              </div>
                            )}

                            <div className={`max-w-[300px] md:max-w-[450px] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              {msg.replyTo && (
                                <div className="mb-1.5 px-4 py-2.5 bg-black/[0.06] dark:bg-white/[0.1] rounded-t-2xl rounded-br-2xl text-sm border-l-[6px] border-black/40 dark:border-white/40 italic opacity-80 max-w-full truncate">
                                  {msg.replyTo.text}
                                </div>
                              )}
                              {msg.imageUrl && <div className="mb-2 rounded-xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm"><img src={msg.imageUrl} alt="Sent" className="max-h-72 w-auto object-cover" /></div>}
                              <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm relative overflow-hidden flex items-end gap-2 ${
                                msg.deleted 
                                  ? 'bg-black/[0.08] dark:bg-white/[0.08] italic opacity-60 border border-dashed border-black/20 dark:border-white/20' 
                                  : isMe 
                                    ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-none' 
                                    : 'bg-white dark:bg-[#262626] dark:text-white rounded-tl-none border border-black/5 dark:border-white/5'
                              }`}>
                                <p className="leading-relaxed flex-1">{msg.deleted ? 'Message was deleted' : msg.text}</p>
                                {!msg.deleted && (
                                  <div className="flex items-center gap-1 shrink-0 -mb-1 translate-y-0.5">
                                    <span className={`text-[8px] font-bold uppercase tracking-tighter ${isMe ? 'opacity-50' : 'opacity-30'}`}>{msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                                    {isMe && (
                                      <div className="flex items-center ml-1">
                                        <CheckCheck 
                                          size={16} 
                                          className={msg.read === true ? "text-[#00A3FF]" : "text-gray-400 opacity-40"} 
                                          strokeWidth={2.5}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-6 shrink-0 border-t border-black/[0.05] dark:border-white/[0.05] bg-[#f5f5ee] dark:bg-[#0a0a0a]">
                  {(replyingTo || editingMessage) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-white/50 dark:bg-white/5 rounded-2xl flex items-center justify-between border-l-4 border-black dark:border-white">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">{replyingTo ? 'Replying to' : 'Editing Message'}</p>
                        <p className="text-sm truncate opacity-60 italic">"{replyingTo?.text || editingMessage?.text}"</p>
                      </div>
                      <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); }} className="p-2 hover:bg-black/5 rounded-lg"><X size={16}/></button>
                    </motion.div>
                  )}
                  <form onSubmit={sendMessage} className="flex items-center gap-3 bg-white/80 dark:bg-white/[0.03] p-2 rounded-2xl border border-black/[0.05] dark:border-white/[0.05] shadow-sm">
                    {!editingMessage && <label className="p-3 rounded-xl hover:bg-black/5 cursor-pointer">{uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} className="opacity-40" />}<input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} /></label>}
                    <input type="text" placeholder={editingMessage ? "Edit your message..." : "Type your message..."} className="flex-1 bg-transparent border-none py-3 text-sm font-medium outline-none" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} autoFocus={!!editingMessage} />
                    <button type="submit" className="size-11 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"><Send size={18} /></button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Messages;
