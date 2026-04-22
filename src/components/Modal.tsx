import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MessageCircle, Share2, Globe } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            id="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            id="modal-content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 md:p-6"
          >
            <div className="bg-[#111] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
                <button
                  id="modal-close-button"
                  onClick={onClose}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div id="modal-body" className="text-gray-400 space-y-4 mb-8">
                {children}
              </div>
              
              <div id="modal-connect-section" className="border-t border-white/10 pt-6">
                <p className="text-white font-bold mb-4">Connect with us:</p>
                <div className="flex items-center gap-4">
                  <a href="https://wa.me/923242571748" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-green-500 rounded-full transition-colors border border-white/5"><MessageCircle className="w-5 h-5 text-white" /></a>
                  <a href="https://www.facebook.com/share/1BAhDS2JWE/" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-blue-600 rounded-full transition-colors border border-white/5"><Share2 className="w-5 h-5 text-white" /></a>
                  <a href="https://babar-ali-arain.netlify.app/" target="_blank" rel="noopener noreferrer" className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"><Globe className="w-5 h-5 text-white" /></a>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
