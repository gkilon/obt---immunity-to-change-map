import React from 'react';
import { Sparkles } from 'lucide-react';

interface TextAreaFieldProps {
  label: string;
  subLabel?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  onAutoGenerate?: () => void;
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
  heightClass = "h-40",
  colorClass = "border-slate-200 focus:border-brand-500"
}) => {
  return (
    <div className="flex flex-col h-full relative group">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{label}</h3>
          {subLabel && <p className="text-xs text-slate-500">{subLabel}</p>}
        </div>
        {onAutoGenerate && (
          <button 
            onClick={onAutoGenerate}
            className="text-brand-600 hover:text-brand-800 transition-colors p-1 opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="קבל רעיונות מ-AI"
          >
            <Sparkles size={16} />
          </button>
        )}
      </div>
      <textarea
        className={`w-full ${heightClass} p-3 rounded-lg border-2 ${colorClass} focus:ring-2 focus:ring-brand-100 outline-none resize-none transition-all shadow-sm text-slate-700 bg-white/50 backdrop-blur-sm`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
};