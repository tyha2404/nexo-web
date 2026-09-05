import { Bell, BellOff, HelpCircle, Loader2, Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { notificationService } from '../../services/notificationService';
import { IOSPushModal } from './IOSPushModal';
import './NotificationToggle.css';

export const NotificationToggle: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  const handleToggle = async () => {
    // Check if iOS not standalone (Safari browser tab)
    if (notificationService.isIOS() && !notificationService.isStandalone()) {
      setShowIOSModal(true);
      setShowPopover(false);
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
        setShowPopover(false);
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
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        className={`notification-btn ${isSubscribed ? 'active' : ''}`}
        onClick={() => setShowPopover(!showPopover)}
        aria-label="Cài đặt thông báo"
        title="Thông báo đẩy"
      >
        <Bell size={18} />
      </button>

      {showPopover && (
        <>
          <div className="notification-panel-overlay" onClick={() => setShowPopover(false)} />
          <div className="notification-popover">
            <div className="notification-popover-title">
              <span>Thông báo đẩy</span>
              <span className={`notification-status-badge ${isSubscribed ? 'on' : 'off'}`}>
                {isSubscribed ? 'Đang bật' : 'Đang tắt'}
              </span>
            </div>

            <p className="notification-popover-desc">
              Nhận thông báo tức thì khi chi tiêu vượt hạn mức hoặc nhắc nhở tài chính quan trọng.
            </p>

            <div className="notification-popover-actions">
              <button
                className={`notification-action-btn ${isSubscribed ? 'danger' : 'primary'}`}
                onClick={handleToggle}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isSubscribed ? (
                  <>
                    <BellOff size={16} /> Tắt thông báo
                  </>
                ) : (
                  <>
                    <Bell size={16} /> Bật thông báo
                  </>
                )}
              </button>

              {isSubscribed && (
                <button
                  className="notification-action-btn secondary"
                  onClick={handleSendTest}
                  disabled={loading}
                >
                  <Send size={14} /> Gửi thử thông báo
                </button>
              )}

              {notificationService.isIOS() && (
                <button
                  className="notification-action-btn secondary"
                  onClick={() => {
                    setShowPopover(false);
                    setShowIOSModal(true);
                  }}
                >
                  <HelpCircle size={14} /> Hướng dẫn cho iPhone
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <IOSPushModal isOpen={showIOSModal} onClose={() => setShowIOSModal(false)} />
    </div>
  );
};
