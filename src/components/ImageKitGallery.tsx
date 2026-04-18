
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Trash2, Copy, Download, ExternalLink, Loader2, Sparkles, FolderOpen, RefreshCw, Lock, Crown } from 'lucide-react';
import { IKContext, IKImage } from 'imagekitio-react';
import { imageKitConfig, ImageKitFile, isImageKitConfigured } from '../lib/imagekit';
import { useNotification } from '../context/NotificationContext';
import { useUserProfile } from '../context/UserProfileContext';
import { cn } from '../lib/utils';

interface ImageKitGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgrade?: () => void;
}

export const ImageKitGallery: React.FC<ImageKitGalleryProps> = ({ isOpen, onClose, onOpenUpgrade }) => {
  const [images, setImages] = useState<ImageKitFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageKitFile | null>(null);
  const { notify } = useNotification();
  const { isPaid } = useUserProfile();

  const fetchImages = async () => {
    if (!isPaid) return;
    setLoading(true);
    try {
      // ImageKit doesn't have a simple client-side "list" API for security reasons.
      // We should implement a server-side list endpoint.
      const res = await fetch('/api/imagekit/files');
      
      const contentType = res.headers.get("content-type");
      if (res.ok && contentType && contentType.indexOf("application/json") !== -1) {
        const data = await res.json();
        setImages(data);
      } else {
        console.warn("Could not fetch images from server, returned invalid format.");
        // Try to handle API error gracefully
        if (!res.ok) {
           console.error("Image API error:", res.status, res.statusText);
        }
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchImages();
    }
  }, [isOpen]);

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;
    
    try {
      const res = await fetch(`/api/imagekit/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setImages(prev => prev.filter(img => img.fileId !== fileId));
        if (selectedImage?.fileId === fileId) setSelectedImage(null);
        notify("Image deleted from Vault", "success");
      }
    } catch (error) {
      notify("Failed to delete image", "error");
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    notify("URL copied to clipboard", "success");
  };

  if (!isOpen) return null;

  if (!isPaid) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 outline-none"
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
        <motion.div
           initial={{ scale: 0.95, y: 20 }}
           animate={{ scale: 1, y: 0 }}
           className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-2xl overflow-hidden p-12 text-center space-y-8"
        >
           <div className="w-24 h-24 bg-brand-50 rounded-[2.5rem] flex items-center justify-center mx-auto relative">
              <ImageIcon className="w-10 h-10 text-brand-500" />
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center">
                 <Lock className="w-5 h-5 text-slate-400" />
              </div>
           </div>
           <div className="space-y-3">
              <h2 className="text-3xl font-black text-slate-900">Media Vault is Locked</h2>
              <p className="text-slate-500 font-medium">Cloud storage and management for your AI creations is a SALU AI Plus exclusive feature.</p>
           </div>
           <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                 <Crown className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600 leading-tight">
                 Upgrade to SALU AI Plus for Rs. 200/month to unlock Media Vault, Live AI, and more.
              </p>
           </div>
           <button 
             onClick={() => {
               onOpenUpgrade?.();
               onClose();
             }}
             className="w-full py-4 bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-lg transition-all active:scale-95"
           >
              Upgrade to Plus
           </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">Media Vault</h2>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cloud Image Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchImages}
              disabled={loading}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              title="Refresh Gallery"
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button 
              onClick={onClose}
              className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Gallery Grid */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                <p className="text-slate-500 font-medium">Accessing vault...</p>
              </div>
            ) : images.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center mb-6">
                  <ImageIcon className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Your vault is empty</h3>
                <p className="text-slate-500 max-w-xs mx-auto">
                  Images uploaded or generated by SALU AI will appear here once saved to ImageKit.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image) => (
                  <motion.div
                    key={image.fileId}
                    layoutId={image.fileId}
                    whileHover={{ scale: 1.02, y: -2 }}
                    onClick={() => setSelectedImage(image)}
                    className={cn(
                      "aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group relative",
                      selectedImage?.fileId === image.fileId ? "border-brand-500 ring-4 ring-brand-500/10" : "border-transparent bg-slate-100"
                    )}
                  >
                    {isImageKitConfigured() ? (
                      <IKContext urlEndpoint={imageKitConfig.urlEndpoint}>
                        <IKImage
                          path={image.filePath}
                          urlEndpoint={imageKitConfig.urlEndpoint}
                          transformation={[{ height: "300", width: "300", cropMode: "extract" }]}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      </IKContext>
                    ) : (
                      <img
                        src={image.thumbnailUrl || image.url}
                        alt={image.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] text-white font-medium truncate">{image.name}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Details Sidebar */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 300, opacity: 0 }}
                className="w-full md:w-80 border-l border-slate-100 bg-slate-50/50 p-6 flex flex-col gap-6 overflow-y-auto"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Image Details</h3>
                  <button onClick={() => setSelectedImage(null)} className="md:hidden p-1 hover:bg-slate-200 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="aspect-square rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-200">
                  <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-contain" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">File Name</label>
                    <p className="text-sm text-slate-900 font-medium truncate">{selectedImage.name}</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Size</label>
                      <p className="text-sm text-slate-900 font-medium lowercase">{(selectedImage.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Created</label>
                      <p className="text-sm text-slate-900 font-medium">{new Date(selectedImage.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  <button
                    onClick={() => copyUrl(selectedImage.url)}
                    className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="text-xs font-bold">Copy URL</span>
                  </button>
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-xs font-bold">Open</span>
                  </a>
                  <button
                    onClick={() => handleDelete(selectedImage.fileId)}
                    className="flex items-center justify-center gap-2 p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-bold">Delete</span>
                  </button>
                  <button
                    onClick={async () => {
                      const response = await fetch(selectedImage.url);
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = selectedImage.name;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center justify-center gap-2 p-3 bg-brand-500 hover:bg-brand-600 rounded-xl text-white transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-xs font-bold">Save</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
