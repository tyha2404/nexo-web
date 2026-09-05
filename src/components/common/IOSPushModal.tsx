import { Bell, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import React from 'react';
import './IOSPushModal.css';

interface IOSPushModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSPushModal: React.FC<IOSPushModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="ios-push-modal-overlay" onClick={onClose}>
      <div className="ios-push-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ios-push-modal-header">
          <div className="ios-push-modal-title">
            <div className="ios-icon-badge">
              <Bell size={20} />
            </div>
            <h3>Bật Thông Báo Trên iPhone</h3>
          </div>
          <button className="ios-push-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="ios-push-modal-body">
          <div className="ios-push-info-banner">
            <p>
              Apple yêu cầu ứng dụng Nexo phải được thêm vào{' '}
              <strong>Màn hình chính (Home Screen)</strong> trên iOS 16.4+ để nhận được thông báo
              đẩy.
            </p>
          </div>

          <div className="ios-steps-list">
            <div className="ios-step-item">
              <div className="ios-step-number">1</div>
              <div className="ios-step-content">
                <div className="ios-step-title">
                  Nhấn biểu tượng Chia sẻ{' '}
                  <span className="ios-badge">
                    <Share size={14} /> Chia sẻ
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
                    <PlusSquare size={14} /> Thêm vào MH chính
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
                    <Smartphone size={14} /> Nexo
                  </span>
                </div>
                <div className="ios-step-desc">
                  Mở Nexo từ icon trên màn hình chính và bật thông báo để nhận cảnh báo giao dịch &
                  ngân sách.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="ios-push-modal-footer">
          <button className="ios-primary-btn" onClick={onClose}>
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
