import React, { useState, useEffect } from 'react';
import { collection, query, limit, getDocs, getDocsFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const GuestTicker = () => {
  const { user } = useAuth();
  const [tickerStudents, setTickerStudents] = useState(['Connecting community...', 'Joining batchmates...', 'Indus University']);

  useEffect(() => {
    if (user) return;

    const fetchTickerData = async () => {
      try {
        const qStudents = query(collection(db, 'students'), limit(40));
        const qFaculties = query(collection(db, 'faculties'), limit(20));
        
        const [snapStudents, snapFaculties] = await Promise.all([
          getDocsFromServer(qStudents),
          getDocsFromServer(qFaculties)
        ]);

        const studentNames = snapStudents.docs.map(doc => doc.data().fullName).filter(Boolean);
        const facultyNames = snapFaculties.docs.map(doc => doc.data().fullName).filter(Boolean);
        
        const allNames = [...studentNames, ...facultyNames];

        if (allNames.length > 0) {
          setTickerStudents(allNames.sort(() => Math.random() - 0.5));
        }
      } catch (e) {
        console.error("GuestTicker fetch error:", e);
      }
    };

    fetchTickerData();
  }, [user]);

  if (user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-black/10 py-3.5 z-[9998] overflow-hidden shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
      <div className="flex items-center">
        <div className="px-6 border-r border-black/10 bg-white z-20">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] whitespace-nowrap text-black/40">Students who joined</p>
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
                <span className="text-[10px] font-black tracking-[0.2em] text-black/60 uppercase">{name}</span>
                <div className="size-1 rounded-full bg-black/10" />
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
