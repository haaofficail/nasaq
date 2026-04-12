import { isNative } from './platform';
import { api } from '../api';

let FirebaseMessaging: any = null;

export async function initNotifications() {
  if (!isNative) return;

  const mod = await import('@capacitor-firebase/messaging');
  FirebaseMessaging = mod.FirebaseMessaging;

  const { receive } = await FirebaseMessaging.requestPermissions();
  if (receive !== 'granted') return;

  const { token } = await FirebaseMessaging.getToken();
  if (token) await sendTokenToServer(token);

  FirebaseMessaging.addListener('notificationReceived', (notification: any) => {
    handleNotification(notification);
  });

  FirebaseMessaging.addListener('notificationActionPerformed', (action: any) => {
    handleNotificationTap(action);
  });
}

async function sendTokenToServer(token: string) {
  try {
    await api.post('/devices/register', { token, platform: 'fcm' });
  } catch {
    // non-fatal — device registration failure should not block the app
  }
}

function handleNotification(_notification: any) {
  // TODO: عرض إشعار داخل التطبيق
}

function handleNotificationTap(_action: any) {
  // TODO: توجيه المستخدم للصفحة المناسبة
}

export async function subscribeToTopic(topic: string) {
  if (!isNative || !FirebaseMessaging) return;
  await FirebaseMessaging.subscribeToTopic({ topic });
}

export async function unsubscribeFromTopic(topic: string) {
  if (!isNative || !FirebaseMessaging) return;
  await FirebaseMessaging.unsubscribeFromTopic({ topic });
}
