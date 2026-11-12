import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../hooks';
import {
  cx,
  MODAL_BACKDROP,
  MODAL_CLOSE_BTN,
  MODAL_FORM_SHELL_PANEL,
  MODAL_HEADER,
  MODAL_PANEL,
  MODAL_SHELL_HEADER,
  X,
} from '../ui';

/**
 * Panel shape (see ui/modalStyles):
 * - 'shell': MODAL_FORM_SHELL_PANEL + MODAL_SHELL_HEADER; children bring their own
 *   MODAL_FORM_BODY + MODAL_SHELL_FOOTER.
 * - 'scroll': MODAL_PANEL + sticky MODAL_HEADER; the whole card scrolls (MODAL_FOOTER).
 */
export type FormModalVariant = 'shell' | 'scroll';

export interface FormModalProps {
  open: boolean;
  onClose: () => void;
  /** Heading text of the dialog (h3). */
  title: ReactNode;
  /** Set to label the dialog by its heading (aria-labelledby); the h3 gets this id. */
  titleId?: string;
  /** Accessible name when the dialog is not labelled by its heading. */
  ariaLabel?: string;
  variant?: FormModalVariant;
  /** Extra panel classes (merged after the variant's panel class). */
  panelClassName?: string;
  /** Header buttons rendered before the close button (grouped with it). */
  headerActions?: ReactNode;
  /** Disables the X button (e.g. while saving). */
  closeDisabled?: boolean;
  children: ReactNode;
}

/**
 * The dialog shell every form modal shares: portalled backdrop that closes on click, the
 * focus-trapped panel (useModal), the header with its title and X button.
 */
export function FormModal({
  open,
  onClose,
  title,
  titleId,
  ariaLabel,
  variant = 'shell',
  panelClassName,
  headerActions,
  closeDisabled,
  children,
}: FormModalProps) {
  const dialogRef = useModal(open, onClose);
  if (!open) return null;

  const closeButton = (
    <button
      type="button"
      className={MODAL_CLOSE_BTN}
      onClick={onClose}
      disabled={closeDisabled}
      aria-label="Đóng"
    >
      <X size={16} />
    </button>
  );

  return createPortal(
    <div className={MODAL_BACKDROP} onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={ariaLabel}
        tabIndex={-1}
        className={cx(variant === 'shell' ? MODAL_FORM_SHELL_PANEL : MODAL_PANEL, panelClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={variant === 'shell' ? MODAL_SHELL_HEADER : MODAL_HEADER}>
          <h3 id={titleId}>{title}</h3>
          {headerActions ? (
            <div className="flex items-center gap-[0.4rem]">
              {headerActions}
              {closeButton}
            </div>
          ) : (
            closeButton
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
