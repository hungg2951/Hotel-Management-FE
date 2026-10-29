import React from 'react';
import type { AppRole } from '../../types/auth';

interface BadgeProps {
  role?: AppRole;
  variant?: 'success' | 'warning' | 'danger' | 'info';
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ role, variant, children }) => {
  const baseClasses =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold leading-normal border whitespace-nowrap';

  if (role) {
    const roleConfig: Record<AppRole, { label: string; classes: string }> = {
      ADMIN: {
        label: 'ADMIN',
        classes: 'bg-rose-50 text-rose-700 border-rose-200',
      },
      MANAGER: {
        label: 'Quản lý',
        classes: 'bg-amber-50 text-amber-800 border-amber-200',
      },
      RECEPTIONIST: {
        label: 'Lễ tân',
        classes: 'bg-blue-50 text-blue-800 border-blue-200',
      },
      ACCOUNTANT: {
        label: 'Kế toán',
        classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
      HOUSEKEEPER: {
        label: 'Buồng phòng',
        classes: 'bg-purple-50 text-purple-800 border-purple-200',
      },
    };

    const config = roleConfig[role] || roleConfig.ADMIN;

    return (
      <span className={`${baseClasses} ${config.classes}`}>
        {children || config.label}
      </span>
    );
  }

  const variantClasses: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant || 'info']}`}>
      {children}
    </span>
  );
};
