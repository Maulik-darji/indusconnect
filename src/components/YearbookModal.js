import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const YearbookModal = ({ mate, onClose }) => {
  const { userData } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    // Add to local state just for UI demonstration
    setMessages([...messages, { text: newMessage, author: userData?.fullName || 'Anonymous' }]);
    setNewMessage('');
  };

  if (!mate) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-[80vh] w-full max-w-5xl overflow-hidden rounded-xl border border-white/10 shadow-2xl"
          style={{ backgroundColor: '#10100e' }}
        >
          {/* Left Side - Portrait */}
          <div className="relative hidden w-[45%] flex-col justify-end overflow-hidden border-r border-white/5 bg-[#1a1a1a] md:flex">
            {mate.profileImageUrl ? (
              <img src={mate.profileImageUrl} alt={mate.fullName} className="absolute inset-0 size-full object-cover grayscale opacity-80" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <span className="text-[12rem] font-bold tracking-tighter text-white">ΔΔ</span>
              </div>
            )}
            
            {/* Gradient overlay for text */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            
            <div className="relative z-10 p-10 text-white">
              <h2 className="premium-title mb-3 text-5xl">{mate.fullName}</h2>
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest opacity-80">
                <span className="text-[#ffb03a]">{mate.course}</span>
                <span className="opacity-40">|</span>
                <span>{mate.iuNumber ? mate.iuNumber : `SEC ${mate.section}`}</span>
              </div>
            </div>
          </div>

          {/* Right Side - Messages */}
          <div className="flex w-full flex-col md:w-[55%]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 p-6 px-8">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-black tracking-[0.2em] text-white/20">////</span>
                <h3 className="font-serif italic text-white/90 text-lg">{mate.fullName}</h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/40">
                  {messages.length} REPLIES
                </span>
              </div>
              <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* Message List Area */}
            <div className="flex flex-1 flex-col items-center justify-center p-8 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="text-center opacity-40">
                  
                </div>
              ) : (
                <div className="w-full h-full flex flex-col gap-6 justify-end pb-4">
                  {messages.map((msg, i) => (
                    <div key={i} className="flex flex-col gap-1 items-end">
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-br-sm px-5 py-3 max-w-[80%]">
                        <p className="text-white/90 text-sm">{msg.text}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 pr-2">{msg.author}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 px-8 pt-4">
              <div className="relative flex items-center rounded-2xl border border-white/10 bg-white/5 p-1.5 transition-colors focus-within:border-white/30">
                <input
                  type="text"
                  placeholder="Write message..."
                  className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#ffb03a] text-black transition-transform hover:scale-105 active:scale-95"
                >
                  <Send size={18} className="-ml-0.5 mt-0.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default YearbookModal;
