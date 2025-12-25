import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

// Enhanced Card with smoother hover effects
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div 
    onClick={onClick} 
    className={`glass-panel p-6 rounded-2xl transition-all duration-300 ${onClick ? 'cursor-pointer glass-panel-hover' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' | 'outline' }> = ({ 
  children, className = '', variant = 'primary', ...props 
}) => {
  const base = "px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 tracking-wide text-sm shadow-lg";
  
  const styles = {
    primary: "bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 border border-white/10",
    danger: "bg-gradient-to-br from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-red-500/25 border border-white/10",
    ghost: "bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white shadow-none backdrop-blur-md",
    outline: "bg-transparent border border-white/20 hover:border-white/40 text-gray-200 hover:text-white shadow-none"
  };
  
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className="w-full glass-input px-4 py-3 rounded-xl transition-all placeholder-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 text-sm"
    {...props}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select 
    className="w-full glass-input px-4 py-3 rounded-xl transition-all text-white appearance-none cursor-pointer text-sm"
    {...props}
  >
    {props.children}
  </select>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl animate-[scaleIn_0.2s_ease-out] overflow-hidden border border-white/10">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Toast System ---

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(id), 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="text-emerald-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />
  };

  const styles = {
    success: 'bg-emerald-950/80 border-emerald-500/20 text-emerald-100',
    error: 'bg-red-950/80 border-red-500/20 text-red-100',
    info: 'bg-blue-950/80 border-blue-500/20 text-blue-100'
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-xl animate-[slideIn_0.3s_ease-out] mb-3 ${styles[type]}`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={() => onClose(id)} className="ml-auto opacity-50 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: { id: string; message: string; type: ToastType }[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col w-full max-w-sm gap-2">
      {toasts.map(t => (
        <Toast key={t.id} {...t} onClose={removeToast} />
      ))}
    </div>
  );
};

// --- Animations ---

export const SparkleEffect: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center">
       {Array.from({length: 16}).map((_, i) => (
         <div 
            key={i}
            className="absolute w-1.5 h-1.5 bg-yellow-200 rounded-full animate-boom shadow-[0_0_10px_rgba(253,224,71,0.8)]"
            style={{
                transform: `rotate(${i * 22.5}deg) translate(0, 0)`,
                '--tw-translate-y': `-${120 + Math.random() * 60}px`
            } as any}
         ></div>
       ))}
    </div>
  );
};

export const BoomEffect: React.FC<{ active: boolean }> = ({ active }) => {
    if (!active) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center">
             <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-boom" style={{transform: 'rotate(0deg)'}}></div>
             <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-boom" style={{transform: 'rotate(45deg)'}}></div>
             <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-boom" style={{transform: 'rotate(90deg)'}}></div>
             <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-boom" style={{transform: 'rotate(135deg)'}}></div>
             
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center scale-150 transition-transform duration-500">
                 <h1 className="text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-500 animate-[pulse_0.3s_ease-in-out] drop-shadow-2xl">
                     LEVEL UP!
                 </h1>
             </div>
        </div>
    );
}

export const FireworksEffect: React.FC<{ active: boolean }> = ({ active }) => {
    if (!active) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-[70] overflow-hidden">
             <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-red-500/80 rounded-full animate-[ping_1s_ease-out_infinite] shadow-[0_0_20px_red]"></div>
             <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-blue-500/80 rounded-full animate-[ping_1.2s_ease-out_infinite] shadow-[0_0_20px_blue]"></div>
             <div className="absolute top-1/3 left-3/4 w-3 h-3 bg-green-500/80 rounded-full animate-[ping_0.8s_ease-out_infinite] shadow-[0_0_20px_green]"></div>
        </div>
    );
}

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "bg-white/5 text-gray-300" }) => (
  <span className={`px-2.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-bold border border-white/5 ${color}`}>
    {children}
  </span>
);