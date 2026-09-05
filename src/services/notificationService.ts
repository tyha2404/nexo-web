import { request } from './client';

export interface VapidPublicKeyResponse {
  publicKey: string;
}

export interface SubscribePushRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  device_type?: string;
  device_name?: string;
}

export interface TestPushRequest {
  title?: string;
  body?: string;
  url?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const notificationService = {
  isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  },

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  },

  isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  async getVapidPublicKey(): Promise<string> {
    const res = await request<VapidPublicKeyResponse>('/notifications/vapid-public-key', {
      method: 'GET',
    });
    return res.publicKey;
  },

  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  },

  async subscribe(): Promise<PushSubscription> {
    if (!this.isPushSupported()) {
      throw new Error('Trình duyệt hoặc thiết bị này không hỗ trợ Web Push Notifications.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Quyền nhận thông báo đã bị từ chối.');
    }

    const publicKey = await this.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('Không thể lấy VAPID Public Key từ server.');
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as ArrayBuffer,
      });
    }

    const subscriptionJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subscriptionJson.keys?.p256dh;
    const auth = subscriptionJson.keys?.auth;

    if (!p256dh || !auth) {
      throw new Error('Không thể đọc mã bảo mật push subscription từ trình duyệt.');
    }

    let deviceType = 'web';
    if (this.isIOS()) {
      deviceType = 'ios';
    } else if (/android/.test(navigator.userAgent.toLowerCase())) {
      deviceType = 'android';
    }

    await request('/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint,
        keys: {
          p256dh,
          auth,
        },
        device_type: deviceType,
        device_name: navigator.userAgent,
      } as SubscribePushRequest),
    });

    return subscription;
  },

  async unsubscribe(): Promise<void> {
    if (!this.isPushSupported()) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await request('/notifications/unsubscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });
      await subscription.unsubscribe();
    }
  },

  async sendTestPush(payload?: TestPushRequest): Promise<void> {
    await request('/notifications/test', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};
