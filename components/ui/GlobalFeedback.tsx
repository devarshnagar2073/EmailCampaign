
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle, HelpCircle } from 'lucide-react';
import { Button, Card } from './ui-components';

// --- Toast Types ---
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

// --- Confirm Types ---
interface ConfirmOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface FeedbackContextType {
  toast: {
    success: (msg: string, title?: string) => void;
    error: (msg: string, title?: string) => void;
    info: (msg: string, title?: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useToast must be used within FeedbackProvider");
  return context.toast;
};

export const useConfirm = () => {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("useConfirm must be used within FeedbackProvider");
  return context.confirm;
};

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  // --- Toast Logic ---
  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => removeToast(id), 5000); // Auto remove after 5s
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toastFuncs = {
    success: (msg: string, title?: string) => addToast('success', msg, title),
    error: (msg: string, title?: string) => addToast('error', msg, title),
    info: (msg: string, title?: string) => addToast('info', msg, title),
  };

  // --- Confirm Logic ---
  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirmAction = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result);
      setConfirmState(null);
    }
  };

  return (
    <FeedbackContext.Provider value={{ toast: toastFuncs, confirm }}>
      {children}

      {/* --- Toast UI Container (Portaled) --- */}
      {createPortal(
        <div className="fixed bottom-4 right-4 z-[10001] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-white dark:bg-slate-800 shadow-2xl rounded-xl border border-slate-100 dark:border-slate-700 p-4 flex items-start gap-3 animate-in slide-in-from-right-10 duration-300 ring-1 ring-black/5"
            >
              <div className="shrink-0 pt-0.5">
                {t.type === 'success' && <CheckCircle className="text-emerald-500" size={20} />}
                {t.type === 'error' && <AlertCircle className="text-red-500" size={20} />}
                {t.type === 'info' && <Info className="text-blue-500" size={20} />}
              </div>
              <div className="flex-1">
                {t.title && <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">{t.title}</h4>}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.message}</p>
              </div>
              <button onClick={() => removeToast(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* --- Confirm Modal UI (Portaled) --- */}
      {confirmState && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md shadow-2xl border-0 bg-white animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full ${confirmState.options.variant === 'destructive' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {confirmState.options.variant === 'destructive' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{confirmState.options.title}</h3>
                </div>
              </div>
              <p className="text-slate-600 mb-6 leading-relaxed">
                {confirmState.options.description}
              </p>
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => handleConfirmAction(false)}
                >
                  {confirmState.options.cancelText || 'Cancel'}
                </Button>
                <Button 
                  variant={confirmState.options.variant === 'destructive' ? 'destructive' : 'default'}
                  onClick={() => handleConfirmAction(true)}
                  className={confirmState.options.variant !== 'destructive' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                >
                  {confirmState.options.confirmText || 'Confirm'}
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </FeedbackContext.Provider>
  );
};
