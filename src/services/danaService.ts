import { DanaGatewayConfig, DanaPaymentSession, Bill, Customer, Voucher } from '../types';
import { DataService } from './dataService';
import { WhatsAppService } from './whatsappService';
import { RuijieService } from './ruijieService';
import { NotificationService } from './notificationService';

const STORAGE_KEY_DANA_CONFIG = 'anw_dana_config_v1';
const STORAGE_KEY_DANA_SESSIONS = 'anw_dana_sessions_v1';

export const initialDanaConfig: DanaGatewayConfig = {
  merchantId: 'MCH-ANUWANINET-8829',
  merchantName: 'AnuwaniNet Broadband & Voucher',
  clientId: 'dana_client_id_live_9918237',
  clientSecret: 'dana_sec_k9823101928301923',
  environment: 'sandbox',
  notificationUrl: 'https://ais-dev-agv7q3nso4fjfu4nqkfcvz-437876397957.asia-southeast1.run.app/api/dana/webhook',
  qrisStaticCode: '00020101021226670014ID.DANA.WWW01189360000000000000000215MCH-ANUWANINET5204581253033605802ID5910AnuwaniNet6007Jakarta6304A1B2',
  autoSettle: true,
  isActive: true
};

export class DanaService {
  static getConfig(): DanaGatewayConfig {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DANA_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return initialDanaConfig;
  }

  static saveConfig(config: DanaGatewayConfig) {
    localStorage.setItem(STORAGE_KEY_DANA_CONFIG, JSON.stringify(config));
    DataService.syncSystemSettingsToDatabase();
  }

  static getSessions(): DanaPaymentSession[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DANA_SESSIONS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  }

  static saveSessions(sessions: DanaPaymentSession[]) {
    localStorage.setItem(STORAGE_KEY_DANA_SESSIONS, JSON.stringify(sessions));
  }

