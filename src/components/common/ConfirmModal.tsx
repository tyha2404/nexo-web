import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter') {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-content animate-scale-in confirm-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{ maxWidth: '420px', padding: '1.5rem' }}
      >
        <div
          className="modal-header"
          style={{ marginBottom: '1rem', borderBottom: 'none', paddingBottom: 0 }}
        >
          <div className="flex items-center gap-3">
            <div
              className={`confirm-icon-badge ${
                variant === 'danger' ? 'icon-danger-badge' : 'icon-warning-badge'
              }`}
            >
              {variant === 'danger' ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <h3 id="confirm-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
              {title}
            </h3>
          </div>
          <button type="button" className="close-btn" onClick={onCancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            margin: '0 0 1.5rem 0',
          }}
        >
          {message}
        </p>

        <div
          className="modal-actions"
          style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            style={{ flex: 1 }}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
