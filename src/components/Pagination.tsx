import { MOTION_PRESS } from './ui';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
  totalItems?: number;
  itemsPerPageOptions?: number[];
}

const PAGE_BTN = `${MOTION_PRESS} inline-flex h-[38px] min-w-[38px] cursor-pointer items-center justify-center rounded-md border px-[0.6rem] text-[0.875rem] transition-all duration-200 enabled:hover:border-line-hover enabled:hover:bg-hover enabled:hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 max-[640px]:h-11 max-[640px]:min-w-11 max-[640px]:text-[0.95rem] mobile:min-h-11 mobile:min-w-11 pointer-coarse:min-h-11 pointer-coarse:min-w-11`;
const PAGE_BTN_IDLE = 'border-line bg-card font-semibold text-main';
const PAGE_BTN_ACTIVE =
  'active border-primary bg-primary font-bold text-[var(--text-dark,#fff)] shadow-[0_2px_8px_var(--primary-glow)]';

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  itemsPerPageOptions = [5, 10, 20, 50],
}: PaginationProps) {
  // A single page only needs the size picker when a smaller page size could split it
  const fitsSmallestPage = (totalItems ?? 0) <= Math.min(...itemsPerPageOptions);
  if (totalPages <= 1 && (!onItemsPerPageChange || fitsSmallestPage)) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 pb-2 animate-fade-in max-[640px]:flex-col max-[640px]:items-center max-[640px]:gap-3">
      {totalItems !== undefined && (
        <div className="text-[0.875rem] text-muted">
          Hiển thị {totalItems > 0 ? (currentPage - 1) * (itemsPerPage || 10) + 1 : 0} -{' '}
          {Math.min(currentPage * (itemsPerPage || 10), totalItems)} trên tổng số {totalItems} mục
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-[0.35rem]">
          <button
            className={`${PAGE_BTN} ${PAGE_BTN_IDLE}`}
            disabled={currentPage === 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Trang trước"
            title="Trang trước"
          >
            &lsaquo;
          </button>

          {getPageNumbers().map((page, idx) =>
            typeof page === 'number' ? (
              <button
                key={idx}
                className={`${PAGE_BTN} ${page === currentPage ? PAGE_BTN_ACTIVE : PAGE_BTN_IDLE}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="px-[0.35rem] text-[0.875rem] text-muted">
                {page}
              </span>
            )
          )}

          <button
            className={`${PAGE_BTN} ${PAGE_BTN_IDLE}`}
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Trang sau"
            title="Trang sau"
          >
            &rsaquo;
          </button>
        </div>
      )}

      {onItemsPerPageChange && itemsPerPage && (
        <div className="flex items-center gap-2 text-[0.875rem] text-muted">
          <span>Hiển thị:</span>
          <select
            className="h-[38px] cursor-pointer rounded-md border border-line bg-input px-[0.65rem] py-[0.35rem] text-[0.875rem] text-main outline-none focus:border-primary max-[640px]:h-11"
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          >
            {itemsPerPageOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / trang
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
