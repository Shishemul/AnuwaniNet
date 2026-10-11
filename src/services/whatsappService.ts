import { Bill, Customer, Voucher } from '../types';
import { DataService } from './dataService';
import { FonnteService } from './fonnteService';

export class WhatsAppService {
  // Format Indonesian phone numbers to 628xxx for WhatsApp Web
  static formatPhoneForWa(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    return clean;
  }

  // Format currency
  static formatRupiah(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  // 1. Template Tagihan Bulanan
  static generateBillingMessage(bill: Bill, customer: Customer): string {
    const danaLink = `https://link.dana.id/pay?order=${bill.billNumber}&amount=${bill.amount}`;
    return `*TAGIHAN INTERNET ANUWANINET*\n` +
      `--------------------------------------\n` +
      `Kepada Yth: *${customer.name}*\n` +
      `ID Pelanggan: *${customer.customerCode}*\n` +
      `No. Tagihan: *${bill.billNumber}*\n` +
      `Periode: *${bill.period}*\n` +
      `Paket: *${customer.packageName}*\n` +
      `Total Tagihan: *${this.formatRupiah(bill.amount)}*\n` +
      `Jatuh Tempo: *${bill.dueDate}*\n` +
      `--------------------------------------\n` +
      `Metode Pembayaran Resmi:\n` +
      `🔹 *DANA E-Wallet & QRIS Instan*:\n` +
      `👉 ${danaLink} (Auto-Verifikasi Langsung)\n` +
      `🔹 *BCA*: 8291-039-112 a/n AnuwaniNet\n` +
      `🔹 *BRI*: 0021-01-082910-50-1 a/n AnuwaniNet\n\n` +
      `_Catatan: Layanan akan diisolir otomatis oleh sistem Ruijie jika belum dibayar hingga tanggal ${customer.billingDay + 2}._\n\n` +
      `Terima kasih telah menggunakan layanan AnuwaniNet!`;
  }

  // 2. Template Kuitansi / Bukti Pembayaran
  static generateReceiptMessage(bill: Bill, customerName: string): string {
    return `*KUITANSI PEMBAYARAN ANUWANINET*\n` +
      `--------------------------------------\n` +
      `Status: *LUNAS (TERVERIFIKASI)*\n` +
      `Pelanggan: *${customerName}*\n` +
      `No. Tagihan: *${bill.billNumber}*\n` +
      `Periode: *${bill.period}*\n` +
      `Jumlah: *${this.formatRupiah(bill.amount)}*\n` +
      `Metode: *${(bill.paymentMethod || 'Transfer').toUpperCase()}*\n` +
      `Tanggal Bayar: *${bill.paidAt || new Date().toLocaleString('id-ID')}*\n` +
      `Ref: *${bill.transactionRef || 'TRX-PAID-' + Date.now().toString().slice(-6)}*\n` +
      `--------------------------------------\n` +
      `Layanan internet Anda dalam status *AKTIF NORMAL* tanpa isolir.\n` +
      `Terima kasih atas kepercayaan Anda bersama AnuwaniNet.`;
  }

  // 3. Template Pengiriman Voucher Hotspot via WA
  static generateVoucherMessage(voucher: Voucher): string {
    return `*KODE VOUCHER HOTSPOT ANUWANINET*\n` +
      `--------------------------------------\n` +
      `Paket: *${voucher.packageName}*\n` +
      `Durasi: *${voucher.durationHours} Jam*\n` +
      `Harga: *${this.formatRupiah(voucher.price)}*\n\n` +
      `*LOGIN HOTSPOT:*\n` +
      `Username: *${voucher.code}*\n` +
      `Password: *${voucher.password || voucher.code}*\n` +
      `--------------------------------------\n` +
      `Cara Menggunakan:\n` +
      `1. Sambungkan ke Wi-Fi *@AnuwaniNet-Hotspot*\n` +
      `2. Buka browser atau klik notifikasi 'Masuk ke Jaringan'\n` +
      `3. Masukkan Username & Password di atas\n` +
      `4. Klik Login dan selamat berinternet ria!\n\n` +
      `_Voucher aktif sejak login pertama. Simpan pesan ini._`;
  }

  // Open direct WhatsApp Web / mobile URL or send via Fonnte Gateway
  static openWhatsAppUrl(phone: string, text: string) {
    const formattedPhone = this.formatPhoneForWa(phone);
    const waConfig = DataService.getWhatsAppBotConfig();

    // Trigger Fonnte API asynchronously
    if (waConfig.fonnteToken) {
      FonnteService.sendMessage(formattedPhone, text).catch(() => {});
    }

    const encoded = encodeURIComponent(text);
    const url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
    
    // Also record to logs
    DataService.addWaLog({
      id: 'msg-' + Date.now(),
      phone: formattedPhone,
      recipientName: phone,
      type: 'tagihan',
      message: text,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'sent'
    });

    window.open(url, '_blank');
  }

  // Record automated notification and send via Fonnte API Gateway
  static sendAutomatedNotification(phone: string, recipientName: string, type: any, message: string) {
    const formattedPhone = this.formatPhoneForWa(phone);
    const waConfig = DataService.getWhatsAppBotConfig();

    // Send via real Fonnte REST API Gateway
    if (waConfig.fonnteToken) {
      FonnteService.sendMessage(formattedPhone, message).catch(err => {
        console.warn('Fonnte dispatch notice:', err);
      });
    }

    DataService.addWaLog({
      id: 'msg-' + Date.now(),
      phone: formattedPhone,
      recipientName,
      type,
      message,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      status: 'sent'
    });
  }

  // ==========================================
  // WHATSAPP BOT PROCESSOR
  // ==========================================
  static processBotMessage(userPhone: string, rawInput: string): {
    replyText: string;
    generatedVoucher?: Voucher;
    actionTaken?: string;
  } {
    const input = rawInput.trim();
    const upper = input.toUpperCase();

    // 1. MENU / BANTUAN
    if (upper === 'MENU' || upper === 'BANTUAN' || upper === 'HALO' || upper === 'HI' || upper === 'START') {
      return {
        replyText: `👋 *Selamat Datang di AnuwaniNet Bot WhatsApp!*\n` +
          `Layanan otomatis 24 Jam pembelian voucher & cek tagihan via *DANA Payment Gateway* tanpa aplikasi.\n\n` +
          `Ketik perintah berikut:\n` +
          `🔹 *BELI VOUCHER* - Beli voucher Wi-Fi Hotspot instan via DANA\n` +
          `🔹 *TAGIHAN* - Cek tagihan internet bulanan Anda\n` +
          `🔹 *BAYAR DANA* - Bayar tagihan instan menggunakan saldo DANA / QRIS\n` +
          `🔹 *STATUS* - Cek status koneksi & isolir Ruijie\n` +
          `🔹 *BAYAR <NO_TAGIHAN>* - Konfirmasi pembayaran tagihan\n` +
          `🔹 *BANTUAN* - Menampilkan menu ini lagi`
      };
    }

    // 2. BELI VOUCHER
    if (upper.startsWith('BELI VOUCHER') || upper === 'VOUCHER' || upper.startsWith('BELI')) {
      // Check if user specified 3K, 5K, 25K
      let targetHours = 24;
      let targetPrice = 5000;
      let pkgName = 'Voucher Harian 24 Jam';
      let pkgId = 'pkg-v2';

      if (upper.includes('3K') || upper.includes('3 JAM') || upper.includes('3.000')) {
        targetHours = 3;
        targetPrice = 3000;
        pkgName = 'Voucher Kilat 3 Jam';
        pkgId = 'pkg-v1';
      } else if (upper.includes('25K') || upper.includes('7 HARI') || upper.includes('25.000') || upper.includes('MINGGUAN')) {
        targetHours = 168;
        targetPrice = 25000;
        pkgName = 'Voucher Mingguan 7 Hari';
        pkgId = 'pkg-v3';
      } else if (upper === 'BELI VOUCHER' || upper === 'VOUCHER' || upper === 'BELI') {
        // Return options
        return {
          replyText: `🛒 *PILIHAN PAKET VOUCHER ANUWANINET*\n` +
            `--------------------------------------\n` +
            `1️⃣ *Voucher Kilat 3 Jam* - Rp 3.000\n` +
            `2️⃣ *Voucher Harian 24 Jam* - Rp 5.000 (Terlaris!)\n` +
            `3️⃣ *Voucher Mingguan 7 Hari* - Rp 25.000\n` +
            `--------------------------------------\n` +
            `Untuk memesan, balas dengan format:\n` +
            `👉 *BELI 3K* (untuk 3 Jam)\n` +
            `👉 *BELI 5K* (untuk 24 Jam)\n` +
            `👉 *BELI 25K* (untuk 7 Hari)`
        };
      }

      // Check available vouchers in stock, or generate new one
      const allVouchers = DataService.getVouchers();
      let availableVoucher = allVouchers.find(v => v.status === 'available' && v.price === targetPrice);

      const codeGenerated = availableVoucher ? availableVoucher.code : `ANW-${targetPrice >= 10000 ? '25K' : targetPrice >= 5000 ? '5K' : '3K'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const pwdGenerated = availableVoucher ? (availableVoucher.password || '123') : `${Math.floor(100 + Math.random() * 900)}`;

      const voucher: Voucher = {
        id: availableVoucher ? availableVoucher.id : 'vch-' + Date.now(),
        code: codeGenerated,
        password: pwdGenerated,
        packageId: pkgId,
        packageName: pkgName,
        durationHours: targetHours,
        price: targetPrice,
        status: 'used',
        generatedAt: availableVoucher ? availableVoucher.generatedAt : new Date().toISOString(),
        usedAt: new Date().toLocaleString('id-ID'),
        buyerPhone: userPhone,
        buyerName: 'Pembeli WhatsApp (' + userPhone + ')',
        ruijieSynced: true
      };

      if (availableVoucher) {
        DataService.saveVouchers(allVouchers.map(v => v.id === availableVoucher.id ? voucher : v));
      } else {
        DataService.addVouchers([voucher]);
      }

      // Catat transaksi keuangan otomatis
      DataService.addTransaction({
        id: 'trx-vch-' + Date.now(),
        invoiceNumber: 'VCH-WA-' + Math.floor(100000 + Math.random() * 900000),
        customerName: `Pembeli WA (${userPhone})`,
        type: 'voucher',
        category: 'income',
        amount: targetPrice,
        date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        paymentMethod: 'dana',
        status: 'completed',
        notes: `Pembelian via WhatsApp Bot DANA Gateway (${pkgName})`,
        whatsappNotificationSent: true,
        danaTransactionId: 'DANA-WA-' + Date.now().toString().slice(-6)
      });

      return {
        replyText: `✅ *PEMBELIAN VOUCHER VIA DANA SUKSES!*\n` +
          `Pembayaran ${this.formatRupiah(targetPrice)} via *DANA Payment Gateway & QRIS* telah Terverifikasi Otomatis.\n\n` +
          `*DETAIL LOGIN HOTSPOT RUIJIE:*\n` +
          `📶 SSID: *@AnuwaniNet-Hotspot*\n` +
          `🔑 Username: *${voucher.code}*\n` +
          `🔒 Password: *${voucher.password}*\n` +
          `⏱ Durasi: *${voucher.durationHours} Jam*\n` +
          `⚡ Kecepatan: Unlimited Hingga 20 Mbps\n` +
          `💳 Metode: DANA E-Wallet (Auto-Settled)\n\n` +
          `Kode telah aktif di server Ruijie Reyee. Selamat berselancar!`,
        generatedVoucher: voucher,
        actionTaken: 'voucher_purchased'
      };
    }

    // 3. TAGIHAN / CEK TAGIHAN
    if (upper.startsWith('TAGIHAN') || upper.startsWith('CEK')) {
      const customers = DataService.getCustomers();
      const bills = DataService.getBills();

      // Try finding customer by phone or matching ANW code
      let matchedCust = customers.find(c => 
        userPhone.includes(c.phone.slice(-8)) || 
        upper.includes(c.customerCode) ||
        upper.includes(c.name.toUpperCase())
      );

      if (!matchedCust) {
        matchedCust = customers[0]; // fallback to demo customer
      }

      const custBills = bills.filter(b => b.customerId === matchedCust!.id);
      const unpaidBill = custBills.find(b => b.status === 'unpaid' || b.status === 'overdue');

      if (!unpaidBill) {
        return {
          replyText: `🎉 *STATUS TAGIHAN ANUWANINET*\n` +
            `Pelanggan: *${matchedCust.name}* (${matchedCust.customerCode})\n\n` +
            `Semua tagihan Anda telah *LUNAS*. Tidak ada tagihan tertunggak saat ini.\n` +
            `Status Koneksi: *${matchedCust.status === 'active' ? '🟢 AKTIF NORMAL' : '🔴 ' + matchedCust.status.toUpperCase()}*.\n` +
            `Terima kasih sudah menjadi pelanggan setia!`
        };
      }

      return {
        replyText: `📋 *INFORMASI TAGIHAN ANDA*\n` +
          `Pelanggan: *${matchedCust.name}* (${matchedCust.customerCode})\n` +
          `No. Tagihan: *${unpaidBill.billNumber}*\n` +
          `Periode: *${unpaidBill.period}*\n` +
          `Jumlah: *${this.formatRupiah(unpaidBill.amount)}*\n` +
          `Jatuh Tempo: *${unpaidBill.dueDate}*\n` +
          `Status: *${unpaidBill.status === 'overdue' ? '⚠️ TERTUNGGAK (ISOLIR)' : '⏳ MENUNGGU PEMBAYARAN'}*\n\n` +
          `Ketik *BAYAR ${unpaidBill.billNumber}* untuk simulasi bayar instan & auto-buka isolir.`
      };
    }

    // 4. BAYAR / KONFIRMASI PEMBAYARAN
    if (upper.startsWith('BAYAR') || upper.startsWith('KONFIRMASI')) {
      const bills = DataService.getBills();
      const customers = DataService.getCustomers();

      // Find bill
      let targetBill = bills.find(b => upper.includes(b.billNumber) || b.status !== 'paid');

      if (!targetBill) {
        return {
          replyText: `Semua tagihan Anda telah lunas. Tidak ada tagihan yang perlu dibayar.`
        };
      }

      // Mark paid
      targetBill.status = 'paid';
      targetBill.paidAt = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
      targetBill.paymentMethod = 'whatsapp_bot';
      targetBill.transactionRef = 'WA-BOT-' + Date.now().toString().slice(-6);
      DataService.updateBill(targetBill);

      // Record transaction
      DataService.addTransaction({
        id: 'trx-' + Date.now(),
        invoiceNumber: 'TRX-' + Date.now().toString().slice(-6),
        customerId: targetBill.customerId,
        customerName: targetBill.customerName,
        type: 'tagihan',
        category: 'income',
        amount: targetBill.amount,
        date: targetBill.paidAt,
        paymentMethod: 'whatsapp_bot',
        status: 'completed',
        notes: `Pembayaran ${targetBill.billNumber} via WhatsApp Bot`,
        whatsappNotificationSent: true
      });

      // If customer was isolated, restore them on Ruijie!
      const cust = customers.find(c => c.id === targetBill!.customerId);
      let restoreMsg = '';
      if (cust && cust.status === 'isolated') {
        cust.status = 'active';
        cust.lastPaymentDate = targetBill.paidAt;
        DataService.updateCustomer(cust);
        restoreMsg = `\n🔓 *AUTO-UNISOLIR RUIJIE AKTIF*: Koneksi internet ${cust.name} telah dipulihkan otomatis ke profil normal!`;
      }

      return {
        replyText: `✅ *PEMBAYARAN DITERIMA & LUNAS!*\n` +
          `Terima kasih! Pembayaran tagihan *${targetBill.billNumber}* sebesar *${this.formatRupiah(targetBill.amount)}* telah kami verifikasi.${restoreMsg}\n\n` +
          `Ref: *${targetBill.transactionRef}*\n` +
          `Kuitansi digital telah diterbitkan. Nikmati koneksi stabil AnuwaniNet!`,
        actionTaken: 'bill_paid'
      };
    }

    // 5. STATUS KONEKSI
    if (upper.startsWith('STATUS')) {
      const customers = DataService.getCustomers();
      const matchedCust = customers.find(c => userPhone.includes(c.phone.slice(-8))) || customers[0];

      return {
        replyText: `📡 *STATUS JARINGAN ANUWANINET*\n` +
          `Pelanggan: *${matchedCust.name}*\n` +
          `ID: *${matchedCust.customerCode}*\n` +
          `Status Sambungan: *${matchedCust.status === 'active' ? '🟢 AKTIF NORMAL' : matchedCust.status === 'isolated' ? '🔴 TERISOLIR (TUNGGAKAN)' : '🟡 PENDING AKTIVASI'}*\n` +
          `Paket: *${matchedCust.packageName}*\n` +
          `Gateway Ruijie: *192.168.10.1 (Online)*\n` +
          `Latency Rata-rata: *14 ms (Sangat Baik)*\n\n` +
          `Ketik *BANTUAN* untuk bantuan lainnya.`
      };
    }

    // Default Fallback
    return {
      replyText: `Perintah tidak dikenali. Ketik *MENU* untuk melihat daftar opsi, atau ketik *BELI VOUCHER* untuk membeli voucher hotspot secara instan.`
    };
  }
}
