import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Save, Sparkles, Wand2, Terminal, Info } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNotification } from '../context/NotificationContext';

interface SecretTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SecretTrainingModal({ isOpen, onClose }: SecretTrainingModalProps) {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    assistantName: 'SALU AI',
    activationResponses: 'Yes boss, Yes sir, G jan, Ji hukum',
    customSystemInstructions: '',
    secretTrainingCode: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'system', 'hidden_config'));
        if (configDoc.exists()) {
          setConfig(prev => ({ ...prev, ...configDoc.data() }));
        }
      } catch (error) {
        console.error("Error fetching hidden config:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'hidden_config'), config);
      notify('Hidden intelligence updated successfully.', 'success', 3000);
      onClose();
    } catch (error) {
      notify('Failed to update hidden config.', 'error', 3000);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">SALU AI Intelligence Training</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secret Configuration Node</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Sparkles className="w-10 h-10 text-slate-200 animate-pulse" />
              <p className="text-sm font-bold text-slate-400">Decrypting internal configurations...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-500" /> Assistant Name
                  </label>
                  <input
                    type="text"
                    value={config.assistantName}
                    onChange={(e) => setConfig({ ...config, assistantName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium"
                    placeholder="e.g. Hania"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-brand-500" /> Hotword Responses
                  </label>
                  <input
                    type="text"
                    value={config.activationResponses}
                    onChange={(e) => setConfig({ ...config, activationResponses: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium"
                    placeholder="Comma separated responses"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-brand-500" /> Advanced Training Data
                </label>
                <textarea
                  value={config.customSystemInstructions}
                  onChange={(e) => setConfig({ ...config, customSystemInstructions: e.target.value })}
                  className="w-full h-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all font-medium resize-none"
                  placeholder="Inject custom memories, knowledge, or behavioral logic into the AI core..."
                />
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  These settings override standard AI behaviors. The assistant will recognize the name above and use one of the hotword responses when addressed by name in Live Mode. The training data is injected into the system prompt.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            disabled={saving || loading}
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Encrypting...' : 'Seal Training'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
