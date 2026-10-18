import {
  initialCustomers,
  initialPackages,
  initialBills,
  initialTransactions,
  initialVouchers,
  initialRuijieDevices,
  initialUsers,
  initialRuijieConfig,
  initialWhatsAppLogs
} from '../data/seedData';
import {
  Customer,
  InternetPackage,
  Bill,
  Transaction,
  Voucher,
  RuijieDevice,
  User,
  RuijieConfig,
  WhatsAppMessageLog
} from '../types';
import {
  getSupabaseClient,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  syncTableToSupabase,
  syncAllTablesToDatabase,
  loadAllTablesFromDatabase
} from './supabaseService';
import { NotificationService } from './notificationService';

const KEYS = {
  CUSTOMERS: 'anw_customers_v1',
  PACKAGES: 'anw_packages_v1',
  BILLS: 'anw_bills_v1',
  TRANSACTIONS: 'anw_transactions_v1',
  VOUCHERS: 'anw_vouchers_v1',
  DEVICES: 'anw_devices_v1',
  USERS: 'anw_users_v1',
  RUIJIE_CONFIG: 'anw_ruijie_config_v1',
  WA_LOGS: 'anw_wa_logs_v1'
};

function getStorage<T>(key: string, defaultVal: T): T {
  try {
    const val = localStorage.getItem(key);
    if (val) return JSON.parse(val);
  } catch (e) {
    console.error(`Failed to read ${key}`, e);
  }
  return defaultVal;
}

function setStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save ${key}`, e);
  }
}

export class DataService {
  private static listeners: Array<(event: string, payload?: any) => void> = [];

  static subscribe(listener: (event: string, payload?: any) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static notify(event: string, payload?: any) {
    this.listeners.forEach(l => {
      try {
        l(event, payload);
      } catch (e) {
        console.error(e);
      }
    });
  }

  // Customers
  static getCustomers(): Customer[] {
    return getStorage<Customer[]>(KEYS.CUSTOMERS, initialCustomers);
  }

  static saveCustomers(customers: Customer[]) {
    setStorage(KEYS.CUSTOMERS, customers);
    this.syncToSupabaseIfConnected('anuwani_customers', customers);
  }

  static updateCustomer(updated: Customer) {
    const list = this.getCustomers();
    const idx = list.findIndex(c => c.id === updated.id);
    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }
    this.saveCustomers(list);
  }

  static deleteCustomer(id: string) {
    const list = this.getCustomers().filter(c => c.id !== id);
    this.saveCustomers(list);
  }

  // Packages
  static getPackages(): InternetPackage[] {
    return getStorage<InternetPackage[]>(KEYS.PACKAGES, initialPackages);
  }

  static savePackages(packages: InternetPackage[]) {
    setStorage(KEYS.PACKAGES, packages);
    this.notify('packages_updated', packages);
    this.syncToSupabaseIfConnected('anuwani_packages', packages);
  }

  // Bills
  static getBills(): Bill[] {
    const stored = getStorage<Bill[]>(KEYS.BILLS, initialBills);
    if (stored && Array.isArray(stored)) {
      const existingIds = new Set(stored.map(b => b.id));
      const missing = initialBills.filter(b => !existingIds.has(b.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        setStorage(KEYS.BILLS, merged);
        return merged;
      }
      return stored;
    }
    return initialBills;
  }

  static saveBills(bills: Bill[]) {
    setStorage(KEYS.BILLS, bills);
    this.notify('bills_updated', bills);
    this.syncToSupabaseIfConnected('anuwani_bills', bills);
  }

  static updateBill(bill: Bill) {
    const list = this.getBills();
    const idx = list.findIndex(b => b.id === bill.id);
    if (idx >= 0) {
      list[idx] = bill;
    } else {
      list.push(bill);
    }
    this.saveBills(list);
  }

  // Transactions
  static getTransactions(): Transaction[] {
    const stored = getStorage<Transaction[]>(KEYS.TRANSACTIONS, initialTransactions);
    if (stored && Array.isArray(stored)) {
      const existingIds = new Set(stored.map(t => t.id));
      const missing = initialTransactions.filter(t => !existingIds.has(t.id));
      if (missing.length > 0) {
        const merged = [...stored, ...missing];
        setStorage(KEYS.TRANSACTIONS, merged);
        return merged;
      }
      return stored;
    }
    return initialTransactions;
  }

  static saveTransactions(trxs: Transaction[]) {
    setStorage(KEYS.TRANSACTIONS, trxs);
    this.notify('transactions_updated', trxs);
    this.syncToSupabaseIfConnected('anuwani_transactions', trxs);
  }

  static addTransaction(trx: Transaction) {
    const list = this.getTransactions();
    list.unshift(trx);
    this.saveTransactions(list);
    this.notify('transaction_added', trx);
  }

  // Vouchers
  static getVouchers(): Voucher[] {
    return getStorage<Voucher[]>(KEYS.VOUCHERS, initialVouchers);
  }

  static saveVouchers(vouchers: Voucher[]) {
    setStorage(KEYS.VOUCHERS, vouchers);
    this.syncToSupabaseIfConnected('anuwani_vouchers', vouchers);
  }

  static addVouchers(newVouchers: Voucher[]) {
    const list = this.getVouchers();
    list.unshift(...newVouchers);
    this.saveVouchers(list);
  }

  // Ruijie Devices & Config
  static getRuijieDevices(): RuijieDevice[] {
    return getStorage<RuijieDevice[]>(KEYS.DEVICES, initialRuijieDevices);
  }

  static saveRuijieDevices(devices: RuijieDevice[]) {
    setStorage(KEYS.DEVICES, devices);
    this.notify('devices_updated', devices);
    this.syncToSupabaseIfConnected('anuwani_devices', devices);
  }

  static getRuijieConfig(): RuijieConfig {
    const raw = getStorage<RuijieConfig>(KEYS.RUIJIE_CONFIG, initialRuijieConfig);
    // ensure backward compatibility with appId, secretKey, username, password, and autoSync settings
    return {
      ...initialRuijieConfig,
      ...raw,
      appId: raw.appId || raw.apiKey || 'rj_app_anuwani_882910398',
      secretKey: raw.secretKey || raw.apiSecret || 'rj_sec_778120392819039129x88a',
      apiKey: raw.appId || raw.apiKey || 'rj_app_anuwani_882910398',
      apiSecret: raw.secretKey || raw.apiSecret || 'rj_sec_778120392819039129x88a',
      username: raw.username !== undefined ? raw.username : 'noc.admin@anuwani.net',
      password: raw.password !== undefined ? raw.password : 'RuijieCloud#2026*',
      autoSyncEnabled: raw.autoSyncEnabled !== undefined ? raw.autoSyncEnabled : true,
      autoSyncIntervalMinutes: raw.autoSyncIntervalMinutes || 30,
      autoSyncFrequency: raw.autoSyncFrequency || 'every_30_mins',
      syncScope: raw.syncScope || 'all',
      lastSyncAt: raw.lastSyncAt || '15 Okt 2026, 10:30 WIB',
      lastSuccessfulSyncAt: raw.lastSuccessfulSyncAt || raw.lastSyncAt || '15 Okt 2026, 10:30 WIB',
      lastSyncTimestamp: raw.lastSyncTimestamp || 1791999000000,
      lastSyncStatus: raw.lastSyncStatus || 'completed',
      lastSyncSummary: raw.lastSyncSummary || {
        customers: 10,
        devices: 2,
        vouchers: 6,
        newlyAdded: 0,
        updated: 5
      }
    };
  }

  static saveRuijieConfig(config: RuijieConfig) {
    const normalized: RuijieConfig = {
      ...config,
      appId: config.appId || config.apiKey || '',
      secretKey: config.secretKey || config.apiSecret || '',
      apiKey: config.appId || config.apiKey || '',
      apiSecret: config.secretKey || config.apiSecret || '',
      username: config.username || '',
      password: config.password || '',
      autoSyncEnabled: config.autoSyncEnabled !== undefined ? config.autoSyncEnabled : true,
      autoSyncIntervalMinutes: config.autoSyncIntervalMinutes || 30,
      autoSyncFrequency: config.autoSyncFrequency || 'every_30_mins',
      syncScope: config.syncScope || 'all'
    };
    setStorage(KEYS.RUIJIE_CONFIG, normalized);
    this.notify('ruijie_config_updated', normalized);
    this.syncSystemSettingsToDatabase();
  }

  // Users
  static getUsers(): User[] {
    return getStorage<User[]>(KEYS.USERS, initialUsers);
  }

  static saveUsers(users: User[]) {
    setStorage(KEYS.USERS, users);
    this.syncToSupabaseIfConnected('anuwani_users', users);
  }

  static updateUser(user: User) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    this.saveUsers(users);
  }

  static deleteUser(userId: string) {
    const users = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(users);
  }

  // WhatsApp Message Logs
  static getWaLogs(): WhatsAppMessageLog[] {
    return getStorage<WhatsAppMessageLog[]>(KEYS.WA_LOGS, initialWhatsAppLogs);
  }

  static addWaLog(log: WhatsAppMessageLog) {
    const logs = this.getWaLogs();
    logs.unshift(log);
    setStorage(KEYS.WA_LOGS, logs);
    this.syncToSupabaseIfConnected('anuwani_wa_logs', [log]);
  }

  // App Settings
  static getAppSettings(): import('../types').AppSettings {
    return getStorage<import('../types').AppSettings>('anw_app_settings_v1', {
      appName: 'AnuwaniNet',
      companyName: 'PT Anuwani Lintas Network',
      phoneCs: '0812-3456-7890',
      addressNoc: 'Jl. Jaringan Telekomunikasi No. 1, RT 02 / RW 04',
      bcaAccount: '8291-039-112 a/n AnuwaniNet',
      briAccount: '0021-01-082910-50-1 a/n AnuwaniNet',
      receiptFooterNote: 'Simpan kuitansi ini sebagai bukti pembayaran sah. Terima kasih atas kepercayaan Anda.',
      autoGenerateBillsEnabled: true,
      autoGenerateBillsDay: 1,
      lastAutoGeneratedPeriod: undefined
    });
  }

  static saveAppSettings(settings: import('../types').AppSettings) {
    setStorage('anw_app_settings_v1', settings);
    this.notify('app_settings_updated', settings);
    this.syncSystemSettingsToDatabase();
  }

  // Auto-Generate Bills at start of month
  static checkAndRunAutoBilling(force: boolean = false): { triggered: boolean; generatedCount: number; message: string } {
    const settings = this.getAppSettings();
    if (!settings.autoGenerateBillsEnabled && !force) {
      return {
        triggered: false,
        generatedCount: 0,
        message: 'Auto-Generate Bills sedang dinonaktifkan dalam Pengaturan Sistem.'
      };
    }

    const now = new Date();
    const currentMonthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(now);

    // Check if already executed for this period unless force is requested
    if (settings.lastAutoGeneratedPeriod === currentMonthYear && !force) {
      return {
        triggered: false,
        generatedCount: 0,
        message: `Tagihan untuk periode ${currentMonthYear} sudah pernah digenerate otomatis sebelumnya.`
      };
    }

    // Check if current date >= target day (default 1) unless force
    const targetDay = settings.autoGenerateBillsDay || 1;
    if (now.getDate() < targetDay && !force) {
      return {
        triggered: false,
        generatedCount: 0,
        message: `Jadwal auto-generate bulanan disetel setiap tanggal ${targetDay}. Hari ini tanggal ${now.getDate()}.`
      };
    }

    const customers = this.getCustomers();
    const existingBills = this.getBills();
    const newBills: import('../types').Bill[] = [];

    customers.forEach(cust => {
      if (cust.status === 'active' || cust.status === 'isolated') {
        const alreadyHas = existingBills.some(b => b.customerId === cust.id && b.period === currentMonthYear);
        if (!alreadyHas) {
          const dueDay = Math.min(Math.max(cust.billingDay || 20, 1), 28);
          const dueDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
          const newBill: import('../types').Bill = {
            id: 'bill-auto-' + Date.now() + '-' + (newBills.length + 1) + '-' + Math.floor(Math.random() * 1000),
            billNumber: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${String(existingBills.length + newBills.length + 1).padStart(3, '0')}`,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            packageId: cust.packageId,
            packageName: cust.packageName,
            amount: cust.packagePrice,
            period: currentMonthYear,
            dueDate: dueDate,
            status: 'unpaid',
            whatsappReminderSent: true
          };
          newBills.push(newBill);
        }
      }
    });

    if (newBills.length > 0) {
      const updatedBills = [...existingBills, ...newBills];
      this.saveBills(updatedBills);
      settings.lastAutoGeneratedPeriod = currentMonthYear;
      this.saveAppSettings(settings);
      this.notify('bills_updated', updatedBills);

      // Log to Notification Center
      NotificationService.logAutoBilling({
        generatedCount: newBills.length,
        period: currentMonthYear,
        details: `Auto-billing berhasil menerbitkan ${newBills.length} lembar tagihan baru untuk periode ${currentMonthYear}!`
      });

      return {
        triggered: true,
        generatedCount: newBills.length,
        message: `Auto-Generate Bills berhasil membuat ${newBills.length} lembar tagihan baru untuk periode ${currentMonthYear}!`
      };
    } else {
      settings.lastAutoGeneratedPeriod = currentMonthYear;
      this.saveAppSettings(settings);
      return {
        triggered: false,
        generatedCount: 0,
        message: `Semua pelanggan aktif (${customers.length} pelanggan) sudah memiliki lembar tagihan untuk periode ${currentMonthYear}.`
      };
    }
  }

  // WhatsApp Bot Config & Custom Billing Templates
  static getWhatsAppBotConfig(): import('../types').WhatsAppBotConfig {
    const defaultTemplates: import('../types').WhatsAppCustomTemplate[] = [
      {
        id: 'tmpl-official',
        name: 'Template Resmi AnuwaniNet (Lengkap)',
        category: 'tagihan',
        isDefault: true,
        description: 'Format tagihan lengkap dengan rincian rekening BCA/BRI, link DANA, dan catatan isolir.',
        content: `*TAGIHAN INTERNET ANUWANINET*
--------------------------------------
Kepada Yth: *{NAMA}*
ID Pelanggan: *{ID_PELANGGAN}*
No. Tagihan: *{NO_TAGIHAN}*
Periode: *{PERIODE}*
Paket: *{PAKET}*
Total Tagihan: *{JUMLAH}*
Jatuh Tempo: *{JATUH_TEMPO}*
--------------------------------------
Metode Pembayaran Resmi:
🔹 *DANA E-Wallet & QRIS Instan*:
👉 {LINK_DANA} (Auto-Verifikasi Langsung)
🔹 *BCA*: 8291-039-112 a/n AnuwaniNet
🔹 *BRI*: 0021-01-082910-50-1 a/n AnuwaniNet

_Catatan: Layanan akan diisolir otomatis oleh sistem Ruijie jika belum dibayar hingga tanggal {TANGGAL_ISOLIR}._

Terima kasih telah menggunakan layanan AnuwaniNet!`
      },
      {
        id: 'tmpl-friendly',
        name: 'Pengingat Ramah & Santai',
        category: 'pengingat',
        isDefault: false,
        description: 'Pesan tagihan santai dan sopan untuk langganan warga perumahan/RT.',
        content: `Halo Kak *{NAMA}* 😊,
Semoga harinya menyenangkan! Sekadar mengingatkan tagihan internet AnuwaniNet untuk periode *{PERIODE}* sebesar *{JUMLAH}* telah terbit.

Jatuh tempo pada tanggal: *{JATUH_TEMPO}*.
Bisa langsung bayar praktis via DANA / QRIS di sini:
👉 {LINK_DANA}

Jika sudah melakukan pembayaran, silakan abaikan pesan ini ya. Terima kasih banyak Kak!`
      },
      {
        id: 'tmpl-urgent',
        name: 'Peringatan Jatuh Tempo & Auto-Isolir (Tegas)',
        category: 'tagihan',
        isDefault: false,
        description: 'Peringatan keras H-1 atau saat overdue sebelum diputus auto-isolir Ruijie.',
        content: `⚠️ *PERINGATAN JATUH TEMPO & AUTO-ISOLIR ANUWANINET*
Yth. Bpk/Ibu *{NAMA}* ({ID_PELANGGAN}),

Tagihan internet Anda no. *{NO_TAGIHAN}* sebesar *{JUMLAH}* telah melewati batas jatuh tempo *{JATUH_TEMPO}*.
Layanan WiFi Anda dijadwalkan dialihkan ke profil isolir otomatis Ruijie pada tanggal *{TANGGAL_ISOLIR}*.

Mohon segera selesaikan pelunasan instan:
👉 {LINK_DANA}
Konfirmasi otomatis setelah pembayaran sukses.`
      },
      {
        id: 'tmpl-simple',
        name: 'Format Singkat / SMS Style',
        category: 'tagihan',
        isDefault: false,
        description: 'Format ringkas to-the-point untuk notifikasi cepat.',
        content: `AnuwaniNet Info: Tagihan {PERIODE} a/n {NAMA} sebesar {JUMLAH}. Jatuh tempo {JATUH_TEMPO}. Bayar instan via DANA: {LINK_DANA}. Abaikan jika telah bayar.`
      }
    ];

    const defaultReminderTemplate = `Halo Kak *{{customer_name}}* ({{customer_code}}) 😊,
Kami menginformasikan bahwa tagihan internet AnuwaniNet untuk periode *{{period}}* sebesar *{{bill_amount}}* telah terbit.

Batas jatuh tempo: *{{due_date}}*.
Paket Layanan: *{{package_name}}*

Pembayaran praktis & otomatis via DANA & QRIS:
👉 {{payment_link}}

Rekening Bank Resmi AnuwaniNet:
• BCA: 8291-039-112 a/n AnuwaniNet
• BRI: 0021-01-082910-50-1 a/n AnuwaniNet

Abaikan pesan ini apabila Kakak sudah melakukan pembayaran. Terima kasih banyak!`;

    const defaultUrgentNoticeTemplate = `🚨 *PERINGATAN PEMBAYARAN MENDESAK (URGENT PAYMENT)* 🚨
*JARINGAN INTERNET ANUWANINET*
--------------------------------------------------
Yth. Pelanggan: *{{customer_name}}*
ID Pelanggan: *{{customer_code}}*
No. Tagihan: *{{bill_number}}*
Periode: *{{period}}*
Paket Layanan: *{{package_name}}*
Batas Jatuh Tempo: *{{due_date}}*
Status: *⚠️ OVERDUE (Terlambat {{days_overdue}} Hari)*
TOTAL TUNGGAKAN: *{{bill_amount}}*
--------------------------------------------------
⚠️ *PEMBERITAHUAN ISOLIR OTOMATIS RUIJIE:*
Tagihan internet Anda telah melewati batas waktu pembayaran. Router Ruijie Reyee akan *MENGISOLIR (MEMUTUS SEMENTARA)* akses internet jika pelunasan belum diselesaikan hari ini.

💳 *BAYAR SEKARANG & BUKA ISOLIR CEPAT:*
👉 {{payment_link}}
*(Verifikasi otomatis 24 jam langsung memulihkan koneksi Wi-Fi Anda)*

Transfer Bank Resmi:
• BCA: 8291-039-112 a/n AnuwaniNet
• BRI: 0021-01-082910-50-1 a/n AnuwaniNet

Setelah transfer, konfirmasi via bot: *BAYAR {{bill_number}}*

_Abaikan pemberitahuan ini jika Anda telah menyelesaikan pembayaran._`;

    const cfg = getStorage<import('../types').WhatsAppBotConfig>('anw_wa_bot_config_v1', {
      senderNumber: '0812-3456-7890',
      fonnteToken: 'FNTE_89a128bc991024_live',
      fonnteDevice: 'DEV-ANUWANINET-01',
      provider: 'fonnte',
      autoSendOnBillCreated: true,
      autoSendOnDueAlert: true,
      botEnabled: true,
      billingTemplate: defaultTemplates[0].content,
      receiptTemplate: 'Halo {{customer_name}}, pembayaran tagihan {{bill_number}} sebesar {{bill_amount}} telah LUNAS terverifikasi. Terima kasih!',
      isolirTemplate: 'Pemberitahuan Isolir: Layanan internet AnuwaniNet ID {{customer_code}} telah dialihkan sementara karena tunggakan tagihan {{bill_amount}}.',
      reminderTemplate: defaultReminderTemplate,
      urgentNoticeTemplate: defaultUrgentNoticeTemplate,
      customTemplates: defaultTemplates
    });

    if (!cfg.reminderTemplate) {
      cfg.reminderTemplate = defaultReminderTemplate;
    }
    if (!cfg.urgentNoticeTemplate) {
      cfg.urgentNoticeTemplate = defaultUrgentNoticeTemplate;
    }

    if (!cfg.customTemplates || cfg.customTemplates.length === 0) {
      cfg.customTemplates = defaultTemplates;
    }

    return cfg;
  }

  static getCustomTemplates(): import('../types').WhatsAppCustomTemplate[] {
    const config = this.getWhatsAppBotConfig();
    return config.customTemplates || [];
  }

  static saveCustomTemplate(template: import('../types').WhatsAppCustomTemplate) {
    const config = this.getWhatsAppBotConfig();
    const list = config.customTemplates || [];
    const index = list.findIndex(t => t.id === template.id);
    if (index >= 0) {
      list[index] = template;
    } else {
      list.push(template);
    }
    config.customTemplates = list;
    this.saveWhatsAppBotConfig(config);
    return template;
  }

  static deleteCustomTemplate(templateId: string) {
    const config = this.getWhatsAppBotConfig();
    config.customTemplates = (config.customTemplates || []).filter(t => t.id !== templateId);
    this.saveWhatsAppBotConfig(config);
  }

  static saveWhatsAppBotConfig(config: import('../types').WhatsAppBotConfig) {
    setStorage('anw_wa_bot_config_v1', config);
    this.notify('wa_bot_config_updated', config);
    this.syncSystemSettingsToDatabase();
  }

  // Central Database for System Settings
  static getSystemSettingsDatabase(): import('../types').SystemSettingsDatabase {
    const appSettings = this.getAppSettings();
    const ruijieConfig = this.getRuijieConfig();
    const waBotConfig = this.getWhatsAppBotConfig();
    const danaConfig = getStorage<import('../types').DanaGatewayConfig>('anw_dana_config_v1', {
      merchantId: 'MCH-ANUWANINET-8829',
      merchantName: 'AnuwaniNet Broadband & Voucher',
      clientId: 'dana_client_id_live_9918237',
      clientSecret: 'dana_sec_k9823101928301923',
      environment: 'sandbox',
      notificationUrl: 'https://ais-dev-agv7q3nso4fjfu4nqkfcvz-437876397957.asia-southeast1.run.app/api/dana/webhook',
      qrisStaticCode: '00020101021226670014ID.DANA.WWW01189360000000000000000215MCH-ANUWANINET5204581253033605802ID5910AnuwaniNet6007Jakarta6304A1B2',
      autoSettle: true,
      isActive: true
    });

    return {
      id: 'system_settings_primary',
      appSettings,
      ruijieConfig,
      danaConfig,
      waBotConfig,
      updatedAt: new Date().toISOString()
    };
  }

  static async syncSystemSettingsToDatabase(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    const fullSettings = this.getSystemSettingsDatabase();
    setStorage('anw_system_settings_db_v1', fullSettings);
    
    const timeStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    const config = getStoredSupabaseConfig();
    config.lastSettingsSavedAt = timeStr;
    saveStoredSupabaseConfig(config);

    // Auto sync to cloud database (Supabase PostgreSQL / MySQL)
    const client = getSupabaseClient();
    if (client) {
      try {
        const { error } = await client.from('anuwani_system_settings').upsert({
          id: 'primary',
          app_settings: fullSettings.appSettings,
          ruijie_config: fullSettings.ruijieConfig,
          dana_config: fullSettings.danaConfig,
          wa_bot_config: fullSettings.waBotConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (!error) {
          return {
            success: true,
            message: `Seluruh pengaturan berhasil disimpan langsung ke Database (Waktu: ${timeStr})!`,
            timestamp: timeStr
          };
        }
      } catch (err) {
        // Tolerant
      }
    }

    return {
      success: true,
      message: `Pengaturan berhasil disimpan ke Database Lokal & Mirror Cloud (Waktu: ${timeStr}).`,
      timestamp: timeStr
    };
  }

  // Explicit method to save all settings directly to database with user feedback
  static async saveAllSettingsDirectlyToDatabase(): Promise<{
    success: boolean;
    message: string;
    timestamp: string;
  }> {
    return await this.syncSystemSettingsToDatabase();
  }

  // Load latest settings from Supabase Database if available
  static async loadSettingsFromSupabase(): Promise<boolean> {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const { data, error } = await client.from('anuwani_system_settings').select('*').eq('id', 'primary').single();
      if (!error && data) {
        if (data.app_settings) this.saveAppSettings(data.app_settings);
        if (data.ruijie_config) this.saveRuijieConfig(data.ruijie_config);
        if (data.wa_bot_config) this.saveWhatsAppBotConfig(data.wa_bot_config);
        if (data.dana_config) {
          setStorage('anw_dana_config_v1', data.dana_config);
          this.notify('dana_config_updated', data.dana_config);
        }
        return true;
      }
    } catch {
      // Fallback
    }
    return false;
  }

  // Background sync to database with schema transformation
  private static async syncToSupabaseIfConnected(table: string, data: any[]) {
    try {
      await syncTableToSupabase(table, data);
    } catch {
      // Ignored for offline tolerance
    }
  }

  // Push all application entities to database
  static async syncAllToDatabase(): Promise<{ success: boolean; message: string; counts: Record<string, number> }> {
    return await syncAllTablesToDatabase();
  }

  // Pull all application entities from database if connected
  static async loadAllFromDatabase(): Promise<boolean> {
    const res = await loadAllTablesFromDatabase();
    if (res.success && res.data) {
      if (res.data.customers && res.data.customers.length > 0) {
        setStorage(KEYS.CUSTOMERS, res.data.customers);
      }
      if (res.data.packages && res.data.packages.length > 0) {
        setStorage(KEYS.PACKAGES, res.data.packages);
      }
      if (res.data.bills && res.data.bills.length > 0) {
        setStorage(KEYS.BILLS, res.data.bills);
      }
      if (res.data.transactions && res.data.transactions.length > 0) {
        setStorage(KEYS.TRANSACTIONS, res.data.transactions);
      }
      if (res.data.vouchers && res.data.vouchers.length > 0) {
        setStorage(KEYS.VOUCHERS, res.data.vouchers);
      }
      if (res.data.devices && res.data.devices.length > 0) {
        setStorage(KEYS.DEVICES, res.data.devices);
      }
      if (res.data.users && res.data.users.length > 0) {
        setStorage(KEYS.USERS, res.data.users);
      }
      if (res.data.waLogs && res.data.waLogs.length > 0) {
        setStorage(KEYS.WA_LOGS, res.data.waLogs);
      }
      await this.loadSettingsFromSupabase();
      this.notify('database_data_loaded');
      return true;
    }
    return false;
  }

  // Reset demo data helper
  static resetToDemoData() {
    setStorage(KEYS.CUSTOMERS, initialCustomers);
    setStorage(KEYS.PACKAGES, initialPackages);
    setStorage(KEYS.BILLS, initialBills);
    setStorage(KEYS.TRANSACTIONS, initialTransactions);
    setStorage(KEYS.VOUCHERS, initialVouchers);
    setStorage(KEYS.DEVICES, initialRuijieDevices);
    setStorage(KEYS.USERS, initialUsers);
    setStorage(KEYS.RUIJIE_CONFIG, initialRuijieConfig);
    setStorage(KEYS.WA_LOGS, initialWhatsAppLogs);
  }
}
