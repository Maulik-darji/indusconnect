import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Shield, Bell, Moon, Sun, ChevronRight, LogOut, Settings as SettingsIcon, Briefcase, MessageSquare, X, Send, BookOpen, Calendar, Heart, Globe, GraduationCap } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';

const Settings = () => {
  const { userData } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('account');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: <User size={18} /> },
    { id: 'preferences', label: 'Preferences', icon: <SettingsIcon size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'support', label: 'Support & Feedback', icon: <MessageSquare size={18} /> },
  ];

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: userData.uid,
        userName: userData.fullName,
        userEmail: userData.email,
        text: feedback,
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setFeedback('');
      setShowFeedbackModal(false);
      toast.success('Feedback sent successfully! Thank you.');
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast.error('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#181818] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-5xl sm:text-6xl premium-title tracking-tight mb-4">Settings</h1>
          <p className="text-lg opacity-60 font-light">Manage your account preferences and profile details.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="w-full md:w-64 space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-xl transition-all font-bold text-sm ${
                  activeTab === tab.id
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-xl shadow-black/10'
                    : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white dark:bg-[#121212] rounded-xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5"
            >
              {activeTab === 'account' && (
                <div className="space-y-10">
                  {/* Profile Header */}
                  <div>
                    <h2 className="text-2xl premium-title mb-8">Profile Overview</h2>
                    <div className="flex flex-col sm:flex-row items-center gap-8 p-6 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/5 dark:border-white/5">
                      <div className="size-32 rounded-2xl border-4 border-white dark:border-[#1a1a1a] shadow-2xl overflow-hidden bg-black/5 dark:bg-white/5 shrink-0">
                        {userData?.profileImageUrl ? (
                          <img src={userData.profileImageUrl} alt="Profile" className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center text-4xl font-bold opacity-20">
                            {userData?.fullName?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="text-center sm:text-left flex-1">
                        <h3 className="text-3xl premium-title mb-1">{userData?.fullName}</h3>
                        <p className="opacity-50 text-sm font-medium mb-4">
                          {userData?.course} • Batch of {userData?.batchEnd}
                        </p>
                        <Link 
                          to="/edit-profile"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:scale-105 transition-all shadow-lg shadow-black/10 dark:shadow-white/5"
                        >
                          <User size={14} />
                          Edit Profile Details
                        </Link>
                      </div>
                    </div>
                    {userData?.bio && (
                      <div className="mb-8 p-5 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 italic opacity-80 text-sm">
                        "{userData.bio}"
                      </div>
                    )}
                  </div>

                  {/* Educational Background */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                        <BookOpen size={18} />
                      </div>
                      <h3 className="text-xl premium-title">Educational Background</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoCard label="Full Name" value={userData?.fullName} />
                      <InfoCard label="Bio (About Me)" value={userData?.bio || "No bio added yet."} fullWidth />
                      <InfoCard label="Degree Type" value={userData?.degree} />
                      <InfoCard label={userData?.role === 'faculty' ? "Primary Branch" : "Course / Branch"} value={userData?.course} />
                      {userData?.role === 'faculty' && (
                        <InfoCard label="Courses Taught" value={userData?.coursesTaught?.filter(c => c.trim()).join(', ')} fullWidth />
                      )}
                      <InfoCard label="IU Number" value={userData?.iuNumber} mono />
                      <InfoCard label="Section" value={userData?.section || "N/A"} />
                    </div>
                  </div>

                  {/* Batch & Timeline */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                        <Calendar size={18} />
                      </div>
                      <h3 className="text-xl premium-title">Batch & Timeline</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoCard label="Start Year" value={userData?.batchStart} />
                      <InfoCard label="End Year (Auto)" value={userData?.batchEnd} />
                    </div>
                  </div>

                  {/* Personal Details */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                        <Heart size={18} />
                      </div>
                      <h3 className="text-xl premium-title">Personal Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoCard 
                        label="Birthdate" 
                        value={userData?.birthdate ? new Date(userData.birthdate).toLocaleDateString('en-GB') : "Not specified"} 
                      />
                      <InfoCard label="Relationship Status" value={userData?.marriedStatus || "Single"} />
                      <InfoCard label="Email Address" value={userData?.email} fullWidth />
                    </div>
                  </div>

                  {/* Professional Experience */}
                  {userData?.experiences && userData.experiences.length > 0 && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                          <Briefcase size={18} />
                        </div>
                        <h3 className="text-xl premium-title">Professional Experience</h3>
                      </div>
                      <div className="space-y-4">
                        {userData.experiences.map((exp, i) => (
                          <div key={i} className="flex gap-4 p-5 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl border border-black/5 dark:border-white/5">
                            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl h-fit">
                              <Briefcase size={20} className="opacity-40" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{exp.title}</p>
                              <p className="opacity-60 font-medium">{exp.company} · {exp.location}</p>
                              <p className="text-xs font-bold uppercase tracking-widest opacity-30 mt-2">
                                {new Date(exp.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - {exp.endDate}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Social Connections */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                        <Globe size={18} />
                      </div>
                      <h3 className="text-xl premium-title">Social Connections</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoCard label="LinkedIn URL" value={userData?.socials?.linkedin} />
                      <InfoCard label="Twitter / X URL" value={userData?.socials?.twitter} />
                      <InfoCard label="GitHub URL" value={userData?.socials?.github} />
                      <InfoCard label="Instagram URL" value={userData?.socials?.instagram} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <h2 className="text-2xl premium-title mb-6">App Preferences</h2>
                  
                  <div className="flex items-center justify-between p-5 bg-black/5 dark:bg-white/5 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                        {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                      </div>
                      <div>
                        <h3 className="font-bold">Appearance</h3>
                        <p className="text-sm opacity-50">Toggle between Light and Dark mode</p>
                      </div>
                    </div>
                    <button 
                      onClick={toggleTheme}
                      className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                      {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-8">
                  <h2 className="text-2xl premium-title mb-6">Security Settings</h2>
                  
                  <div className="space-y-4">
                    <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-xl">
                      <h3 className="font-bold text-red-500 mb-2">Sign Out</h3>
                      <p className="text-sm opacity-60 mb-4">Log out of your IndusConnect account on this device.</p>
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                      >
                        <LogOut size={18} />
                        Sign Out
                      </button>
                    </div>

                    <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-xl">
                      <h3 className="font-bold text-red-500 mb-2">Delete Account</h3>
                      <p className="text-sm opacity-60 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
                      <button 
                        onClick={async () => {
                          if (window.confirm('Are you absolutely sure? This will delete your profile, wall thoughts, and media vault permanently.')) {
                            try {
                              const userId = userData.uid;
                              const role = userData.role;

                              // Delete all associated data (similar to Admin logic)
                              const collections = ['wall_thoughts', 'media_vault', 'comments'];
                              for (const coll of collections) {
                                const q = query(collection(db, coll), where('authorId', '==', userId));
                                const snap = await getDocs(q);
                                await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                              }

                              // Delete user profile
                              const collectionName = role === 'faculty' ? 'faculties' : 'students';
                              await deleteDoc(doc(db, collectionName, userId));
                              await deleteDoc(doc(db, 'users', userId)).catch(() => {});

                              // Finally delete auth user and sign out
                              await auth.currentUser.delete();
                              toast.success('Account deleted successfully.');
                              navigate('/login');
                            } catch (error) {
                              console.error(error);
                              toast.error('Failed to delete account. You may need to re-authenticate first.');
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-transparent border border-red-500/50 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all"
                      >
                        Delete My Account Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'support' && (
                <div className="space-y-8">
                  <h2 className="text-2xl premium-title mb-6">Support & Feedback</h2>
                  
                  <div className="p-8 border border-black/10 dark:border-white/10 rounded-2xl bg-black/5 dark:bg-white/5 text-center">
                    <div className="size-16 bg-black text-white dark:bg-white dark:text-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-black/10">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">Help us improve IndusConnect</h3>
                    <p className="text-sm opacity-60 mb-8 max-w-sm mx-auto leading-relaxed">
                      Your feedback is crucial. Whether it's a bug, a feature request, or just a suggestion, we want to hear from you.
                    </p>
                    <button 
                      onClick={() => setShowFeedbackModal(true)}
                      className="px-8 py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold hover:scale-105 transition-transform"
                    >
                      Write Feedback
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowFeedbackModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl relative z-10 border border-black/10 dark:border-white/10"
            >
              <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-2xl premium-title">Send Feedback</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSendFeedback} className="p-6">
                <textarea
                  autoFocus
                  placeholder="How can we make IndusConnect better for you?"
                  className="w-full h-40 bg-black/5 dark:bg-white/5 rounded-xl p-4 outline-none border border-transparent focus:border-black/10 dark:focus:border-white/10 transition-all text-sm"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  maxLength={500}
                />
                <div className="mt-6 flex items-center justify-between">
                  <span className="text-xs opacity-40 font-bold">{feedback.length}/500</span>
                  <button
                    disabled={!feedback.trim() || isSubmitting}
                    className="flex items-center gap-2 px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Feedback'}
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;

const InfoCard = ({ label, value, mono = false, fullWidth = false }) => (
  <div className={`p-4 bg-black/[0.03] dark:bg-white/[0.03] rounded-xl border border-black/5 dark:border-white/5 ${fullWidth ? 'md:col-span-2' : ''}`}>
    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-1">{label}</p>
    <p className={`text-sm font-bold ${mono ? 'font-mono uppercase' : ''} ${!value ? 'italic opacity-30' : ''}`}>
      {value || "Not provided"}
    </p>
  </div>
);
