import { createPortal } from 'react-dom';
import { useModal } from '../../hooks';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import {
  BTN_DANGER,
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CONFIRM_BACKDROP,
  CONFIRM_ICON_DANGER,
  CONFIRM_ICON_WARNING,
  CONFIRM_PANEL,
  MODAL_CLOSE_BTN,
  MODAL_HEADER,
  cx,
} from '../ui';

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
  const dialogRef = useModal(isOpen, onCancel);

  if (!isOpen) return null;

  return createPortal(
    <div className={CONFIRM_BACKDROP} onClick={onCancel}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={CONFIRM_PANEL}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div className={MODAL_HEADER}>
          <div className="flex items-center gap-3">
            <div className={variant === 'danger' ? CONFIRM_ICON_DANGER : CONFIRM_ICON_WARNING}>
              {variant === 'danger' ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <h3 id="confirm-modal-title">{title}</h3>
          </div>
          <button type="button" className={MODAL_CLOSE_BTN} onClick={onCancel} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <p className="m-0 mb-6 text-[0.9rem] leading-[1.5] text-muted">{message}</p>

        <div className="flex justify-end gap-3">
          <button type="button" className={cx(BTN_SECONDARY, BTN_FILL)} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={cx(variant === 'danger' ? BTN_DANGER : BTN_PRIMARY, BTN_FILL)}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
