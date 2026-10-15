export type UserRole = 'superadmin' | 'admin' | 'pelanggan';
export type ThemePreference = 'midnight' | 'clean';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  customerId?: string; // Links to customer record if role is pelanggan
  themePreference?: ThemePreference;
}

export type CustomerStatus = 'active' | 'isolated' | 'pending' | 'inactive';

export interface Customer {
  id: string;
  customerCode: string; // e.g. ANW-101
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
  status: CustomerStatus;
  autoIsolirEnabled: boolean;
  billingDay: number; // e.g., 20
  joinDate: string;
  lastPaymentDate?: string;
  ruijieDeviceId: string;
  notes?: string;
}

export interface InternetPackage {
  id: string;
  name: string;
  speedMbps: number;
  price: number;
  validityDays: number;
  type: 'bulanan' | 'voucher';
  description: string;
}

export type BillStatus = 'unpaid' | 'paid' | 'overdue';

export type PaymentMethod = 'cash' | 'transfer' | 'qris' | 'dana' | 'whatsapp_bot';

export interface Bill {
  id: string;
  billNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  packageId: string;
  packageName: string;
  amount: number;
  period: string; // e.g., "Oktober 2026"
  dueDate: string;
  status: BillStatus;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  transactionRef?: string;
  whatsappReminderSent?: boolean;
  danaPaymentUrl?: string;
}

export interface Transaction {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  type: 'tagihan' | 'voucher' | 'pemasangan' | 'pengeluaran_operasional';
  category: 'income' | 'expense';
  amount: number;
  date: string;
  paymentMethod: PaymentMethod;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
  whatsappNotificationSent: boolean;
  danaTransactionId?: string;
}

export interface Voucher {
  id: string;
  code: string;
  password?: string;
  packageId: string;
  packageName: string;
  durationHours: number;
  price: number;
  status: 'available' | 'used' | 'expired';
  generatedAt: string;
  usedAt?: string;
  buyerPhone?: string;
  buyerName?: string;
  ruijieSynced: boolean;
}

export interface RuijieDevice {
  id: string;
  name: string;
  ip: string;
  model: string;
  siteId: string;
  serialNumber: string;
  status: 'online' | 'offline';
  connectedUsers: number;
  cpuUsage: number;
  memUsage: number;
  isolirPoolName: string;
  lastSync: string;
}

export interface WhatsAppMessageLog {
  id: string;
  phone: string;
  recipientName: string;
  type: 'tagihan' | 'bukti_bayar' | 'isolir_alert' | 'voucher_delivery' | 'bot_reply';
  message: string;
  timestamp: string;
  status: 'sent' | 'pending' | 'failed';
}

export interface BotChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  voucherCode?: string;
  billData?: any;
}

export interface RuijieConfig {
  cloudUrl: string;
  appId: string; // Ruijie Reyee Cloud App ID
  secretKey: string; // Ruijie Reyee Cloud Secret Key
  apiKey?: string; // Backwards-compatible alias
  apiSecret?: string; // Backwards-compatible alias
  siteId: string;
  autoIsolirDay: number; // default 20th
  gracePeriodDays: number; // default 2 days after due date
  isolirProfileName: string;
  normalProfileName: string;
  autoIsolirActive: boolean;
}

export interface DanaGatewayConfig {
  merchantId: string;
  merchantName: string;
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
  notificationUrl: string;
  qrisStaticCode: string;
  autoSettle: boolean;
  isActive: boolean;
}

export interface DanaPaymentSession {
  id: string;
  orderId: string;
  amount: number;
  itemType: 'bill' | 'voucher';
  itemTitle: string;
  itemRefId: string;
  customerName: string;
  customerPhone: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  paymentUrl: string;
  deepLink: string;
  qrCodeUrl: string;
  createdAt: string;
  paidAt?: string;
  voucherCode?: string;
  voucherPassword?: string;
}

export interface SupabaseConfig {
  engine?: 'supabase' | 'mysql';
  url: string;
  anonKey: string;
  mysqlHost?: string;
  mysqlPort?: number;
  mysqlDatabase?: string;
  mysqlUser?: string;
  mysqlPassword?: string;
  isConnected: boolean;
  lastTested?: string;
  backupIntervalHours?: number; // e.g., 1, 6, 12, 24, 48, 168 hours
  backupFrequency?: 'hourly' | 'every_6_hours' | 'every_12_hours' | 'daily' | 'every_2_days' | 'weekly' | 'custom';
  backupExecutionTime?: string; // e.g. "02:00" WIB
  autoBackupEnabled?: boolean;
  autoDownloadOnScheduled?: boolean;
  backupRetentionCount?: number;
  lastBackupAt?: string;
  lastSuccessfulBackupAt?: string;
  lastSuccessfulBackupTimestamp?: number;
  lastBackupStatus?: 'completed' | 'failed' | 'in_progress';
  lastBackupSizeKb?: number;
  lastBackupRecordCount?: number;
  lastSettingsSavedAt?: string;
}

export interface DatabaseBackupRecord {
  id: string;
  timestamp: string;
  tables: string[];
  totalRecords: number;
  fileSizeKb: number;
  status: 'completed' | 'in_progress' | 'failed';
  triggerType: 'manual' | 'scheduled';
  summary: {
    customers: number;
    transactions: number;
    bills: number;
    vouchers: number;
  };
}

export interface AppSettings {
  appName: string;
  companyName: string;
  phoneCs: string;
  addressNoc: string;
  bcaAccount: string;
  briAccount: string;
  receiptFooterNote: string;
  autoGenerateBillsEnabled?: boolean;
  autoGenerateBillsDay?: number; // e.g., 1 (1st of every month)
  lastAutoGeneratedPeriod?: string; // e.g., "Oktober 2026"
}

export interface WhatsAppCustomTemplate {
  id: string;
  name: string;
  category: 'tagihan' | 'kuitansi' | 'pengingat' | 'promosi' | 'isolir';
  content: string;
  description?: string;
  isDefault?: boolean;
  createdAt?: string;
}

export interface WhatsAppBotConfig {
  senderNumber: string;
  fonnteToken: string; // Fonnte API Token / Device Token
  fonnteDevice?: string; // Optional device ID / name
  provider: 'fonnte' | 'direct'; // Gateway provider
  autoSendOnBillCreated: boolean;
  autoSendOnDueAlert: boolean;
  botEnabled: boolean;
  billingTemplate: string;
  receiptTemplate: string;
  isolirTemplate: string;
  customTemplates?: WhatsAppCustomTemplate[];
}

export interface SystemSettingsDatabase {
  id: string;
  appSettings: AppSettings;
  ruijieConfig: RuijieConfig;
  danaConfig: DanaGatewayConfig;
  waBotConfig: WhatsAppBotConfig;
  updatedAt: string;
  updatedBy?: string;
}

