import { Bell, BellOff, HelpCircle, Loader2, Send, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { notificationService } from '../../services/notificationService';
import { IOSPushModal } from './IOSPushModal';
import './NotificationToggle.css';

export const NotificationToggle: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const checkSubscription = async () => {
    try {
      const sub = await notificationService.getExistingSubscription();
      const permission = notificationService.getPermissionState();
      if (sub && permission === 'granted') {
        setIsSubscribed(true);
        // Silently sync current subscription to backend to ensure DB is up to date
        notificationService.subscribe().catch((err) => {
          console.warn('Silent subscription sync warning:', err);
        });
      } else {
        setIsSubscribed(false);
      }
    } catch (e) {
      console.error('Failed to check push subscription', e);
    }
  };

  useEffect(() => {
    checkSubscription();
  }, []);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
      }
    };
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal]);

  const handleToggle = async () => {
    // Check if iOS not standalone (Safari browser tab)
    if (notificationService.isIOS() && !notificationService.isStandalone()) {
      setShowModal(false);
      setShowIOSModal(true);
      return;
    }

    setLoading(true);
    try {
      if (isSubscribed) {
        await notificationService.unsubscribe();
        setIsSubscribed(false);
        toast.info('Đã tắt nhận thông báo đẩy.');
      } else {
        await notificationService.subscribe();
        setIsSubscribed(true);
        toast.success('Bật thông báo đẩy thành công!');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      if (message === 'IOS_NEED_STANDALONE') {
        setShowModal(false);
        setShowIOSModal(true);
      } else {
        toast.error(message || 'Có lỗi xảy ra khi cài đặt thông báo');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    setLoading(true);
    try {
      await notificationService.sendTestPush({
        title: '🔔 Nexo Test Notification',
        body: 'Thông báo đẩy hoạt động hoàn hảo trên thiết bị của bạn!',
        url: '/',
      });
      toast.success('Đã gửi thông báo thử nghiệm!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể gửi thông báo thử';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="notification-toggle-wrapper" ref={containerRef}>
      <button
        type="button"
        className={`notification-btn ${isSubscribed ? 'active' : ''}`}
        onClick={() => setShowModal(!showModal)}
        aria-label="Cài đặt thông báo"
        title="Cài đặt thông báo"
      >
        <Bell size={18} />
        {isSubscribed && <span className="notification-indicator-dot" />}
      </button>

      {showModal && (
        <div
          className="modal-backdrop notification-modal-overlay"
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-content animate-scale-in notification-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-modal-title"
          >
            <div className="modal-header notification-modal-header">
              <div className="notification-modal-title-group">
                <div className="notification-modal-icon-badge">
                  <Bell size={18} />
                </div>
                <div>
                  <h3 id="notification-modal-title" className="notification-modal-title">
                    Thông báo đẩy
                  </h3>
                  <div className="notification-modal-status-wrap">
                    <span className={`notification-status-badge ${isSubscribed ? 'on' : 'off'}`}>
                      <span className="status-dot" />
                      {isSubscribed ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="close-btn notification-modal-close"
                onClick={() => setShowModal(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="notification-modal-body">
              <p className="notification-modal-desc">
                Nhận thông báo tức thì khi chi tiêu vượt hạn mức, nhắc nhở định kỳ và các sự kiện
                tài chính quan trọng.
              </p>

              <div className="notification-modal-actions">
                <button
                  type="button"
                  className={`btn notification-toggle-btn ${isSubscribed ? 'btn-danger-outline' : 'btn-primary'}`}
                  onClick={handleToggle}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isSubscribed ? (
                    <>
                      <BellOff size={16} /> Tắt nhận thông báo
                    </>
                  ) : (
                    <>
                      <Bell size={16} /> Bật nhận thông báo
                    </>
                  )}
                </button>

                {isSubscribed && (
                  <button
                    type="button"
                    className="btn btn-secondary notification-sub-btn"
                    onClick={handleSendTest}
                    disabled={loading}
                  >
                    <Send size={15} /> Gửi thử thông báo
                  </button>
                )}

                {notificationService.isIOS() && (
                  <button
                    type="button"
                    className="btn btn-secondary notification-sub-btn"
                    onClick={() => {
                      setShowModal(false);
                      setShowIOSModal(true);
                    }}
                  >
                    <HelpCircle size={15} /> Hướng dẫn thêm vào iPhone
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <IOSPushModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
    </div>
  );
};
