import React, { useRef, useState } from 'react';
import { Camera, Trash2, Loader2 } from 'lucide-react';

export const PhotoUpload = ({ imageSrc, onImageChange }) => {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.7 quality
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const compressedBase64 = await compressImage(file);
        onImageChange(compressedBase64);
      } catch (error) {
        console.error("Image processing failed", error);
        alert("画像の処理に失敗しました。");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerUpload = () => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex justify-center items-center h-full w-full p-1">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {isProcessing ? (
         <div className="flex items-center justify-center w-16 h-16 bg-gray-50 rounded border border-gray-200">
           <Loader2 className="animate-spin text-blue-500" size={20} />
         </div>
      ) : imageSrc ? (
        <div 
          className="relative group w-16 h-16 cursor-pointer"
          onClick={triggerUpload}
        >
          <img 
            src={imageSrc} 
            alt="Result" 
            className="w-full h-full object-cover rounded border border-gray-300 shadow-sm"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded flex items-center justify-center">
            <button 
              onClick={handleClear}
              className="text-white opacity-0 group-hover:opacity-100 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-opacity"
              title="削除"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={triggerUpload}
          className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-gray-300 rounded text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors bg-gray-50 hover:bg-blue-50"
          title="写真を添付"
        >
          <Camera size={20} />
          <span className="text-[10px] mt-1">写真</span>
        </button>
      )}
    </div>
  );
};