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
import { getSupabaseClient } from './supabaseService';

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
  }

  // Bills
  static getBills(): Bill[] {
    return getStorage<Bill[]>(KEYS.BILLS, initialBills);
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
    return getStorage<Transaction[]>(KEYS.TRANSACTIONS, initialTransactions);
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
  }

  static getRuijieConfig(): RuijieConfig {
    const raw = getStorage<RuijieConfig>(KEYS.RUIJIE_CONFIG, initialRuijieConfig);
    // ensure backward compatibility with appId and secretKey
    return {
      ...raw,
      appId: raw.appId || raw.apiKey || 'rj_app_anuwani_882910398',
      secretKey: raw.secretKey || raw.apiSecret || 'rj_sec_778120392819039129x88a',
      apiKey: raw.appId || raw.apiKey || 'rj_app_anuwani_882910398',
      apiSecret: raw.secretKey || raw.apiSecret || 'rj_sec_778120392819039129x88a'
    };
  }

  static saveRuijieConfig(config: RuijieConfig) {
    const normalized: RuijieConfig = {
      ...config,
      appId: config.appId || config.apiKey || '',
      secretKey: config.secretKey || config.apiSecret || '',
      apiKey: config.appId || config.apiKey || '',
      apiSecret: config.secretKey || config.apiSecret || ''
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
      receiptFooterNote: 'Simpan kuitansi ini sebagai bukti pembayaran sah. Terima kasih atas kepercayaan Anda.'
    });
  }

  static saveAppSettings(settings: import('../types').AppSettings) {
    setStorage('anw_app_settings_v1', settings);
    this.notify('app_settings_updated', settings);
    this.syncSystemSettingsToDatabase();
  }

  // WhatsApp Bot Config
  static getWhatsAppBotConfig(): import('../types').WhatsAppBotConfig {
    return getStorage<import('../types').WhatsAppBotConfig>('anw_wa_bot_config_v1', {
      senderNumber: '0812-3456-7890',
      fonnteToken: 'FNTE_89a128bc991024_live',
      fonnteDevice: 'DEV-ANUWANINET-01',
      provider: 'fonnte',
      autoSendOnBillCreated: true,
      autoSendOnDueAlert: true,
      botEnabled: true,
      billingTemplate: 'Halo {NAMA}, tagihan AnuwaniNet periode {PERIODE} sebesar {JUMLAH} telah terbit. Jatuh tempo {JATUH_TEMPO}. Bayar DANA: {LINK_DANA}',
      receiptTemplate: 'Halo {NAMA}, pembayaran tagihan {NO_INVOICE} sebesar {JUMLAH} telah LUNAS terverifikasi. Terima kasih!',
      isolirTemplate: 'Pemberitahuan Isolir: Layanan internet AnuwaniNet ID {ID_PELANGGAN} telah dialihkan sementara karena tunggakan tagihan.'
    });
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

  static async syncSystemSettingsToDatabase() {
    const fullSettings = this.getSystemSettingsDatabase();
    setStorage('anw_system_settings_db_v1', fullSettings);
    
    // Auto sync to cloud Supabase if connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('anuwani_system_settings').upsert({
          id: 'primary',
          app_settings: fullSettings.appSettings,
          ruijie_config: fullSettings.ruijieConfig,
          dana_config: fullSettings.danaConfig,
          wa_bot_config: fullSettings.waBotConfig,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (err) {
        // Tolerant
      }
    }
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

  // Optional background sync to Supabase table
  private static async syncToSupabaseIfConnected(table: string, data: any[]) {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      // Non-blocking sync attempt
      // We don't throw to preserve local experience
      await client.from(table).upsert(data, { onConflict: 'id' });
    } catch {
      // Ignored for offline tolerance
    }
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
