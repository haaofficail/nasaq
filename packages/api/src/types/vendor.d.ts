// Vendor module declarations for optional runtime dependencies

declare module "web-push" {
  interface PushSubscription {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  interface SendResult {
    statusCode: number;
    body: string;
    headers: Record<string, string>;
  }
  function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  function sendNotification(
    subscription: PushSubscription,
    payload?: string | Buffer,
    options?: Record<string, unknown>
  ): Promise<SendResult>;
  function generateVAPIDKeys(): { publicKey: string; privateKey: string };
}

declare module "@whiskeysockets/baileys" {
  const makeWASocket: (...args: any[]) => any;
  const DisconnectReason: Record<string, number>;
  const fetchLatestBaileysVersion: () => Promise<{ version: number[] }>;
  const useMultiFileAuthState: (dir: string) => Promise<{ state: any; saveCreds: () => Promise<void> }>;
  const Browsers: Record<string, (...args: any[]) => any[]>;
  export { makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState, Browsers };
  // CJS default: may resolve as the function or the full module exports depending on runtime
  const _default: ((...args: any[]) => any) | { makeWASocket: (...args: any[]) => any; default: (...args: any[]) => any; [key: string]: any };
  export default _default;
}

declare module "qrcode" {
  function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
  export { toDataURL };
}

declare module "@hapi/boom" {
  class Boom extends Error {
    output: { statusCode: number };
  }
  export { Boom };
}