  // 1. Create DANA Payment Session (For Bill or Voucher)
  static createPaymentSession(params: {
    itemType: 'bill' | 'voucher';
    itemTitle: string;
    itemRefId: string;
    amount: number;
    customerName: string;
    customerPhone: string;
  }): DanaPaymentSession {
    const orderId = `DANA-ANW-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const session: DanaPaymentSession = {
      id: 'sess-' + Date.now(),
      orderId,
      amount: params.amount,
      itemType: params.itemType,
      itemTitle: params.itemTitle,
      itemRefId: params.itemRefId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      status: 'pending',
      paymentUrl: `https://m.dana.id/d/checkout?orderId=${orderId}&amount=${params.amount}`,
      deepLink: `dana://checkout?orderId=${orderId}&merchantId=MCH-ANUWANINET`,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DANA-PAY-${orderId}-${params.amount}`,
      createdAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    };

    const sessions = this.getSessions();
    sessions.unshift(session);
    this.saveSessions(sessions);

    return session;
  }

  // 2. Process DANA Webhook / Settle Payment (Simulated Callback & Real-Time execution)
  static settleDanaPayment(orderId: string, danaPhone: string = '081298765432'): {
    success: boolean;
    session: DanaPaymentSession | null;
    message: string;
  } {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.orderId === orderId);

    if (!session) {
      return { success: false, session: null, message: 'Sesi pembayaran DANA tidak ditemukan' };
    }

    if (session.status === 'success') {
      return { success: true, session, message: 'Pembayaran DANA sudah berstatus sukses' };
    }

    const paidAt = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    session.status = 'success';
    session.paidAt = paidAt;

    // Handle BILL payment
    if (session.itemType === 'bill') {
      const bills = DataService.getBills();
      const targetBill = bills.find(b => b.id === session.itemRefId || b.billNumber === session.itemRefId);

      if (targetBill) {
        targetBill.status = 'paid';
        targetBill.paidAt = paidAt;
        targetBill.paymentMethod = 'dana';
        targetBill.transactionRef = session.orderId;
        DataService.updateBill(targetBill);

        // Record real-time transaction
        DataService.addTransaction({
          id: 'trx-dana-' + Date.now(),
          invoiceNumber: 'TRX-DANA-' + Date.now().toString().slice(-6),
          customerId: targetBill.customerId,
          customerName: targetBill.customerName,
          type: 'tagihan',
          category: 'income',
          amount: targetBill.amount,
          date: paidAt,
          paymentMethod: 'dana',
          status: 'completed',
          notes: `Pembayaran via DANA E-Wallet (${danaPhone}) Order: ${session.orderId}`,
          whatsappNotificationSent: true,
          danaTransactionId: session.orderId
        });

        // Log to Notification Center
        NotificationService.logPaymentReceived({
          billNumber: targetBill.billNumber,
          customerName: targetBill.customerName,
          amount: targetBill.amount,
          paymentMethod: 'DANA E-Wallet & QRIS',
          transactionId: session.orderId
        });

        // Check if customer was isolated on Ruijie -> Auto-Unblock
        const customers = DataService.getCustomers();
        const cust = customers.find(c => c.id === targetBill.customerId);
        if (cust && cust.status === 'isolated') {
          RuijieService.restoreCustomer(cust, 'Auto-buka isolir Ruijie setelah pembayaran DANA Gateway terverifikasi');
        }

        // Send WhatsApp confirmation
        const waMsg = `✅ *PEMBAYARAN DANA BERHASIL DIKONFIRMASI*\n` +
          `--------------------------------------\n` +
          `Pelanggan: *${targetBill.customerName}*\n` +
          `No. Tagihan: *${targetBill.billNumber}*\n` +
          `Periode: *${targetBill.period}*\n` +
          `Nominal: *${WhatsAppService.formatRupiah(targetBill.amount)}*\n` +
          `Metode: *DANA E-WALLET / QRIS*\n` +
          `Order Ref: *${session.orderId}*\n` +
          `Waktu: *${paidAt}*\n` +
          `--------------------------------------\n` +
          `Layanan internet AnuwaniNet Anda AKTIF NORMAL. Terima kasih!`;
        
        WhatsAppService.sendAutomatedNotification(session.customerPhone, session.customerName, 'bukti_bayar', waMsg);
      }
    } 
    // Handle VOUCHER payment (via WhatsApp Bot or direct)
    else if (session.itemType === 'voucher') {
      const allVouchers = DataService.getVouchers();
      // Generate or allocate voucher
      const prefix = session.amount >= 20000 ? '25K' : session.amount >= 5000 ? '5K' : '3K';
      const durationHours = session.amount >= 20000 ? 168 : session.amount >= 5000 ? 24 : 3;
      const code = `ANW-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      const password = `${Math.floor(100 + Math.random() * 900)}`;

      const newVoucher: Voucher = {
        id: 'vch-' + Date.now(),
        code,
        password,
        packageId: session.itemRefId || 'pkg-v2',
        packageName: session.itemTitle,
        durationHours,
        price: session.amount,
        status: 'used',
        generatedAt: new Date().toISOString(),
        usedAt: paidAt,
        buyerPhone: session.customerPhone,
        buyerName: session.customerName,
        ruijieSynced: true
      };

      DataService.addVouchers([newVoucher]);
      session.voucherCode = code;
      session.voucherPassword = password;

      // Record transaction
      DataService.addTransaction({
        id: 'trx-dana-vch-' + Date.now(),
        invoiceNumber: 'VCH-DANA-' + Date.now().toString().slice(-6),
        customerName: session.customerName,
        type: 'voucher',
        category: 'income',
        amount: session.amount,
        date: paidAt,
        paymentMethod: 'dana',
        status: 'completed',
        notes: `Beli Voucher Hotspot via DANA Payment Gateway (${session.itemTitle})`,
        whatsappNotificationSent: true,
        danaTransactionId: session.orderId
      });

      // Log to Notification Center
      NotificationService.addNotification({
        title: 'Pembelian Voucher DANA Berhasil',
        message: `Voucher ${session.itemTitle} an. ${session.customerName} senilai Rp ${session.amount.toLocaleString('id-ID')} lunas diverifikasi via DANA (Kode: ${code}).`,
        type: 'payment_received',
        level: 'success',
        metadata: {
          customerName: session.customerName,
          amount: session.amount,
          paymentMethod: 'DANA E-Wallet Gateway',
          transactionId: session.orderId
        }
      });

      // Send WhatsApp with Voucher Code
      const waMsg = `🎉 *PEMBAYARAN DANA SUKSES - KODE VOUCHER ANDA*\n` +
        `--------------------------------------\n` +
        `Paket: *${session.itemTitle}*\n` +
        `Durasi: *${durationHours} Jam*\n` +
        `Nominal: *${WhatsAppService.formatRupiah(session.amount)}* (LUNAS via DANA)\n\n` +
        `*LOGIN HOTSPOT RUIJIE:*\n` +
        `SSID: *@AnuwaniNet-Hotspot*\n` +
        `Username: *${code}*\n` +
        `Password: *${password}*\n` +
        `--------------------------------------\n` +
        `Buka browser Anda dan masukkan username/password di atas. Selamat menikmati internet cepat AnuwaniNet!`;

      WhatsAppService.sendAutomatedNotification(session.customerPhone, session.customerName, 'voucher_delivery', waMsg);
    }

    this.saveSessions(sessions);

    return {
      success: true,
      session,
      message: `Pembayaran DANA ${session.orderId} berhasil diverifikasi!`
    };
  }
}
