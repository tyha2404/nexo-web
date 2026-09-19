import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  title?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title = 'Chứng từ / Hóa đơn đính kèm',
}) => {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          maxWidth: '680px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          className="modal-header"
          style={{
            padding: '1.1rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: 0,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--text-main)',
            }}
          >
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Mở trong tab mới"
            >
              <ExternalLink size={16} />
            </a>
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
              title="Tải về máy"
            >
              <Download size={16} />
            </a>
            <button
              type="button"
              className="close-btn"
              onClick={onClose}
              aria-label="Đóng"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={17} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: '1.25rem',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-card)',
            minHeight: '260px',
          }}
        >
          <img
            src={imageUrl}
            alt="Receipt details"
            style={{
              maxHeight: '68vh',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border)',
            }}
          />
        </div>
      </div>
    </div>
  );
};
