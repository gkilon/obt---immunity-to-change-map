import React from 'react';
import { Sparkles, LucideIcon } from 'lucide-react';

interface TextAreaFieldProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onAutoGenerate?: () => void;
  aiButtonText?: string;
  heightClass?: string;
  colorClass?: string;
  actionIcon?: LucideIcon;
  actionButtonClass?: string;
  dir?: 'rtl' | 'ltr';
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  subLabel,
  value,
  onChange,
  placeholder,
  onAutoGenerate,
  aiButtonText,
  heightClass = "h-40",
  colorClass = "",
  actionIcon: ActionIcon = Sparkles,
  actionButtonClass = "bg-bronze-700 hover:bg-bronze-600 border-bronze-600/50",
  dir = 'rtl'
}) => {
  return (
    <div className="flex flex-col h-full relative group" dir={dir}>
      {(label || subLabel) && (
        <div className={`mb-4 ${dir === 'rtl' ? 'pl-1 border-r-2 pr-3' : 'pr-1 border-l-2 pl-3'} border-bronze-700/50`}>
          {label && <h3 className="text-xl font-normal text-onyx-100 tracking-wide">{label}</h3>}
          {subLabel && <p className="text-sm text-onyx-400 font-normal mt-1 leading-relaxed">{subLabel}</p>}
        </div>
      )}
      
      <div className="flex-1 flex flex-col relative">
        <textarea
          className={`w-full ${heightClass} p-5 pb-14 rounded-lg border border-onyx-700/50 bg-onyx-950/30 focus:bg-onyx-950/60 focus:border-bronze-500/50 focus:ring-1 focus:ring-bronze-500/20 outline-none resize-none transition-all duration-300 text-onyx-200 placeholder:text-onyx-600 text-lg font-light leading-loose shadow-inner ${dir === 'ltr' ? 'text-left' : 'text-right'}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ 
             backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)', 
             backgroundSize: '24px 24px' 
          }} 
        />
        
        {onAutoGenerate && (
          <div className={`absolute bottom-3 ${dir === 'rtl' ? 'left-3' : 'right-3'} z-20`}>
            <button 
              onClick={onAutoGenerate}
              className={`text-xs font-bold text-white px-3 py-1.5 rounded shadow-lg transition-all flex items-center gap-2 tracking-wide backdrop-blur-sm border ${actionButtonClass}`}
            >
              <ActionIcon size={12} />
              <span>{aiButtonText || "Help"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};