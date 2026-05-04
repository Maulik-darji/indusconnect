import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Lock, 
  Mail, 
  LogIn, 
  UserPlus, 
  QrCode as QrIcon, 
  Upload, 
  Check, 
  LogOut,
  Image as ImageIcon,
  FileText,
  Settings,
  Activity,
  LayoutDashboard,
  List,
  GraduationCap,
  ArrowLeft,
  User as UserIcon,
  Save,
  CupSoda,
  Pizza,
  Heart,
  Search,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

const SECRET_ADMIN_CODE = "000000";
const LOCAL_ADMIN_SESSION_KEY = "indus_admin_verified_uid";

const SUPPORT_ITEMS = [
  { key: 'tea', label: 'Buy Tea', amount: 5 },
  { key: 'coffee', label: 'Buy Coffee', amount: 50 },
  { key: 'fries', label: 'Buy French Fries', amount: 100 },
  { key: 'pizza', label: 'Buy Pizza', amount: 200 }
];

const Admin = () => {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showSecretInput, setShowSecretInput] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [deletingUser, setDeletingUser] = useState(false);
  const [adminSettings, setAdminSettings] = useState({
    adminEmail: '',
    secretCode: SECRET_ADMIN_CODE,
    supportItems: SUPPORT_ITEMS
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [studentReadBlocked, setStudentReadBlocked] = useState(false);
  const [wallThoughts, setWallThoughts] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        if (currentUser) {
          const locallyVerifiedUid = localStorage.getItem(LOCAL_ADMIN_SESSION_KEY);
          if (locallyVerifiedUid === currentUser.uid) {
            setIsAdmin(true);
            setShowSecretInput(false);
            // Background sync to Firestore now that rules are fixed
            setDoc(doc(db, 'admins', currentUser.uid), {
              email: currentUser.email,
              role: 'admin',
              syncedAt: new Date().toISOString()
            }, { merge: true }).catch(console.error);
            
            fetchPaymentSettings();
            fetchAdminConsoleData();
            return;
          }

          let adminDoc = null;
          try {
            adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
          } catch (error) {
            setIsAdmin(false);
            setShowSecretInput(true);
            return;
          }

          if (adminDoc.exists()) {
            setIsAdmin(true);
            setShowSecretInput(false);
            fetchPaymentSettings();
            fetchAdminConsoleData();
          } else {
            try {
              const adminSettingsSnap = await getDoc(doc(db, 'settings', 'admin'));
              if (adminSettingsSnap.exists()) {
                setAdminSettings((prev) => ({ ...prev, ...adminSettingsSnap.data() }));
              }
            } catch (error) {
              // If rules block this read, the built-in bootstrap code remains available.
            }
            setShowSecretInput(true);
          }
        } else {
          setIsAdmin(false);
          setShowSecretInput(false);
        }
      } finally {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const fetchPaymentSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'payment'));
      if (docSnap.exists()) {
        setQrCodeUrl(docSnap.data().qrCodeUrl);
      }
    } catch (error) {
      setQrCodeUrl('');
    }
  };

  const fetchAdminConsoleData = async () => {
    let usersSnapshot = null;
    let adminSettingsSnap = null;
    let wallSnapshot = null;

    try {
      const studentSnap = await getDocs(collection(db, 'students'));
      const facultySnap = await getDocs(collection(db, 'faculties'));
      const usersSnap = await getDocs(collection(db, 'users'));
      
      const studentsList = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const facultiesList = facultySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const legacyList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Merge legacy users into correct lists if they aren't already there
      const finalStudents = [...studentsList];
      const finalFaculties = [...facultiesList];

      legacyList.forEach(u => {
        const isFaculty = u.role === 'faculty';
        const existsInNew = isFaculty 
          ? finalFaculties.some(f => f.id === u.id)
          : finalStudents.some(s => s.id === u.id);
        
        if (!existsInNew) {
          if (isFaculty) finalFaculties.push(u);
          else finalStudents.push(u);
        }
      });

      setStudents(finalStudents);
      setFaculties(finalFaculties);
      setStudentReadBlocked(false);
    } catch (error) {
      console.error("Fetch Error:", error);
      setStudents([]);
      setFaculties([]);
      setStudentReadBlocked(true);
    }

    try {
      wallSnapshot = await getDocs(collection(db, 'wall_thoughts'));
      setWallThoughts(wallSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      setWallThoughts([]);
    }

    try {
      adminSettingsSnap = await getDoc(doc(db, 'settings', 'admin'));
    } catch (error) {
      adminSettingsSnap = null;
    }

    if (adminSettingsSnap?.exists()) {
      setAdminSettings((prev) => ({
        ...prev,
        ...adminSettingsSnap.data(),
        supportItems: adminSettingsSnap.data().supportItems || prev.supportItems
      }));
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Logged in successfully');
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setShowSecretInput(true);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      
      try {
        let userDoc = await getDoc(doc(db, 'students', result.user.uid));
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'faculties', result.user.uid));
        }
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'users', result.user.uid));
        }

        if (!userDoc.exists()) {
          return;
        }
        const adminDoc = await getDoc(doc(db, 'admins', result.user.uid));
        if (!adminDoc.exists()) {
          await auth.signOut();
          toast.error('This account is not registered as an admin.');
          return;
        }
      } catch (err) {
        console.error('Admin Check Error:', err);
        await auth.signOut();
        toast.error('Access Denied. You are not authorized to access the admin portal.');
        return;
      }

      toast.success('Authenticated with Google');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleSecretCode = async (e) => {
    e.preventDefault();
    if (secretCode === (adminSettings.secretCode || SECRET_ADMIN_CODE)) {
      try {
        await setDoc(doc(db, 'admins', user.uid), {
          email: user.email,
          role: 'admin',
          createdAt: new Date().toISOString()
        });
        setIsAdmin(true);
        setShowSecretInput(false);
        toast.success('Admin access granted!');
        fetchPaymentSettings();
        fetchAdminConsoleData();
      } catch (error) {
        localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, user.uid);
        setIsAdmin(true);
        setShowSecretInput(false);
        toast.success('Admin access granted for this device');
        fetchPaymentSettings();
        fetchAdminConsoleData();
      }
    } else {
      toast.error('Invalid secret code');
    }
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const storageRef = ref(storage, `settings/payment_qr.${extension}`);
      
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);
      
      await setDoc(doc(db, 'settings', 'payment'), {
        qrCodeUrl: url,
        updatedAt: new Date().toISOString(),
        fileName: file.name
      }, { merge: true });

      setQrCodeUrl(url);
      toast.success('QR Code updated successfully');
    } catch (error) {
      console.error("QR Upload Error:", error);
      if (error.code === 'storage/unauthorized') {
        toast.error('Permission denied. Please update Firebase Storage rules.');
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSaveAdminSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'admin'), {
        adminEmail: adminSettings.adminEmail,
        secretCode: adminSettings.secretCode || SECRET_ADMIN_CODE,
        supportItems: adminSettings.supportItems,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success('Admin settings saved');
    } catch (error) {
      toast.error('Failed to save admin settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteThought = async (id) => {
    if (!window.confirm('Are you sure you want to delete this thought?')) return;
    try {
      await deleteDoc(doc(db, 'wall_thoughts', id));
      setWallThoughts(prev => prev.filter(t => t.id !== id));
      toast.success('Thought deleted');
    } catch (error) {
      toast.error('Failed to delete thought');
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to delete ${targetUser.fullName}? This will remove ALL their data (Wall, Media, Comments).`)) return;
    
    setDeletingUser(true);
    try {
      const userId = targetUser.uid || targetUser.id;
      const role = targetUser.role;

      const thoughtsQuery = query(collection(db, 'wall_thoughts'), where('authorId', '==', userId));
      const thoughtsSnap = await getDocs(thoughtsQuery);
      await Promise.all(thoughtsSnap.docs.map(d => deleteDoc(d.ref)));

      const mediaQuery = query(collection(db, 'media_vault'), where('authorId', '==', userId));
      const mediaSnap = await getDocs(mediaQuery);
      await Promise.all(mediaSnap.docs.map(d => deleteDoc(d.ref)));

      const commentsQuery = query(collection(db, 'comments'), where('authorId', '==', userId));
      const commentsSnap = await getDocs(commentsQuery);
      await Promise.all(commentsSnap.docs.map(d => deleteDoc(d.ref)));

      const collectionName = role === 'faculty' ? 'faculties' : 'students';
      await deleteDoc(doc(db, collectionName, userId));
      
      await deleteDoc(doc(db, 'users', userId)).catch(() => {});

      if (role === 'faculty') {
        setFaculties(prev => prev.filter(u => (u.uid || u.id) !== userId));
      } else {
        setStudents(prev => prev.filter(u => (u.uid || u.id) !== userId));
      }

      toast.success(`${targetUser.fullName}'s data has been deleted.`);
    } catch (error) {
      console.error("Deletion Error:", error);
      toast.error('Failed to delete user data fully.');
    } finally {
      setDeletingUser(false);
    }
  };
  const batchYears = [...new Set(students.map(student => student.batchStart).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a));

  const batchStudents = selectedBatch
    ? students.filter(student => String(student.batchStart) === String(selectedBatch))
    : [];

  const adminMenuItems = [
    { id: 'log', label: 'Log', icon: List },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: UserIcon },
    { id: 'faculties', label: 'Faculties', icon: GraduationCap },
    { id: 'batch', label: 'Batch', icon: GraduationCap },
    { id: 'wall', label: 'The Wall', icon: Heart },
    { id: 'settings', label: 'Admin Setting', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5] dark:bg-[#070707]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (user && showSecretInput && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5] dark:bg-[#070707] p-4 sm:p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass p-6 text-center shadow-2xl sm:p-8"
        >
          <div className="size-16 bg-black text-white dark:bg-white dark:text-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl sm:text-4xl premium-title mb-3">Verification Required</h2>
          <p className="opacity-60 mb-7 text-sm sm:text-base">Enter the master secret code to access the admin panel.</p>
          
          <form onSubmit={handleSecretCode} className="space-y-6">
            <input 
              type="password" 
              placeholder="Master Secret Code" 
              className="input-field text-center text-lg tracking-widest sm:text-xl"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary w-full py-4 text-base sm:text-lg">Verify Identity</button>
            <button 
              type="button" 
              onClick={() => auth.signOut()}
              className="text-sm opacity-40 hover:opacity-100 transition-opacity"
            >
              Sign out and try another account
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (user && isAdmin) {
    return (
      <div className="min-h-screen bg-[#f4f5ef] text-[#11120f] dark:bg-[#070707] dark:text-white transition-colors duration-500">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="w-full border-b border-black/10 bg-[#fbfcf8] p-4 dark:border-white/10 dark:bg-[#0d0d0d] lg:w-72 lg:border-b-0 lg:border-r lg:p-6">
            <div className="mb-5 flex items-center justify-between gap-4 lg:mb-10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-sm bg-black text-white dark:bg-white dark:text-black">
                  <Shield size={22} />
                </div>
                <div>
                  <p className="text-lg font-black leading-none">IndusConnect</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-black/35 dark:text-white/35">Admin</p>
                </div>
              </div>
              <button onClick={() => auth.signOut()} className="size-11 shrink-0 rounded-xl border border-black/10 bg-white shadow-sm transition-all hover:bg-red-500 hover:text-white dark:border-white/10 dark:bg-white/5" title="Sign out">
                <LogOut className="mx-auto" size={20} />
              </button>
            </div>

            <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setSelectedStudent(null);
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition-colors ${
                      activeView === item.id
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-black/5 text-black/65 hover:bg-black/10 dark:bg-white/5 dark:text-white/65 dark:hover:bg-white/10'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {activeView === 'log' && (
                <section className="rounded-lg border border-black/5 bg-white p-6 shadow-xl shadow-black/[0.03] dark:border-white/10 dark:bg-[#101010]">
                  <h1 className="mb-2 text-4xl premium-title">Log</h1>
                  <p className="mb-6 text-sm text-black/55 dark:text-white/55">Recent admin console activity.</p>
                  <div className="space-y-3">
                    {[
                      'Admin console opened',
                      `${students.length} student profiles loaded`,
                      qrCodeUrl ? 'Support QR code is configured' : 'Support QR code is pending',
                      `${wallThoughts.length} wall thoughts loaded`
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 rounded-lg bg-[#f4f5ef] p-4 text-sm font-bold dark:bg-white/5">
                        <Activity size={18} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {activeView === 'dashboard' && (
                <div className="grid grid-cols-1 gap-6">
                  <section className="rounded-lg border border-black/5 bg-white p-6 shadow-xl shadow-black/[0.03] dark:border-white/10 dark:bg-[#101010]">
                    <h1 className="mb-8 text-4xl premium-title">Dashboard</h1>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div 
                        onClick={() => setActiveView('students')}
                        className="p-8 rounded-2xl bg-[#f5f5ee] dark:bg-white/5 border border-black/5 dark:border-white/5 relative overflow-hidden group cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                          <Users size={80} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Total Students</p>
                        <h3 className="text-6xl premium-title">{students.length}</h3>
                      </div>

                      <div 
                        onClick={() => setActiveView('faculties')}
                        className="p-8 rounded-2xl bg-[#f5f5ee] dark:bg-white/5 border border-black/5 dark:border-white/5 relative overflow-hidden group cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                          <GraduationCap size={80} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Total Faculties</p>
                        <h3 className="text-6xl premium-title">{faculties.length}</h3>
                      </div>

                      <div 
                        onClick={() => setActiveView('wall')}
                        className="p-8 rounded-2xl bg-[#f5f5ee] dark:bg-white/5 border border-black/5 dark:border-white/5 relative overflow-hidden group cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                          <CupSoda size={80} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-4">Wall Thoughts</p>
                        <h3 className="text-6xl premium-title">{wallThoughts.length}</h3>
                      </div>
                    </div>
                  </section>

                  <aside className="space-y-5">
                    <div className="rounded-lg bg-[#151713] p-6 text-white shadow-2xl dark:bg-white dark:text-black">
                      <h3 className="mb-2 text-3xl premium-title">Welcome, Admin</h3>
                      <p className="mb-8 text-sm leading-relaxed opacity-65">You have full access to manage platform settings and community assets.</p>
                      <div className="flex w-fit max-w-full items-center gap-2 rounded-full bg-white/10 px-4 py-2 dark:bg-black/10">
                        <Check size={16} />
                        <span className="text-[11px] font-black uppercase tracking-[0.16em]">Verified System Admin</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-black/10 bg-white/70 p-6 dark:border-white/10 dark:bg-white/[0.03]">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-[0.18em] opacity-55">System Version</h4>
                        <FileText size={18} className="opacity-45" />
                      </div>
                      <p className="text-2xl font-mono">v1.2.0-stable</p>
                      <p className="mt-2 text-sm opacity-60">IndusConnect Community Platform</p>
                    </div>
                  </aside>
                </div>
              )}

              {(activeView === 'students' || activeView === 'faculties') && (
                <section className="rounded-lg border border-black/5 bg-white p-6 shadow-xl shadow-black/[0.03] dark:border-white/10 dark:bg-[#101010]">
                  <h1 className="mb-2 text-4xl premium-title">Manage {activeView === 'students' ? 'Students' : 'Faculties'}</h1>
                  <p className="mb-8 text-sm text-black/55 dark:text-white/55">Search and delete {activeView === 'students' ? 'student' : 'faculty'} accounts and their associated data.</p>
                  
                  <div className="mb-6 relative max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={18} />
                    <input 
                      type="text" 
                      placeholder={`Search by name, email or IU number...`} 
                      className="w-full rounded-xl border border-black/10 bg-black/5 py-4 pl-12 pr-4 text-sm outline-none transition-all focus:border-black/30 dark:border-white/10 dark:bg-white/5 dark:focus:border-white/30 shadow-sm"
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5">
                           <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">User</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">IU Number</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">Role</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">Details</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {(activeView === 'students' ? students : faculties)
                          .filter(u => 
                            (u.fullName || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            (u.iuNumber || '').toLowerCase().includes(userSearchTerm.toLowerCase())
                          )
                          .map((u) => (
                          <tr key={u.uid || u.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            <td className="py-4 pr-6">
                              <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                                  {u.profileImageUrl ? <img src={u.profileImageUrl} alt="" className="size-full object-cover" /> : <UserIcon className="size-full p-2 opacity-20" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{u.fullName || 'No Name'}</p>
                                  <p className="text-xs opacity-50">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className="text-xs font-mono opacity-70">{u.iuNumber || 'N/A'}</span>
                            </td>
                            <td className="py-4">
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${u.role === 'faculty' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {u.role || 'Student'}
                              </span>
                            </td>
                            <td className="py-4">
                              <p className="text-xs opacity-60">
                                {u.role === 'faculty' ? (u.course || 'Educator') : `${u.course || 'No Course'} • ${u.batchStart || '?'}-${u.batchEnd || '?'}`}
                              </p>
                            </td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingUser}
                                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
                              >
                                {deletingUser ? 'Deleting...' : 'Delete Account'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {activeView === 'batch' && (
                <section className="rounded-lg border border-black/5 bg-white p-6 shadow-xl shadow-black/[0.03] dark:border-white/10 dark:bg-[#101010]">
                  {selectedStudent ? (
                    <div>
                      <button type="button" onClick={() => setSelectedStudent(null)} className="mb-6 flex items-center gap-2 rounded-xl bg-black/5 px-4 py-3 text-sm font-black dark:bg-white/5">
                        <ArrowLeft size={18} />
                        Back to Students
                      </button>
                      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <div className="aspect-square overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
                          {selectedStudent.profileImageUrl ? (
                            <img src={selectedStudent.profileImageUrl} alt={selectedStudent.fullName} className="size-full object-cover" />
                          ) : (
                            <div className="flex size-full items-center justify-center opacity-20">
                              <UserIcon size={80} />
                            </div>
                          )}
                        </div>
                        <div>
                          <h1 className="text-5xl premium-title">{selectedStudent.fullName || 'Unnamed Student'}</h1>
                          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {[
                              ['Email', selectedStudent.email],
                              ['IU Number', selectedStudent.iuNumber || 'Not set'],
                              ['Degree', selectedStudent.degree],
                              ['Course', selectedStudent.course],
                              ['Batch', `${selectedStudent.batchStart || '-'} - ${selectedStudent.batchEnd || '-'}`],
                              ['Section', selectedStudent.section],
                              ['Birthdate', selectedStudent.birthdate],
                              ['Status', selectedStudent.marriedStatus],
                              ['UID', selectedStudent.uid || selectedStudent.id]
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-lg bg-[#f4f5ef] p-4 dark:bg-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-45">{label}</p>
                                <p className="mt-2 break-words font-bold">{value || '-'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h1 className="mb-2 text-4xl premium-title">Batch</h1>
                      <p className="mb-6 text-sm text-black/55 dark:text-white/55">Select a batch year to view students.</p>
                      {studentReadBlocked && (
                        <div className="mb-6 rounded-lg bg-amber-500/10 p-4 text-sm font-semibold text-amber-700 dark:text-amber-300">
                          Student profiles are currently blocked by Firestore rules for this admin account.
                        </div>
                      )}
                      <select className="input-field mb-6 max-w-xs" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                        <option value="">Select batch year</option>
                        {batchYears.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>

                      {selectedBatch && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {batchStudents.map((student) => (
                            <button
                              type="button"
                              key={student.uid || student.id}
                              onClick={() => setSelectedStudent(student)}
                              className="group rounded-lg border border-black/5 bg-[#f9faf6] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-xl dark:border-white/10 dark:bg-white/5"
                            >
                              <div className="mb-4 flex items-center gap-4">
                                <div className="size-16 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                                  {student.profileImageUrl ? (
                                    <img src={student.profileImageUrl} alt={student.fullName} className="size-full object-cover" />
                                  ) : (
                                    <div className="flex size-full items-center justify-center opacity-20">
                                      <UserIcon size={30} />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="truncate text-lg font-black">{student.fullName || 'Unnamed Student'}</h3>
                                  <p className="truncate text-xs font-bold uppercase tracking-wide opacity-45">{student.course || 'Course pending'}</p>
                                </div>
                              </div>
                              <p className="text-sm opacity-60">Batch {student.batchStart || '-'} - {student.batchEnd || '-'}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </section>
              )}

              {activeView === 'wall' && (
                <section className="rounded-lg border border-black/5 bg-white p-6 shadow-xl shadow-black/[0.03] dark:border-white/10 dark:bg-[#101010]">
                  <h1 className="mb-2 text-4xl premium-title">The Wall</h1>
                  <p className="mb-8 text-sm text-black/55 dark:text-white/55">Manage community thoughts. Even anonymous posts show author details here.</p>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-black/5 dark:border-white/5">
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">Thought</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">Author Info</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40">Privacy</th>
                          <th className="pb-4 text-[10px] font-black uppercase tracking-widest opacity-40 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 dark:divide-white/5">
                        {wallThoughts.map((thought) => (
                          <tr key={thought.id} className="group hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                            <td className="py-4 pr-6">
                              <p className="text-sm font-medium leading-relaxed max-w-md italic">"{thought.text}"</p>
                              <p className="mt-1 text-[10px] opacity-30">{thought.createdAt?.toDate ? new Date(thought.createdAt.toDate()).toLocaleString() : 'Recent'}</p>
                            </td>
                            <td className="py-4 pr-6">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold">{thought.authorName}</span>
                                <span className="text-xs opacity-50">{thought.authorEmail}</span>
                              </div>
                            </td>
                            <td className="py-4">
                              <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${thought.isAnonymous ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                                {thought.isAnonymous ? 'Anonymous' : 'Public'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              <button 
                                onClick={() => handleDeleteThought(thought.id)}
                                className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {wallThoughts.length === 0 && (
                      <div className="text-center py-20 opacity-30 italic">No thoughts posted yet.</div>
                    )}
                  </div>
                </section>
              )}

              {activeView === 'settings' && (
                <section className="rounded-lg border border-black/5 bg-white p-6 shadow-xl shadow-black/[0.03] dark:border-white/10 dark:bg-[#101010]">
                  <h1 className="mb-2 text-4xl premium-title">Admin Setting</h1>
                  <p className="mb-8 text-sm text-black/55 dark:text-white/55">Manage admin contact, secret login code, support QR, and support amounts.</p>

                  <form onSubmit={handleSaveAdminSettings} className="space-y-8">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold opacity-60">Admin Email</label>
                        <input className="input-field" type="email" value={adminSettings.adminEmail} onChange={(e) => setAdminSettings({ ...adminSettings, adminEmail: e.target.value })} placeholder="admin@example.com" />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold opacity-60">Secret Login Code</label>
                        <input className="input-field" type="text" value={adminSettings.secretCode} onChange={(e) => setAdminSettings({ ...adminSettings, secretCode: e.target.value })} />
                      </div>
                    </div>

                    <div className="rounded-lg bg-[#f4f5ef] p-5 dark:bg-white/5">
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl premium-title">Support QR Code</h2>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] opacity-45">Used to support the project</p>
                        </div>
                        <QrIcon size={24} />
                      </div>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed border-black/10 bg-white dark:border-white/10 dark:bg-black/20">
                          {qrCodeUrl ? (
                            <img src={qrCodeUrl} alt="Payment QR" className="size-full object-contain p-4" />
                          ) : (
                            <div className="text-center opacity-40">
                              <ImageIcon className="mx-auto mb-3" size={40} />
                              <p className="font-bold">No QR uploaded</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center">
                          <label className="flex w-fit cursor-pointer items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-black text-white dark:bg-white dark:text-black">
                            <Upload size={18} />
                            {uploading ? 'Uploading...' : 'Upload QR Code Image'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleQrUpload} />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h2 className="mb-4 text-2xl premium-title">Support Options</h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {adminSettings.supportItems.map((item, index) => {
                          const Icon = item.key === 'pizza' ? Pizza : CupSoda;
                          return (
                            <div key={item.key} className="rounded-lg bg-[#f4f5ef] p-4 dark:bg-white/5">
                              <Icon size={20} />
                              <label className="mt-4 block text-xs font-black uppercase tracking-[0.16em] opacity-45">{item.label}</label>
                              <div className="mt-2 flex items-center gap-2">
                                <input
                                  className="input-field"
                                  type="number"
                                  value={item.amount}
                                  onChange={(e) => {
                                    const supportItems = [...adminSettings.supportItems];
                                    supportItems[index] = { ...item, amount: Number(e.target.value) };
                                    setAdminSettings({ ...adminSettings, supportItems });
                                  }}
                                />
                                <span className="font-black">Rs</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button type="submit" className="btn-primary px-6" disabled={savingSettings}>
                      <Save size={18} />
                      {savingSettings ? 'Saving...' : 'Save Settings'}
                    </button>
                  </form>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // --- Auth Screen ---
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8f5] dark:bg-[#070707] p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full glass p-6 sm:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="text-center mb-8">
          <div className="size-16 bg-black text-white dark:bg-white dark:text-black rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Shield size={32} />
          </div>
          <h1 className="text-4xl premium-title mb-2 leading-none">Admin Portal</h1>
          <p className="opacity-50 text-sm sm:text-base">Secure access for platform moderators.</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 opacity-20 pointer-events-none" />
            <input 
              type="email" 
              placeholder="Admin Email" 
              className="input-field"
              style={{ paddingLeft: '3.5rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 opacity-20 pointer-events-none" />
            <input 
              type="password" 
              placeholder="Password" 
              className="input-field"
              style={{ paddingLeft: '3.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 items-center gap-3 px-1">
            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-left text-[11px] sm:text-xs font-bold uppercase tracking-wider hover:underline"
            >
              {isLogin ? "Create Admin Account" : "Back to Login"}
            </button>
            <button 
              type="button" 
              onClick={handleForgotPassword}
              className="text-right text-[11px] sm:text-xs font-bold uppercase tracking-wider opacity-45 hover:opacity-100 transition-opacity"
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-base sm:text-lg flex items-center justify-center gap-2">
            {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
            {isLogin ? "Sign In" : "Register Admin"}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-black/5 dark:border-white/5"></div></div>
          <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold"><span className="bg-white dark:bg-[#1e1e1e] px-4 opacity-30">or</span></div>
        </div>

        <button 
          onClick={handleGoogleAuth}
          className="w-full py-4 border border-black/10 dark:border-white/10 rounded-xl flex items-center justify-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all font-semibold"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] font-bold opacity-20">
          Secure Infrastructure Protected by Firebase
        </p>
      </motion.div>
    </div>
  );
};

export default Admin;
