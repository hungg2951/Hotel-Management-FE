import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  isPassword = false,
  className = '',
  id,
  type = 'text',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5 mb-4 text-left">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-slate-400 flex items-center pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          type={actualType}
          className={`w-full py-2.5 px-3.5 font-sans text-sm text-slate-900 bg-white border border-slate-300 rounded-lg outline-none transition-all placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:cursor-not-allowed ${
            leftIcon ? 'pl-10' : ''
          } ${isPassword ? 'pr-10' : ''} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''} ${className}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3.5 text-slate-400 hover:text-slate-700 flex items-center p-0 bg-transparent border-0 cursor-pointer"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-rose-600 mt-1">{error}</span>}
    </div>
  );
};
