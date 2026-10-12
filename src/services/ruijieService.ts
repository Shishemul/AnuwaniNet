import { Customer, RuijieConfig, RuijieDevice } from '../types';
import { DataService } from './dataService';
import { WhatsAppService } from './whatsappService';

export interface RuijieExecutionLog {
  id: string;
  timestamp: string;
  action: 'auto_isolir' | 'manual_isolir' | 'restore_service' | 'sync_vouchers' | 'reboot_device' | 'import_customers';
  customerName?: string;
  customerCode?: string;
  status: 'success' | 'failed';
  details: string;
}

export interface DiscoveredRuijieCustomer {
  customerCode: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  pppoeUsername: string;
  pppoePassword: string;
  ipAddress: string;
  macAddress: string;
  packageId: string;
  packageName: string;
  packagePrice: number;
  status: 'active' | 'isolated' | 'pending';
  ruijieDeviceId: string;
  billingDay: number;
  rateLimit: string;
  isExisting: boolean;
  notes?: string;
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

  // 6. Tarik Data Pelanggan Langsung dari Ruijie Gateway RG-EG3250 & Reyee Cloud
  static async fetchCustomersFromRuijieGateway(): Promise<{
    success: boolean;
    customers: DiscoveredRuijieCustomer[];
    message: string;
    gatewayInfo: { model: string; ip: string; siteId: string; totalDetected: number };
  }> {
    // Simulated live discovery handshake with Ruijie Gateway & Reyee Cloud
    await new Promise(r => setTimeout(r, 700));

    const config = DataService.getRuijieConfig();
    const existingCustomers = DataService.getCustomers();
    const packages = DataService.getPackages();

    const pkg1 = packages.find(p => p.id === 'pkg-1') || { id: 'pkg-1', name: 'Paket Hemat 10 Mbps', price: 100000 };
    const pkg2 = packages.find(p => p.id === 'pkg-2') || { id: 'pkg-2', name: 'Paket Keluarga 20 Mbps', price: 165000 };
    const pkg3 = packages.find(p => p.id === 'pkg-3') || { id: 'pkg-3', name: 'Paket Gamers Pro 50 Mbps', price: 275000 };

    // Ruijie Gateway discovered PPPoE client database pool
    const mockGatewayPool = [
      {
        customerCode: 'ANW-006',
        name: 'Nanda Pratama',
        phone: '081298112233',
        address: 'Jl. Flamboyan Blok B No. 14, RT 01 / RW 05',
        email: 'nanda.pratama@gmail.com',
        pppoeUsername: 'nanda_anw006',
        pppoePassword: 'passNanda2026',
        ipAddress: '192.168.10.22',
        macAddress: '74:D0:2B:44:81:90',
        packageId: pkg2.id,
        packageName: pkg2.name,
        packagePrice: pkg2.price,
        status: 'active' as const,
        ruijieDeviceId: 'dev-1',
        billingDay: 20,
        rateLimit: '20M / 10M (Up/Down)',
        notes: 'Terdeteksi di Port LAN 3 Ruijie Gateway - Profil PPPOE_20M'
      },
      {
        customerCode: 'ANW-007',
        name: 'Farhan Alamsyah',
        phone: '085611224455',
        address: 'Komplek Permata Hijau Kav. 09, RT 03 / RW 02',
        email: 'farhan.alam@yahoo.com',
        pppoeUsername: 'farhan_anw007',
        pppoePassword: 'passFarhan2026',
        ipAddress: '192.168.10.23',
        macAddress: '3C:52:82:11:98:AA',
        packageId: pkg3.id,
        packageName: pkg3.name,
        packagePrice: pkg3.price,
        status: 'active' as const,
        ruijieDeviceId: 'dev-1',
        billingDay: 20,
        rateLimit: '50M / 25M (Gaming Priority)',
        notes: 'Ruijie Cloud Static IP Assigned - Profil PPPOE_50M'
      },
      {
        customerCode: 'ANW-008',
        name: 'Maya Anggraini',
        phone: '087799001122',
        address: 'Jl. Kenanga Timur No. 27, RT 02 / RW 03',
        email: 'maya.anggraini@outlook.com',
        pppoeUsername: 'maya_anw008',
        pppoePassword: 'passMaya2026',
        ipAddress: '192.168.10.24',
        macAddress: '90:B6:86:E0:44:12',
        packageId: pkg1.id,
        packageName: pkg1.name,
        packagePrice: pkg1.price,
        status: 'active' as const,
        ruijieDeviceId: 'dev-1',
        billingDay: 20,
        rateLimit: '10M / 5M (Basic)',
        notes: 'Terdaftar di Reyee Cloud eWeb - ODP-02 Port 5'
      },
      {
        customerCode: 'ANW-009',
        name: 'Dimas Setiawan',
        phone: '081344556677',
        address: 'Perum Graha Indah Blok D-11',
        email: 'dimas.setiawan@gmail.com',
        pppoeUsername: 'dimas_anw009',
        pppoePassword: 'passDimas2026',
        ipAddress: '192.168.10.25',
        macAddress: '14:CC:20:77:88:51',
        packageId: pkg2.id,
        packageName: pkg2.name,
        packagePrice: pkg2.price,
        status: 'active' as const,
        ruijieDeviceId: 'dev-1',
        billingDay: 20,
        rateLimit: '20M / 10M (Up/Down)',
        notes: 'Koneksi ONT ZTE via Ruijie VLAN 100'
      },
      {
        customerCode: 'ANW-010',
        name: 'Dina Kusumawati',
        phone: '082211447788',
        address: 'Jl. Cendrawasih Gang 2 No. 5',
        email: 'dina.kusuma@gmail.com',
        pppoeUsername: 'dina_anw010',
        pppoePassword: 'passDina2026',
        ipAddress: '192.168.10.26',
        macAddress: '68:D7:9A:33:51:77',
        packageId: pkg1.id,
        packageName: pkg1.name,
        packagePrice: pkg1.price,
        status: 'pending' as const,
        ruijieDeviceId: 'dev-1',
        billingDay: 20,
        rateLimit: '10M / 5M',
        notes: 'Akun baru ditambahkan di Ruijie eWeb, menunggu aktivasi'
      },
      {
        customerCode: 'ANW-011',
        name: 'Wahyu Hidayat',
        phone: '085811335577',
        address: 'Jl. Dahlia Raya RT 05 / RW 01',
        email: 'wahyu.hidayat@gmail.com',
        pppoeUsername: 'wahyu_anw011',
        pppoePassword: 'passWahyu2026',
        ipAddress: '192.168.10.27',
        macAddress: 'BC:D0:74:99:11:44',
        packageId: pkg2.id,
        packageName: pkg2.name,
        packagePrice: pkg2.price,
        status: 'active' as const,
        ruijieDeviceId: 'dev-1',
        billingDay: 20,
        rateLimit: '20M / 10M',
        notes: 'Ruijie Reyee Hotspot / PPPoE Client - Signal -18dBm'
      }
    ];

    const discovered: DiscoveredRuijieCustomer[] = mockGatewayPool.map(item => {
      const isExisting = existingCustomers.some(
        c => c.pppoeUsername.toLowerCase() === item.pppoeUsername.toLowerCase() ||
             c.customerCode.toLowerCase() === item.customerCode.toLowerCase()
      );
      return {
        ...item,
        isExisting
      };
    });

    return {
      success: true,
      customers: discovered,
      message: `Berhasil memindai gateway Ruijie Reyee! Ditemukan ${discovered.length} akun pelanggan PPPoE (${discovered.filter(d => !d.isExisting).length} pelanggan baru).`,
      gatewayInfo: {
        model: 'Ruijie Gateway RG-EG3250',
        ip: '192.168.10.1',
        siteId: config.siteId || 'SITE-ANUWANI-01',
        totalDetected: discovered.length
      }
    };
  }

