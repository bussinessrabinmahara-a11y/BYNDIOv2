import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

let toastId = 0;
let addToastFn: ((msg: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'info') {
  if (addToastFn) addToastFn(message, type);
}
export const toastSuccess = (m: string) => toast(m, 'success');
export const toastError   = (m: string) => toast(m, 'error');
export const toastInfo    = (m: string) => toast(m, 'info');

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastFn = (message, type = 'info') => {
      const id = ++toastId;
      setToasts(prev => [...prev, { id, type, message }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
    };
    return () => { addToastFn = null; };
  }, []);

  const icons = { success: CheckCircle, error: AlertCircle, info: Info };
  const colors = {
    success: 'bg-[#1B5E20] text-white border-[#2E7D32]',
    error: 'bg-[#B71C1C] text-white border-[#C62828]',
    info: 'bg-[#0D47A1] text-white border-[#1565C0]',
  };

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-[340px]">
      {toasts.map(t => {
        const Icon = icons[t.type];
        return (
          <div key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-[13px] font-semibold animate-fade-in ${colors[t.type]}`}
            style={{ animation: 'slideInRight 0.25s ease' }}>
            <Icon size={16} className="shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t2 => t2.id !== t.id))}
              className="shrink-0 opacity-70 hover:opacity-100 ml-1">
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
