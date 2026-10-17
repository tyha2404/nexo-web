import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './ReloadPrompt.css';

const ReloadPrompt: React.FC = () => {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const handleDirty = (event: Event) => setDirty(Boolean((event as CustomEvent).detail));
    window.addEventListener('nexo-form-dirty', handleDirty);
    return () => window.removeEventListener('nexo-form-dirty', handleDirty);
  }, []);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="pwa-toast" role="alert">
      <div className="pwa-message">
        {offlineReady ? (
          <span>
            Đã lưu giao diện để mở ngoại tuyến. Bạn có thể xem dữ liệu đã tải; giao dịch mới sẽ tự
            đồng bộ khi có mạng.
          </span>
        ) : (
          <span>Có phiên bản mới. Lưu hoặc đóng biểu mẫu trước khi cập nhật.</span>
        )}
      </div>
      <div className="pwa-actions">
        {needRefresh && (
          <button
            className="pwa-button-reload"
            disabled={dirty}
            onClick={() => updateServiceWorker(true)}
          >
            Tải lại
          </button>
        )}
        <button className="pwa-button-close" onClick={close}>
          Đóng
        </button>
      </div>
    </div>
  );
};

export default ReloadPrompt;
