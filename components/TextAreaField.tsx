import React from 'react';
import { Sparkles, ArrowLeft } from 'lucide-react';

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
  colorClass = "border-slate-200 focus:border-brand-500"
}) => {
  return (
    <div className="flex flex-col h-full relative group">
      <div className="mb-2">
        <h3 className="text-lg font-bold text-slate-800">{label}</h3>
        {subLabel && <p className="text-xs text-slate-500 leading-snug">{subLabel}</p>}
      </div>
      
      <div className="flex-1 flex flex-col relative">
        <textarea
          className={`w-full ${heightClass} p-3 rounded-lg border-2 ${colorClass} focus:ring-2 focus:ring-brand-100 outline-none resize-none transition-all shadow-sm text-slate-700 bg-white/50 backdrop-blur-sm mb-2`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        
        {onAutoGenerate && (
          <button 
            onClick={onAutoGenerate}
            className="self-start text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-full transition-all flex items-center gap-2 group/btn"
          >
            <Sparkles size={14} className="text-brand-500 group-hover/btn:animate-pulse" />
            <span>{aiButtonText || "צריך עזרה עם השלב הזה?"}</span>
            <ArrowLeft size={12} className="opacity-0 group-hover/btn:opacity-100 transition-opacity -mr-1" />
          </button>
        )}
      </div>
    </div>
  );
};