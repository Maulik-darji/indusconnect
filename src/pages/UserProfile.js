import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Link as LinkIcon, Camera, X, Code, Briefcase, 
  MapPin, Calendar, BookOpen, Heart, User as UserIcon, 
  ArrowLeft, MessageSquare, Image as ImageIcon, ExternalLink, GraduationCap
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
        // Check students collection first
        let userDoc = await getDoc(doc(db, 'students', userId));
        
        if (!userDoc.exists()) {
          // Check faculties collection if not found in students
          userDoc = await getDoc(doc(db, 'faculties', userId));
        }

        if (!userDoc.exists()) {
          // Legacy check for 'users' collection
          userDoc = await getDoc(doc(db, 'users', userId));
        }

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
          where('authorId', '==', userId)
        );
        const memoriesSnapshot = await getDocs(memoriesQ);
        const userMemories = memoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort client-side to avoid index requirements for mixed where/orderBy queries
        userMemories.sort((a, b) => {
          const timeA = a.timestamp?.seconds || (a.timestamp ? new Date(a.timestamp).getTime() / 1000 : 0);
          const timeB = b.timestamp?.seconds || (b.timestamp ? new Date(b.timestamp).getTime() / 1000 : 0);
          return timeB - timeA;
        });
        
        setMemories(userMemories);

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
<<<<<<< HEAD
    linkedin: (
      <svg className="size-5 fill-[#0077B5]" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
    twitter: (
      <svg className="size-5 fill-black dark:fill-white" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    github: (
      <svg className="size-5 fill-[#181717] dark:fill-white" viewBox="0 0 24 24">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
    instagram: (
      <svg className="size-5 fill-[#E4405F]" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.412.558.217.957.477 1.377.896.419.42.679.819.896 1.377.163.422.358 1.057.412 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.412 2.227-.217.558-.477.957-.896 1.377-.42.419-.819.679-1.377.896-.422.163-1.057.358-2.227.412-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.412-.558-.217-.957-.477-1.377-.896-.419-.42-.679-.819-.896-1.377-.163-.422-.358-1.057-.412-2.227-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.249-1.805.412-2.227.217-.558.477-.957.896-1.377.42-.419.819-.679 1.377-.896.422-.163 1.057-.358 2.227-.412 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.277.057-2.148.258-2.911.554-.79.306-1.461.714-2.131 1.384s-1.078 1.341-1.384 2.131c-.296.763-.497 1.634-.554 2.911-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.057 1.277.258 2.148.554 2.911.306.79.714 1.461 1.384 2.131s1.341 1.078 2.131 1.384c.763.296 1.634.497 2.911.554 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.277-.057 2.148-.258 2.911-.554.79-.306 1.461-.714 2.131-1.384s1.078-1.341 1.384-2.131c.296-.763.497-1.634.554-2.911.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.057-1.277-.258-2.148-.554-2.911-.306-.79-.714-1.461-1.384-2.131s-1.341-1.078-2.131-1.384c-.763-.296-1.634-.497-2.911-.554-1.28-.058-1.688-.072-4.947-.072zM12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
=======
    linkedin: <Briefcase size={20} />,
    twitter: <X size={20} />,
    github: <Code size={20} />,
    instagram: <Camera size={20} />
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
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
          <div className="bg-white dark:bg-[#121212] rounded-xl p-8 md:p-12 shadow-2xl border border-black/5 dark:border-white/5 overflow-hidden">
            {/* Background Accent */}
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
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                  <h1 className="text-4xl md:text-5xl premium-title tracking-tight">{profile.fullName}</h1>
                  {profile.uid !== currentUser?.uid && (
                    <button 
                      onClick={() => navigate(`/messages/${profile.uid}`)}
                      className="inline-flex items-center gap-2 px-6 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-sm font-bold hover:scale-105 transition-transform"
                    >
                      <MessageSquare size={16} />
                      Message
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                    <BookOpen size={14} />
                    {profile.role === 'faculty' ? `Faculty of ${profile.course}` : profile.course}
                  </div>
<<<<<<< HEAD
                  {profile.role === 'faculty' ? (
                    profile.batchStart && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                        <Calendar size={14} />
                        Joined in {profile.batchStart}
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                      <Calendar size={14} />
                      Batch of {profile.batchEnd}
                    </div>
                  )}
                  {profile.role !== 'faculty' && profile.section && (
=======
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                    <Calendar size={14} />
                    Batch of {profile.batchEnd}
                  </div>
                  {profile.section && (
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                    <div className="flex items-center gap-2 px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-60">
                      Section {profile.section}
                    </div>
                  )}
                </div>

                {profile.role === 'faculty' && profile.coursesTaught && profile.coursesTaught.length > 0 && (
                  <div className="mt-2 mb-8">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3 text-center md:text-left">Courses Taught</p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      {profile.coursesTaught.filter(c => c.trim()).map((course, i) => (
                        <span key={i} className="px-3 py-1 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-lg text-xs font-bold opacity-80">
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="max-w-2xl mb-10">
                  <p className="text-lg opacity-70 font-light leading-relaxed italic">
                    "{profile.bio || 'No bio provided yet.'}"
                  </p>
                </div>

                {/* Socials & Contact */}
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                  {profile.socials && Object.entries(profile.socials).map(([platform, url]) => (
                    url && (
                      <a 
                        key={platform}
                        href={url.startsWith('http') ? url : `https://${url}`}
                        target="_blank"
                        rel="noreferrer"
<<<<<<< HEAD
                        className="size-12 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:scale-110 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-300"
=======
                        className="size-12 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all"
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                        title={platform}
                      >
                        {socialIcons[platform] || <LinkIcon size={20} />}
                      </a>
                    )
                  ))}
<<<<<<< HEAD
                  
                  <div className="flex gap-2 h-12">
                    {userId !== currentUser?.uid && (
                      <button 
                        onClick={() => navigate(`/messages?user=${userId}`)}
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
=======
                  <a 
                    href={`mailto:${profile.email}`}
                    className="flex items-center gap-3 px-6 bg-black/5 dark:bg-white/5 rounded-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all group"
                  >
                    <Mail size={20} className="opacity-40 group-hover:opacity-100" />
                    <span className="text-sm font-bold">Email</span>
                  </a>
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details Sidebar */}
          <div className="lg:col-span-1 space-y-8">
<<<<<<< HEAD
              <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 sm:p-10 shadow-2xl border border-black/5 dark:border-white/5 h-fit">
                <h2 className="text-3xl premium-title mb-8">Details</h2>
=======
            <div className="bg-white dark:bg-[#121212] rounded-xl p-8 shadow-2xl border border-black/5 dark:border-white/5">
              <h3 className="text-xl premium-title mb-6">Details</h3>
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                      {profile.role === 'faculty' ? 'Faculty ID / IU Number' : 'IU Number'}
                    </p>
                    <p className="font-mono text-sm uppercase">{profile.iuNumber || 'N/A'}</p>
                  </div>
                </div>
<<<<<<< HEAD

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                    <BookOpen size={20} />
                  </div>
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
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Courses Taught</p>
                      <p className="font-medium text-sm">{profile.coursesTaught.filter(c => c.trim()).join(', ')}</p>
                    </div>
                  </div>
                )}

                {profile.role !== 'faculty' && profile.section && (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                      <Code size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Section</p>
                      <p className="font-medium text-sm">Class Section {profile.section}</p>
                    </div>
                  </div>
                )}

=======
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                {profile.experience && (profile.experience.company || profile.experience.role) && (
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                      <Briefcase size={20} />
                    </div>
                    <div>
<<<<<<< HEAD
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Current Role</p>
=======
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Experience</p>
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                      <p className="font-medium text-sm">
                        {profile.experience.role} {profile.experience.company ? `@ ${profile.experience.company}` : ''}
                      </p>
                    </div>
                  </div>
                )}
<<<<<<< HEAD

=======
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
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

                <div className="flex items-center gap-4">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl text-[#ffb03a]">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Email</p>
                    <a href={`mailto:${profile.email}`} className="font-medium text-sm hover:underline">{profile.email}</a>
                  </div>
                </div>

                {/* Social Media Section inside card */}
                {profile.socials && Object.values(profile.socials).some(url => url) && (
                  <div className="pt-6 border-t border-black/5 dark:border-white/5">
                    <h4 className="text-sm font-bold uppercase tracking-widest opacity-40 mb-4">Social Media</h4>
                    <div className="flex flex-wrap gap-4">
                      {Object.entries(profile.socials).map(([platform, url]) => {
                        if (!url) return null;
                        
                        const icons = {
                          linkedin: (
                            <svg className="size-5 fill-[#0077B5]" viewBox="0 0 24 24">
                              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                            </svg>
                          ),
                          twitter: (
                            <svg className="size-5 fill-black dark:fill-white" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          ),
                          github: (
                            <svg className="size-5 fill-[#181717] dark:fill-white" viewBox="0 0 24 24">
                              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
                            </svg>
                          ),
                          instagram: (
                            <svg className="size-5 fill-[#E4405F]" viewBox="0 0 24 24">
                              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.412.558.217.957.477 1.377.896.419.42.679.819.896 1.377.163.422.358 1.057.412 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.054 1.17-.249 1.805-.412 2.227-.217.558-.477.957-.896 1.377-.42.419-.819.679-1.377.896-.422.163-1.057.358-2.227.412-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.054-1.805-.249-2.227-.412-.558-.217-.957-.477-1.377-.896-.419-.42-.679-.819-.896-1.377-.163-.422-.358-1.057-.412-2.227-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.054-1.17.249-1.805.412-2.227.217-.558.477-.957.896-1.377.42-.419.819-.679 1.377-.896.422-.163 1.057-.358 2.227-.412 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-1.277.057-2.148.258-2.911.554-.79.306-1.461.714-2.131 1.384s-1.078 1.341-1.384 2.131c-.296.763-.497 1.634-.554 2.911-.058 1.28-.072 1.688-.072 4.947s.014 3.667.072 4.947c.057 1.277.258 2.148.554 2.911.306.79.714 1.461 1.384 2.131s1.341 1.078 2.131 1.384c.763.296 1.634.497 2.911.554 1.28.058 1.688.072 4.947.072s3.667-.014 4.947-.072c1.277-.057 2.148-.258 2.911-.554.79-.306 1.461-.714 2.131-1.384s1.078-1.341 1.384-2.131c.296-.763.497-1.634.554-2.911.058-1.28.072-1.688.072-4.947s-.014-3.667-.072-4.947c-.057-1.277-.258-2.148-.554-2.911-.306-.79-.714-1.461-1.384-2.131s-1.341-1.078-2.131-1.384c-.763-.296-1.634-.497-2.911-.554-1.28-.058-1.688-.072-4.947-.072zM12 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                          )
                        };

                        return (
                          <a 
                            key={platform}
                            href={url.startsWith('http') ? url : `https://${url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-3 bg-black/5 dark:bg-white/5 rounded-xl hover:scale-110 hover:shadow-lg transition-all"
                            title={platform}
                          >
                            {icons[platform] || <LinkIcon size={20} />}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Gallery & Experience */}
          <div className="lg:col-span-2 space-y-8">
            {/* Professional Experience Section */}
            {profile.experiences && profile.experiences.length > 0 && (
<<<<<<< HEAD
              <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 shadow-2xl border border-black/5 dark:border-white/5">
=======
              <div className="bg-white dark:bg-[#121212] rounded-xl p-8 shadow-2xl border border-black/5 dark:border-white/5">
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                    <Briefcase size={20} />
                  </div>
<<<<<<< HEAD
                  <h2 className="text-3xl premium-title">Experience</h2>
=======
                  <h3 className="text-xl premium-title">Experience</h3>
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                </div>

                <div className="space-y-10 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-px before:bg-black/5 dark:before:bg-white/5">
                  {profile.experiences.map((exp, idx) => (
                    <div key={exp.id || idx} className="relative pl-14">
                      {/* Timeline Dot */}
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
                          {exp.startDate ? new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''} 
                          {' - '} 
                          {exp.endDate}
                        </p>
                        {exp.location && (
                          <p className="text-xs font-bold opacity-40 uppercase tracking-widest flex items-center gap-2 mt-1">
                            <MapPin size={12} />
                            {exp.location}
                          </p>
                        )}
                        {exp.description && (
                          <p className="mt-4 text-sm leading-relaxed opacity-70 whitespace-pre-wrap">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

<<<<<<< HEAD
            <div className="bg-white dark:bg-[#121212] rounded-[2rem] p-8 shadow-2xl border border-black/5 dark:border-white/5 h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl premium-title">Shared Memories</h2>
=======
            <div className="bg-white dark:bg-[#121212] rounded-xl p-8 shadow-2xl border border-black/5 dark:border-white/5 h-full">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl premium-title">Shared Memories</h3>
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
                <span className="px-4 py-1.5 bg-black/5 dark:bg-white/5 rounded-xl text-xs font-bold opacity-40">
                  {memories.length} Images
                </span>
              </div>

              {memories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {memories.map((memory) => (
                    <motion.div 
                      key={memory.id}
                      whileHover={{ scale: 1.05 }}
<<<<<<< HEAD
                      className="aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer relative group"
=======
                      className="aspect-square rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 cursor-pointer relative group"
>>>>>>> d3371a814008f216ba821381f5e1b40883f99a3d
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
          </div>
        </div>
      </div>
    </div>
