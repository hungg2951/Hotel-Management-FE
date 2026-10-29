import React from 'react';

export interface CurrencyInputProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
  inputClassName?: string;
  error?: string;
  helperText?: string;
  showQuickSummary?: boolean;
  suffix?: string;
  autoFocus?: boolean;
}

/**
 * Rút gọn số tiền thành dạng dễ đọc tiếng Việt:
 * 1.500.000 -> 1,5 triệu đ
 * 500.000 -> 500 nghìn đ
 * 2.000.000.000 -> 2 tỷ đ
 */
export const formatVNDSummary = (amount: number): string => {
  if (!amount || amount <= 0) return '';
  if (amount >= 1_000_000_000) {
    const val = (amount / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${val} tỷ đ`;
  }
  if (amount >= 1_000_000) {
    const val = (amount / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return `${val} triệu đ`;
  }
  if (amount >= 1_000) {
    const val = (amount / 1_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 });
    return `${val} nghìn đ`;
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  name,
  value,
  onChange,
  label,
  placeholder = '0',
  required = false,
  disabled = false,
  min = 0,
  max,
  className = '',
  inputClassName = '',
  error,
  helperText,
  showQuickSummary = true,
  suffix = 'đ',
  autoFocus = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Chỉ lấy chữ số
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      onChange(0);
      return;
    }

    let num = parseInt(rawDigits, 10);
    if (isNaN(num)) num = 0;
    if (min !== undefined && num < min) {
      // Cho phép người dùng gõ số đang tăng dần
    }
    if (max !== undefined && num > max) {
      num = max;
    }
    onChange(num);
  };

  // Định dạng hiển thị dấu phẩy phân tách hàng nghìn (VD: 1,000,000)
  const displayValue = value && value > 0 ? value.toLocaleString('en-US') : (value === 0 ? '0' : '');
  const summary = showQuickSummary && value >= 1000 ? formatVNDSummary(value) : '';

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-slate-700 tracking-wide"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          id={id}
          name={name}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          value={displayValue}
          onChange={handleChange}
          onFocus={(e) => {
            if (value === 0) e.target.select();
          }}
          placeholder={placeholder}
          className={`w-full pl-3.5 pr-9 py-2 text-sm font-mono font-bold bg-white border border-slate-200 rounded-xl text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-slate-50 disabled:text-slate-400 ${
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : ''
          } ${inputClassName}`}
        />
        {suffix && (
          <span className="absolute right-3 text-slate-400 font-bold text-sm pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] min-h-[16px]">
        {error ? (
          <span className="text-rose-500 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-slate-400">{helperText}</span>
        ) : (
          <span />
        )}

        {summary && (
          <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50">
            ≈ {summary}
          </span>
        )}
      </div>
    </div>
  );
};
