import './Pagination.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (size: number) => void;
  totalItems?: number;
  itemsPerPageOptions?: number[];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  itemsPerPageOptions = [5, 10, 20, 50],
}: PaginationProps) {
  if (totalPages <= 1 && !onItemsPerPageChange) {
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
    <div className="pagination-container animate-fade-in">
      {totalItems !== undefined && (
        <div className="pagination-info">
          Hiển thị {totalItems > 0 ? (currentPage - 1) * (itemsPerPage || 10) + 1 : 0} -{' '}
          {Math.min(currentPage * (itemsPerPage || 10), totalItems)} trên tổng số {totalItems} mục
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button
            className="pagination-btn"
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
                className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            ) : (
              <span key={idx} className="pagination-ellipsis">
                {page}
              </span>
            )
          )}

          <button
            className="pagination-btn"
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
        <div className="pagination-size-selector">
          <span>Hiển thị:</span>
          <select
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
