import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

// --- Toast Component ---
export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className={`
            flex items-center gap-3 px-4 py-3 rounded shadow-lg text-white min-w-[300px] animate-slideIn
            ${t.type === 'success' ? 'bg-emerald-600' : t.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}
          `}
        >
          {t.type === 'success' && <CheckCircle size={20} />}
          {t.type === 'error' && <AlertCircle size={20} />}
          {t.type === 'info' && <Info size={20} />}
          
          <span className="flex-1 text-sm font-medium">{t.message}</span>
          
          <button onClick={() => removeToast(t.id)} className="text-white/80 hover:text-white">
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};

// --- Confirm Modal Component ---
export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<{ config: ConfirmState }> = ({ config }) => {
  if (!config.isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] animate-fadeIn">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 transform transition-all scale-100">
        <div className="flex items-center gap-3 text-amber-500 mb-4">
          <AlertTriangle size={28} />
          <h3 className="text-xl font-bold text-slate-800">{config.title}</h3>
        </div>
        
        <p className="text-slate-600 mb-8 leading-relaxed">
          {config.message}
        </p>
        
        <div className="flex justify-end gap-3">
          <button 
            onClick={config.onCancel}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={config.onConfirm}
            className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded font-medium shadow-sm transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};