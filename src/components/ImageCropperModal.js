import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Camera, Trash2, Check, ZoomIn } from 'lucide-react';
import { motion } from 'framer-motion';

const ImageCropperModal = ({ image, onCropComplete, onCancel, onDelete }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = useCallback((crop) => setCrop(crop), []);
  const onZoomChange = useCallback((zoom) => setZoom(zoom), []);

  const handleCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = image;
      
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const ctx = canvas.getContext('2d');
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
      );

      canvas.toBlob((blob) => {
        onCropComplete(blob);
      }, 'image/jpeg');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onCancel}
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl overflow-hidden relative z-10 flex flex-col h-80vh bg-dark rounded-2xl border border-white/10"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-dark">
          <h3 className="text-white font-medium">Profile photo</h3>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="flex-1 relative bg-black min-h-400">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={handleCropComplete}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="p-8 bg-dark space-y-8">
          {/* Zoom Slider */}
          <div className="flex items-center gap-6">
            <ZoomIn size={18} className="text-white-40" />
            <div className="flex-1 relative h-6 flex items-center">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1 bg-white-10 rounded-full appearance-none cursor-pointer accent-white hover:bg-white-20 transition-colors"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-8">
              <label className="flex flex-col items-center gap-2 cursor-pointer group reset-button">
                <div className="p-3 rounded-full bg-white-5 group-hover:bg-white-10 transition-all border border-white-5">
                  <Camera size={20} className="text-white-80" />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white-40 group-hover:text-white-80 transition-colors">Update</span>
                <input type="file" className="hidden" onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                      onCancel(); // Close current
                      // Parent handles the new file via its input
                    };
                    reader.readAsDataURL(file);
                  }
                }} accept="image/*" />
              </label>

              <button 
                onClick={onDelete}
                className="flex flex-col items-center gap-2 group reset-button"
              >
                <div className="p-3 rounded-full bg-red-500-10 group-hover:bg-red-500-20 transition-all border border-red-500-10">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold text-red-400-40 group-hover:text-red-400 transition-colors">Delete</span>
              </button>
            </div>

            <button 
              onClick={getCroppedImg}
              className="flex items-center gap-3 px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black-20 reset-button"
            >
              <Check size={20} />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageCropperModal;
