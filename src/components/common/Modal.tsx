import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  onSubmit?: (e: React.FormEvent) => void;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = '520px',
  onSubmit,
}) => {
  // Đóng bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] transition-all transform animate-in zoom-in-95 duration-200"
        style={{ maxWidth }}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
            title="Đóng (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {onSubmit ? (
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Modal Body */}
            <div className="modal-scrollable-body p-6 overflow-y-auto flex-1 min-h-0">{children}</div>

            {/* Modal Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
                {footer}
              </div>
            )}
          </form>
        ) : (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Modal Body */}
            <div className="modal-scrollable-body p-6 overflow-y-auto flex-1 min-h-0">{children}</div>

            {/* Modal Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 backdrop-blur-xs flex items-center justify-end gap-3 shrink-0">
                {footer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