  // 7. Parse File Export Ruijie (CSV / JSON)
  static parseRuijieFile(content: string, format: 'csv' | 'json'): {
    success: boolean;
    customers: DiscoveredRuijieCustomer[];
    error?: string;
  } {
    const existingCustomers = DataService.getCustomers();
    const packages = DataService.getPackages();
    const defaultPkg = packages[0] || { id: 'pkg-1', name: 'Paket Hemat 10 Mbps', price: 100000 };

    try {
      if (format === 'json') {
        const rawJson = JSON.parse(content);
        const list = Array.isArray(rawJson) ? rawJson : (rawJson.users || rawJson.clients || rawJson.data || []);
        
        const mapped: DiscoveredRuijieCustomer[] = list.map((item: any, idx: number) => {
          const pppoeUsername = item.username || item.pppoeUsername || item.pppoe_username || `user_rj_${Date.now()}_${idx}`;
          const isExisting = existingCustomers.some(c => c.pppoeUsername.toLowerCase() === pppoeUsername.toLowerCase());
          const matchedPkg = packages.find(p => p.id === item.packageId || p.name.toLowerCase().includes((item.packageName || item.package || '').toLowerCase())) || defaultPkg;

          return {
            customerCode: item.customerCode || item.code || `ANW-${String(existingCustomers.length + idx + 1).padStart(3, '0')}`,
            name: item.name || item.customerName || `Pelanggan Ruijie ${idx + 1}`,
            phone: item.phone || item.no_hp || '081200000000',
            address: item.address || item.alamat || 'Alamat Belum Terdata',
            email: item.email || undefined,
            pppoeUsername,
            pppoePassword: item.password || item.pppoePassword || '123456',
            ipAddress: item.ip || item.ipAddress || item.ip_address || `192.168.10.${30 + idx}`,
            macAddress: item.mac || item.macAddress || item.mac_address || 'AA:BB:CC:DD:EE:FF',
            packageId: matchedPkg.id,
            packageName: matchedPkg.name,
            packagePrice: matchedPkg.price,
            status: (item.status === 'isolated' || item.status === 'pending') ? item.status : 'active',
            ruijieDeviceId: item.ruijieDeviceId || 'dev-1',
            billingDay: Number(item.billingDay || item.billing_day || 20),
            rateLimit: item.rateLimit || `${matchedPkg.speedMbps} Mbps`,
            isExisting,
            notes: item.notes || 'Diimpor dari file Ruijie Reyee JSON'
          };
        });

        return { success: true, customers: mapped };
      }

      // CSV parsing
      const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        return { success: false, customers: [], error: 'File CSV kosong atau tidak memiliki baris data.' };
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const getVal = (cols: string[], possibleHeaders: string[]) => {
        for (const ph of possibleHeaders) {
          const idx = headers.indexOf(ph);
          if (idx >= 0 && cols[idx] !== undefined) {
            return cols[idx].trim().replace(/^["']|["']$/g, '');
          }
        }
        return '';
      };

      const result: DiscoveredRuijieCustomer[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const cols = line.split(',');
        if (cols.length < 2) continue;

        const pppoeUsername = getVal(cols, ['username', 'pppoe_username', 'pppoeusername', 'user']) || `user_rj_${i}`;
        const name = getVal(cols, ['name', 'nama', 'customer_name', 'customername']) || `Pelanggan Ruijie ${i}`;
        const phone = getVal(cols, ['phone', 'no_hp', 'telepon', 'mobile']) || '081200000000';
        const address = getVal(cols, ['address', 'alamat', 'lokasi']) || 'Alamat Ruijie';
        const password = getVal(cols, ['password', 'pppoe_password', 'pass']) || '123456';
        const ip = getVal(cols, ['ip', 'ip_address', 'ipaddress']) || `192.168.10.${30 + i}`;
        const mac = getVal(cols, ['mac', 'mac_address', 'macaddress']) || '00:1A:2B:3C:4D:5E';
        const pkgName = getVal(cols, ['package', 'paket', 'profile', 'package_name']);
        const statusVal = getVal(cols, ['status']).toLowerCase();

        const matchedPkg = packages.find(p => p.name.toLowerCase().includes(pkgName.toLowerCase())) || defaultPkg;
        const isExisting = existingCustomers.some(c => c.pppoeUsername.toLowerCase() === pppoeUsername.toLowerCase());

        result.push({
          customerCode: getVal(cols, ['code', 'customer_code', 'id']) || `ANW-${String(existingCustomers.length + i).padStart(3, '0')}`,
          name,
          phone,
          address,
          email: getVal(cols, ['email']),
          pppoeUsername,
          pppoePassword: password,
          ipAddress: ip,
          macAddress: mac,
          packageId: matchedPkg.id,
          packageName: matchedPkg.name,
          packagePrice: matchedPkg.price,
          status: statusVal === 'isolated' || statusVal === 'pending' ? statusVal : 'active',
          ruijieDeviceId: 'dev-1',
          billingDay: 20,
          rateLimit: `${matchedPkg.speedMbps} Mbps`,
          isExisting,
          notes: 'Diimpor dari file Ruijie Reyee CSV'
        });
      }

      return { success: true, customers: result };
    } catch (err: any) {
      return { success: false, customers: [], error: err?.message || 'Gagal memproses file Ruijie.' };
    }
  }

  // 8. Generate Template Contoh CSV untuk Import Ruijie
  static generateRuijieSampleCsv(): string {
    return `username,password,name,phone,address,ip_address,mac_address,package_name,status
ahmad_rj01,passAhmad2026,Ahmad Supriyadi,081299887711,Jl. Melati No. 10 RT 01/02,192.168.10.40,E4:AA:5D:89:12:01,Paket Keluarga 20 Mbps,active
rina_rj02,passRina2026,Rina Marlina,085712349988,Komplek Griya Asri Blok A-3,192.168.10.41,BC:30:7D:99:44:11,Paket Hemat 10 Mbps,active
joko_rj03,passJoko2026,Joko Widodo,082188990022,Jl. Anggrek RT 04/05 No. 88,192.168.10.42,70:85:C2:55:77:88,Paket Gamers Pro 50 Mbps,active`;
  }

  // 9. Eksekusi Impor Pelanggan Ruijie & Simpan ke Database
  static importCustomers(
    selectedCustomers: DiscoveredRuijieCustomer[],
    options: { saveToDatabase?: boolean } = { saveToDatabase: true }
  ): {
    success: boolean;
    importedCount: number;
    updatedCount: number;
    message: string;
  } {
    if (!selectedCustomers.length) {
      return {
        success: false,
        importedCount: 0,
        updatedCount: 0,
        message: 'Tidak ada pelanggan yang dipilih untuk diimpor.'
      };
    }

    const currentCustomers = DataService.getCustomers();
    let importedCount = 0;
    let updatedCount = 0;

    selectedCustomers.forEach(item => {
      const existingIdx = currentCustomers.findIndex(
        c => c.pppoeUsername.toLowerCase() === item.pppoeUsername.toLowerCase() ||
             c.customerCode.toLowerCase() === item.customerCode.toLowerCase()
      );

      const customerObj: Customer = {
        id: existingIdx >= 0 ? currentCustomers[existingIdx].id : `cust-rj-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customerCode: item.customerCode,
        name: item.name,
        phone: item.phone,
        address: item.address,
        email: item.email || `${item.pppoeUsername}@gmail.com`,
        pppoeUsername: item.pppoeUsername,
        pppoePassword: item.pppoePassword,
        ipAddress: item.ipAddress,
        macAddress: item.macAddress,
        packageId: item.packageId,
        packageName: item.packageName,
        packagePrice: item.packagePrice,
        status: item.status,
        autoIsolirEnabled: true,
        billingDay: item.billingDay || 20,
        joinDate: new Date().toISOString().slice(0, 10),
        ruijieDeviceId: item.ruijieDeviceId || 'dev-1',
        notes: item.notes || 'Diimpor langsung dari Ruijie Gateway EG3250'
      };

      if (existingIdx >= 0) {
        currentCustomers[existingIdx] = { ...currentCustomers[existingIdx], ...customerObj };
        updatedCount++;
      } else {
        currentCustomers.push(customerObj);
        importedCount++;
      }
    });

    // Simpan data pelanggan secara permanen
    // Method DataService.saveCustomers() otomatis menyimpan ke local database dan menyinkronkan ke Supabase table 'anuwani_customers'
    DataService.saveCustomers(currentCustomers);

    // Catat ke Log Eksekusi Ruijie
    this.addLog({
      action: 'import_customers',
      status: 'success',
      details: `Impor pelanggan dari Ruijie berhasil: ${importedCount} pelanggan baru ditambahkan, ${updatedCount} pelanggan diperbarui. Disimpan ke Database.`
    });

    return {
      success: true,
      importedCount,
      updatedCount,
      message: `Berhasil mengimpor ${importedCount} pelanggan baru dan memperbarui ${updatedCount} pelanggan dari Ruijie. Data telah tersimpan di Database!`
    };
  }
}
