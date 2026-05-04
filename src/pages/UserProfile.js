import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion } from 'framer-motion';
import {
  Mail,
  Link as LinkIcon,
  Camera,
  X,
  Code,
  Briefcase,
  Link,
  MapPin,
  Calendar,
  BookOpen,
  Heart,
  User as UserIcon,
  ArrowLeft,
  MessageSquare,
  Image as ImageIcon,
  ExternalLink,
  GraduationCap,
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
        // Fetch user data from potential collections
        let userDoc = await getDoc(doc(db, 'students', userId));
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'faculties', userId));
        }
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'users', userId));
        }
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else if (userId.startsWith('fake-')) {
          setProfile({
            fullName: 'Mock User',
            course: 'Computer Science',
            bio: 'This is a mock profile for demonstration purposes.',
            socials: { linkedin: '#' },
          });
        }

        // Fetch user memories
        const memoriesQ = query(
          collection(db, 'media_vault'),
          where('authorId', '==', userId)
        );
        const memoriesSnapshot = await getDocs(memoriesQ);
        const userMemories = memoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        userMemories.sort((a, b) => {
          const timeA = a.timestamp?.seconds || (a.timestamp ? new Date(a.timestamp).getTime() / 1000 : 0);
          const timeB = b.timestamp?.seconds || (b.timestamp ? new Date(b.timestamp).getTime() / 1000 : 0);
          return timeB - timeA;
        });
        setMemories(userMemories);
      } catch (error) {
        console.error('Error fetching profile:', error);
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
    linkedin: <LinkIcon size={20} />, 
    twitter: <X size={20} />, 
    github: <Code size={20} />, 
    instagram: <ImageIcon size={20} />, 
  };

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#050505] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity mb-8">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Profile Header Card */}
        <div className="relative mb-12">
          <div className="bg-white dark:bg-[#121212] rounded-xl p-8 md:p-12 shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-10">
              {/* Profile Image */}
              <div className="shrink-0">
                <div className="size-48 md:size-56 rounded-xl overflow-hidden border-4 border-black/5 dark:border-white/5 shadow-2xl">
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
                <h1 className="text-4xl md:text-5xl premium-title tracking-tight">{profile.fullName}</h1>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8 mt-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                    <BookOpen size={14} />
                    {profile.role === 'faculty' ? `Faculty of ${profile.course}` : profile.course}
                  </div>
                  {profile.role === 'faculty' && profile.batchStart && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                      <Calendar size={14} /> Joined in {profile.batchStart}
                    </div>
                  )}
                  {profile.role !== 'faculty' && profile.batchEnd && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                      <Calendar size={14} /> Batch of {profile.batchEnd}
                    </div>
                  )}
                  {profile.role !== 'faculty' && profile.section && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                      Section {profile.section}
                    </div>
                  )}
                </div>
                <div className="max-w-2xl mb-10">
                  <p className="text-lg opacity-70 font-light leading-relaxed italic">
                    {profile.bio || 'No bio provided yet.'}
                  </p>
                </div>
                {/* Socials */}
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                  {profile.socials && Object.entries(profile.socials).map(([platform, url]) => (
                    url && (
                      <a
                        key={platform}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="size-12 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:scale-110 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300"
                        title={platform}
                      >
                        {socialIcons[platform] || <LinkIcon size={20} />}
                      </a>
                    )
                  ))}
                </div>
                {/* Action Buttons */}
                <div className="flex gap-2 h-12 mt-4">
                  {userId !== currentUser?.uid && (
                    <button
                      onClick={() => navigate(`/messages/${userId}`)}
                      className="flex items-center gap-3 px-6 h-full bg-black dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      <MessageSquare size={18} />
                      <span className="text-sm font-bold">Message</span>
                    </button>
                  )}
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-3 px-6 h-full bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
                  >
                    <Mail size={18} className="opacity-40 group-hover:opacity-100" />
                    <span className="text-sm font-bold">Email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 sm:p-10 shadow-2xl border border-black/5 dark:border-white/5 h-fit">
              <h2 className="text-3xl premium-title mb-8">Details</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]"><UserIcon size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                      {profile.role === 'faculty' ? 'Faculty ID / IU Number' : 'IU Number'}
                    </p>
                    <p className="font-mono text-sm uppercase">{profile.iuNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]"><BookOpen size={20} /></div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                      {profile.role === 'faculty' ? 'Specialization / Course' : 'Degree & Course'}
                    </p>
                    <p className="font-medium text-sm">
                      {profile.degree ? `${profile.degree} in ` : ''}{profile.course}
                    </p>
                  </div>
                </div>
                {profile.role === 'faculty' && profile.coursesTaught && profile.coursesTaught.length > 0 && (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]"><GraduationCap size={20} /></div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Courses Taught</p>
                      <p className="font-medium text-sm">{profile.coursesTaught.filter(c => c.trim()).join(', ')}</p>
                    </div>
                  </div>
                )}
                {profile.role !== 'faculty' && profile.section && (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]"><Code size={20} /></div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Section</p>
                      <p className="font-medium text-sm">Class Section {profile.section}</p>
                    </div>
                  </div>
                )}
                {/* Experience Section */}
                {profile.experiences && profile.experiences.length > 0 && (
                  <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 shadow-2xl border border-black/5 dark:border-white/5">
                    <h2 className="text-3xl premium-title mb-8">Experience</h2>
                    <div className="space-y-10 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-px before:bg-black/5 dark:before:bg-white/5">
                      {profile.experiences.map((exp, idx) => (
                        <div key={exp.id || idx} className="relative pl-14">
                          <div className="absolute left-0 top-1.5 size-[46px] bg-white dark:bg-[#181818] border-4 border-[#f5f5ee] dark:border-[#121212] flex items-center justify-center rounded-xl z-10 shadow-sm overflow-hidden">
                            <Briefcase size={20} className="opacity-20" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-lg font-bold leading-tight">{exp.title}</h4>
                            <p className="font-medium text-black/80 dark:text-white/80">
                              {exp.company} {exp.employmentType ? `· ${exp.employmentType}` : ''}
                            </p>
                            <p className="text-xs font-bold opacity-40 uppercase tracking-widest flex items-center gap-2">
                              <Calendar size={12} />
                              {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} - {exp.endDate}
                            </p>
                            {exp.location && (
                              <p className="text-xs font-bold opacity-40 uppercase tracking-widest flex items-center gap-2 mt-1">
                                <MapPin size={12} /> {exp.location}
                              </p>
                            )}
                            {exp.description && (
                              <p className="mt-4 text-sm leading-relaxed opacity-70 whitespace-pre-wrap">{exp.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Shared Memories */}
                {(!profile.experiences || profile.experiences.length === 0) && (
                  <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 h-full">
                    <h2 className="text-3xl premium-title mb-8">Shared Memories</h2>
                    <div className="flex items-center justify-between mb-8">
                      <span className="px-4 py-1.5 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-40">{memories.length} Images</span>
                    </div>
                    {memories.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {memories.map(memory => (
                          <motion.div
                            key={memory.id}
                            whileHover={{ scale: 1.05 }}
                            className="aspect-video rounded-[2rem] overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer group relative"
                            onClick={() => navigate(`/archive?view=${memory.id}`)}
                          >
                            <img src={memory.url} className="size-full object-cover object-[center_25%] transition-transform duration-500 group-hover:scale-110" alt={memory.title} />
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
                )}
              </div>
            </div>
          </div>

          {/* User Gallery & Experience */}
          <div className="lg:col-span-2 space-y-8">
            {/* Content already rendered in the Details column when appropriate */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;

