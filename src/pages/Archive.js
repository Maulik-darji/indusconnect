import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, ArrowUpDown, Plus, X, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage, db } from '../firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const Archive = () => {
  const { userData } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('All Memories');
  const [sortOrder, setSortOrder] = useState('Newest First');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [uploadYear, setUploadYear] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isSealing, setIsSealing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { progress: 0, total: 0, current: 0 }

  const FILTERS = ['All Memories', '1st yr', '2nd yr', '3rd yr', '4th yr', "Rhapsody'24", "Rhapsody'25", "Rhapsody'26"];

  // Mock data for memories
  const memories = [
    { id: 1, url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800', title: 'Graduation', year: '4th yr', author: 'Aarav Sharma' },
    { id: 2, url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?q=80&w=800', title: 'Library Session', year: '1st yr', author: 'Ishani Patel' },
    { id: 3, url: 'https://images.unsplash.com/photo-1541339907198-e08759df9a73?q=80&w=800', title: 'Tech Fest', year: "Rhapsody'26", author: 'Rohan Malhotra' },
    { id: 4, url: 'https://images.unsplash.com/photo-1524178232363-1fb28f74b55a?q=80&w=800', title: 'First Day', year: '1st yr', author: 'Sanya Gupta' },
    { id: 5, url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=800', title: 'Cultural Night', year: "Rhapsody'25", author: 'Vikram Singh' },
    { id: 6, url: 'https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?q=80&w=800', title: 'Final Farewell', year: '4th yr', author: 'Aarav Sharma' },
  ];

  const handleUpload = async () => {
    if (!uploadYear || selectedFiles.length === 0 || !userData) return;
    
    setIsSealing(true);
    const totalFiles = selectedFiles.length;
    const startUploadTime = Date.now();
    setUploadStatus({ progress: 0, total: totalFiles, current: 0, remainingTime: 'Calculating...' });

    // Exit modal view immediately as requested
    setTimeout(() => {
      setIsUploading(false);
    }, 500);

    for (let i = 0; i < selectedFiles.length; i++) {
      const fileObj = selectedFiles[i];
      const fileName = `${Date.now()}_${fileObj.file.name}`;
      const storageRef = ref(storage, `media_vault/${userData.uid}/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, fileObj.file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const overallProgress = ((i / totalFiles) * 100) + (fileProgress / totalFiles);
            
            // Calculate estimated time
            const elapsedTime = (Date.now() - startUploadTime) / 1000; // in seconds
            if (overallProgress > 0) {
              const totalEstimatedTime = (elapsedTime / overallProgress) * 100;
              const remaining = Math.max(0, totalEstimatedTime - elapsedTime);
              const minutes = Math.floor(remaining / 60);
              const seconds = Math.floor(remaining % 60);
              const timeString = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
              setUploadStatus(prev => ({ ...prev, progress: overallProgress, current: i + 1, remainingTime: timeString }));
            }
          }, 
          (error) => {
            console.error(error);
            setIsSealing(false);
            setUploadStatus(null);
            reject(error);
          }, 
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, 'media_vault'), {
              url: downloadURL,
              year: uploadYear,
              authorId: userData.uid,
              authorName: userData.fullName || 'Anonymous',
              title: fileObj.file.name.split('.')[0],
              createdAt: serverTimestamp(),
              batchRange: `${userData.batchStart}-${userData.batchEnd}`
            });
            resolve();
          }
        );
      });
    }

    setUploadStatus(prev => ({ ...prev, progress: 100 }));
    setTimeout(() => {
      setUploadStatus(null);
      setIsSealing(false);
      setSelectedFiles([]);
      setUploadYear('');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#f5f5ee] dark:bg-[#050505] transition-colors duration-500 pt-24 pb-20 px-4 sm:px-6 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <header className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-6xl sm:text-7xl md:text-8xl premium-title tracking-tight">The Archive</h1>
              <p className="text-base sm:text-lg opacity-60 font-light leading-relaxed">
                A cinematic collection of fleeting moments, frozen in time. <br className="hidden sm:block" />
                From the first lecture to the final goodbye.
              </p>
            </div>
            
            <button 
              className="flex items-center gap-2 px-6 py-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-full hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-all duration-300 group"
              onClick={() => setSortOrder(prev => prev === 'Newest First' ? 'Oldest First' : 'Newest First')}
            >
              <ArrowUpDown size={16} className="opacity-40 group-hover:opacity-100" />
              <span className="text-xs font-bold uppercase tracking-widest">{sortOrder}</span>
            </button>
          </div>
        </header>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12 py-6 border-y border-black/5 dark:border-white/5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {FILTERS.map(filter => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
                  selectedFilter === filter
                    ? 'bg-[#ffb03a] text-black shadow-lg shadow-[#ffb03a]/20'
                    : 'bg-black/5 dark:bg-white/5 text-black/40 dark:text-white/40 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsUploading(true)}
            className="flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Plus size={20} />
            <span className="font-bold tracking-tight">Add Memory</span>
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {memories.filter(m => selectedFilter === 'All Memories' || m.year === selectedFilter).map((memory, index) => (
            <motion.div
              key={memory.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative aspect-[4/3] overflow-hidden rounded-3xl bg-black/5 dark:bg-white/5 cursor-pointer"
            >
              <img 
                src={memory.url} 
                alt={memory.title} 
                className="absolute inset-0 size-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 p-8 transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffb03a] mb-2">{memory.year}</p>
                <h3 className="text-2xl font-bold text-white tracking-tight">{memory.title}</h3>
              </div>

              <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMemory(memory);
                  }}
                  className="size-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                >
                  <Info size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {memories.length === 0 && (
          <div className="py-40 text-center">
            <ImageIcon size={64} className="mx-auto opacity-10 mb-6" />
            <h3 className="text-2xl font-serif italic opacity-30">No memories in the vault yet.</h3>
          </div>
        )}
      </div>

      {/* Upload Modal (Placeholder) */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl p-10 border border-black/5 dark:border-white/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl premium-title">Deposit Memory</h2>
                <button onClick={() => setIsUploading(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl p-12 text-center space-y-4 hover:border-[#ffb03a] transition-colors cursor-pointer group">
                <div className="size-16 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Plus size={32} className="opacity-20" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Drop your image here</p>
                  <p className="text-sm opacity-40 italic">Support: JPG, PNG, WEBP (Max 5MB)</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <input type="text" placeholder="Add a caption..." className="w-full bg-black/5 dark:bg-white/5 p-4 rounded-xl outline-none border border-transparent focus:border-[#ffb03a] transition-all" />
                <button className="w-full btn-primary py-4 rounded-xl">Seal in Vault</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Floating Action Button */}
      <button 
        onClick={() => setIsUploading(true)}
        className="fixed bottom-8 right-8 size-16 bg-[#ffb03a] text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <Plus size={32} />
        <span className="absolute right-full mr-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          Add Memories
        </span>
      </button>

      {/* Info Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setSelectedMemory(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#121212] w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-8 border border-black/5 dark:border-white/5 relative"
            >
              <button onClick={() => setSelectedMemory(null)} className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={20} />
              </button>
              
              <div className="space-y-6">
                <div className="aspect-square rounded-2xl overflow-hidden">
                  <img src={selectedMemory.url} className="size-full object-cover" alt="" />
                </div>
                <div className="space-y-2 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffb03a]">{selectedMemory.year}</p>
                  <h3 className="text-3xl premium-title">{selectedMemory.title}</h3>
                  <div className="pt-4 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-30 mb-1">Posted By</span>
                    <p className="font-serif italic text-xl opacity-80">{selectedMemory.author}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal (Multiple Support) */}
      <AnimatePresence>
        {isUploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121212] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl p-10 border border-black/5 dark:border-white/5"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl premium-title">Deposit Memories</h2>
                <button onClick={() => { setIsUploading(false); setUploadYear(''); setSelectedFiles([]); }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="mb-8">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4">Select Year / Collection</p>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.filter(f => f !== 'All Memories').map(year => (
                    <button
                      key={year}
                      onClick={() => setUploadYear(year)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
                        uploadYear === year
                          ? 'bg-[#ffb03a] text-black shadow-lg shadow-[#ffb03a]/20'
                          : 'bg-black/5 dark:bg-white/5 opacity-50 hover:opacity-100'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedFiles.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img src={file.preview} className="size-full object-cover" alt="" />
                      <button 
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-xl border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer hover:border-[#ffb03a] transition-colors">
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      accept="image/*" 
                      onChange={(e) => {
                        const files = Array.from(e.target.files);
                        const newFiles = files.map(file => ({
                          file,
                          preview: URL.createObjectURL(file)
                        }));
                        setSelectedFiles(prev => [...prev, ...newFiles]);
                      }}
                    />
                    <Plus size={20} className="opacity-20" />
                  </label>
                </div>
              ) : (
                <label className="border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl p-12 text-center space-y-4 hover:border-[#ffb03a] transition-colors cursor-pointer group block mb-8">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const newFiles = files.map(file => ({
                        file,
                        preview: URL.createObjectURL(file)
                      }));
                      setSelectedFiles(newFiles);
                    }}
                  />
                  <div className="size-16 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                    <Plus size={32} className="opacity-20" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold">Select multiple images</p>
                    <p className="text-sm opacity-40 italic">Drop your memories here or click to browse</p>
                  </div>
                </label>
              )}

              <div className="space-y-4">
                <button 
                  onClick={handleUpload}
                  disabled={isSealing}
                  className={`w-full btn-primary py-4 rounded-xl transition-all duration-500 ${isSealing ? 'bg-black/20 text-black/40 cursor-not-allowed' : 'bg-black text-white hover:scale-[1.02] active:scale-[0.98]'}`}
                >
                  {isSealing ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 size={18} className="animate-spin" />
                      <span>Sealing Memories...</span>
                    </div>
                  ) : (
                    <span>Seal {selectedFiles.length || ''} Memories in {uploadYear || '...'}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Upload Progress */}
      <AnimatePresence>
        {uploadStatus && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-8 left-8 right-8 sm:left-auto sm:w-80 z-[110] bg-white dark:bg-[#121212] rounded-3xl shadow-2xl border border-black/5 dark:border-white/5 p-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-[#ffb03a]/10 rounded-xl flex items-center justify-center">
                  {uploadStatus.progress === 100 ? (
                    <CheckCircle2 size={20} className="text-[#ffb03a]" />
                  ) : (
                    <Loader2 size={20} className="text-[#ffb03a] animate-spin" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-30">
                    {uploadStatus.progress === 100 ? 'Vault Sealed' : `Sealing ${uploadStatus.current}/${uploadStatus.total}`}
                  </p>
                  <p className="font-bold text-sm tracking-tight">
                    {uploadStatus.progress === 100 ? 'Memories Deposited!' : `Time left: ${uploadStatus.remainingTime}`}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black font-mono">{Math.round(uploadStatus.progress)}%</span>
            </div>
            
            <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-[#ffb03a]"
                initial={{ width: 0 }}
                animate={{ width: `${uploadStatus.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Archive;
