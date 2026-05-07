import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, getDocsFromServer } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Search, MessageSquare, ExternalLink, User as UserIcon, ChevronDown } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import YearbookModal from '../components/YearbookModal';
import { getFunkyAvatar } from '../constants';

const Batchmates = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [batchmates, setBatchmates] = useState(() => {
    try {
      const cached = localStorage.getItem(`indus_batchmates_${userData?.uid}`);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('All');
  const [searchParams] = useSearchParams();
  const [selectedMateModal, setSelectedMateModal] = useState(null);

  const selectedYear = searchParams.get('year') || 'All';
  const SECTIONS = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  useEffect(() => {
    const fetchBatchmates = async () => {
      try {
        let realBatchmates = [];
        
        if (!userData) {
          // For guests, fetch a mix of students and faculties
          const qStudents = query(collection(db, 'students'), limit(20));
          const qFaculties = query(collection(db, 'faculties'), limit(20));
          const [snapStudents, snapFaculties] = await Promise.all([
            getDocsFromServer(qStudents),
            getDocsFromServer(qFaculties)
          ]);
          realBatchmates = [
            ...snapStudents.docs.map(doc => doc.data()),
            ...snapFaculties.docs.map(doc => doc.data())
          ];
        } else if (userData.role === 'faculty') {
          const q = query(collection(db, 'faculties'));
          const snap = await getDocsFromServer(q);
          realBatchmates = snap.docs.map(doc => doc.data());
        } else {
          const qStudents = query(
            collection(db, 'students'),
            where('batchStart', '==', userData.batchStart),
            where('batchEnd', '==', userData.batchEnd),
            where('course', '==', userData.course)
          );
          const qUsers = query(
            collection(db, 'users'),
            where('batchStart', '==', userData.batchStart),
            where('batchEnd', '==', userData.batchEnd),
            where('course', '==', userData.course)
          );
          
          const [snapStudents, snapUsers] = await Promise.all([
            getDocsFromServer(qStudents).catch(e => { console.warn("Students query failed", e); return { docs: [] }; }),
            getDocsFromServer(qUsers).catch(e => { console.warn("Users query failed", e); return { docs: [] }; })
          ]);
          
          realBatchmates = [
            ...snapStudents.docs.map(doc => doc.data()),
            ...snapUsers.docs.map(doc => doc.data())
          ];
        }
        
        let allProfiles = [...realBatchmates];
        
        if (userData && !allProfiles.some(p => p.uid === userData.uid)) {
          allProfiles.push(userData);
        }
        
        const uniqueProfiles = Array.from(new Map(allProfiles.map(p => [p.uid && p.uid !== 'undefined' ? p.uid : p.id, p])).values());
        
        setBatchmates(uniqueProfiles);
        if (userData?.uid) {
          try {
            localStorage.setItem(`indus_batchmates_${userData.uid}`, JSON.stringify(uniqueProfiles));
          } catch (e) {}
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchBatchmates();
  }, [userData]);

  const filteredBatchmates = batchmates.filter(mate => {
    const queryText = searchTerm.toLowerCase();
    const matchesSearch = (mate.fullName || '').toLowerCase().includes(queryText) ||
                          (mate.course || '').toLowerCase().includes(queryText) ||
                          String(mate.iuNumber || '').toLowerCase().includes(queryText);
    
    if (userData?.role === 'faculty') {
      return matchesSearch;
    }

    const matchesSection = selectedSection === 'All' || mate.section === selectedSection;
    const matchesYear = selectedYear === 'All' || (mate.year && mate.year.toString() === selectedYear);
    
    return matchesSearch && matchesSection && matchesYear;
  });

  return (
    <div className="min-h-screen bg-[#f5f5ee] px-4 pb-16 pt-20 transition-colors duration-500 dark:bg-[#181818] sm:px-6 sm:pb-20 sm:pt-24 md:pt-28">
      <header className="mx-auto mb-8 mt-4 max-w-4xl animate-fade-in text-center sm:mb-10 sm:mt-6">
        <h1 className="premium-title mb-4 text-5xl sm:mb-6 sm:text-6xl md:text-7xl">
          {!userData ? 'Community Directory' : (userData?.role === 'faculty' ? 'Faculty Directory' : `The Class of '${userData?.batchEnd?.toString().slice(-2) || '28'}`)}
        </h1>
        <p className="mx-auto max-w-2xl text-sm font-light leading-relaxed opacity-60 sm:text-base">
          {userData?.role === 'faculty' 
            ? 'The educators who inspire, lead, and shape the future of Indus University.'
            : 'Faces that defined our journey. Moments that became memories. Click a card to sign their yearbook.'
          }
        </p>
      </header>

      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col items-center justify-between gap-6 md:flex-row md:gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" size={16} />
            <input 
              type="text" 
              placeholder={userData?.role === 'faculty' ? "Find a faculty member..." : "Find a classmate..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-black/5 py-3 pl-12 pr-4 text-sm outline-none transition-all focus:border-black/30 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30"
            />
          </div>
          
          {userData?.role !== 'faculty' && (
            <div className="flex flex-wrap justify-center gap-2">
              {SECTIONS.map((section) => (
                <button
                  key={section}
                  onClick={() => setSelectedSection(section)}
                  className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-300 ${
                    selectedSection === section
                      ? 'bg-black text-white shadow-md dark:bg-white dark:text-black'
                      : 'bg-black/5 text-black/60 hover:bg-black/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {section === 'All' ? 'All Sections' : section}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredBatchmates.map((mate, idx) => (
              <motion.div
                key={mate.uid}
                onClick={() => navigate(`/profile/${mate.uid}`)}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-black/5 bg-black/5 cursor-pointer dark:border-white/5 dark:bg-white/5"
              >
                {mate.profileImageUrl ? (
                  <img src={mate.profileImageUrl} alt={mate.fullName} className="absolute inset-0 size-full object-cover grayscale opacity-40 transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100" />
                ) : (
                  <img src={getFunkyAvatar(mate.uid)} alt={mate.fullName} className="absolute inset-0 size-full object-cover grayscale opacity-40 transition-all duration-500 group-hover:scale-105 group-hover:grayscale-0 group-hover:opacity-100" />
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                
                {mate.uid === userData?.uid && (
                  <div className="absolute left-4 top-4 z-20">
                    <span className="rounded-xl bg-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      You
                    </span>
                  </div>
                )}
                
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-5">
                  <div className="flex justify-end gap-2">
                    {mate.uid !== userData?.uid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!userData) {
                            navigate('/signup');
                            return;
                          }
                          setSelectedMateModal(mate);
                        }}
                        className="rounded-full bg-black/20 p-2.5 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
                        title="Sign Yearbook"
                      >
                        <MessageSquare size={16} />
                      </button>
                    )}
                    {mate.socials?.linkedin && (
                      <a
                        href={mate.socials.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-black/20 p-2.5 text-white backdrop-blur-md transition-all hover:bg-white hover:text-black"
                        title="LinkedIn"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>

                  <div className="text-white">
                    <h3 className="mb-1 text-2xl font-bold tracking-tight">{mate.fullName}</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-medium uppercase tracking-wider opacity-70">
                        {mate.role === 'faculty' ? (mate.course || 'Faculty') : `${mate.course} • Sec ${mate.section}`}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredBatchmates.length === 0 && (
          <div className="animate-fade-in py-20 text-center opacity-50">
            <p className="text-xl italic">No batchmates found matching your search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMateModal && (
          <YearbookModal 
            mate={selectedMateModal} 
            onClose={() => setSelectedMateModal(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Batchmates;
