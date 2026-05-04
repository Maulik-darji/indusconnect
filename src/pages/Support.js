import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Heart, QrCode, Coffee, Utensils, Pizza, ChevronRight } from 'lucide-react';

const SUPPORT_OPTIONS = [
  { key: 'tea', label: 'Buy Tea', amount: 5, icon: <Coffee size={24} /> },
  { key: 'coffee', label: 'Buy Coffee', amount: 50, icon: <Coffee size={24} /> },
  { key: 'fries', label: 'Buy French Fries', amount: 100, icon: <Utensils size={24} /> },
  { key: 'pizza', label: 'Buy Pizza', amount: 200, icon: <Pizza size={24} /> }
];

const Support = () => {
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [supportItems, setSupportItems] = useState(SUPPORT_OPTIONS);

  useEffect(() => {
    const unsubPayment = onSnapshot(
      doc(db, 'settings', 'payment'),
      (snapshot) => {
        if (snapshot.exists()) {
          setQrCodeUrl(snapshot.data().qrCodeUrl);
        }
      }
    );

    const unsubAdminSettings = onSnapshot(
      doc(db, 'settings', 'admin'),
      (snapshot) => {
        if (snapshot.exists() && snapshot.data().supportItems) {
          // Map stored amounts if they exist, otherwise use defaults
          const merged = SUPPORT_OPTIONS.map(opt => {
            const stored = snapshot.data().supportItems.find(s => s.key === opt.key);
            return stored ? { ...opt, amount: stored.amount } : opt;
          });
          setSupportItems(merged);
        }
      }
    );

    return () => {
      unsubPayment();
      unsubAdminSettings();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#fdfdfb] dark:bg-[#121212] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-red-500/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-orange-500/5 blur-[120px] rounded-full" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16 animate-fade-in">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
          >
            <Heart size={14} fill="currentColor" /> Help Us Grow
          </motion.div>
          <h1 className="text-6xl sm:text-7xl premium-title mb-6 leading-tight">Support the Project</h1>
          <p className="text-xl text-black/60 dark:text-white/60 max-w-2xl mx-auto leading-relaxed">
            IndusConnect was created with one goal: <span className="text-black dark:text-white font-bold">to connect all of you together</span>. 
            Your support keeps this platform alive and thriving. Even the smallest contribution matters more than you know.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Support Options */}
          <div className="space-y-6">
            <h3 className="text-2xl premium-title mb-8">Support Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {supportItems.map((item, idx) => (
                <motion.div
                  key={item.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 hover:border-red-500/30 transition-all group"
                >
                  <div className="size-12 rounded-xl bg-white dark:bg-black flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">{item.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">Rs {item.amount}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="p-8 rounded-3xl bg-red-500/5 border border-red-500/10 mt-12">
              <p className="text-sm leading-relaxed italic opacity-80">
                "This platform is built by the community, for the community. A small donation helps cover server costs and keeps the connections flowing."
              </p>
            </div>
          </div>

          {/* Payment Section */}
          <div className="sticky top-28">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#181818] p-8 sm:p-10 rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] border border-black/5 dark:border-white/5 text-center"
            >
              <div className="inline-block p-6 bg-white rounded-3xl shadow-inner border border-black/5 mb-8">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="Scan to pay" className="size-64 object-contain" />
                ) : (
                  <div className="size-64 flex flex-col items-center justify-center text-black/10">
                    <QrCode size={100} strokeWidth={1} />
                    <p className="text-[10px] font-bold mt-4 uppercase tracking-[0.2em]">QR Code Loading...</p>
                  </div>
                )}
              </div>
              
              <h4 className="text-xl font-bold mb-2">Scan to Support</h4>
              <p className="text-sm opacity-50 mb-8">Scan the QR code using any UPI app to contribute.</p>
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl text-sm font-semibold">
                  <span className="opacity-50">Project</span>
                  <span>IndusConnect</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-black/5 dark:bg-white/5 rounded-2xl text-sm font-semibold">
                  <span className="opacity-50">Purpose</span>
                  <span>Community Growth</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
