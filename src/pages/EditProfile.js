import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COURSES_DATA } from '../constants';
import { motion } from 'framer-motion';
import { Loader2, Camera, Pencil, ArrowLeft, Save, User, BookOpen, Calendar, Hash, Heart, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ImageCropperModal from '../components/ImageCropperModal';

const EditProfile = () => {
  const { user, userData, setUserData } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  const [batchDuration, setBatchDuration] = useState(4);

  const [formData, setFormData] = useState({
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
    profileImage: null,
    profileImageUrl: ''
  });

  useEffect(() => {
    if (userData) {
      setFormData({
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
        profileImageUrl: userData.profileImageUrl || ''
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

  const handleCropComplete = (croppedBlob) => {
    const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
    setFormData({ ...formData, profileImage: file });
    setShowCropper(false);
  };

  const handleSave = async () => {
    if (!formData.fullName || !formData.degree || !formData.course || !formData.batchStart || !formData.iuNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = formData.profileImageUrl;
      
      if (formData.profileImage) {
        const imageRef = ref(storage, `profiles/${user.uid}`);
        await uploadBytes(imageRef, formData.profileImage);
        imageUrl = await getDownloadURL(imageRef);
      }

      const finalData = {
        ...formData,
        profileImageUrl: imageUrl,
        updatedAt: new Date().toISOString()
      };
      delete finalData.profileImage;

      await updateDoc(doc(db, 'users', user.uid), finalData);
      
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
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#050505] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8">
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
            <p className="text-lg opacity-60 font-light">Update your personal and educational information.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="hidden sm:flex items-center gap-2 px-8 py-4 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Save Changes
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Photo Card */}
          <div className="md:col-span-1">
            <div className="bg-white dark:bg-[#121212] rounded-3xl p-8 shadow-2xl border border-black/5 dark:border-white/5 sticky top-28">
              <div className="flex flex-col items-center">
                <div className="relative size-40 group mb-6">
                  <div className="size-full rounded-full overflow-hidden border-4 border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5">
                    {formData.profileImage ? (
                      <img src={URL.createObjectURL(formData.profileImage)} className="size-full object-cover" alt="Preview" />
                    ) : formData.profileImageUrl ? (
                      <img src={formData.profileImageUrl} className="size-full object-cover" alt="Profile" />
                    ) : (
                      <div className="size-full flex items-center justify-center text-5xl font-bold opacity-20">
                        {formData.fullName?.charAt(0) || <User size={60} />}
                      </div>
                    )}
                  </div>
                  
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="text-white" size={32} />
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </label>

                  {(formData.profileImage || formData.profileImageUrl) && (
                    <button 
                      onClick={() => {
                        if (formData.profileImage) {
                          const reader = new FileReader();
                          reader.onload = () => {
                            setTempImage(reader.result);
                            setShowCropper(true);
                          };
                          reader.readAsDataURL(formData.profileImage);
                        } else {
                          // Handle existing URL cropping if needed, or just allow re-upload
                          toast.error("To edit current photo, please upload it again.");
                        }
                      }}
                      className="absolute bottom-1 right-1 size-10 bg-black dark:bg-white rounded-full flex items-center justify-center text-white dark:text-black shadow-lg hover:scale-110 transition-transform z-20 border-2 border-white dark:border-[#121212]"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
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
            <div className="bg-white dark:bg-[#121212] rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                  <BookOpen size={20} />
                </div>
                <h2 className="text-2xl premium-title">Educational Background</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Full Name</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Yug Patel"
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Bio (About Me)</label>
                  <textarea 
                    className="input-field min-h-[100px] py-3" 
                    placeholder="Tell us a bit about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Degree Type</label>
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
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">Course / Branch</label>
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
                    <label className="text-sm font-bold opacity-50 mb-2 block uppercase tracking-widest">IU Number</label>
                    <input 
                      type="text" 
                      className="input-field font-mono uppercase" 
                      placeholder="e.g. IU1234567890"
                      value={formData.iuNumber}
                      onChange={(e) => setFormData({...formData, iuNumber: e.target.value.toUpperCase()})}
                    />
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
            <div className="bg-white dark:bg-[#121212] rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
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
            <div className="bg-white dark:bg-[#121212] rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
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
              </div>
            </div>

            {/* Social Connections */}
            <div className="bg-white dark:bg-[#121212] rounded-3xl p-6 sm:p-8 shadow-2xl border border-black/5 dark:border-white/5">
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
                className="w-full flex items-center justify-center gap-2 p-5 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-bold shadow-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
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
