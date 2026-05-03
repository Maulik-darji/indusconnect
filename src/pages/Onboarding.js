import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COURSES_DATA } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ImageCropperModal from '../components/ImageCropperModal';

const Onboarding = () => {
  const { user, setUserData } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    return parseInt(localStorage.getItem('onboarding_step')) || 1;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState(null);
  
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('onboarding_data');
    const initial = {
      fullName: '',
      degree: '',
      course: '',
      batchStart: '',
      batchEnd: '',
      socials: { linkedin: '', twitter: '', github: '', instagram: '' },
      birthdate: '',
      marriedStatus: 'Single',
      section: '',
      profileImage: null,
      profileImageUrl: ''
    };
    return saved ? { ...initial, ...JSON.parse(saved), profileImage: null } : initial;
  });

  const [batchDuration, setBatchDuration] = useState(4);

  // Save progress on change
  useEffect(() => {
    const { profileImage, ...serializableData } = formData;
    localStorage.setItem('onboarding_data', JSON.stringify(serializableData));
    localStorage.setItem('onboarding_step', step.toString());
  }, [formData, step]);

  useEffect(() => {
    if (formData.degree) {
      const degreeData = COURSES_DATA[formData.degree];
      if (degreeData && degreeData.branches) {
        if (typeof degreeData.branches[0] === 'object') {
          // Special case for IT/Science/Management
        } else {
          setBatchDuration(degreeData.duration);
        }
      }
    }
  }, [formData.degree]);

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

  const handleFinish = async () => {
    setIsConnecting(true);
    try {
      let imageUrl = '';
      if (formData.profileImage) {
        console.log('Uploading image...');
        try {
          const imageRef = ref(storage, `profiles/${user.uid}`);
          const uploadPromise = uploadBytes(imageRef, formData.profileImage);
          const uploadTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Image upload timed out')), 12000)
          );
          
          await Promise.race([uploadPromise, uploadTimeout]);
          imageUrl = await getDownloadURL(imageRef);
        } catch (imgError) {
          console.error('Image upload failed:', imgError);
          toast.error('Image upload failed. Continuing without profile picture.');
          // Continue with empty imageUrl
        }
      }

      const finalData = {
        ...formData,
        uid: user.uid,
        email: user.email,
        profileImageUrl: imageUrl || '',
        isOnboarded: true,
        updatedAt: new Date().toISOString()
      };
      delete finalData.profileImage;

      console.log('Saving profile to Firestore...');
      const savePromise = setDoc(doc(db, 'users', user.uid), finalData);
      const saveTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout. Please check your Firestore rules.')), 10000)
      );

      await Promise.race([savePromise, saveTimeout]);
      
      console.log('Profile saved successfully');
      setUserData(finalData);
      localStorage.removeItem('onboarding_data');
      localStorage.removeItem('onboarding_step');

      toast.success('Profile completed!');
      
      setTimeout(() => {
        navigate('/');
      }, 500);
    } catch (error) {
      console.error('Onboarding Error:', error);
      toast.error(error.message || 'Failed to save profile. Check Firestore rules.');
    } finally {
      setIsConnecting(false);
    }
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f5ee] dark:bg-[#121212]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="size-16 animate-spin mx-auto mb-6 opacity-40" />
          <h2 className="text-4xl premium-title mb-2">Connecting you with your batchmates</h2>
          <p className="opacity-60 italic">Please wait while we set up your workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:p-6 flex items-center justify-center bg-[#fdfdfb] dark:bg-[#050505]">
      <div className="glass w-full max-w-2xl p-5 sm:p-8 overflow-hidden">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-black dark:bg-white' : 'bg-black/10 dark:bg-white/10'}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl premium-title mb-6">Educational Background</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm opacity-60 mb-2 block">Full Name</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm opacity-60 mb-2 block">Degree Type</label>
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
                      <label className="text-sm opacity-60 mb-2 block">Course / Branch</label>
                      <select 
                        className="input-field appearance-none"
                        value={formData.course}
                        disabled={!formData.degree}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({...formData, course: val});
                          // Handle duration logic for mixed lists
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
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  className="flex-1 p-4 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </button>
                <button 
                  className="btn-primary flex-[2]"
                  onClick={() => formData.fullName && formData.degree && formData.course && setStep(2)}
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl premium-title mb-2">Select Your Batch</h2>
                <p className="text-sm opacity-60 mb-8">Base on your {batchDuration} year course.</p>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm opacity-60 mb-2 block font-medium">Start Year</label>
                      <select 
                        className="input-field"
                        value={formData.batchStart}
                        onChange={(e) => {
                          const start = parseInt(e.target.value);
                          setFormData({...formData, batchStart: start, batchEnd: start + batchDuration});
                        }}
                      >
                        <option value="">Year</option>
                        {Array.from({length: 40}, (_, i) => new Date().getFullYear() - 10 + i).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm opacity-60 mb-2 block font-medium">End Year</label>
                      <input 
                        type="text" 
                        className="input-field bg-black/5 dark:bg-white/5 border-transparent cursor-not-allowed" 
                        value={formData.batchEnd || ''} 
                        placeholder="Auto-calculated"
                        readOnly 
                      />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <label className="text-sm opacity-60 mb-2 block font-medium">Class Section (Optional)</label>
                    <input 
                      type="text" 
                      className="input-field text-center text-xl font-bold !w-14 !h-14 p-0" 
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
                    <p className="text-[10px] opacity-30 mt-2 uppercase tracking-widest text-center">Assigned section letter (A-L)</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  className="flex-1 p-4 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium"
                  onClick={() => setStep(1)}
                >
                  Previous
                </button>
                <button 
                  className="btn-primary flex-[2]"
                  onClick={() => formData.batchStart && setStep(3)}
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl premium-title mb-6">Personalize Your Profile</h2>
                
                <div className="flex flex-col items-center mb-8">
                  <div className="relative size-24 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center border-2 border-dashed border-black/10 dark:border-white/10 group overflow-hidden transition-all hover:border-black/30 dark:hover:border-white/30">
                    {formData.profileImage ? (
                      <>
                        <img src={URL.createObjectURL(formData.profileImage)} className="size-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white" size={20} />
                        </div>
                      </>
                    ) : (
                      <Camera className="opacity-20" size={32} />
                    )}
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </div>
                  <p className="text-xs opacity-40 mt-2">
                    {formData.profileImage ? 'Click to change photo' : 'Upload Profile Photo (Optional)'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm opacity-60 mb-2 block">Birthdate</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={formData.birthdate}
                      onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm opacity-60 mb-2 block">Status</label>
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

                <div className="space-y-3">
                  <label className="text-sm opacity-60 block">Social Links (Optional)</label>
                  <input 
                    type="url" 
                    placeholder="LinkedIn URL" 
                    className="input-field" 
                    onChange={(e) => setFormData({...formData, socials: {...formData.socials, linkedin: e.target.value}})}
                  />
                  <input 
                    type="url" 
                    placeholder="Twitter / X URL" 
                    className="input-field" 
                    onChange={(e) => setFormData({...formData, socials: {...formData.socials, twitter: e.target.value}})}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  className="flex-1 p-4 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium"
                  onClick={() => setStep(2)}
                >
                  Previous
                </button>
                <button 
                  className="btn-primary flex-[2]"
                  onClick={handleFinish}
                >
                  Complete Profile
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
    </div>
  );
};

export default Onboarding;
