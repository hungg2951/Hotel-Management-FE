import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number; // 0-indexed theo chuẩn Spring Boot
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
  pageSizeOptions?: number[];
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96],
}) => {
  if (totalElements === 0) return null;

  const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
  const endItem = Math.min((page + 1) * pageSize, totalElements);

  // Tạo danh sách các số trang cần hiển thị
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 2) {
        pages.push(0, 1, 2, '...', totalPages - 1);
      } else if (page >= totalPages - 3) {
        pages.push(0, '...', totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        pages.push(0, '...', page - 1, page, page + 1, '...', totalPages - 1);
      }
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between flex-wrap gap-4 py-4 px-1 mt-4 border-t border-slate-100 text-xs text-slate-500">
      {/* Hiển thị số lượng bản ghi */}
      <div className="flex items-center gap-3">
        <span>
          Hiển thị <strong className="text-slate-900 font-semibold">{startItem}</strong> -{' '}
          <strong className="text-slate-900 font-semibold">{endItem}</strong> trong tổng số{' '}
          <strong className="text-slate-900 font-semibold">{totalElements}</strong> kết quả
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">|</span>
            <span>Mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="py-1 px-2 rounded-md border border-slate-300 bg-white text-slate-800 text-xs cursor-pointer outline-none focus:border-slate-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Điều hướng trang */}
      <div className="flex items-center gap-1.5">
        {/* Nút Trước (<) */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 0}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Các số trang */}
        {getPageNumbers().map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold select-none">
                ...
              </span>
            );
          }

          const pageNum = Number(p);
          const isActive = pageNum === page;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-8 h-8 px-2 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                isActive
                  ? 'border-2 border-black bg-white text-black'
                  : 'border border-slate-300 bg-white text-black hover:bg-slate-50'
              }`}
            >
              {pageNum + 1}
            </button>
          );
        })}

        {/* Nút Sau (>) */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
