import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Bell, Moon, Sun, ChevronRight, LogOut, Settings as SettingsIcon } from 'lucide-react';
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

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: <User size={18} /> },
    { id: 'preferences', label: 'Preferences', icon: <SettingsIcon size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
  ];

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
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${
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
              className="bg-white dark:bg-[#121212] rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5"
            >
              {activeTab === 'account' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-2xl premium-title mb-6">Profile Details</h2>
                    <div className="flex items-center gap-6 mb-8">
                      <div className="size-24 rounded-full border border-black/10 dark:border-white/10 overflow-hidden bg-black/5 dark:bg-white/5">
                        {userData?.profileImageUrl ? (
                          <img src={userData.profileImageUrl} alt="Profile" className="size-full object-cover" />
                        ) : (
                          <div className="size-full flex items-center justify-center text-2xl font-bold">
                            {userData?.fullName?.charAt(0) || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{userData?.fullName}</h3>
                        <p className="opacity-50">{userData?.course} • Batch of {userData?.batchEnd}</p>
                        <Link 
                          to="/edit-profile"
                          className="inline-block mt-3 px-4 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm font-bold transition-colors"
                        >
                          Edit Profile Details
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="h-px w-full bg-black/5 dark:bg-white/5" />

                  <div>
                    <h2 className="text-xl font-bold mb-4">Personal Information</h2>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Email Address</p>
                          <p className="font-medium">{userData?.email || auth.currentUser?.email}</p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-black/5 dark:bg-white/5 rounded-xl">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">IU Number</p>
                          <p className="font-medium font-mono uppercase">{userData?.iuNumber}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="space-y-8">
                  <h2 className="text-2xl premium-title mb-6">App Preferences</h2>
                  
                  <div className="flex items-center justify-between p-5 bg-black/5 dark:bg-white/5 rounded-2xl">
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
                    <div className="p-5 border border-red-500/20 bg-red-500/5 rounded-2xl">
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
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
