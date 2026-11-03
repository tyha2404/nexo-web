import React from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../hooks';
import { X, ExternalLink, Download } from '../ui';
import {
  ACTION_BTN_EDIT,
  MODAL_BACKDROP,
  MODAL_CLOSE_BTN,
  MODAL_HEADER,
  MODAL_PANEL,
  cx,
} from '../ui';

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
  // Only http(s) links: the URL is stored data and ends up in href.
  const safeUrl = imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : undefined;
  const dialogRef = useModal(isOpen && !!safeUrl, onClose);
  if (!isOpen || !safeUrl) return null;

  return createPortal(
    <div className={MODAL_BACKDROP} onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cx(
          MODAL_PANEL,
          'flex! max-h-[90vh]! w-[95%]! max-w-[680px]! flex-col! overflow-hidden! p-0! mobile:max-h-full! mobile:w-full! mobile:max-w-full! mobile:pt-[max(1.25rem,env(safe-area-inset-top,0px))]! mobile:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]!'
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={MODAL_HEADER}>
          <h3>{title}</h3>
          <div className="flex items-center gap-[0.4rem]">
            <a
              href={safeUrl}
              target="_blank"
              rel="noreferrer"
              className={ACTION_BTN_EDIT}
              title="Mở trong tab mới"
            >
              <ExternalLink size={16} />
            </a>
            <a
              href={safeUrl}
              download
              target="_blank"
              rel="noreferrer"
              className={ACTION_BTN_EDIT}
              title="Tải về máy"
            >
              <Download size={16} />
            </a>
            <button type="button" className={MODAL_CLOSE_BTN} onClick={onClose} aria-label="Đóng">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex min-h-[260px] flex-1 items-center justify-center overflow-auto bg-card p-5">
          <img
            src={safeUrl}
            alt="Receipt details"
            className="h-auto max-h-[68vh] w-auto max-w-full rounded-md border border-line object-contain shadow-app-md"
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
