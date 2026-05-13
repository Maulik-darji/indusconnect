import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getBlob } from 'firebase/storage';
import { COURSES_DATA } from '../constants';
import { motion } from 'framer-motion';
import { Loader2, Camera, Pencil, ArrowLeft, Save, User, BookOpen, Calendar, Hash, Heart, Share2, Briefcase, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getFunkyAvatar } from '../constants';
import ImageCropperModal from '../components/ImageCropperModal';
import AvatarSelectorModal from '../components/AvatarSelectorModal';

const EditProfile = () => {
  const { user, userData, setUserData } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isPencilLoading, setIsPencilLoading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [batchDuration, setBatchDuration] = useState(4);
  const [iuError, setIuError] = useState('');
  const [isCheckingIu, setIsCheckingIu] = useState(false);
  const [showAvatarLibrary, setShowAvatarLibrary] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    degree: '',
    course: '',
    batchStart: '',
    batchEnd: '',
    bio: '',
    socials: { linkedin: '', twitter: '', github: '', instagram: '' },
    birthdate: '',
    marriedStatus: 'Single',
    section: '',
    iuNumber: '',
    experiences: [],
    profileImageUrl: '',
    role: 'student',
    gender: 'other',
    coursesTaught: []
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.fullName?.split(' ')[0] || '',
        lastName: userData.fullName?.split(' ').slice(1).join(' ') || '',
        fullName: userData.fullName || '',
        degree: userData.degree || '',
        course: userData.course || '',
        batchStart: userData.batchStart || '',
        batchEnd: userData.batchEnd || '',
        bio: userData.bio || '',
        socials: userData.socials || { linkedin: '', twitter: '', github: '', instagram: '' },
        birthdate: userData.birthdate || '',
        marriedStatus: userData.marriedStatus || 'Single',
        section: userData.section || '',
        iuNumber: userData.iuNumber || '',
        experiences: userData.experiences || [],
        profileImageUrl: userData.profileImageUrl || '',
        role: userData.role || 'student',
        gender: userData.gender || 'other',
        coursesTaught: userData.coursesTaught || []
      });

      // Calculate batch duration based on degree/course
      if (userData.degree) {
        const degreeData = COURSES_DATA[userData.degree];
        if (degreeData) {
          if (Array.isArray(degreeData.branches)) {
            if (typeof degreeData.branches[0] === 'object') {
              const found = degreeData.branches.find(b => b.name === userData.course);
              if (found) setBatchDuration(found.duration);
            } else {
              setBatchDuration(degreeData.duration);
            }
          }
        }
      }
    }
  }, [userData]);

  // Real-time IU uniqueness check
  useEffect(() => {
    const checkIu = async () => {
      if (formData.iuNumber && formData.iuNumber.length > 5) {
        setIsCheckingIu(true);
        try {
          const q = query(collection(db, 'students'), where('iuNumber', '==', formData.iuNumber));
          const snap = await getDocs(q);
          if (!snap.empty && snap.docs[0].id !== user.uid) {
            setIuError('This IU Number is already in use');
          } else {
            setIuError('');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsCheckingIu(false);
        }
      } else {
        setIuError('');
      }
    };

    const timeoutId = setTimeout(checkIu, 800);
    return () => clearTimeout(timeoutId);
  }, [formData.iuNumber, user.uid]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setTempImage(reader.result);
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const updateProfileImageDirectly = async (imageUrl, fileBlob) => {
    const uploadToast = toast.loading('Updating profile picture...');
    try {
      let finalUrl = imageUrl;
      
      if (fileBlob) {
        const imageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(imageRef, fileBlob);
        finalUrl = await getDownloadURL(imageRef);
      }

      const targetCollection = formData.role === 'faculty' ? 'faculties' : 'students';
      await updateDoc(doc(db, targetCollection, user.uid), { profileImageUrl: finalUrl, updatedAt: new Date().toISOString() });
      await updateDoc(doc(db, 'users', user.uid), { profileImageUrl: finalUrl, updatedAt: new Date().toISOString() }).catch(() => {});

      const qPosts = query(collection(db, 'home_feed'), where('authorId', '==', user.uid));
      const postsSnap = await getDocs(qPosts);
      const postPromises = postsSnap.docs.map(d => updateDoc(doc(db, 'home_feed', d.id), { authorPhoto: finalUrl }));

      const qThoughts = query(collection(db, 'wall_thoughts'), where('authorId', '==', user.uid));
      const thoughtsSnap = await getDocs(qThoughts);
      const thoughtPromises = thoughtsSnap.docs.map(d => updateDoc(doc(db, 'wall_thoughts', d.id), { authorPhoto: finalUrl }));

      const qMemories = query(collection(db, 'media_vault'), where('authorId', '==', user.uid));
      const memoriesSnap = await getDocs(qMemories);
      const memoryPromises = memoriesSnap.docs.map(d => updateDoc(doc(db, 'media_vault', d.id), { authorImage: finalUrl }));

      await Promise.all([...postPromises, ...thoughtPromises, ...memoryPromises]);

      setFormData(prev => ({ ...prev, profileImageUrl: finalUrl, profileImage: null }));
      setUserData(prev => ({ ...prev, profileImageUrl: finalUrl }));
      
      toast.success('Profile picture updated successfully!', { id: uploadToast });
    } catch (error) {
      console.error(error);
      toast.error('Failed to update profile picture.', { id: uploadToast });
    }
  };

  const handleCropComplete = (croppedBlob) => {
    setShowCropper(false);
    updateProfileImageDirectly(null, croppedBlob);
  };

  const handleSave = async () => {
    if (!formData.firstName?.trim() || !formData.lastName?.trim() || !formData.degree || !formData.course || !formData.batchStart || !formData.iuNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.firstName.length < 2 || formData.lastName.length < 2) {
      toast.error('Name fields must be at least 2 characters long');
      return;
    }

    if (formData.iuNumber.length < 5) {
      toast.error('Please enter a valid IU number');
      return;
    }

    if (iuError) {
      toast.error(iuError);
      return;
    }

    setIsSaving(true);
    try {
      // Check IU uniqueness if it changed
      if (formData.iuNumber !== userData.iuNumber) {
        const q = query(collection(db, 'students'), where('iuNumber', '==', formData.iuNumber));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const existingUser = querySnapshot.docs[0];
          if (existingUser.id !== user.uid) {
            toast.error('This IU Number is already registered by another student.');
            setIsSaving(false);
            return;
          }
        }
      }

      let imageUrl = formData.profileImageUrl;
      
      if (formData.profileImage) {
        const imageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(imageRef, formData.profileImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const combinedName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const finalData = {
        ...formData,
        fullName: combinedName,
        profileImageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      };
      delete finalData.profileImage;

      const targetCollection = formData.role === 'faculty' ? 'faculties' : 'students';
      await updateDoc(doc(db, targetCollection, user.uid), finalData);
      
      // Also update users collection for legacy compatibility
      await updateDoc(doc(db, 'users', user.uid), finalData).catch(() => {});

      // Propagate name/photo changes to posts and thoughts
      const propagateUpdates = async () => {
        try {
          // 1. Update Home Feed Posts
          const qPosts = query(collection(db, 'home_feed'), where('authorId', '==', user.uid));
          const postsSnap = await getDocs(qPosts);
          const postPromises = postsSnap.docs.map(d => 
            updateDoc(doc(db, 'home_feed', d.id), {
              authorName: finalData.fullName,
              authorPhoto: imageUrl,
              authorCourse: finalData.course || 'N/A',
              authorBatch: finalData.batchStart || 'N/A'
            })
          );

          // 2. Update Wall Thoughts
          const qThoughts = query(collection(db, 'wall_thoughts'), where('authorId', '==', user.uid));
          const thoughtsSnap = await getDocs(qThoughts);
          const thoughtPromises = thoughtsSnap.docs.map(d => 
            updateDoc(doc(db, 'wall_thoughts', d.id), {
              authorName: finalData.fullName,
              authorPhoto: imageUrl,
              authorCourse: finalData.course || 'N/A',
              authorBatch: finalData.batchStart || 'N/A'
            })
          );

          // 3. Update Media Vault Memories
          const qMemories = query(collection(db, 'media_vault'), where('authorId', '==', user.uid));
          const memoriesSnap = await getDocs(qMemories);
          const memoryPromises = memoriesSnap.docs.map(d => 
            updateDoc(doc(db, 'media_vault', d.id), {
              author: finalData.fullName,
              authorImage: imageUrl
            })
          );

          await Promise.all([...postPromises, ...thoughtPromises, ...memoryPromises]);
        } catch (err) {
          console.error("Propagation error:", err);
        }
      };
      
      propagateUpdates();
      
      setUserData({ ...userData, ...finalData });
      toast.success('Profile updated successfully!');
      navigate('/settings');
    } catch (error) {
      console.error('Update Error:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#050505] transition-colors duration-500 pt-20 sm:pt-24 md:pt-28 pb-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div>
            <button 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 text-sm font-bold opacity-50 hover:opacity-100 transition-opacity mb-4"
            >
              <ArrowLeft size={16} />
              Back to Settings
            </button>
            <h1 className="text-4xl sm:text-5xl premium-title tracking-tight mb-2">Edit Profile</h1>
            <p className="text-lg opacity-60 font-light">
              {userData?.role === 'faculty' ? 'Update your academic profile and teaching history.' : 'Update your personal and educational information.'}
            </p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="hidden sm:flex items-center gap-2 px-8 py-4 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Photo Card */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-[#121212] rounded-xl p-8 shadow-2xl border border-black/5 dark:border-white/5 sticky top-28">
              <div className="flex flex-col items-center">
                <div className="relative size-40 group mb-6">
                  <div className="size-full rounded-xl overflow-hidden border-4 border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                    {formData.profileImage ? (
                      <img 
                        id="profile-preview-img"
                        src={URL.createObjectURL(formData.profileImage)} 
                        className="size-full object-cover" 
                        alt="Preview" 
                      />
                    ) : formData.profileImageUrl ? (
                      <img 
                        id="profile-preview-img"
                        src={formData.profileImageUrl} 
                        className="size-full object-cover" 
                        alt="Profile" 
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = ''; // Fallback to initials
                          setFormData(prev => ({ ...prev, profileImageUrl: '' }));
                        }}
                      />
                    ) : (
                      <img src={getFunkyAvatar(user?.uid)} alt="" className="size-full object-cover" />
                    )}
                  </div>
                  
                  <label className="absolute -bottom-2 -left-2 p-2.5 bg-black text-white dark:bg-white dark:text-black rounded-xl shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all">
                    <Camera size={18} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>

                  <button 
                    onClick={() => setShowAvatarLibrary(true)}
                    className="absolute -bottom-2 -right-2 p-2.5 bg-white dark:bg-[#1a1a1a] text-black dark:text-white rounded-xl shadow-xl border border-black/5 dark:border-white/5 hover:scale-110 active:scale-95 transition-all group"
                    title="Choose from library"
                  >
                    <Users size={18} className="group-hover:text-[#ffb03a] transition-colors" />
                  </button>
                </div>
                <h3 className="text-xl font-bold text-center mb-1">{formData.fullName || 'Your Name'}</h3>
                <p className="text-sm opacity-50 text-center mb-6">{formData.course || 'Select a course'}</p>
                <p className="text-xs opacity-30 text-center font-medium leading-relaxed">
                  Recommended: Square JPG or PNG, <br />at least 400x400px.
                </p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="md:col-span-2 space-y-8">
            {/* Educational Background */}
            <div className="bg-white dark:bg-[#121212] rounded-xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-2xl premium-title">{userData?.role === 'faculty' ? 'Academic Profile' : 'Educational Background'}</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">First Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Yug"
                      value={formData.firstName}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setFormData({...formData, firstName: val});
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Last Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Patel"
                      value={formData.lastName}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                        setFormData({...formData, lastName: val});
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold opacity-50 block uppercase tracking-widest">Bio (About Me)</label>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      (formData.bio?.trim().split(/\s+/).filter(Boolean).length || 0) > 100 ? 'text-red-500' : 'opacity-30'
                    }`}>
                      {formData.bio?.trim().split(/\s+/).filter(Boolean).length || 0} / 100 Words
                    </span>
                  </div>
                  <textarea 
                    className={`input-field min-h-[100px] py-3 transition-colors ${
                      (formData.bio?.trim().split(/\s+/).filter(Boolean).length || 0) > 100 ? 'border-red-500/50 focus:border-red-500' : ''
                    }`}
                    placeholder="Tell us a bit about yourself..."
                    value={formData.bio}
                    onChange={(e) => {
                      const text = e.target.value;
                      const words = text.trim().split(/\s+/).filter(Boolean);
                      if (words.length <= 100 || text.length < formData.bio.length) {
                        setFormData({...formData, bio: text});
                      } else {
                        // If they try to paste/type more, we trim it to 100 words
                        const trimmed = words.slice(0, 100).join(' ');
                        setFormData({...formData, bio: trimmed});
                        toast.error("Word limit reached (100 words max)");
                      }
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">
                      {userData?.role === 'faculty' ? 'Assigned Degree' : 'Degree Type'}
                    </label>
                    <select 
                      className="input-field appearance-none"
                      value={formData.degree}
                      onChange={(e) => setFormData({...formData, degree: e.target.value, course: ''})}
                    >
                      <option value="">Select Degree</option>
                      {Object.keys(COURSES_DATA).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">
                      {userData?.role === 'faculty' ? 'Primary Branch' : 'Course / Branch'}
                    </label>
                    <select 
                      className="input-field appearance-none"
                      value={formData.course}
                      disabled={!formData.degree}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({...formData, course: val});
                        const degreeData = COURSES_DATA[formData.degree];
                        if (Array.isArray(degreeData.branches)) {
                          if (typeof degreeData.branches[0] === 'object') {
                            const found = degreeData.branches.find(b => b.name === val);
                            if (found) setBatchDuration(found.duration);
                          } else {
                            setBatchDuration(degreeData.duration);
                          }
                        }
                      }}
                    >
                      <option value="">Select Course</option>
                      {formData.degree && COURSES_DATA[formData.degree].branches.map(b => (
                        <option key={typeof b === 'string' ? b : b.name} value={typeof b === 'string' ? b : b.name}>
                          {typeof b === 'string' ? b : b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">
                      {userData?.role === 'faculty' ? 'Faculty / IU Number' : 'IU Number'}
                    </label>
                    <input 
                    type="text" 
                    className="input-field font-mono uppercase" 
                    placeholder="e.g. IU2341230378"
                    maxLength={12}
                    value={formData.iuNumber}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      const digits = val.replace(/[^0-9]/g, '');
                      setFormData({...formData, iuNumber: 'IU' + digits});
                    }}
                  />
                  {isCheckingIu && <p className="text-[10px] text-blue-500 mt-1 animate-pulse font-bold uppercase tracking-widest">Checking availability...</p>}
                  {iuError && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-widest">{iuError}</p>}
                </div>
                <div>
                  <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Section (Optional)</label>
                  <input 
                    type="text" 
                    className="input-field uppercase text-center" 
                    placeholder="A-L"
                    maxLength={1}
                    value={formData.section}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      if (val === '' || (val >= 'A' && val <= 'L')) {
                        setFormData({...formData, section: val});
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Batch & Timeline */}
          <div className="bg-white dark:bg-[#121212] rounded-xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <Calendar size={20} />
              </div>
              <h2 className="text-2xl premium-title">Batch & Timeline</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Start Year</label>
                <select 
                  className="input-field"
                  value={formData.batchStart}
                  onChange={(e) => {
                    const start = parseInt(e.target.value);
                    setFormData({...formData, batchStart: start, batchEnd: start + batchDuration});
                  }}
                >
                  <option value="">Select Year</option>
                  {Array.from({length: 40}, (_, i) => new Date().getFullYear() - 15 + i).map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">End Year (Auto)</label>
                <input 
                  type="text" 
                  className="input-field bg-black/5 dark:bg-white/5 border-transparent cursor-not-allowed" 
                  value={formData.batchEnd || ''} 
                  readOnly 
                />
              </div>
            </div>
          </div>

          {/* Personal Details */}
          <div className="bg-white dark:bg-[#121212] rounded-xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <Heart size={20} />
              </div>
              <h2 className="text-2xl premium-title">Personal Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Birthdate</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={formData.birthdate}
                  onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Relationship Status</label>
                <select 
                  className="input-field"
                  value={formData.marriedStatus}
                  onChange={(e) => setFormData({...formData, marriedStatus: e.target.value})}
                >
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Engaged">Engaged</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Gender</label>
                <select 
                  className="input-field"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="other">Other / Not Specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Professional Experience */}
          <div className="bg-white dark:bg-[#121212] rounded-xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <Briefcase size={20} />
                </div>
                <h2 className="text-2xl premium-title">Professional Experience</h2>
              </div>
              <button 
                onClick={() => {
                  const newExp = {
                    id: Date.now().toString(),
                    title: '',
                    company: '',
                    employmentType: 'Full-time',
                    location: '',
                    startDate: '',
                    endDate: 'Present',
                    websiteUrl: '',
                    description: ''
                  };
                  setFormData({ ...formData, experiences: [...formData.experiences, newExp] });
                }}
                className="p-2 bg-black text-white dark:bg-white dark:text-black rounded-lg hover:scale-110 transition-transform"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {formData.experiences.map((exp, index) => (
                <div key={exp.id} className="p-6 border border-black/5 dark:border-white/5 rounded-xl bg-black/5 dark:bg-white/5 relative group">
                  <button 
                    onClick={() => {
                      const newExps = formData.experiences.filter((_, i) => i !== index);
                      setFormData({ ...formData, experiences: newExps });
                    }}
                    className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">Job Title*</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Retail Sales Manager" 
                        className="input-field" 
                        value={exp.title}
                        onChange={(e) => {
                          const newExps = [...formData.experiences];
                          newExps[index].title = e.target.value;
                          setFormData({ ...formData, experiences: newExps });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">Company*</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Microsoft" 
                        className="input-field" 
                        value={exp.company}
                        onChange={(e) => {
                          const newExps = [...formData.experiences];
                          newExps[index].company = e.target.value;
                          setFormData({ ...formData, experiences: newExps });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">Employment Type</label>
                      <select 
                        className="input-field"
                        value={exp.employmentType}
                        onChange={(e) => {
                          const newExps = [...formData.experiences];
                          newExps[index].employmentType = e.target.value;
                          setFormData({ ...formData, experiences: newExps });
                        }}
                      >
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Self-employed">Self-employed</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Contract">Contract</option>
                        <option value="Internship">Internship</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">Location</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Ahmedabad, India" 
                        className="input-field" 
                        list="location-suggestions"
                        value={exp.location}
                        onChange={(e) => {
                          const newExps = [...formData.experiences];
                          newExps[index].location = e.target.value;
                          setFormData({ ...formData, experiences: newExps });
                        }}
                      />
                      <datalist id="location-suggestions">
                        <option value="Ahmedabad, Gujarat" />
                        <option value="Gandhinagar, Gujarat" />
                        <option value="Surat, Gujarat" />
                        <option value="Vadodara, Gujarat" />
                        <option value="Rajkot, Gujarat" />
                        <option value="Mumbai, Maharashtra" />
                        <option value="Pune, Maharashtra" />
                        <option value="Bangalore, Karnataka" />
                        <option value="Hyderabad, Telangana" />
                        <option value="Delhi, NCR" />
                        <option value="Chennai, Tamil Nadu" />
                        <option value="Kolkata, West Bengal" />
                        <option value="Remote" />
                        <option value="On-site" />
                        <option value="Hybrid" />
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">Website URL (Optional)</label>
                      <input 
                        type="url" 
                        placeholder="https://company.com" 
                        className="input-field" 
                        value={exp.websiteUrl || ''}
                        onChange={(e) => {
                          const newExps = [...formData.experiences];
                          newExps[index].websiteUrl = e.target.value;
                          setFormData({ ...formData, experiences: newExps });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">Start Date</label>
                      <input 
                        type="month" 
                        className="input-field" 
                        value={exp.startDate}
                        onChange={(e) => {
                          const newExps = [...formData.experiences];
                          newExps[index].startDate = e.target.value;
                          setFormData({ ...formData, experiences: newExps });
                        }}
                      />
                    </div>
                    <div className="col-span-2 mb-2">
                      <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02] rounded-xl border border-black/5 dark:border-white/5 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="size-4 rounded border-black/20 text-[#ffb03a] focus:ring-[#ffb03a] bg-transparent"
                            checked={!exp.endDate || exp.endDate === 'Present'}
                            onChange={(e) => {
                              const newExps = [...formData.experiences];
                              newExps[index].endDate = e.target.checked ? 'Present' : '';
                              setFormData({ ...formData, experiences: newExps });
                            }}
                          />
                          <span className="text-sm font-medium opacity-60 group-hover:opacity-100 transition-opacity">I am currently working in this role</span>
                        </label>

                        {(!exp.endDate || exp.endDate === 'Present') && (
                          <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/5">
                            {[
                              `End current position as of now - Building`,
                              `End current position as of now - ${exp.title || 'Role'}`,
                              `End current position as of now - ${exp.title || 'Role'} | Built and scaled web platform`
                            ].map((option, optIdx) => (
                              <label key={optIdx} className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  className="size-4 rounded border-black/20 text-[#ffb03a] focus:ring-[#ffb03a] bg-transparent"
                                  checked={false}
                                  onChange={() => {
                                    const newExps = [...formData.experiences];
                                    const now = new Date();
                                    const month = String(now.getMonth() + 1).padStart(2, '0');
                                    newExps[index].endDate = `${now.getFullYear()}-${month}`;
                                    setFormData({ ...formData, experiences: newExps });
                                  }}
                                />
                                <span className="text-xs opacity-40 group-hover:opacity-80 transition-opacity">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {exp.endDate && exp.endDate !== 'Present' && (
                      <div>
                        <label className="text-xs font-bold opacity-50 mb-2 block uppercase tracking-widest">End Date</label>
                        <input 
                          type="month" 
                          className="input-field" 
                          value={exp.endDate}
                          onChange={(e) => {
                            const newExps = [...formData.experiences];
                            newExps[index].endDate = e.target.value;
                            setFormData({ ...formData, experiences: newExps });
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {formData.experiences.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-black/5 dark:border-white/5 rounded-xl">
                  <p className="opacity-40 italic">No experience added yet. Click + to add your professional journey.</p>
                </div>
              )}
            </div>
          </div>

          {/* Social Connections */}
          <div className="bg-white dark:bg-[#121212] rounded-xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <Share2 size={20} />
              </div>
              <h2 className="text-2xl premium-title">Social Connections</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">LinkedIn URL</label>
                <input 
                  type="url" 
                  placeholder="https://linkedin.com/in/username" 
                  className="input-field" 
                  value={formData.socials.linkedin}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, linkedin: e.target.value}})}
                />
              </div>
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Twitter / X URL</label>
                <input 
                  type="url" 
                  placeholder="https://twitter.com/username" 
                  className="input-field" 
                  value={formData.socials.twitter}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, twitter: e.target.value}})}
                />
              </div>
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">GitHub URL</label>
                <input 
                  type="url" 
                  placeholder="https://github.com/username" 
                  className="input-field" 
                  value={formData.socials.github}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, github: e.target.value}})}
                />
              </div>
              <div>
                <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Instagram URL</label>
                <input 
                  type="url" 
                  placeholder="https://instagram.com/username" 
                  className="input-field" 
                  value={formData.socials.instagram}
                  onChange={(e) => setFormData({...formData, socials: {...formData.socials, instagram: e.target.value}})}
                />
              </div>
            </div>
          </div>

            {/* Mobile Save Button */}
            <div className="sm:hidden">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 p-5 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Changes
              </button>
            </div>

        </div>
      </div>

      <AvatarSelectorModal 
        isOpen={showAvatarLibrary}
        onClose={() => setShowAvatarLibrary(false)}
        genderDefault={formData.gender}
        onSelect={(url) => {
          updateProfileImageDirectly(url, null);
        }}
        currentAvatarUrl={formData.profileImageUrl}
      />
    </div>

    {showCropper && (
      <ImageCropperModal 
        image={tempImage}
        onCropComplete={handleCropComplete}
        onCancel={() => setShowCropper(false)}
        onDelete={() => {
          setFormData({ ...formData, profileImage: null });
          setShowCropper(false);
        }}
      />
    )}
  </div>
  );
};

export default EditProfile;
