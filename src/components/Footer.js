import React from 'react';
import { Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const { theme } = useTheme();
  const { userData } = useAuth();
  
  return (
    <footer className="py-20 mt-20 border-t border-black/[0.03] dark:border-white/[0.03] flex flex-col items-center justify-center text-center">
      <div className="flex items-center gap-8 mb-12 w-full max-w-sm px-4">
        <div className="h-px flex-1 bg-black/5 dark:bg-white/5" />
        <div className="size-10 flex items-center justify-center bg-black/[0.03] dark:bg-white/5 rounded-full text-black/20 dark:text-white/20">
          <Globe size={18} />
        </div>
        <div className="h-px flex-1 bg-black/5 dark:bg-white/5" />
      </div>
      <p className="text-base font-serif italic tracking-tight px-4 leading-relaxed text-black/80 dark:text-white/80">
        &copy; {userData?.endYear || userData?.batchEnd || '2026'} Batch . All memories preserved forever.
      </p>
    </footer>
  );
};

export default Footer;
