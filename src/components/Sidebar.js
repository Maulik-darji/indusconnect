import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, MessageSquare, Heart, Sun, Moon, LogOut, Menu, X, QrCode, ChevronDown, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  
  const selectedYear = searchParams.get('year') || 'All';
  const years = userData ? Array.from({ length: userData.batchEnd - userData.batchStart + 1 }, (_, i) => userData.batchStart + i) : [];
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

  const menuItems = [
    { icon: <Home size={18} />, label: 'Home', path: '/' },
    { icon: <Users size={18} />, label: 'Batchmates', path: '/batchmates' },
    { icon: <ImageIcon size={18} />, label: 'Media Vault', path: '/archive' },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full h-20 border-b border-black/5 dark:border-white/5 z-50 transition-all duration-300 frosted-glass">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="size-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-xl">I</span>
            </div>
            <span className="text-2xl premium-title hidden md:block">IndusConnect</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-5 py-2 rounded-full transition-all font-semibold text-sm ${
                      isActive 
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10' 
                        : 'text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5'
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
            <button 
              onClick={toggleTheme}
              className="p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all reset-button"
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
              <div className="size-11 rounded-full border border-black/10 flex items-center justify-center cursor-pointer transition-all hover:border-black dark:border-white/10 dark:hover:border-white overflow-hidden bg-black/5 dark:bg-white/5">
                {userData?.profileImageUrl ? (
                  <img src={userData.profileImageUrl} alt="Profile" className="size-full object-cover" />
                ) : (
                  <span className="font-bold text-sm">{userData?.fullName?.charAt(0) || 'U'}</span>
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
                    <div className="bg-white/90 dark:bg-[#121212]/90 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden p-2">
                      <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">Signed in as</p>
                        <p className="text-sm font-bold truncate">{userData?.fullName}</p>
                      </div>
                      
                      <Link 
                        to="/onboarding" 
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-semibold"
                      >
                        <Users size={18} className="opacity-50" />
                        Update Profile
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
              className="md:hidden p-2.5 bg-black/5 dark:bg-white/5 rounded-xl reset-button"
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
            className="fixed top-20 left-0 w-full bg-white dark:bg-[#0a0a0a] border-b border-black/10 dark:border-white/10 z-40 p-4 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-4">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-4 p-4 rounded-2xl ${
                    location.pathname === item.path ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-black/5 dark:bg-white/5'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  <span className="font-bold">{item.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Support Modal */}
      <AnimatePresence>
        {showSupport && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowSupport(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-[#0f0f0f] p-6 sm:p-8 rounded-2xl max-w-sm w-full relative z-10 text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] border border-white/10"
            >
              <h2 className="text-3xl premium-title mb-4">Support IndusConnect</h2>
              <p className="text-sm opacity-60 mb-8 leading-relaxed">Your contributions help us keep the platform free for students and alumni.</p>
              
              <div className="bg-white p-4 sm:p-6 rounded-2xl inline-block mb-5 shadow-2xl border border-black/5">
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

              <button 
                className="btn-primary w-full py-4 text-lg rounded-2xl"
                onClick={() => setShowSupport(false)}
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
