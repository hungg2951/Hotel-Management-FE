import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
      style={style}
    >
      {(title || action) && (
        <div className="flex justify-between items-start mb-5 pb-3.5 border-b border-slate-100">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="min-w-10">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
