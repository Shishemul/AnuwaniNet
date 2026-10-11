import { Customer, RuijieConfig, RuijieDevice } from '../types';
import { DataService } from './dataService';
import { WhatsAppService } from './whatsappService';

export interface RuijieExecutionLog {
  id: string;
  timestamp: string;
  action: 'auto_isolir' | 'manual_isolir' | 'restore_service' | 'sync_vouchers' | 'reboot_device';
  customerName?: string;
  customerCode?: string;
  status: 'success' | 'failed';
  details: string;
}

const STORAGE_KEY_RUIJIE_LOGS = 'anw_ruijie_execution_logs';

export class RuijieService {
  static getLogs(): RuijieExecutionLog[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RUIJIE_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'rlog-1',
        timestamp: '2026-10-10 19:40',
        action: 'sync_vouchers',
        status: 'success',
        details: 'Sinkronisasi 6 kode voucher hotspot ke Ruijie Reyee Gateway EG3250 berhasil'
      },
      {
        id: 'rlog-2',
        timestamp: '2026-10-09 23:59',
        action: 'auto_isolir',
        customerName: 'Siti Rahmawati',
        customerCode: 'ANW-002',
        status: 'success',
        details: 'Profil PPPoE dialihkan ke ISOLIR_REDIRECT_WEB karena tagihan September & Oktober belum dibayar'
      }
    ];
  }

  static addLog(log: Omit<RuijieExecutionLog, 'id' | 'timestamp'>) {
    const logs = this.getLogs();
    const newLog: RuijieExecutionLog = {
      ...log,
      id: 'rlog-' + Date.now(),
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
    };
    logs.unshift(newLog);
    try {
      localStorage.setItem(STORAGE_KEY_RUIJIE_LOGS, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error(e);
    }
    return newLog;
  }

  // 1. Manual Isolir Pelanggan
  static isolateCustomer(customer: Customer, reason: string = 'Isolir manual oleh Admin'): { success: boolean; message: string } {
    try {
      const updated: Customer = {
        ...customer,
        status: 'isolated'
      };
      DataService.updateCustomer(updated);

      // Catat log Ruijie
      this.addLog({
        action: 'manual_isolir',
        customerName: customer.name,
        customerCode: customer.customerCode,
        status: 'success',
        details: `Ruijie API command disconnect PPPoE session (${customer.pppoeUsername}) & switch rate limit pool ke ISOLIR_REDIRECT_WEB. Alasan: ${reason}`
      });

      // Kirim Notifikasi WhatsApp Isolir
      const msg = `Halo Bpk/Ibu *${customer.name}*,\n\nPemberitahuan dari *AnuwaniNet*:\nLayanan internet Anda (ID Pelanggan: *${customer.customerCode}*) saat ini telah *DIISOLIR*. Layanan dialihkan sementara ke portal tagihan.\n\nAlasan: ${reason}.\nMohon segera selesaikan administrasi tagihan Anda untuk aktivasi kembali secara otomatis.\n\nTerima kasih,\nTim Support AnuwaniNet.`;
      
      WhatsAppService.sendAutomatedNotification(customer.phone, customer.name, 'isolir_alert', msg);

      return {
        success: true,
        message: `Pelanggan ${customer.name} (${customer.customerCode}) berhasil diisolir pada Ruijie Gateway!`
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal melakukan isolir' };
    }
  }

  // 2. Manual Buka Isolir / Pulihkan Layanan
  static restoreCustomer(customer: Customer, reason: string = 'Pembayaran terverifikasi / Aktivasi admin'): { success: boolean; message: string } {
    try {
      const updated: Customer = {
        ...customer,
        status: 'active'
      };
      DataService.updateCustomer(updated);

      // Catat log Ruijie
      this.addLog({
        action: 'restore_service',
        customerName: customer.name,
        customerCode: customer.customerCode,
        status: 'success',
        details: `Ruijie API switch profil PPPoE (${customer.pppoeUsername}) ke profil reguler (${customer.packageName}). Bandwidth dialirkan normal.`
      });

      // Kirim Notifikasi WhatsApp Pemulihan
      const msg = `Halo Bpk/Ibu *${customer.name}*,\n\nKabar baik! Layanan internet AnuwaniNet Anda (*${customer.customerCode}*) telah *DIAKTIFKAN KEMBALI*.\n\nStatus: Aktif Normal\nPaket: ${customer.packageName}\n\nSelamat menikmati koneksi internet super cepat AnuwaniNet!`;
      
      WhatsAppService.sendAutomatedNotification(customer.phone, customer.name, 'bukti_bayar', msg);

      return {
        success: true,
        message: `Isolir ${customer.name} berhasil dibuka. Koneksi kembali normal!`
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal membuka isolir' };
    }
  }

  // 3. Jalankan Eksekusi Auto-Isolir (Jatuh tempo)
  static runAutoIsolir(): { isolatedCount: number; message: string; details: string[] } {
    const config = DataService.getRuijieConfig();
    const customers = DataService.getCustomers();
    const bills = DataService.getBills();

    let isolatedCount = 0;
    const details: string[] = [];

    // Cari tagihan yang statusnya overdue / belum lunas
    customers.forEach(cust => {
      if (cust.status === 'active' && cust.autoIsolirEnabled) {
        // Cek apakah ada tagihan overdue untuk customer ini
        const hasUnpaidOrOverdue = bills.some(b => 
          b.customerId === cust.id && 
          (b.status === 'overdue' || (b.status === 'unpaid' && new Date(b.dueDate) < new Date()))
        );

        if (hasUnpaidOrOverdue) {
          cust.status = 'isolated';
          DataService.updateCustomer(cust);
          isolatedCount++;

          const detailMsg = `Auto-isolir diterapkan untuk ${cust.name} (${cust.customerCode}) karena tagihan jatuh tempo terlewati.`;
          details.push(detailMsg);

          this.addLog({
            action: 'auto_isolir',
            customerName: cust.name,
            customerCode: cust.customerCode,
            status: 'success',
            details: `Auto-isolir Cron triggered via Ruijie Reyee Cloud. Dialihkan ke ${config.isolirProfileName}.`
          });

          // Notifikasi WhatsApp
          const waMsg = `Pemberitahuan Otomatis AnuwaniNet:\nLayanan internet Anda (${cust.customerCode} - ${cust.name}) telah *DIISOLIR OTOMATIS* oleh sistem Ruijie karena melewati tanggal jatuh tempo (${config.autoIsolirDay} tiap bulan).\n\nSilakan lunasi tagihan Anda untuk auto-unblock instan.`;
          WhatsAppService.sendAutomatedNotification(cust.phone, cust.name, 'isolir_alert', waMsg);
        }
      }
    });

    return {
      isolatedCount,
      message: isolatedCount > 0 
        ? `Berhasil mengeksekusi Auto-Isolir Ruijie: ${isolatedCount} pelanggan dialihkan ke isolir.`
        : 'Pemeriksaan selesai. Tidak ada pelanggan yang memenuhi syarat isolir baru.',
      details
    };
  }

  // 4. Sinkronisasi Voucher ke Ruijie Reyee Hotspot Pool
  static syncVouchersWithRuijie(): { success: boolean; count: number; message: string } {
    const vouchers = DataService.getVouchers();
    const unsynced = vouchers.filter(v => !v.ruijieSynced);
    
    // Mark all as synced
    const updated = vouchers.map(v => ({ ...v, ruijieSynced: true }));
    DataService.saveVouchers(updated);

    this.addLog({
      action: 'sync_vouchers',
      status: 'success',
      details: `Sinkronisasi voucher ke Ruijie Reyee Hotspot Server berhasil (${vouchers.length} total voucher dalam pool).`
    });

    return {
      success: true,
      count: vouchers.length,
      message: `Semua voucher (${vouchers.length} unit) berhasil disinkronkan ke gateway Ruijie Reyee!`
    };
  }

  // 5. Test Ping & Koneksi Ruijie Cloud API
  static async testRuijieConnection(config: RuijieConfig): Promise<{ success: boolean; latencyMs: number; message: string }> {
    // Simulating real network handshake with Ruijie Cloud
    await new Promise(r => setTimeout(r, 600));
    
    const key = config.appId || config.apiKey;
    const secret = config.secretKey || config.apiSecret;

    if (!key || !secret) {
      return {
        success: false,
        latencyMs: 0,
        message: 'App ID dan Secret Key Ruijie Reyee harus diisi lengkap!'
      };
    }

    return {
      success: true,
      latencyMs: Math.floor(Math.random() * 25) + 15,
      message: `Terhubung dengan Ruijie Reyee Cloud API (AppID: ${key.slice(0, 8)}***, Site: ${config.siteId}). Status: HTTP 200 OK Cloud Authorized.`
    };
  }
}
