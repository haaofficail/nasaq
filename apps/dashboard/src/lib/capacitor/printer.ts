import { isNative } from './platform';

let ThermalPrinter: any = null;

export interface PrinterDevice {
  name: string;
  address: string;
}

export interface PrintReceiptOptions {
  storeName: string;
  invoiceNumber: string;
  date: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  vatAmount: number;
  qrData: string; // بيانات ZATCA QR
}

export async function initPrinter() {
  if (!isNative) return;
  const mod = await import('capacitor-thermal-printer');
  ThermalPrinter = (mod as any).CapacitorThermalPrinter;
}

export async function scanPrinters(): Promise<PrinterDevice[]> {
  if (!ThermalPrinter) await initPrinter();
  if (!ThermalPrinter) return [];

  return new Promise((resolve) => {
    const devices: PrinterDevice[] = [];

    ThermalPrinter.addListener('discoverDevices', (discovered: any) => {
      devices.push(...(discovered.devices ?? []));
    });

    ThermalPrinter.startScan();

    setTimeout(() => {
      ThermalPrinter.stopScan();
      resolve(devices);
    }, 10_000);
  });
}

export async function connectPrinter(address: string): Promise<boolean> {
  if (!ThermalPrinter) await initPrinter();
  if (!ThermalPrinter) return false;
  const device = await ThermalPrinter.connect({ address });
  return device !== null;
}

export async function printReceipt(receipt: PrintReceiptOptions) {
  if (!ThermalPrinter) return;

  const builder = ThermalPrinter.begin();

  builder
    .align('center')
    .bold()
    .doubleWidth()
    .text(receipt.storeName + '\n')
    .clearFormatting()
    .align('center')
    .text('فاتورة ضريبية مبسطة\n')
    .text('━━━━━━━━━━━━━━━━━━━━━━\n')
    .align('right')
    .text('رقم الفاتورة: ' + receipt.invoiceNumber + '\n')
    .text('التاريخ: ' + receipt.date + '\n')
    .text('━━━━━━━━━━━━━━━━━━━━━━\n');

  for (const item of receipt.items) {
    builder
      .align('right')
      .text(item.name + '\n')
      .text(item.qty + ' × ' + item.price.toFixed(2) + ' = ' + (item.qty * item.price).toFixed(2) + ' ر.س\n');
  }

  builder
    .text('━━━━━━━━━━━━━━━━━━━━━━\n')
    .bold()
    .text('المجموع: ' + receipt.total.toFixed(2) + ' ر.س\n')
    .text('ضريبة القيمة المضافة: ' + receipt.vatAmount.toFixed(2) + ' ر.س\n')
    .clearFormatting()
    .text('━━━━━━━━━━━━━━━━━━━━━━\n')
    .align('center')
    .qr(receipt.qrData)
    .text('\n')
    .text('شكراً لزيارتكم\n')
    .text('\n\n\n')
    .cutPaper();

  await builder.write();
}

export async function disconnectPrinter() {
  if (!ThermalPrinter) return;
  await ThermalPrinter.disconnect();
}
