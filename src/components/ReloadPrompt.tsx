import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt: React.FC = () => {
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
          <span>Ứng dụng đã sẵn sàng hoạt động ngoại tuyến</span>
        ) : (
          <span>Có nội dung mới, nhấp vào nút tải lại để cập nhật.</span>
        )}
      </div>
      <div className="pwa-actions">
        {needRefresh && (
          <button className="pwa-button-reload" onClick={() => updateServiceWorker(true)}>
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
