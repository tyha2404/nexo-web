import { Bell, Check, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import React, { useEffect } from 'react';
import './IOSPushModal.css';

interface IOSPushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSPushModal: React.FC<IOSPushModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop ios-push-modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-scale-in ios-push-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-push-modal-title"
      >
        <div className="modal-header ios-push-modal-header">
          <div className="ios-push-modal-title">
            <div className="ios-icon-badge">
              <Bell size={20} />
            </div>
            <h3 id="ios-push-modal-title">Bật Thông Báo Trên iPhone</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="ios-push-modal-body">
          <div className="ios-push-info-banner">
            <p>
              Apple yêu cầu ứng dụng Nexo phải được thêm vào{' '}
              <strong>Màn hình chính (Home Screen)</strong> trên iOS 16.4+ để nhận thông báo đẩy.
            </p>
          </div>

          <div className="ios-steps-list">
            <div className="ios-step-item">
              <div className="ios-step-number">1</div>
              <div className="ios-step-content">
                <div className="ios-step-title">
                  Nhấn biểu tượng Chia sẻ{' '}
                  <span className="ios-badge">
                    <Share size={13} /> Chia sẻ
                  </span>
                </div>
                <div className="ios-step-desc">
                  Nhấn nút chia sẻ ở thanh công cụ dưới đáy trình duyệt Safari.
                </div>
              </div>
            </div>

            <div className="ios-step-item">
              <div className="ios-step-number">2</div>
              <div className="ios-step-content">
                <div className="ios-step-title">
                  Chọn{' '}
                  <span className="ios-badge">
                    <PlusSquare size={13} /> Thêm vào MH chính
                  </span>
                </div>
                <div className="ios-step-desc">
                  Cuộn xuống danh sách tùy chọn và chọn "Thêm vào MH chính" (Add to Home Screen).
                </div>
              </div>
            </div>

            <div className="ios-step-item">
              <div className="ios-step-number">3</div>
              <div className="ios-step-content">
                <div className="ios-step-title">
                  Mở ứng dụng từ Màn hình chính{' '}
                  <span className="ios-badge">
                    <Smartphone size={13} /> Nexo
                  </span>
                </div>
                <div className="ios-step-desc">
                  Mở Nexo từ icon trên màn hình chính và bật thông báo để nhận cảnh báo chi tiêu &
                  ngân sách.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ios-push-modal-footer">
          <button type="button" className="btn btn-primary ios-primary-btn" onClick={onClose}>
            <Check size={16} /> Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
