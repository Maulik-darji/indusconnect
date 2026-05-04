import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Search, MessageSquare, ExternalLink, User as UserIcon, ChevronDown } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import YearbookModal from '../components/YearbookModal';

const Home = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [batchmates, setBatchmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [selectedSection, setSelectedSection] = useState('All');
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMateModal, setSelectedMateModal] = useState(null);

  const selectedYear = searchParams.get('year') || 'All';
  const SECTIONS = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];


  const startJourney = () => {
    localStorage.setItem(`journey_seen_${userData?.uid}`, 'true');
    setShowWelcome(false);
  };

  useEffect(() => {
    const fetchBatchmates = async () => {
      if (!userData) return;
      try {
        let q;
        const targetCollection = userData.role === 'faculty' ? 'faculties' : 'students';
        
        if (userData.role === 'faculty') {
          // Faculty see all faculties from their own collection
          q = query(
            collection(db, 'faculties')
          );
        } else {
          // Students see their strict isolation batchmates from students collection
          q = query(
            collection(db, 'students'),
            where('batchStart', '==', userData.batchStart),
            where('batchEnd', '==', userData.batchEnd),
            where('course', '==', userData.course)
          );
        }
        const querySnapshot = await getDocs(q);
        const realBatchmates = querySnapshot.docs.map(doc => doc.data());
        
        // Add current user to the list if not already there (though they should be in the DB)
        // and add 5 fake hardcoded batchmates
        const fakeBatchmates = [
          {
            uid: 'fake-1',
            fullName: 'Aarav Sharma',
            profileImageUrl: '/fake_profiles/fake1.png',
            course: userData.course,
            degree: userData.degree,
            marriedStatus: 'Single',
            section: 'A',
            year: userData.batchStart,
            socials: { linkedin: '#' }
          },
          {
            uid: 'fake-2',
            fullName: 'Ishani Patel',
            profileImageUrl: '/fake_profiles/fake2.png',
            course: userData.course,
            degree: userData.degree,
            marriedStatus: 'Single',
            section: 'B',
            year: userData.batchStart + 1,
            socials: { linkedin: '#' }
          },
          {
            uid: 'fake-3',
            fullName: 'Rohan Malhotra',
            profileImageUrl: '/fake_profiles/fake3.png',
            course: userData.course,
            degree: userData.degree,
            marriedStatus: 'Single',
            section: 'A',
            year: userData.batchStart + 2,
            socials: { linkedin: '#' }
          },
          {
            uid: 'fake-4',
            fullName: 'Sanya Gupta',
            profileImageUrl: '/fake_profiles/fake4.png',
            course: userData.course,
            degree: userData.degree,
            marriedStatus: 'Single',
            section: 'C',
            year: userData.batchStart,
            socials: { linkedin: '#' }
          },
          {
            uid: 'fake-5',
            fullName: 'Vikram Singh',
            profileImageUrl: '/fake_profiles/fake5.png',
            course: userData.course,
            degree: userData.degree,
            marriedStatus: 'Single',
            section: 'D',
            year: userData.batchStart + 1,
            socials: { linkedin: '#' }
          }
        ];

        // Combined real batchmates (including current user) and fake ones
        let allProfiles = [...realBatchmates];
        
        // Explicitly ensure current user is in the list even if they are in legacy 'users' collection
        if (userData && !allProfiles.some(p => p.uid === userData.uid)) {
          allProfiles.push(userData);
        }
        
        if (userData.role !== 'faculty') {
          allProfiles = [...allProfiles, ...fakeBatchmates];
        }
        
        // Deduplicate
        const uniqueProfiles = Array.from(new Map(allProfiles.map(p => [p.uid && p.uid !== 'undefined' ? p.uid : p.id, p])).values());
        
        setBatchmates(uniqueProfiles);
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
                          (mate.iuNumber || '').toLowerCase().includes(queryText);
    
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
          {userData?.role === 'faculty' ? 'Faculty Directory' : `The Class of '${userData?.batchEnd?.toString().slice(-2) || '28'}`}
        </h1>
        <p className="mx-auto max-w-2xl text-sm font-light leading-relaxed opacity-60 sm:text-base">
          {userData?.role === 'faculty' 
            ? 'The educators who inspire, lead, and shape the future of Indus University.'
            : 'Faces that defined our journey. Moments that became memories. Click a card to sign their yearbook.'
          }
        </p>
      </header>

      <div className="mx-auto max-w-6xl">
        {/* Search & Filter Row */}
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
                  <img src={mate.profileImageUrl} alt={mate.fullName} className="absolute inset-0 size-full object-cover grayscale transition-transform duration-500 group-hover:scale-105 group-hover:grayscale-0" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <span className="text-9xl font-bold tracking-tighter">ΔΔ</span>
                  </div>
                )}
                
                {/* Gradient Overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-100" />
                
                {mate.uid === userData?.uid && (
                  <div className="absolute left-4 top-4 z-20">
                    <span className="rounded-xl bg-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
                      You
                    </span>
                  </div>
                )}
                
                {/* Content Container */}
                <div className="absolute inset-0 z-10 flex flex-col justify-between p-5">
                  {/* Top Actions */}
                  <div className="flex justify-end gap-2">
                    {mate.uid !== userData?.uid && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
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

                  {/* Bottom Info */}
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
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#fdfdfb] p-6 text-center dark:bg-[#121212]"
          >
            {/* Grainy overlay specifically for this screen too */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none dark:opacity-[0.05]" 
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
            />

            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 max-w-2xl"
            >
              <p className="premium-title italic mb-4 text-4xl tracking-widest text-[#ff7448]">
                A Journey we'll always carry
              </p>
              
              <h2 className="premium-title italic mb-8 text-6xl sm:text-7xl md:text-8xl">
                Batch {userData?.batchStart} — {userData?.batchEnd}
              </h2>
              
              <p className="mx-auto mb-16 max-w-md text-base leading-relaxed opacity-60 sm:text-lg">
                {userData?.batchEnd - userData?.batchStart} years of laughter, late nights, and lessons learned. 
                Join us as we look back on the moments that defined us.
              </p>
              
              <button 
                onClick={startJourney}
                className="group relative flex flex-col items-center gap-6 mx-auto reset-button"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 transition-opacity group-hover:opacity-100">
                  Click to start the journey
                </span>
                
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="opacity-20 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronDown size={32} strokeWidth={1} />
                </motion.div>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Yearbook Modal */}
      {selectedMateModal && (
        <YearbookModal 
          mate={selectedMateModal} 
          onClose={() => setSelectedMateModal(null)} 
        />
      )}
    </div>
  );
};

export default Home;
