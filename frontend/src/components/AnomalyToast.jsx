import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  XMarkIcon, 
  ExclamationTriangleIcon, 
  ShieldExclamationIcon, 
  InformationCircleIcon,
  LockClosedIcon 
} from '@heroicons/react/24/outline';

const AnomalyToast = () => {
  const { toasts, dismissToast } = useAuth();

  const getSeverityStyle = (severity) => {
    if (severity === 'High') {
      return {
        border: 'border-l-4 border-l-red-500 border-red-500/20',
        text: 'text-red-400',
        bg: 'bg-red-950/40',
        icon: ExclamationTriangleIcon,
      };
    }
    if (severity === 'Medium') {
      return {
        border: 'border-l-4 border-l-amber-500 border-amber-500/20',
        text: 'text-amber-400',
        bg: 'bg-amber-950/40',
        icon: ExclamationTriangleIcon,
      };
    }
    return {
      border: 'border-l-4 border-l-blue-500 border-blue-500/20',
      text: 'text-blue-400',
      bg: 'bg-blue-950/40',
      icon: InformationCircleIcon,
    };
  };

  return (
    <div className="fixed top-6 right-6 w-96 max-w-[calc(100vw-3rem)] z-50 flex flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const style = getSeverityStyle(toast.severity);
          const Icon = style.icon;
          
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-4 rounded-xl border backdrop-blur-xl ${style.bg} ${style.border} shadow-glass flex gap-3 items-start justify-between`}
            >
              <div className="flex gap-3">
                <div className={`p-1.5 rounded-lg bg-white/5 ${style.text} flex-shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-white tracking-wide">
                    {toast.title}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {toast.message}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-200 p-0.5 rounded-md hover:bg-white/5 transition-colors flex-shrink-0"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnomalyToast;
