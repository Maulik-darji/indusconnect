import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, getDocsFromServer, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const GuestTicker = () => {
  const { user } = useAuth();
  // Start with real community names to ensure immediate visual success
  const [tickerStudents, setTickerStudents] = useState([
    'Chaitanya Rathi', 'Pavi Karnavat', 'Gautam Suthar', 
    'Jems Prajapat', 'Prachi Shah', 'Maulik Darji', 
    'Ayush Soni', 'Het Shah', 'Mugdha Pandya', 'Dipen Soni'
  ]);

  useEffect(() => {
    if (user) return;

    let mounted = true;
    
    const fetchNames = async () => {
      try {
        const qStudents = query(collection(db, 'students'));
        const snap = await getDocsFromServer(qStudents);
        
        if (!mounted) return;

        const names = snap.docs.map(doc => doc.data().fullName).filter(Boolean);
        
        if (names.length > 0) {
          setTickerStudents(names.sort(() => Math.random() - 0.5));
        }
      } catch (e) {
        console.error("Ticker fetch error:", e);
      }
    };

    fetchNames();
    // Refresh every 5 minutes if they stay as guest
    const interval = setInterval(fetchNames, 5 * 60 * 1000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  if (user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 py-3.5 z-[9998] overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex items-center">
        <div className="px-6 border-r border-black/10 bg-white z-20">
          <p className="text-xs font-bold uppercase tracking-wider whitespace-nowrap text-black/40">Students who joined</p>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ 
              duration: 25, 
              repeat: Infinity, 
              ease: "linear" 
            }}
            className="flex items-center gap-16 whitespace-nowrap w-max pl-12"
          >
            {[...tickerStudents, ...tickerStudents, ...tickerStudents, ...tickerStudents].map((name, i) => (
              <div key={i} className="flex items-center gap-6">
                <span className="text-sm font-semibold text-black/70">{name}</span>
                <div className="size-1.5 rounded-full bg-black/20" />
              </div>
            ))}
          </motion.div>
          {/* Subtle fade edges */}
          <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-white to-transparent z-10" />
          <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent z-10" />
        </div>
      </div>
    </div>
  );
};

export default GuestTicker;
