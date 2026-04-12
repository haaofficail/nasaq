import { isNative, platform } from './platform';
import { initNotifications } from './notifications';
import { initPrinter } from './printer';
import { initNetworkListener } from './network';

export async function initCapacitor() {
  if (!isNative) {
    return; // كل البلقنز محمية — الويب يعمل بدون أي تأثير
  }

  // Status Bar
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Dark });
  if (platform === 'android') {
    await StatusBar.setBackgroundColor({ color: '#fefcf9' });
  }

  // Keyboard
  const { Keyboard } = await import('@capacitor/keyboard');
  Keyboard.addListener('keyboardWillShow', () => {
    document.body.classList.add('keyboard-open');
  });
  Keyboard.addListener('keyboardWillHide', () => {
    document.body.classList.remove('keyboard-open');
  });

  // Push Notifications
  await initNotifications();

  // Printer
  await initPrinter();

  // Network
  await initNetworkListener((connected) => {
    document.body.classList.toggle('offline', !connected);
  });
}

export { isNative, platform, runOnNative } from './platform';
export { scanPrinters, connectPrinter, printReceipt, disconnectPrinter } from './printer';
export { subscribeToTopic, unsubscribeFromTopic } from './notifications';
