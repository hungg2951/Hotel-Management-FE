import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';

export interface ActionDropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
  dividerBefore?: boolean;
}

interface ActionDropdownProps {
  items: ActionDropdownItem[];
  title?: string;
  className?: string;
}

interface DropdownCoords {
  top?: number;
  bottom?: number;
  right: number;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
  items,
  title = 'Tùy chọn thao tác',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords>({ right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const right = Math.max(10, window.innerWidth - rect.right);
    const estimatedHeight = items.length * 36 + 20;
    const isNearBottom = rect.bottom + estimatedHeight > window.innerHeight;

    if (isNearBottom) {
      setCoords({
        bottom: window.innerHeight - rect.top + 6,
        right,
      });
    } else {
      setCoords({
        top: rect.bottom + 6,
        right,
      });
    }

    setIsOpen(true);
  };

  // Tự động đóng menu khi cuộn chuột hoặc co giãn màn hình
  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => setIsOpen(false);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className={`inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title={title}
        className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
          isOpen
            ? 'bg-amber-50 text-amber-600 border-amber-300 shadow-xs'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
        }`}
      >
        <MoreHorizontal size={17} />
      </button>

      {isOpen && (
        <>
          {/* Lớp Backdrop tàng hình z-[9998] che toàn màn hình để đóng khi click ngoài */}
          <div
            className="fixed inset-0 z-[9998] cursor-default bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          />

          {/* Menu nổi hoàn toàn trên không gian 3D (Fixed z-[9999]), không bao giờ bị dính mặt phẳng table */}
          <div
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : 'auto',
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : 'auto',
              right: `${coords.right}px`,
            }}
            className="z-[9999] min-w-[200px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left select-none ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item, idx) => (
              <React.Fragment key={idx}>
                {item.dividerBefore && <div className="border-t border-slate-100 my-1" />}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    item.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer text-left ${
                    item.variant === 'danger'
                      ? 'text-rose-600 hover:bg-rose-50'
                      : item.variant === 'primary'
                      ? 'text-amber-700 hover:bg-amber-50 font-bold'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

