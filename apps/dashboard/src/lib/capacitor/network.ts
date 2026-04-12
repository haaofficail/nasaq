import { isNative } from './platform';

export async function initNetworkListener(onStatusChange: (connected: boolean) => void) {
  if (!isNative) return;

  const { Network } = await import('@capacitor/network');

  const status = await Network.getStatus();
  onStatusChange(status.connected);

  Network.addListener('networkStatusChange', (s) => {
    onStatusChange(s.connected);
  });
}
