import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, Globe, Eye, EyeOff, GraduationCap } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

const Signup = () => {
  const { user, userData, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFaculty, setIsFaculty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) {
      if (userData?.isOnboarded) {
        navigate('/');
      } else {
        navigate('/onboarding');
      }
    }
  }, [user, userData, authLoading, navigate]);



  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // Store intent in localStorage for onboarding
      localStorage.setItem('is_faculty_signup', isFaculty ? 'true' : 'false');
      toast.success('Account created! Please complete your profile.');
      navigate('/onboarding');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      localStorage.setItem('is_faculty_signup', isFaculty ? 'true' : 'false');
      // Use popup for Google Sign-In as requested
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        toast.error(error.message);
      }
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f5f5ee] dark:bg-[#0a0a0a] transition-colors duration-500">
      <div className="glass w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-5xl mb-4 serif-title leading-tight">
            Join <span className="italic">IndusConnect</span>
          </h1>
          <p className="text-black/60 dark:text-white/60 text-center mb-8">
            Join the community of students and faculties.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div className="relative w-full">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 opacity-40 pointer-events-none" />
            <input
              type="email"
              placeholder="Email address"
              className="input-field"
              style={{ paddingLeft: '3.5rem' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative w-full">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 opacity-40 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="input-field"
              style={{ paddingLeft: '3.5rem', paddingRight: '3.5rem' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity reset-button"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="relative w-full">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 opacity-40 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="input-field"
              style={{ paddingLeft: '3.5rem' }}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div 
            onClick={() => setIsFaculty(!isFaculty)}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-4 ${
              isFaculty 
                ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white shadow-lg' 
                : 'bg-black/5 border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <div className={`p-2 rounded-lg ${isFaculty ? 'bg-white/20 dark:bg-black/20' : 'bg-black/5 dark:bg-white/5'}`}>
              <GraduationCap size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-tight">I am a Faculty member</p>
              <p className="text-[10px] opacity-70">Register as a teacher or staff member</p>
            </div>
            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-all ${isFaculty ? 'border-white dark:border-black bg-white dark:bg-black' : 'border-black/20'}`}>
              {isFaculty && <div className="size-2 rounded-full bg-black dark:bg-white" />}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? 'Creating account...' : <><UserPlus size={18} /> Sign Up</>}
          </button>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-black/10 dark:border-white/10"></span></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#f5f5ee] dark:bg-[#121212] px-2 opacity-40">Or continue with</span></div>
        </div>

        <button 
          onClick={handleGoogleSignup}
          disabled={googleLoading || loading}
          className="w-full py-4 border border-black/10 dark:border-white/10 rounded-xl flex items-center justify-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-all font-semibold disabled:opacity-50"
        >
          {googleLoading ? (
            <div className="flex items-center gap-2">
              <div className="size-4 border-2 border-black/20 border-t-black dark:border-white/20 dark:border-t-white rounded-full animate-spin" />
              <span>Redirecting to Google...</span>
            </div>
          ) : (
            <>
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
            </>
          )}
        </button>

        <div className="mt-6 text-center text-xs">
          <p className="opacity-60">
            Already have an account?{' '}
            <Link to="/login" className="hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
