import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, storage, auth } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { COURSES_DATA } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Camera, Pencil, Users, GraduationCap, X } from 'lucide-react';
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
      role: localStorage.getItem('is_faculty_signup') === 'true' ? 'faculty' : 
            (localStorage.getItem('is_faculty_signup') === 'false' ? 'student' : ''), 
      firstName: '',
      lastName: '',
      degree: '',
      course: '',
      batchStart: '',
      batchEnd: '',
      socials: { linkedin: '', twitter: '', github: '', instagram: '' },
      birthdate: '',
      marriedStatus: 'Single',
      section: '',
      iuNumber: '',
      profileImage: null,
      profileImageUrl: '',
      coursesTaught: [] // for faculty
    };
    return saved ? { ...initial, ...JSON.parse(saved), profileImage: null } : initial;
  });

  const [batchDuration, setBatchDuration] = useState(4);
  const [iuError, setIuError] = useState('');
  const [isCheckingIu, setIsCheckingIu] = useState(false);

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
        fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        uid: user.uid,
        email: user.email,
        profileImageUrl: imageUrl || '',
        authProvider: user.providerData[0]?.providerId || 'password',
        isOnboarded: true,
        updatedAt: new Date().toISOString()
      };
      delete finalData.profileImage;

      const targetCollection = finalData.role === 'faculty' ? 'faculties' : 'students';
      
      console.log(`Saving profile to ${targetCollection} collection...`);
      const savePromise = setDoc(doc(db, targetCollection, user.uid), finalData);
      const saveTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout. Please check your Firestore rules.')), 10000)
      );

      await Promise.race([savePromise, saveTimeout]);
      
      console.log('Profile saved successfully');
      setUserData(finalData);
      localStorage.removeItem('onboarding_data');
      localStorage.removeItem('onboarding_step');
      localStorage.removeItem('is_faculty_signup');

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
          <h2 className="text-4xl premium-title mb-2">
            {formData.role === 'faculty' ? 'Crafting page for you...' : 'Connecting you with your batchmates'}
          </h2>
          <p className="opacity-60 italic">
            {formData.role === 'faculty' ? 'Connecting you with other faculties...' : 'Please wait while we set up your workspace...'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:p-6 flex items-center justify-center bg-[#fdfdfb] dark:bg-[#050505]">
      <div className="glass w-full max-w-2xl p-5 sm:p-8 overflow-hidden">
        <div className="flex gap-2 mb-8">
          {[...Array(formData.role === 'faculty' ? 3 : 3)].map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i + 1 <= step ? 'bg-black dark:bg-white' : 'bg-black/10 dark:bg-white/10'}`} />
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
                <h2 className="text-3xl sm:text-4xl premium-title mb-2">Welcome to IndusConnect</h2>
                <p className="text-sm opacity-60 mb-6">
                  {formData.role 
                    ? `Setting up your profile as ${formData.role === 'faculty' ? 'Faculty' : 'Student'}...` 
                    : 'Tell us who you are to personalize your experience.'}
                </p>
                
                {/* Role selection removed - defaulting to student */}
                {!formData.role && (
                  <div className="flex justify-center mb-8">
                    <div className="p-8 rounded-2xl border-2 border-black bg-black/5 dark:border-white dark:bg-white/5 flex flex-col items-center gap-3 w-full max-w-sm">
                      <div className="size-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        <Users size={32} />
                      </div>
                      <span className="font-bold text-lg">Student / Alumni</span>
                      <p className="text-xs opacity-50 text-center">Your profile will be set up as a student/alumni of Indus University.</p>
                      <button 
                        onClick={() => setFormData({...formData, role: 'student'})}
                        className="mt-4 btn-primary w-full py-3"
                      >
                        Confirm & Continue
                      </button>
                    </div>
                  </div>
                )}

                {formData.role && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm opacity-60 mb-2 block">First Name</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="John"
                          value={formData.firstName}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setFormData({...formData, firstName: val});
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-sm opacity-60 mb-2 block">Last Name</label>
                        <input 
                          type="text" 
                          className="input-field" 
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                            setFormData({...formData, lastName: val});
                          }}
                        />
                      </div>
                    </div>
                    {formData.role === 'student' && (
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
                    )}
                  </motion.div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button 
                  className="flex-1 p-4 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all font-medium"
                  onClick={async () => {
                    await auth.signOut();
                    localStorage.clear(); // Clear intent on back
                    navigate('/login');
                  }}
                >
                  Back to Login
                </button>
                <button 
                  className="btn-primary flex-[2]"
                  disabled={!formData.role || !formData.firstName?.trim() || !formData.lastName?.trim() || formData.firstName.length < 2 || formData.lastName.length < 2 || (formData.role === 'student' && (!formData.degree || !formData.course))}
                  onClick={() => setStep(2)}
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
                <h2 className="text-3xl sm:text-4xl premium-title mb-2">
                  {formData.role === 'faculty' ? 'When did you join?' : 'Select Your Batch'}
                </h2>
                <p className="text-sm opacity-60 mb-8">
                  {formData.role === 'faculty' ? 'The year you became a part of Indus University.' : `Base on your ${batchDuration} year course.`}
                </p>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm opacity-60 mb-2 block font-medium">
                        {formData.role === 'faculty' ? 'Joining Year' : 'Start Year'}
                      </label>
                      <select 
                        className="input-field"
                        value={formData.batchStart}
                        onChange={(e) => {
                          const start = parseInt(e.target.value);
                          if (formData.role === 'student') {
                            setFormData({...formData, batchStart: start, batchEnd: start + batchDuration});
                          } else {
                            setFormData({...formData, batchStart: start});
                          }
                        }}
                      >
                        <option value="">Year</option>
                        {Array.from({length: 40}, (_, i) => new Date().getFullYear() - 30 + i).map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    {formData.role === 'student' && (
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
                    )}
                  </div>

                  {formData.role === 'student' && (
                    <div className="flex flex-col md:flex-row gap-6 mt-6 pt-6 border-t border-black/5 dark:border-white/5">
                      <div className="flex-[2]">
                        <label className="text-sm opacity-60 mb-2 block font-medium">IU Number</label>
                        <input 
                          type="text" 
                          className="input-field uppercase font-mono" 
                          placeholder="e.g. IU2341230378"
                          maxLength={12}
                          value={formData.iuNumber || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            const digits = val.replace(/[^0-9]/g, '');
                            setFormData({...formData, iuNumber: 'IU' + digits});
                          }}
                        />
                        {isCheckingIu && <p className="text-[10px] text-blue-500 mt-1 animate-pulse font-bold uppercase tracking-widest">Checking availability...</p>}
                        {iuError && <p className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-widest">{iuError}</p>}
                        {!iuError && !isCheckingIu && <p className="text-[10px] opacity-30 mt-2 uppercase tracking-widest">Your university roll number</p>}
                      </div>

                      <div className="flex flex-col items-center flex-1">
                        <label className="text-sm opacity-60 mb-2 block font-medium">Section</label>
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
                        <p className="text-[10px] opacity-30 mt-2 uppercase tracking-widest text-center">Optional</p>
                      </div>
                    </div>
                  )}
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
                  className={`btn-primary flex-[2] ${(formData.role === 'student' && (!formData.batchStart || !formData.iuNumber || iuError)) || (formData.role === 'faculty' && !formData.batchStart) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={formData.role === 'student' && iuError}
                  onClick={async () => {
                    if (formData.role === 'faculty') {
                      setStep(3);
                    } else if (formData.batchStart && formData.iuNumber) {
                      // Check uniqueness
                      if (formData.iuNumber.length < 5) {
                        toast.error('Please enter a valid IU number');
                        return;
                      }

                      setIsConnecting(true);
                      try {
                        const q = query(collection(db, 'students'), where('iuNumber', '==', formData.iuNumber));
                        const querySnapshot = await getDocs(q);
                        
                        if (!querySnapshot.empty) {
                          // Check if it's the same user (re-onboarding)
                          const existingUser = querySnapshot.docs[0];
                          if (existingUser.id !== user.uid) {
                            toast.error('This IU Number is already registered by another student.');
                            return;
                          }
                        }
                        setStep(3);
                      } catch (err) {
                        console.error('Uniqueness check failed:', err);
                        // Fallback: allow proceeding if network fails to avoid blocking user
                        setStep(3);
                      } finally {
                        setIsConnecting(false);
                      }
                    }
                  }}
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && formData.role === 'faculty' && (
            <motion.div 
              key="step3-faculty"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl premium-title mb-2">Faculty Details</h2>
                <p className="text-sm opacity-60 mb-8">Tell us about the branch and courses you teach.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm opacity-60 mb-2 block">Primary Branch / Department</label>
                    <select 
                      className="input-field"
                      value={formData.course}
                      onChange={(e) => setFormData({...formData, course: e.target.value})}
                    >
                      <option value="">Select Branch</option>
                      <option value="Computer Engineering">Computer Engineering</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Mechanical Engineering">Mechanical Engineering</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                      <option value="Civil Engineering">Civil Engineering</option>
                      <option value="Automobile Engineering">Automobile Engineering</option>
                      <option value="Aeronautical Engineering">Aeronautical Engineering</option>
                      <option value="Science & Humanities">Science & Humanities</option>
                      <option value="Management Studies">Management Studies</option>
                      <option value="Architecture">Architecture</option>
                      <option value="Design">Design</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm opacity-60 mb-2 block">Courses Taught</label>
                    <div className="space-y-2">
                      {formData.coursesTaught.map((c, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            type="text" 
                            className="input-field" 
                            placeholder="e.g. Data Structures, Python..."
                            value={c}
                            onChange={(e) => {
                              const newList = [...formData.coursesTaught];
                              newList[i] = e.target.value;
                              setFormData({...formData, coursesTaught: newList});
                            }}
                          />
                          <button 
                            onClick={() => {
                              const newList = formData.coursesTaught.filter((_, idx) => idx !== i);
                              setFormData({...formData, coursesTaught: newList});
                            }}
                            className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => setFormData({...formData, coursesTaught: [...formData.coursesTaught, '']})}
                        className="w-full p-4 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl hover:border-black/20 dark:hover:border-white/20 transition-all font-bold text-sm opacity-60"
                      >
                        + Add More Courses
                      </button>
                    </div>
                  </div>
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
                  disabled={!formData.course}
                  onClick={() => setStep(4)}
                >
                  Next Step
                </button>
              </div>
            </motion.div>
          )}

          {((step === 3 && formData.role === 'student') || (step === 4 && formData.role === 'faculty')) && (
            <motion.div 
              key="step-personalize"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl sm:text-4xl premium-title mb-6">Personalize Your Profile</h2>
                
                <div className="flex flex-col items-center mb-8">
                  <div className="relative size-32 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center border-2 border-dashed border-black/10 dark:border-white/10 group transition-all hover:border-black/30 dark:hover:border-white/30">
                    {formData.profileImage ? (
                      <div className="relative size-full rounded-full overflow-hidden">
                        <img src={URL.createObjectURL(formData.profileImage)} className="size-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Camera className="text-white" size={24} />
                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col items-center opacity-20">
                        <Camera size={40} />
                      </div>
                    )}
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                      onChange={handleImageChange}
                      accept="image/*"
                    />
                  </div>
                  <p className="text-xs opacity-40 mt-3 font-medium">
                    {formData.profileImage ? 'Tap image to replace or use pencil to edit' : 'Upload Profile Photo (Optional)'}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className={formData.role === 'faculty' ? 'sm:col-span-2' : ''}>
                    <label className="text-sm opacity-60 mb-2 block">Birthdate</label>
                    <input 
                      type="date" 
                      className="input-field" 
                      value={formData.birthdate}
                      onChange={(e) => setFormData({...formData, birthdate: e.target.value})}
                    />
                  </div>
                  {formData.role === 'student' && (
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
                  )}
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
                  onClick={() => setStep(formData.role === 'faculty' ? 3 : 2)}
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
