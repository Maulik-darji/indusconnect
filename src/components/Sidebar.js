import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MessageSquare, Heart, Sun, Moon, LogOut, Menu, X, QrCode, ChevronDown, Image as ImageIcon, Settings, LogIn } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { getFunkyAvatar } from '../constants';

const DEFAULT_SUPPORT_ITEMS = [
  { key: 'tea', label: 'Buy Tea', amount: 5 },
  { key: 'coffee', label: 'Buy Coffee', amount: 50 },
  { key: 'fries', label: 'Buy French Fries', amount: 100 },
  { key: 'pizza', label: 'Buy Pizza', amount: 200 }
];

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();
  const { userData, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
   const [hasUnread, setHasUnread] = useState(false);
   const locationRef = React.useRef(location.pathname);
   const userDataRef = React.useRef(userData);
   
   // Keep refs updated
   useEffect(() => {
     locationRef.current = location.pathname;
     userDataRef.current = userData;
   }, [location.pathname, userData]);
  
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'settings', 'payment'));
        if (snapshot.exists()) {
          setQrCodeUrl(snapshot.data().qrCodeUrl);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (!userData?.uid) return;
    
    const q = query(
      collection(db, 'messages'),
      where('recipientId', '==', userData.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const currentPath = locationRef.current;
      const currentUserData = userDataRef.current;
      
      const pathParts = currentPath.split('/');
      const activeRecipientId = pathParts[1] === 'messages' ? pathParts[2] : null;
      
      const trulyUnread = snapshot.docs.filter(d => {
        const msgData = d.data();
        return msgData.senderId !== activeRecipientId;
      });
      
      setHasUnread(trulyUnread.length > 0);
    }, (error) => {
      console.error("Sidebar messages snapshot error:", error);
    });

    return () => {
      setTimeout(() => unsubscribe(), 0);
    };
  }, [userData?.uid]); // Still depend on uid to re-start if user changes

  const menuItems = [
    { icon: <Home size={18} />, label: 'Home', path: '/' },
    { icon: <Users size={18} />, label: userData?.role === 'faculty' ? 'Faculty Directory' : 'Batchmates', path: '/batchmates' },
    { icon: <MessageSquare size={18} />, label: 'Inbox', path: '/messages' },
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
      <nav className={`fixed top-0 left-0 w-full h-20 z-50 transition-all duration-300 liquid-glass ${isTranslucent ? 'grainy' : ''}`}>
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${isTranslucent ? 'bg-white/10' : 'bg-black dark:bg-white shadow-lg'}`}>
              <span className={`font-bold text-xl ${isTranslucent ? 'text-white' : 'text-white dark:text-black'}`}>I</span>
            </div>
            <span className={`text-2xl premium-title hidden md:block ${isTranslucent ? 'text-white' : 'text-black dark:text-white'}`}>IndusConnect</span>
          </Link>
  
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {menuItems.map((item) => {
                if (!user && item.path === '/messages') return null;
                const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-2 px-5 py-2 rounded-xl transition-all font-semibold text-sm ${
                      isActive 
                        ? (isTranslucent ? 'bg-white/10 text-white' : 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10')
                        : (isTranslucent ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5')
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.path === '/messages' && hasUnread && (
                      <span className="absolute top-2 right-2 size-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                    )}
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
 
            {/* Profile Dropdown or Login Button */}
            {user ? (
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
                    <img 
                      src={userData.profileImageUrl} 
                      alt="" 
                      className="size-full object-cover"
                    />
                  ) : (
                    <img 
                      src={getFunkyAvatar(userData?.uid)} 
                      alt="" 
                      className="size-full object-cover"
                    />
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
                      <div className={`${isTranslucent ? 'bg-black/80 text-white border-white/20' : 'bg-white/95 dark:bg-[#1a1a1a]/95 text-black dark:text-white border-black/10 dark:border-white/10'} backdrop-blur-2xl border rounded-xl shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] overflow-hidden p-2`}>
                        <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 mb-1">
                          <p className={`text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1 ${isTranslucent ? 'text-white' : ''}`}>Signed in as</p>
                          <p className={`text-sm font-bold truncate ${isTranslucent ? 'text-white' : ''}`}>{userData?.fullName}</p>
                        </div>
                        
                        <Link 
                          to="/settings" 
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-semibold ${
                            isTranslucent 
                              ? 'text-white hover:bg-white/10' 
                              : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
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
            ) : (
              <Link
                to="/signup"
                className={`hidden sm:flex items-center gap-2 px-6 py-2.5 rounded-xl transition-all font-bold text-sm ${
                  isTranslucent 
                    ? 'bg-white text-black hover:bg-white/90' 
                    : 'bg-black text-white dark:bg-white dark:text-black hover:scale-105 active:scale-95 shadow-lg shadow-black/10'
                }`}
              >
                <LogIn size={18} />
                <span>Join Community</span>
              </Link>
            )}

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
            className="fixed top-20 left-0 w-full frosted-glass dark:bg-black border-b border-black/10 dark:border-white/10 z-40 p-4 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => {
                // Hide Inbox for guest users in mobile menu
                if (!user && item.path === '/messages') return null;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-4 p-4 rounded-xl bg-black/5 dark:bg-white/5`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.icon}
                    <span className="font-bold">{item.label}</span>
                    {item.path === '/messages' && hasUnread && (
                      <span className="absolute top-4 left-9 size-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
                    )}
                  </Link>
                );
              })}
              
              {!user ? (
                <Link
                  to="/signup"
                  className="flex items-center gap-4 p-4 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold"
                  onClick={() => setIsOpen(false)}
                >
                  <LogIn size={18} />
                  <span>Join Community</span>
                </Link>
              ) : (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-4 p-4 rounded-xl bg-red-500/10 text-red-500 font-bold text-left"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
