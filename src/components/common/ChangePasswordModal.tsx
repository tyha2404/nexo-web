import { useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { FormModal } from './FormModal';
import { authService } from '../../services';
import { getErrorMessage } from '../../commons/utils';
import {
  BTN_FILL,
  BTN_PRIMARY,
  BTN_SECONDARY,
  FORM_CHECK,
  FORM_CHECK_INPUT,
  FORM_CHECK_LABEL,
  FORM_GROUP,
  MODAL_FORM_BODY,
  MODAL_SHELL_FOOTER,
  cx,
} from '../ui';

const MIN_PASSWORD_LENGTH = 8;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Never keep typed passwords around once the dialog closes.
  const resetAndClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswords(false);
    onClose();
  };
  const handleClose = () => {
    if (!submitting) resetAndClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }

    setSubmitting(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Đổi mật khẩu thành công!');
      resetAndClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Không thể đổi mật khẩu. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputType = showPasswords ? 'text' : 'password';

  return (
    <FormModal
      open={isOpen}
      onClose={handleClose}
      title="Đổi mật khẩu"
      titleId="change-password-title"
    >
      <form onSubmit={handleSubmit}>
        <div className={MODAL_FORM_BODY}>
          <div className={FORM_GROUP}>
            <label htmlFor="current-password">Mật khẩu hiện tại</label>
            <input
              id="current-password"
              type={inputType}
              autoComplete="current-password"
              enterKeyHint="next"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className={FORM_GROUP}>
            <label htmlFor="new-password">Mật khẩu mới</label>
            <input
              id="new-password"
              type={inputType}
              autoComplete="new-password"
              enterKeyHint="next"
              placeholder={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className={FORM_GROUP}>
            <label htmlFor="confirm-password">Xác nhận mật khẩu mới</label>
            <input
              id="confirm-password"
              type={inputType}
              autoComplete="new-password"
              enterKeyHint="done"
              maxLength={128}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className={FORM_CHECK}>
            <label className={FORM_CHECK_LABEL}>
              <input
                type="checkbox"
                className={FORM_CHECK_INPUT}
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
              />
              Hiện mật khẩu
            </label>
          </div>
        </div>
        <div className={MODAL_SHELL_FOOTER}>
          <button
            type="button"
            className={cx(BTN_SECONDARY, BTN_FILL)}
            onClick={handleClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button type="submit" className={cx(BTN_PRIMARY, BTN_FILL)} disabled={submitting}>
            {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
