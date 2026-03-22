import React, { useRef, useState, useEffect } from 'react';
import { X, Image as ImageIcon, Camera, Upload } from 'lucide-react';
import { ImageFile } from '../types';

interface ImageUploaderProps {
  image: ImageFile | null;
  onImageChange: (image: ImageFile | null) => void;
  mode?: 'selfie' | 'artwork';
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ image, onImageChange, mode = 'selfie' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera", err);
      alert("Could not access camera. Please check permissions.");
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      
      // Limit max dimension to 800px to speed up API upload and processing
      const MAX_DIMENSION = 800;
      let width = videoRef.current.videoWidth;
      let height = videoRef.current.videoHeight;
      
      if (width > height && width > MAX_DIMENSION) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else if (height > MAX_DIMENSION) {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Flip horizontally if using front camera for mirror effect
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        
        // Use 0.8 quality to reduce base64 size
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const base64 = dataUrl.split(',')[1];
        
        onImageChange({
          base64,
          mimeType: 'image/jpeg',
          previewUrl: dataUrl
        });
        stopCamera();
      }
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIMENSION) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64 = dataUrl.split(',')[1];

          onImageChange({
            base64,
            mimeType: 'image/jpeg',
            previewUrl: dataUrl
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // If camera is open, show video feed
  if (isCameraOpen) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] flex flex-col group">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-full object-cover transform -scale-x-100" 
        />
        
        {/* Face Overlay Guide (Only for selfie) */}
        {mode === 'selfie' && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
                {/* Instruction Text */}
                <div className="absolute top-8 left-0 right-0 text-center z-20">
                    <span className="bg-black/60 text-white text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-md border border-white/20">
                        Position face in oval
                    </span>
                </div>

                {/* Oval with Shadow Overlay */}
                <div className="w-[60%] aspect-[3/4] max-w-[260px] border-4 border-white/50 border-dashed rounded-[50%] shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] relative">
                    {/* Optional Crosshairs */}
                    <div className="absolute top-1/2 left-4 right-4 h-px bg-white/20" />
                    <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/20" />
                </div>
            </div>
        )}

        {/* Artwork Overlay Guide */}
        {mode === 'artwork' && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center overflow-hidden">
                <div className="absolute top-8 left-0 right-0 text-center z-20">
                    <span className="bg-black/60 text-white text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-md border border-white/20">
                        Position artwork in frame
                    </span>
                </div>
                <div className="w-[80%] aspect-square max-w-[300px] border-4 border-white/50 border-dashed rounded-xl shadow-[0_0_0_2000px_rgba(0,0,0,0.6)] relative" />
            </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between z-30">
          <button 
            onClick={stopCamera}
            className="p-3 text-white bg-white/10 rounded-full backdrop-blur-md hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
          
          <button 
            onClick={capturePhoto}
            className="w-20 h-20 rounded-full border-4 border-white bg-transparent flex items-center justify-center relative hover:bg-white/10 transition-colors active:scale-95"
          >
             <div className="w-16 h-16 bg-white rounded-full transition-transform" />
          </button>
          
          <div className="w-12" /> {/* Spacer for centering */}
        </div>
      </div>
    );
  }

  // If image exists, show preview
  if (image) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
         <div className="aspect-[3/4] relative group">
            <img 
              src={image.previewUrl} 
              alt="Preview" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
               <button 
                onClick={clearImage}
                className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"
                title="Remove image"
              >
                <X size={20} />
              </button>
            </div>
         </div>
         <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm font-medium text-green-600 flex items-center gap-1.5">
              <ImageIcon size={16} /> Photo Ready
            </p>
            <button onClick={clearImage} className="text-xs text-gray-500 underline hover:text-gray-700">
              Retake
            </button>
         </div>
      </div>
    );
  }

  const useDemoPhoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background
      ctx.fillStyle = mode === 'selfie' ? '#e0f2fe' : '#fce7f3';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw text
      ctx.fillStyle = mode === 'selfie' ? '#0369a1' : '#be185d';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mode === 'selfie' ? 'Demo Selfie' : 'Demo Artwork', canvas.width / 2, canvas.height / 2);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      const base64 = dataUrl.split(',')[1];
      
      onImageChange({
        base64,
        mimeType: 'image/jpeg',
        previewUrl: dataUrl
      });
    }
  };

  // Default: Show Camera and Upload options
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors h-[200px] text-center"
          onClick={startCamera}
        >
          <div className="bg-blue-100 p-3 rounded-full text-blue-600">
            <Camera size={28} />
          </div>
          <div>
             <h3 className="font-bold text-gray-900">Camera</h3>
             <p className="text-xs text-gray-500 mt-1">Take a photo</p>
          </div>
        </div>

        <div 
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors h-[200px] text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="bg-blue-100 p-3 rounded-full text-blue-600">
            <Upload size={28} />
          </div>
          <div>
             <h3 className="font-bold text-gray-900">Upload</h3>
             <p className="text-xs text-gray-500 mt-1">Choose file</p>
          </div>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
      
      <button
        onClick={useDemoPhoto}
        className="w-full py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors"
      >
        Use Demo {mode === 'selfie' ? 'Selfie' : 'Artwork'}
      </button>
      
      <p className="text-xs text-gray-500 text-center">
        {mode === 'selfie' 
          ? 'We only use your photo to generate the facial likeness.' 
          : 'We use this to inspire the background and style.'}
      </p>
    </div>
  );
};

export default ImageUploader;
