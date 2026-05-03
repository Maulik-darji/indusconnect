import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { Send, Image as ImageIcon, ChevronLeft, User as UserIcon, Loader2, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const Messages = () => {
  const { recipientId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (!recipientId || !user?.uid) return undefined;

    const fetchRecipient = async () => {
      const docRef = doc(db, 'users', recipientId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setRecipient(docSnap.data());
    };
    fetchRecipient();

    const chatId = [user.uid, recipientId].sort().join('_');
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => unsubscribe();
  }, [recipientId, user?.uid]);

  const sendMessage = async (e, imageUrl = null) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !imageUrl) return;

    const chatId = [user.uid, recipientId].sort().join('_');
    const msgData = {
      chatId,
      senderId: user.uid,
      recipientId,
      text: newMessage,
      imageUrl,
      createdAt: serverTimestamp(),
    };

    setNewMessage('');
    await addDoc(collection(db, 'messages'), msgData);
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
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  if (!recipientId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fdfdfb] p-6 pt-24 text-center dark:bg-[#050505] sm:p-8">
        <div className="mb-8 flex size-24 items-center justify-center rounded-2xl bg-black/5 text-black/25 dark:bg-white/5 dark:text-white/25">
          <MessageSquare size={40} />
        </div>
        <h2 className="premium-title mb-2 text-3xl sm:text-4xl">Private Messages</h2>
        <p className="max-w-sm text-base italic opacity-50 sm:text-lg">Select a batchmate to start a conversation.</p>
        <Link to="/batchmates" className="btn-primary mt-8">View Directory</Link>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] min-h-[520px] flex-col bg-[#fdfdfb] pt-20 dark:bg-[#050505]">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col border-x border-black/5 bg-white shadow-2xl dark:border-white/5 dark:bg-[#0a0a0a]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/5 bg-white/90 p-4 backdrop-blur-xl dark:border-white/5 dark:bg-black/90 sm:p-6">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link to="/batchmates" className="rounded-xl p-2 transition-all hover:bg-black/5 dark:hover:bg-white/5" title="Back">
              <ChevronLeft size={24} />
            </Link>
            <div className="size-11 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-black/5 dark:border-white/5 dark:bg-white/5 sm:size-12">
              {recipient?.profileImageUrl ? (
                <img src={recipient.profileImageUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center opacity-15">
                  <UserIcon size={24} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold sm:text-xl">{recipient?.fullName || 'Loading...'}</h2>
              <p className="truncate text-[10px] font-bold uppercase opacity-40">{recipient?.course}</p>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:space-y-6 sm:p-8">
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className="group min-w-0 max-w-[86%] sm:max-w-[70%]">
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="Sent"
                      className="mb-2 max-h-80 max-w-full rounded-2xl border border-black/5 object-cover shadow-lg transition-transform duration-300 hover:scale-[1.02] dark:border-white/5"
                    />
                  )}
                  {msg.text && (
                    <div className={`break-words rounded-2xl p-4 text-sm leading-relaxed shadow-sm sm:p-5 ${
                      isMe
                        ? 'rounded-tr-none bg-black text-white dark:bg-white dark:text-black'
                        : 'rounded-tl-none bg-black/5 dark:bg-white/5'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                  <p className={`mt-2 text-[8px] font-bold uppercase opacity-0 transition-opacity group-hover:opacity-30 ${isMe ? 'text-right' : 'text-left'}`}>
                    {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        <div className="border-t border-black/5 p-3 dark:border-white/5 sm:p-6">
          <form onSubmit={sendMessage} className="flex items-center gap-2 rounded-2xl border border-black/5 bg-black/5 p-2 transition-all duration-300 focus-within:bg-white dark:border-white/5 dark:bg-white/5 dark:focus-within:bg-black sm:gap-4">
            <label className="relative shrink-0 cursor-pointer rounded-full p-3 transition-colors hover:bg-black/5 dark:hover:bg-white/5 sm:p-4" title="Attach image">
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} className="opacity-45" />}
              <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" disabled={uploading} />
            </label>
            <input
              type="text"
              placeholder="Write a message..."
              className="min-w-0 flex-1 border-none bg-transparent py-3 text-sm font-medium outline-none placeholder:opacity-40 sm:py-4"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="submit" className="shrink-0 rounded-full bg-black p-3 text-white shadow-lg transition-all hover:scale-105 active:scale-95 dark:bg-white dark:text-black sm:p-4" title="Send message">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Messages;
