import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Mail,
  X,
  Code,
  BookOpen,
  Heart,
  User as UserIcon,
  ArrowLeft,
  MessageSquare,
  Image as ImageIcon,
  ExternalLink,
  Calendar,
  Hash,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// import Navbar from '../components/Sidebar';

// Inline SVG icons for social platforms
const LinkedInIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
    <rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.258 5.635 5.906-5.635zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
  </svg>
);

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { userData: currentUser, userCache, saveToCache } = useAuth();
  const [profile, setProfile] = useState(() => userCache[userId] || null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(!userCache[userId]);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userCache[userId]) setLoading(true);
      
      try {
        let userDoc = await getDoc(doc(db, 'students', userId));
        if (!userDoc.exists()) userDoc = await getDoc(doc(db, 'faculties', userId));
        if (!userDoc.exists()) userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists()) {
          const data = userDoc.data();
          setProfile(data);
          saveToCache(userId, data);
        } else if (userId.startsWith('fake-')) {
          const mockData = {
            fullName: 'Mock User',
            course: 'Computer Science',
            bio: 'This is a mock profile.',
            socials: { linkedin: '#' },
          };
          setProfile(mockData);
          saveToCache(userId, mockData);
        }

        const memoriesQ = query(collection(db, 'media_vault'), where('authorId', '==', userId));
        const snap = await getDocs(memoriesQ);
        const userMemories = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(m => m.url && typeof m.url === 'string' && m.url.startsWith('http'));
        
        userMemories.sort((a, b) => {
          const tA = a.timestamp?.seconds || 0;
          const tB = b.timestamp?.seconds || 0;
          return tB - tA;
        });
        setMemories(userMemories);
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [userId, saveToCache, userCache]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5ee] dark:bg-[#050505]">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-4xl font-serif italic opacity-20"
        >
          IndusConnect
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5ee] dark:bg-[#050505] p-6">
        <h2 className="text-3xl premium-title mb-4">Profile Not Found</h2>
        <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
      </div>
    );
  }

  // Format birthday
  const formatBirthday = (dateStr) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const birthday = formatBirthday(profile.birthdate);

  const socials = profile.socials || {};

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#050505] transition-colors duration-500">
      <div className="pt-20 sm:pt-24 md:pt-28 pb-20 px-4 sm:px-6 md:px-8 max-w-6xl mx-auto">

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-xs font-bold opacity-30 hover:opacity-100 transition-all mb-8 uppercase tracking-widest"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* ── HEADER CARD ── */}
        <div className="bg-white dark:bg-[#121212] rounded-2xl p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-black/[0.03] dark:border-white/[0.03] mb-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-black/[0.01] dark:from-white/[0.01] to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="size-44 md:size-52 rounded-xl overflow-hidden border-8 border-white dark:border-[#1a1a1a] shadow-2xl bg-black/5 dark:bg-white/5">
                {profile.profileImageUrl ? (
                  <img src={profile.profileImageUrl} className="size-full object-cover" alt={profile.fullName} />
                ) : (
                  <div className="size-full flex items-center justify-center text-6xl font-bold opacity-20">
                    {profile.fullName?.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-5">
                <h1 className="text-5xl md:text-6xl premium-title tracking-tight">{profile.fullName}</h1>
              </div>

              {/* Badges Row */}
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-2 mb-6">
                {profile.course && (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-black/[0.03] dark:bg-white/5 rounded-lg text-black/60 dark:text-white/60 text-xs font-bold">
                    <BookOpen size={14} />
                    {profile.course}
                  </div>
                )}
                {profile.batchEnd && (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-black/[0.03] dark:bg-white/5 rounded-lg text-black/60 dark:text-white/60 text-xs font-bold">
                    <Calendar size={14} />
                    Batch of {profile.batchEnd}
                  </div>
                )}
                {profile.section && (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-black/[0.03] dark:bg-white/5 rounded-lg text-black/60 dark:text-white/60 text-xs font-bold">
                    Section {profile.section}
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-lg opacity-60 font-light italic mb-8 max-w-2xl leading-relaxed">
                  "{profile.bio}"
                </p>
              )}

              {/* Bottom Actions & Socials */}
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                {socials.linkedin && (
                  <a href={socials.linkedin.startsWith('http') ? socials.linkedin : `https://${socials.linkedin}`} target="_blank" rel="noreferrer"
                    className="size-11 flex items-center justify-center bg-white dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                    <LinkedInIcon />
                  </a>
                )}
                {socials.twitter && (
                  <a href={socials.twitter.startsWith('http') ? socials.twitter : `https://${socials.twitter}`} target="_blank" rel="noreferrer"
                    className="size-11 flex items-center justify-center bg-white dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                    <XIcon />
                  </a>
                )}
                {socials.github && (
                  <a href={socials.github.startsWith('http') ? socials.github : `https://${socials.github}`} target="_blank" rel="noreferrer"
                    className="size-11 flex items-center justify-center bg-white dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                    <GitHubIcon />
                  </a>
                )}

                {/* Divider if socials exist */}
                {(socials.linkedin || socials.twitter || socials.github) && (
                  <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 hidden md:block" />
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {userId !== currentUser?.uid && (
                    <button
                      onClick={() => navigate(`/messages/${userId}`)}
                      className="flex items-center gap-2 px-7 h-11 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 active:scale-95 transition-all shadow-xl text-sm font-bold"
                    >
                      <MessageSquare size={18} />
                      Message
                    </button>
                  )}
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-2 px-7 h-11 border border-black/[0.08] dark:border-white/10 bg-black/[0.03] dark:bg-white/5 rounded-lg hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group text-sm font-bold"
                  >
                    <Mail size={18} className="opacity-40 group-hover:opacity-100" />
                    Email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM GRID: Details | Shared Memories ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">

          {/* ── DETAILS CARD ── */}
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.03]">
            <h2 className="text-4xl premium-title mb-10">Details</h2>

            <div className="space-y-8">
              {/* IU Number */}
              <div className="flex items-center gap-4">
                <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                  <UserIcon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-0.5">IU NUMBER</p>
                  <p className="text-base font-bold break-words leading-tight font-mono">{profile.iuNumber}</p>
                </div>
              </div>

              {/* Degree & Course */}
              <div className="flex items-center gap-4">
                <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-0.5">DEGREE & COURSE</p>
                  <p className="text-base leading-tight">
                    <span className="font-bold">{profile.degree ? `${profile.degree}` : ''}</span> in {profile.course}
                  </p>
                </div>
              </div>

              {/* Section */}
              {profile.section && (
                <div className="flex items-center gap-4">
                  <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                    <Code size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-0.5">SECTION</p>
                    <p className="text-base font-bold">Class Section {profile.section}</p>
                  </div>
                </div>
              )}

              {/* Birthday */}
              {birthday && (
                <div className="flex items-center gap-4">
                  <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                    <Calendar size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-0.5">BIRTHDAY</p>
                    <p className="text-base font-bold">{birthday}</p>
                  </div>
                </div>
              )}

              {/* Status */}
              {profile.marriedStatus && (
                <div className="flex items-center gap-4">
                  <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                    <Heart size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-0.5">STATUS</p>
                    <p className="text-base font-bold">{profile.marriedStatus}</p>
                  </div>
                </div>
              )}

              {/* Email */}
              {profile.email && (
                <div className="flex items-center gap-4">
                  <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                    <Mail size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-0.5">EMAIL</p>
                    <a href={`mailto:${profile.email}`} className="text-base font-bold break-all hover:opacity-70 transition-opacity">
                      {profile.email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Social Media section */}
            {(socials.linkedin || socials.twitter || socials.github) && (
              <div className="mt-12 pt-8 border-t border-black/[0.03] dark:border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-black/30 dark:text-white/30 mb-5">SOCIAL MEDIA</p>
                <div className="flex items-center gap-3">
                  {socials.linkedin && (
                    <a href={socials.linkedin.startsWith('http') ? socials.linkedin : `https://${socials.linkedin}`} target="_blank" rel="noreferrer"
                      className="size-9 flex items-center justify-center bg-white dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                      <LinkedInIcon />
                    </a>
                  )}
                  {socials.twitter && (
                    <a href={socials.twitter.startsWith('http') ? socials.twitter : `https://${socials.twitter}`} target="_blank" rel="noreferrer"
                      className="size-9 flex items-center justify-center bg-white dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                      <XIcon />
                    </a>
                  )}
                  {socials.github && (
                    <a href={socials.github.startsWith('http') ? socials.github : `https://${socials.github}`} target="_blank" rel="noreferrer"
                      className="size-9 flex items-center justify-center bg-white dark:bg-white/5 border border-black/[0.08] dark:border-white/10 rounded-lg hover:bg-black hover:text-white transition-all duration-300">
                      <GitHubIcon />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── SHARED MEMORIES CARD ── */}
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.03]">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-4xl premium-title">Shared Memories</h2>
              <span className="text-[10px] font-bold text-black/40 dark:text-white/40 bg-black/[0.03] dark:bg-white/5 px-4 py-2 rounded-lg uppercase tracking-widest">
                {memories.length} {memories.length === 1 ? 'Image' : 'Images'}
              </span>
            </div>

            {memories.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {memories.map(memory => (
                  <MemoryCard key={memory.id} memory={memory} navigate={navigate} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center opacity-20">
                <ImageIcon size={56} strokeWidth={1} className="mb-4" />
                <p className="text-base italic font-serif">No memories shared yet.</p>
              </div>
            )}
          </div>

          {/* ── EXPERIENCE SECTION ── */}
          <div className="bg-white dark:bg-[#121212] rounded-2xl p-10 shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-black/[0.03] dark:border-white/[0.03] mt-8">
            <div className="flex items-center gap-3 mb-10">
              <div className="size-11 shrink-0 flex items-center justify-center bg-[#fff8f0] dark:bg-white/5 rounded-xl text-[#d97706]">
                <Briefcase size={20} />
              </div>
              <h2 className="text-4xl premium-title">Experience</h2>
            </div>

            <div className="space-y-10 relative before:absolute before:left-[21px] before:top-2 before:bottom-2 before:w-px before:bg-black/5 dark:before:bg-white/5">
              {profile.experiences && profile.experiences.length > 0 ? (
                profile.experiences.map((exp, index) => (
                  <div key={exp.id || index} className="relative pl-12">
                    {/* Dot */}
                    <div className="absolute left-4 top-2 size-[11px] rounded-lg bg-[#d97706] border-4 border-white dark:border-[#121212] z-10" />
                    
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-xl font-bold leading-tight">{exp.title}</h3>
                        <p className="text-[#d97706] font-semibold text-sm">{exp.company}</p>
                      </div>
                      <div className="shrink-0 text-right sm:text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 bg-black/[0.03] dark:bg-white/5 px-3 py-1 rounded-lg inline-block">
                          {exp.startDate} — {exp.endDate || 'Present'}
                        </p>
                      </div>
                    </div>
                    
                    {exp.location && (
                      <p className="text-xs opacity-40 font-medium mb-3 flex items-center gap-1">
                        {exp.location} • {exp.employmentType}
                      </p>
                    )}
                    
                    {exp.description && (
                      <p className="text-sm opacity-60 leading-relaxed max-w-2xl font-light">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-20 ml-0 pl-0 before:hidden">
                  <Briefcase size={40} strokeWidth={1} className="mb-4" />
                  <p className="text-base italic font-serif">No professional experience shared yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfile;

const MemoryCard = ({ memory, navigate }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="aspect-[4/3] rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer group relative shadow-sm"
      onClick={() => navigate(`/archive?view=${memory.id}`)}
    >
      <img
        src={memory.url}
        className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
        alt={memory.title || 'Memory'}
        onError={() => setHasError(true)}
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
        <ExternalLink size={24} className="text-white scale-75 group-hover:scale-100 transition-transform duration-300" />
      </div>
    </motion.div>
  );
};
