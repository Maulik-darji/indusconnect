import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Link as LinkIcon, Camera, X, Code, Briefcase, 
  MapPin, Calendar, BookOpen, Heart, User as UserIcon, 
  ArrowLeft, MessageSquare, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { userData: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // Fetch User Info
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // Check if it's one of the fake profiles (optional, but good for demo)
          if (userId.startsWith('fake-')) {
             // For fake profiles, we could show dummy data or just navigate back
             setProfile({
               fullName: 'Mock User',
               course: 'Computer Science',
               bio: 'This is a mock profile for demonstration purposes.',
               socials: { linkedin: '#' }
             });
          }
        }

        // Fetch User Memories
        const memoriesQ = query(
          collection(db, 'media_vault'),
          where('authorId', '==', userId),
          orderBy('timestamp', 'desc')
        );
        const memoriesSnapshot = await getDocs(memoriesQ);
        setMemories(memoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb] dark:bg-[#050505]">
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfdfb] dark:bg-[#050505] p-6">
        <h2 className="text-3xl premium-title mb-4">Profile Not Found</h2>
        <button onClick={() => navigate(-1)} className="btn-primary">Go Back</button>
      </div>
    );
  }

  const socialIcons = {
    linkedin: <Briefcase size={20} />,
    twitter: <X size={20} />,
    github: <Code size={20} />,
    instagram: <Camera size={20} />
  };

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#050505] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity mb-8"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Profile Header Card */}
        <div className="relative mb-12">
          <div className="bg-white dark:bg-[#121212] rounded-[40px] p-8 md:p-12 shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-10">
              {/* Profile Image */}
              <div className="shrink-0">
                <div className="size-48 md:size-56 rounded-[32px] overflow-hidden border-4 border-black/5 dark:border-white/5 shadow-2xl">
                  {profile.profileImageUrl ? (
                    <img src={profile.profileImageUrl} className="size-full object-cover" alt={profile.fullName} />
                  ) : (
                    <div className="size-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-6xl font-bold opacity-20">
                      {profile.fullName?.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <h1 className="text-4xl md:text-5xl premium-title tracking-tight">{profile.fullName}</h1>
                  {profile.uid !== currentUser?.uid && (
                    <button 
                      onClick={() => navigate(`/messages/${profile.uid}`)}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-black text-white dark:bg-white dark:text-black rounded-full text-sm font-bold hover:scale-105 transition-transform"
                    >
                      <MessageSquare size={16} />
                      Message
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-full text-xs font-bold opacity-60">
                    <BookOpen size={14} />
                    {profile.course}
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-full text-xs font-bold opacity-60">
                    <Calendar size={14} />
                    Batch of {profile.batchEnd}
                  </div>
                  {profile.section && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-full text-xs font-bold opacity-60">
                      Section {profile.section}
                    </div>
                  )}
                </div>

                <div className="max-w-2xl mb-10">
                  <p className="text-lg opacity-70 font-light leading-relaxed italic">
                    \"{profile.bio || 'No bio provided yet.'}\"
                  </p>
                </div>

                {/* Socials & Contact */}
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {profile.socials && Object.entries(profile.socials).map(([platform, url]) => (
                    url && (
                      <a 
                        key={platform}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="size-12 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
                        title={platform}
                      >
                        {socialIcons[platform] || <LinkIcon size={20} />}
                      </a>
                    )
                  ))}
                  <a 
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-3 px-6 bg-black/5 dark:bg-white/5 rounded-2xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
                  >
                    <Mail size={20} className="opacity-40 group-hover:opacity-100" />
                    <span className="text-sm font-bold">Email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-[#121212] rounded-[32px] p-8 shadow-2xl border border-black/5 dark:border-white/5">
              <h3 className="text-xl premium-title mb-6">Details</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">IU Number</p>
                    <p className="font-mono text-sm uppercase">{profile.iuNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Birthday</p>
                    <p className="font-medium text-sm">
                      {profile.birthdate ? new Date(profile.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Private'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                    <Heart size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Status</p>
                    <p className="font-medium text-sm">{profile.marriedStatus || 'Single'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#121212] rounded-[32px] p-8 shadow-2xl border border-black/5 dark:border-white/5 h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl premium-title">Shared Memories</h3>
                <span className="px-4 py-1.5 bg-black/5 dark:bg-white/5 rounded-full text-xs font-bold opacity-40">
                  {memories.length} Images
                </span>
              </div>

              {memories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {memories.map((memory) => (
                    <motion.div 
                      key={memory.id}
                      whileHover={{ scale: 1.05 }}
                      className="aspect-square rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer relative group"
                      onClick={() => navigate(`/archive?view=${memory.id}`)}
                    >
                      <img src={memory.url} className="size-full object-cover transition-transform duration-500 group-hover:scale-110" alt={memory.title} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ExternalLink size={20} className="text-white" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                  <ImageIcon size={64} strokeWidth={1} className="mb-4" />
                  <p className="text-lg italic font-serif">No memories shared yet.</p>
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
