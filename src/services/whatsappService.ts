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

  // Dynamic Placeholder Replacer for WhatsApp Notification Templates
  static renderTemplate(templateText: string, data: {
    customer: Customer;
    bill?: Bill;
    customNote?: string;
    daysOverdue?: number;
  }): string {
    const { customer, bill, customNote } = data;
    const amountVal = bill ? bill.amount : customer.packagePrice;
    const amountFormatted = this.formatRupiah(amountVal);
    const invoiceNum = bill?.billNumber || `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-001`;
    const periodStr = bill?.period || new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
    const dueDateStr = bill?.dueDate || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(customer.billingDay || 20).padStart(2, '0')}`;
    const isolirDateStr = `${customer.billingDay + 2} ${periodStr}`;
    const danaLink = `https://link.dana.id/pay?order=${invoiceNum}&amount=${amountVal}`;

    const overdueDays = data.daysOverdue !== undefined
      ? data.daysOverdue
      : (bill && bill.dueDate ? Math.max(0, Math.ceil((Date.now() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24))) : 0);
    const overdueLabel = overdueDays > 0 ? `TERLAMBAT ${overdueDays} HARI` : 'MELEWATI BATAS JATUH TEMPO';

    const appSettings = DataService.getAppSettings();

    let result = templateText;
    const replacements: Record<string, string> = {
      // User-requested double curly-brace format
      '{{customer_name}}': customer.name,
      '{{bill_amount}}': amountFormatted,
      '{{due_date}}': dueDateStr,
      '{{customer_code}}': customer.customerCode,
      '{{customer_phone}}': customer.phone,
      '{{customer_address}}': customer.address || '-',
      '{{bill_number}}': invoiceNum,
      '{{period}}': periodStr,
      '{{package_name}}': customer.packageName,
      '{{package_price}}': this.formatRupiah(customer.packagePrice),
      '{{payment_link}}': danaLink,
      '{{days_overdue}}': String(overdueDays),
      '{{overdue_label}}': overdueLabel,
      '{{isolir_date}}': isolirDateStr,
      '{{status_koneksi}}': customer.status === 'active' ? 'AKTIF NORMAL' : customer.status === 'isolated' ? 'TERISOLIR' : 'PENDING',
      '{{app_name}}': appSettings.appName || 'AnuwaniNet',
      '{{bank_bca}}': appSettings.bcaAccount || '8291-039-112 a/n AnuwaniNet',
      '{{bank_bri}}': appSettings.briAccount || '0021-01-082910-50-1 a/n AnuwaniNet',
      '{{notes}}': customNote || '',
      '{{current_date}}': new Date().toLocaleDateString('id-ID', { dateStyle: 'long' }),

      // Single curly-brace format (Indonesian & English aliases)
      '{customer_name}': customer.name,
      '{bill_amount}': amountFormatted,
      '{due_date}': dueDateStr,
      '{customer_code}': customer.customerCode,
      '{customer_phone}': customer.phone,
      '{customer_address}': customer.address || '-',
      '{bill_number}': invoiceNum,
      '{period}': periodStr,
      '{package_name}': customer.packageName,
      '{package_price}': this.formatRupiah(customer.packagePrice),
      '{payment_link}': danaLink,
      '{days_overdue}': String(overdueDays),
      '{overdue_label}': overdueLabel,
      '{isolir_date}': isolirDateStr,

      // Legacy single brace placeholders
      '{NAMA}': customer.name,
      '{ID_PELANGGAN}': customer.customerCode,
      '{NO_HP}': customer.phone,
      '{ALAMAT}': customer.address || '-',
      '{PAKET}': customer.packageName,
      '{HARGA_PAKET}': this.formatRupiah(customer.packagePrice),
      '{JUMLAH}': amountFormatted,
      '{TOTAL_TAGIHAN}': amountFormatted,
      '{NO_TAGIHAN}': invoiceNum,
      '{NO_INVOICE}': invoiceNum,
      '{PERIODE}': periodStr,
      '{JATUH_TEMPO}': dueDateStr,
      '{TANGGAL_ISOLIR}': isolirDateStr,
      '{LINK_DANA}': danaLink,
      '{STATUS_KONEKSI}': customer.status === 'active' ? 'AKTIF NORMAL' : customer.status === 'isolated' ? 'TERISOLIR' : 'PENDING',
      '{CATATAN}': customNote || '',
      '{TANGGAL_SEKARANG}': new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })
    };

    Object.entries(replacements).forEach(([key, val]) => {
      // replace all instances case-insensitively
      const escaped = key.replace(/[{}]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      result = result.replace(regex, val);
    });

    return result;
  }

  // 1. Template Tagihan Bulanan / Pengingat Pembayaran (Uses Active or Custom Template)
  static generateBillingMessage(bill: Bill, customer: Customer, customTemplateText?: string): string {
    const waConfig = DataService.getWhatsAppBotConfig();
    const templateToUse = customTemplateText || waConfig.reminderTemplate || waConfig.billingTemplate;

    if (templateToUse && (templateToUse.includes('{') || customTemplateText)) {
      return this.renderTemplate(templateToUse, { customer, bill });
    }

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

  // 1b. Template Peringatan Mendesak (Urgent Payment Reminder) dengan Warning Badge & Isolir Threat
  static generateUrgentPaymentMessage(bill: Bill, customer: Customer, daysOverdue?: number): string {
    const waConfig = DataService.getWhatsAppBotConfig();
    const templateToUse = waConfig.urgentNoticeTemplate;

    if (templateToUse && (templateToUse.includes('{') || templateToUse.trim())) {
      return this.renderTemplate(templateToUse, { customer, bill, daysOverdue });
    }

    const danaLink = `https://link.dana.id/pay?order=${bill.billNumber}&amount=${bill.amount}`;
    const overdueLabel = daysOverdue && daysOverdue > 0 
      ? `TERLAMBAT ${daysOverdue} HARI` 
      : 'MELEWATI BATAS JATUH TEMPO';

    return `🚨 *PERINGATAN PEMBAYARAN MENDESAK (URGENT PAYMENT)* 🚨\n` +
      `*JARINGAN INTERNET ANUWANINET*\n` +
      `--------------------------------------------------\n` +
      `Yth. Pelanggan: *${customer.name}*\n` +
      `ID Pelanggan: *${customer.customerCode}*\n` +
      `No. Tagihan: *${bill.billNumber}*\n` +
      `Periode: *${bill.period}*\n` +
      `Paket Layanan: *${customer.packageName}*\n` +
      `Batas Jatuh Tempo: *${bill.dueDate}*\n` +
      `Status Tagihan: *⚠️ OVERDUE (${overdueLabel})*\n` +
      `TOTAL TUNGGAKAN: *${this.formatRupiah(bill.amount)}*\n` +
      `--------------------------------------------------\n` +
      `⚠️ *PEMBERITAHUAN ISOLIR OTOMATIS RUIJIE:*\n` +
      `Tagihan internet Anda telah melewati batas waktu pembayaran. Sistem router Ruijie Reyee akan *MENGISOLIR (MEMUTUS SEMENTARA)* akses internet Anda jika pelunasan belum diselesaikan hari ini.\n\n` +
      `💳 *PEMBAYARAN INSTAN (AUTO-AKTIF / BUKA ISOLIR CEPAT):*\n` +
      `🔹 *DANA E-Wallet & QRIS Instan*:\n` +
      `👉 ${danaLink}\n` +
      `*(Verifikasi otomatis 24 jam, langsung memulihkan koneksi Wi-Fi Anda)*\n\n` +
      `🔹 *Transfer Bank Resmi AnuwaniNet*:\n` +
      `• BCA: 8291-039-112 a/n AnuwaniNet\n` +
      `• BRI: 0021-01-082910-50-1 a/n AnuwaniNet\n\n` +
      `Setelah transfer, Anda dapat konfirmasi via bot dengan membalas: *BAYAR ${bill.billNumber}*\n\n` +
      `_Abaikan pemberitahuan ini jika Anda telah menyelesaikan pembayaran dalam 1 jam terakhir. Terima kasih atas kerja samanya._`;
  }

  // Kirim Pesan Urgent Payment langsung via WhatsApp
  static sendUrgentPaymentMessage(bill: Bill, customer: Customer, daysOverdue?: number) {
    const msg = this.generateUrgentPaymentMessage(bill, customer, daysOverdue);
    this.sendAutomatedNotification(customer.phone, customer.name, 'tagihan', msg);

    // Update bill status locally
    const allBills = DataService.getBills();
    const target = allBills.find(b => b.id === bill.id);
    if (target) {
      target.whatsappReminderSent = true;
      DataService.saveBills(allBills);
    }

    this.openWhatsAppUrl(customer.phone, msg);
  }

  // Auto-Blast Urgent Payment ke semua pelanggan berstatus Overdue
  static runBulkUrgentPaymentReminders(overdueList: { bill: Bill; customer: Customer; daysOverdue: number }[]): {
    sentCount: number;
    names: string[];
    message: string;
  } {
    let sentCount = 0;
    const names: string[] = [];
    const allBills = DataService.getBills();

    overdueList.forEach(({ bill, customer, daysOverdue }) => {
      const msg = this.generateUrgentPaymentMessage(bill, customer, daysOverdue);
      this.sendAutomatedNotification(customer.phone, customer.name, 'tagihan', msg);

      const b = allBills.find(item => item.id === bill.id);
      if (b) {
        b.whatsappReminderSent = true;
      }
      sentCount++;
      names.push(customer.name);
    });

    if (sentCount > 0) {
      DataService.saveBills(allBills);
    }

    return {
      sentCount,
      names,
      message: sentCount > 0
        ? `Sistem otomatis berhasil mengirimkan ${sentCount} pesan 'Urgent Payment' WhatsApp ke pelanggan overdue!`
        : 'Tidak ada tagihan overdue yang perlu dikirimkan saat ini.'
    };
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

  // Auto Reminder Pelanggan with WhatsApp Bot
  static runAutoReminderPelanggan(): {
    sentCount: number;
    remindedCustomers: string[];
    message: string;
  } {
    const bills = DataService.getBills();
    const customers = DataService.getCustomers();
    const unpaidBills = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');

    let sentCount = 0;
    const remindedCustomers: string[] = [];

    unpaidBills.forEach(bill => {
      const cust = customers.find(c => c.id === bill.customerId);
      if (cust) {
        const msg = this.generateBillingMessage(bill, cust);
        this.sendAutomatedNotification(cust.phone, cust.name, 'tagihan', msg);
        
        // Mark reminder sent
        bill.whatsappReminderSent = true;
        sentCount++;
        remindedCustomers.push(`${cust.name} (${bill.billNumber})`);
      }
    });

    DataService.saveBills(bills);

    return {
      sentCount,
      remindedCustomers,
      message: sentCount > 0
        ? `Bot WhatsApp berhasil mengirimkan ${sentCount} pesan auto-reminder tagihan ke pelanggan!`
        : 'Semua tagihan pelanggan saat ini telah lunas, tidak ada reminder yang perlu dikirim.'
    };
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
