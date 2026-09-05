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

async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Trình duyệt không hỗ trợ Service Worker.');
  }

  // Check if existing registration is ready
  try {
    const regPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const readyReg = await Promise.race([regPromise, timeoutPromise]);
    if (readyReg) {
      return readyReg;
    }
  } catch (e) {
    console.warn('serviceWorker.ready wait error', e);
  }

  // If not ready yet (e.g. in dev mode or before SW activates), register directly
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return registration;
  } catch (err) {
    console.warn('Failed to register /sw.js, trying /sw-push.js fallback', err);
    return await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
  }
}

export const notificationService = {
  isIOS(): boolean {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    // Also detect modern iPad running desktop Safari
    const isIPadSafari = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOSDevice || isIPadSafari;
  },

  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isNavigatorStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    return isDisplayStandalone || isNavigatorStandalone;
  },

  isPushSupported(): boolean {
    if (typeof window === 'undefined') return false;
    // On iOS, Notification and PushManager only exist when in Standalone mode (added to Home Screen)
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
    try {
      const registration = await getOrRegisterServiceWorker();
      return await registration.pushManager.getSubscription();
    } catch {
      return null;
    }
  },

  async subscribe(): Promise<PushSubscription> {
    // Detailed check for iOS vs Non-iOS
    if (this.isIOS()) {
      if (!this.isStandalone()) {
        throw new Error('IOS_NEED_STANDALONE');
      }
      if (!window.isSecureContext) {
        throw new Error(
          'Apple yêu cầu trang web phải chạy qua giao thức bảo mật HTTPS để kích hoạt thông báo.'
        );
      }
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('Trình duyệt không hỗ trợ Service Worker.');
    }

    if (!('Notification' in window) || !('PushManager' in window)) {
      if (this.isIOS()) {
        throw new Error('IOS_NEED_STANDALONE');
      }
      throw new Error(
        'Trình duyệt của bạn hiện chưa hỗ trợ Web Push Notifications hoặc đang chặn quyền này.'
      );
    }

    // 1. Request permission first (Must be triggered during user gesture)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error(
        'Quyền nhận thông báo chưa được cấp (Bạn đã từ chối hoặc đóng thông báo hỏi quyền).'
      );
    }

    // 2. Fetch public key from backend
    const publicKey = await this.getVapidPublicKey();
    if (!publicKey) {
      throw new Error('Không thể lấy VAPID Public Key từ server.');
    }

    // 3. Obtain active ServiceWorkerRegistration
    const registration = await getOrRegisterServiceWorker();
    if (!registration) {
      throw new Error('Không thể khởi tạo Service Worker trên trình duyệt.');
    }

    let subscription = await registration.pushManager.getSubscription();

    // If an existing subscription is present, unsubscribe it first to guarantee
    // registration with the latest VAPID public key configured on backend
    if (subscription) {
      try {
        await subscription.unsubscribe();
      } catch (e) {
        console.warn('Failed to unsubscribe old push subscription', e);
      }
    }

    const convertedVapidKey = urlBase64ToUint8Array(publicKey);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey as unknown as ArrayBuffer,
    });

    const subscriptionJson = subscription.toJSON();
    const endpoint = subscription.endpoint;
    const p256dh = subscriptionJson.keys?.p256dh;
    const auth = subscriptionJson.keys?.auth;

    if (!p256dh || !auth) {
      throw new Error('Không thể đọc mã bảo mật push subscription từ thiết bị.');
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

    try {
      const registration = await getOrRegisterServiceWorker();
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
    } catch (err) {
      console.error('Unsubscribe error:', err);
      throw err;
    }
  },

  async sendTestPush(payload?: TestPushRequest): Promise<void> {
    await request('/notifications/test', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },
};
