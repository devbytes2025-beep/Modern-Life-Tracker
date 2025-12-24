import React from 'react';
import { X } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`glass-panel p-6 rounded-2xl ${className}`}>
    {children}
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }> = ({ 
  children, className = '', variant = 'primary', ...props 
}) => {
  const base = "px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  const styles = {
    primary: "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20",
    danger: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white shadow-lg shadow-red-500/20",
    ghost: "bg-white/10 hover:bg-white/20 text-white border border-white/10"
  };
  
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    className="w-full glass-input px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-gray-400"
    {...props}
  />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
  <select 
    className="w-full glass-input px-4 py-3 rounded-xl focus:ring-2 focus:ring-indigo-500/50 transition-all text-white appearance-none cursor-pointer"
    {...props}
  >
    {props.children}
  </select>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="glass-panel w-full max-w-md rounded-2xl shadow-2xl animate-[scaleIn_0.2s_ease-out] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-white/10">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export const SparkleEffect: React.FC<{ active: boolean }> = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center">
       {/* Simplified CSS sparkle logic would go here, utilizing the animation defined in index.html */}
       <div className="animate-sparkle text-6xl">✨</div>
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = "bg-indigo-500/20 text-indigo-200" }) => (
  <span className={`px-2 py-1 rounded-md text-xs font-medium border border-white/5 ${color}`}>
    {children}
  </span>
);
