import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MessageSquare, Heart, Sun, Moon, LogOut, Menu, X, QrCode, ChevronDown, Image as ImageIcon, Settings } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_SUPPORT_ITEMS = [
  { key: 'tea', label: 'Buy Tea', amount: 5 },
  { key: 'coffee', label: 'Buy Coffee', amount: 50 },
  { key: 'fries', label: 'Buy French Fries', amount: 100 },
  { key: 'pizza', label: 'Buy Pizza', amount: 200 }
];

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { userData } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showQRPreview, setShowQRPreview] = useState(false);
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [inboxUsers, setInboxUsers] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [supportItems, setSupportItems] = useState(DEFAULT_SUPPORT_ITEMS);

  useEffect(() => {
    const unsubPayment = onSnapshot(
      doc(db, 'settings', 'payment'),
      (snapshot) => {
        if (snapshot.exists()) {
          setQrCodeUrl(snapshot.data().qrCodeUrl);
        }
      },
      () => {
        setQrCodeUrl(null);
      }
    );

    const unsubAdminSettings = onSnapshot(
      doc(db, 'settings', 'admin'),
      (snapshot) => {
        if (snapshot.exists() && snapshot.data().supportItems) {
          setSupportItems(snapshot.data().supportItems);
        }
      },
      () => {
        setSupportItems(DEFAULT_SUPPORT_ITEMS);
      }
    );

    return () => {
      unsubPayment();
      unsubAdminSettings();
    };
  }, []);

  useEffect(() => {
    if (!userData?.uid) return;
    
    setInboxLoading(true);
    const q = query(
      collection(db, 'messages'),
      where('participants', 'array-contains', userData.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const messages = snapshot.docs.map(d => d.data());
      
      const unread = messages.some(m => m.recipientId === userData.uid && m.read === false);
      setHasUnread(unread);

      const userIds = new Set();
      messages.forEach(msg => {
        if (msg.participants) {
          msg.participants.forEach(id => {
            if (id !== userData.uid) userIds.add(id);
          });
        } else {
          if (msg.senderId !== userData.uid) userIds.add(msg.senderId);
          if (msg.recipientId !== userData.uid) userIds.add(msg.recipientId);
        }
      });

      const usersData = [];
      for (const id of userIds) {
        if (!id) continue;
        let uDoc = await getDoc(doc(db, 'students', id));
        if (!uDoc.exists()) uDoc = await getDoc(doc(db, 'faculties', id));
        if (!uDoc.exists()) uDoc = await getDoc(doc(db, 'users', id));
        if (uDoc.exists()) {
          const userUnread = messages.some(m => m.recipientId === userData.uid && m.senderId === id && m.read === false);
          usersData.push({ id: uDoc.id, ...uDoc.data(), hasUnread: userUnread });
        }
      }
      setInboxUsers(usersData);
      setInboxLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.uid]);

  const menuItems = [
    { icon: <Home size={18} />, label: 'Home', path: '/' },
    { icon: <Users size={18} />, label: userData?.role === 'faculty' ? 'Faculty Directory' : 'Batchmates', path: '/batchmates' },
    { icon: <MessageSquare size={18} />, label: 'Inbox', isInbox: true },
    { icon: <ImageIcon size={18} />, label: 'Media Vault', path: '/archive' },
    { icon: <Heart size={18} />, label: 'The Wall', path: '/the-wall' },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const isTranslucent = location.pathname === '/the-wall';

  return (
    <>
      <nav className={`fixed top-0 left-0 w-full h-20 border-b border-black/5 dark:border-white/5 z-50 transition-all duration-300 ${isTranslucent ? 'dark-translucent' : 'bg-white/80 dark:bg-black/80 backdrop-blur-xl'}`}>
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${isTranslucent ? 'bg-white/10' : 'bg-black dark:bg-white shadow-lg'}`}>
              <span className={`font-bold text-xl ${isTranslucent ? 'text-white' : 'text-white dark:text-black'}`}>I</span>
            </div>
            <span className="text-2xl premium-title hidden md:block">IndusConnect</span>
          </Link>
 
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {menuItems.map((item) => {
                if (item.isInbox) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => setIsInboxOpen(true)}
                      className={`relative flex items-center gap-2 px-5 py-2 rounded-xl transition-all font-semibold text-sm ${
                        isTranslucent ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                      {hasUnread && (
                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                  );
                }
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-all font-semibold text-sm ${
                      isActive 
                        ? (isTranslucent ? 'bg-white/10 text-white' : 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10')
                        : (isTranslucent ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5')
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              to="/support"
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase tracking-wider"
            >
              <Heart size={16} fill="currentColor" />
              <span className="hidden sm:inline">Support Project</span>
            </Link>

            <button 
              onClick={toggleTheme}
              className={`p-2.5 sm:p-3 rounded-xl transition-all reset-button ${
                isTranslucent 
                  ? 'bg-white/10 text-white hover:bg-white/20' 
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black'
              }`}
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
 
            {/* Profile Dropdown */}
            <div 
              className="relative hidden sm:block"
              onMouseEnter={() => setShowProfileMenu(true)}
              onMouseLeave={() => setShowProfileMenu(false)}
            >
              <div className={`size-11 rounded-xl border flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
                isTranslucent 
                  ? 'border-white/20 bg-white/10 hover:border-white' 
                  : 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 hover:border-black dark:hover:border-white'
              }`}>
                {userData?.profileImageUrl ? (
                  <img src={userData.profileImageUrl} alt="Profile" className="size-full object-cover" />
                ) : (
                  <span className={`font-bold text-sm ${isTranslucent ? 'text-white' : ''}`}>{userData?.fullName?.charAt(0) || 'U'}</span>
                )}
              </div>
              
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full pt-2 w-56 z-[60]"
                  >
                    <div className={`${isTranslucent ? 'bg-black text-white border-white/10' : 'bg-white/90 dark:bg-black/90 border-black/10 dark:border-white/10'} backdrop-blur-xl border rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden p-2`}>
                      <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 mb-1 text-black dark:text-white">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Signed in as</p>
                        <p className="text-sm font-bold truncate">{userData?.fullName}</p>
                      </div>
                      
                      <Link 
                        to="/settings" 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold text-black dark:text-white"
                      >
                        <Settings size={18} className="opacity-50" />
                        Settings
                      </Link>
                      
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors text-sm font-bold text-left"
                      >
                        <LogOut size={18} />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button 
              className={`md:hidden p-2.5 rounded-xl reset-button ${
                isTranslucent 
                  ? 'bg-white/10 text-white' 
                  : 'bg-black/5 dark:bg-white/5'
              }`}
              onClick={() => setIsOpen(!isOpen)}
              title="Menu"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-0 w-full bg-white dark:bg-black border-b border-black/10 dark:border-white/10 z-40 p-4 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                item.isInbox ? (
                  <button
                    key={item.label}
                    className={`relative flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5`}
                    onClick={() => { setIsOpen(false); setIsInboxOpen(true); }}
                  >
                    {item.icon}
                    <span className="font-bold">{item.label}</span>
                    {hasUnread && (
                      <span className="absolute top-4 left-9 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                      </span>
                    )}
                  </button>
                ) : (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-4 p-4 rounded-xl ${
                      location.pathname === item.path ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/5 dark:bg-white/5'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    <span className="font-bold">{item.label}</span>
                  </Link>
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Large Preview */}
      <AnimatePresence>
        {showQRPreview && qrCodeUrl && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
              onClick={() => setShowQRPreview(false)}
            />
            <motion.div
              initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 max-w-lg w-full bg-white p-8 rounded-3xl shadow-2xl overflow-hidden"
            >
              <button 
                onClick={() => setShowQRPreview(false)}
                className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h2 className="text-3xl premium-title mb-4">Support IndusConnect</h2>
              <p className="text-sm opacity-60 mb-8 leading-relaxed">Your contributions help us keep the platform free for students and alumni.</p>
              
              <div className="bg-white p-4 sm:p-6 rounded-xl inline-block mb-5 shadow-2xl border border-black/5">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Support QR" className="w-56 h-56 sm:w-64 sm:h-64 object-contain" />
                ) : (
                  <div className="w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center text-black/20">
                    <QrCode size={80} />
                    <p className="text-xs font-bold mt-4 uppercase tracking-widest">QR Code Pending</p>
                  </div>
                )}
                <div className="h-px bg-black/5 my-6" />
                <p className="text-[10px] text-black font-bold uppercase tracking-[0.2em]">Scan to Support Project</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {supportItems.map((item) => (
                  <div key={item.key} className="rounded-xl bg-black/5 px-3 py-3 text-left dark:bg-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">{item.label}</p>
                    <p className="mt-1 text-lg font-black">Rs {item.amount}</p>
                  </div>
                ))}
              </div>


            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Inbox Sidebar Overlay */}
      <AnimatePresence>
        {isInboxOpen && (
          <div className="fixed inset-0 z-[300] flex justify-start">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsInboxOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm h-full bg-white dark:bg-[#0a0a0a] shadow-2xl flex flex-col z-10"
            >
              <div className="flex items-center justify-between p-6 border-b border-black/5 dark:border-white/5">
                <h2 className="text-2xl font-bold premium-title">Inbox</h2>
                <button 
                  onClick={() => setIsInboxOpen(false)}
                  className="p-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {inboxLoading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
                    ))}
                  </div>
                ) : inboxUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 opacity-40">
                    <MessageSquare size={32} className="mb-2" />
                    <p className="text-sm font-bold">No conversations yet</p>
                  </div>
                ) : (
                  inboxUsers.map(user => (
                    <div 
                      key={user.id}
                      onClick={() => {
                        setIsInboxOpen(false);
                        navigate(`/messages/${user.id}`);
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors"
                    >
                      <div className="size-12 rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0 border border-black/5 dark:border-white/5">
                        {user.profileImageUrl ? (
                          <img src={user.profileImageUrl} alt={user.fullName} className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center font-bold text-lg opacity-40">
                            {user.fullName?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-sm truncate">{user.fullName}</p>
                          {user.hasUnread && <div className="w-2 h-2 bg-red-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />}
                        </div>
                        <p className="text-xs opacity-60 truncate">{user.course}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
