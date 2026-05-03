import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Search, MessageSquare, ExternalLink, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Home = () => {
  const { userData } = useAuth();
  const [batchmates, setBatchmates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchBatchmates = async () => {
      if (!userData) return;
      try {
        const q = query(
          collection(db, 'users'),
          where('batchStart', '==', userData.batchStart),
          where('uid', '!=', userData.uid)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => doc.data());
        setBatchmates(data);
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
    return (
      (mate.fullName || '').toLowerCase().includes(queryText) ||
      (mate.course || '').toLowerCase().includes(queryText)
    );
  });

  return (
    <div className="min-h-screen bg-[#f5f5ee] px-4 pb-16 pt-24 transition-colors duration-500 dark:bg-[#050505] sm:px-6 sm:pb-20 sm:pt-28 md:pt-32">
      <header className="mx-auto mb-10 max-w-4xl animate-fade-in text-center sm:mb-14 md:mb-16">
        <h1 className="premium-title mb-5 text-5xl sm:mb-6 sm:text-6xl md:text-7xl lg:text-8xl">
          IndusConnect
        </h1>
        <p className="mx-auto max-w-3xl text-base font-light leading-relaxed opacity-55 sm:text-xl md:text-2xl">
          Since 2024, we have connected{' '}
          <span className="font-medium text-black dark:text-white">{batchmates.length} batchmates</span>{' '}
          from <span className="italic">{userData?.course}</span> to build a stronger community.
        </p>
      </header>

      <div className="mx-auto max-w-5xl">
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-black/5 dark:bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBatchmates.map((mate, idx) => (
              <motion.div
                key={mate.uid}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="group relative overflow-hidden rounded-2xl border border-black/5 bg-white p-5 transition-all duration-300 hover:shadow-[0_24px_48px_-18px_rgba(0,0,0,0.16)] dark:border-white/5 dark:bg-[#0f0f0f] sm:p-6"
              >
                <div className="relative z-10 mb-6 flex items-start justify-between gap-4">
                  <div className="size-20 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-black/5 shadow-inner transition-transform duration-300 group-hover:scale-105 dark:border-white/5 dark:bg-white/5 sm:size-24">
                    {mate.profileImageUrl ? (
                      <img src={mate.profileImageUrl} alt={mate.fullName} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center opacity-15">
                        <UserIcon size={40} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      to={`/messages/${mate.uid}`}
                      className="rounded-xl bg-black/5 p-3 transition-all duration-300 hover:bg-black hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-black"
                      title="Message"
                    >
                      <MessageSquare size={20} />
                    </Link>
                    {mate.socials?.linkedin && (
                      <a
                        href={mate.socials.linkedin}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-black/5 p-3 transition-all duration-300 hover:bg-black hover:text-white dark:bg-white/5 dark:hover:bg-white dark:hover:text-black"
                        title="LinkedIn"
                      >
                        <ExternalLink size={20} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="mb-2 break-words text-xl font-bold transition-colors group-hover:text-black dark:group-hover:text-white sm:text-2xl">
                    {mate.fullName}
                  </h3>
                  <p className="mb-5 text-[10px] font-medium uppercase opacity-50">{mate.course}</p>

                  <div className="flex flex-wrap gap-2">
                    {mate.degree && (
                      <span className="break-words rounded-full bg-black/5 px-3 py-2 text-[10px] font-bold uppercase opacity-70 transition-opacity group-hover:opacity-100 dark:bg-white/5">
                        {mate.degree}
                      </span>
                    )}
                    {mate.marriedStatus && (
                      <span className="rounded-full bg-black/5 px-3 py-2 text-[10px] font-bold uppercase opacity-70 transition-opacity group-hover:opacity-100 dark:bg-white/5">
                        {mate.marriedStatus}
                      </span>
                    )}
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
    </div>
  );
};

export default Home;
