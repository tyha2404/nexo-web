import moment from 'moment';
import { useEffect, useState } from 'react';
import { useOfflineQueue } from '../../hooks';
import { invalidateRequestCache } from '../../services';

export function ConnectionStatus() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const pending = useOfflineQueue().length;
  useEffect(() => {
    const online = () => {
      setOffline(false);
    };
    const offline = () => setOffline(true);
    const stale = (event: Event) =>
      setSavedAt((event as CustomEvent<{ savedAt: number }>).detail.savedAt);
    const fresh = () => setSavedAt(null);
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    window.addEventListener('nexo-stale-data', stale);
    window.addEventListener('nexo-data-refreshed', fresh);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      window.removeEventListener('nexo-stale-data', stale);
      window.removeEventListener('nexo-data-refreshed', fresh);
    };
  }, []);
  if (!offline && !savedAt && !pending) return null;
  const pendingText = pending ? ` ${pending} giao dịch đang chờ đồng bộ.` : '';
  return (
    <div className="connection-status" role="status">
      {offline || savedAt ? (
        <span>
          {offline ? 'Đang ngoại tuyến.' : 'Kết nối chưa ổn định.'} Đang hiển thị dữ liệu đã lưu
          {savedAt ? ` lúc ${moment(savedAt).format('HH:mm DD/MM')}` : ''}. Giao dịch mới được lưu
          trên thiết bị và tự đồng bộ khi có mạng.{pendingText}
        </span>
      ) : (
        <span>Chờ đồng bộ: {pending} giao dịch chưa được gửi lên máy chủ.</span>
      )}
      {!offline && (
        <button
          className="btn btn-secondary"
          onClick={() => {
            // useOfflineQueueSync also flushes pending writes on 'nexo-reconnect'
            invalidateRequestCache('*');
            window.dispatchEvent(new Event('nexo-reconnect'));
          }}
        >
          {pending && !savedAt ? 'Đồng bộ ngay' : 'Tải lại dữ liệu'}
        </button>
      )}
    </div>
  );
}
