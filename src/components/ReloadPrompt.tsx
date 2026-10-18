import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { PWA_TOAST } from './ui';

const ReloadPrompt: React.FC = () => {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const handleDirty = (event: Event) => setDirty(Boolean((event as CustomEvent).detail));
    window.addEventListener('nexo-form-dirty', handleDirty);
    return () => window.removeEventListener('nexo-form-dirty', handleDirty);
  }, []);
  const {
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
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className={PWA_TOAST} role="alert">
      <div className="text-[0.9rem] text-main">
        <span>Có phiên bản mới. Lưu hoặc đóng biểu mẫu trước khi cập nhật.</span>
      </div>
      <div className="flex gap-2">
        {needRefresh && (
          <button
            className="min-h-11 cursor-pointer rounded-sm border-none bg-primary px-[0.8rem] py-[0.4rem] font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50"
            disabled={dirty}
            onClick={() => updateServiceWorker(true)}
          >
            Tải lại
          </button>
        )}
        <button
          className="min-h-11 cursor-pointer rounded-sm border border-line bg-input px-[0.8rem] py-[0.4rem] text-muted"
          onClick={close}
        >
          Đóng
        </button>
      </div>
    </div>
  );
};

export default ReloadPrompt;
