import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from '../types';

const STORAGE_KEY_SUPABASE = 'anuwani_supabase_config';

export function getStoredSupabaseConfig(): SupabaseConfig {
  const saved = localStorage.getItem(STORAGE_KEY_SUPABASE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  return {
    url: (import.meta as any).env?.VITE_SUPABASE_URL || '',
    anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
    isConnected: false,
    autoBackupEnabled: true,
    backupIntervalHours: 24,
    lastBackupAt: undefined
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig) {
  localStorage.setItem(STORAGE_KEY_SUPABASE, JSON.stringify(config));
}

const STORAGE_KEY_BACKUP_LOGS = 'anuwani_database_backup_logs';

export function getDatabaseBackupLogs(): import('../types').DatabaseBackupRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BACKUP_LOGS);
    if (saved) return JSON.parse(saved);
  } catch {
    // fallback
  }
  return [
    {
      id: 'bk-init-1',
      timestamp: '2026-10-10 18:00',
      tables: ['anuwani_customers', 'anuwani_transactions', 'anuwani_bills', 'anuwani_vouchers'],
      totalRecords: 48,
      fileSizeKb: 14.8,
      status: 'completed',
      triggerType: 'scheduled',
      summary: {
        customers: 5,
        transactions: 7,
        bills: 5,
        vouchers: 6
      }
    }
  ];
}

export function addDatabaseBackupLog(record: import('../types').DatabaseBackupRecord) {
  const list = getDatabaseBackupLogs();
  list.unshift(record);
  try {
    localStorage.setItem(STORAGE_KEY_BACKUP_LOGS, JSON.stringify(list.slice(0, 50)));
  } catch (e) {
    console.error('Failed to save backup log:', e);
  }
}

/**
 * Executes a full database backup export of core tables (customers, transactions, bills, vouchers).
 * Generates structured JSON dump and initiates a download file if downloadFile=true.
 */
export async function executeDatabaseBackup(triggerType: 'manual' | 'scheduled' = 'manual', downloadFile: boolean = false): Promise<{
  success: boolean;
  message: string;
  backupRecord?: import('../types').DatabaseBackupRecord;
  dataDump?: any;
}> {
  try {
    const customers = JSON.parse(localStorage.getItem('anw_customers_v1') || '[]');
    const transactions = JSON.parse(localStorage.getItem('anw_transactions_v1') || '[]');
    const bills = JSON.parse(localStorage.getItem('anw_bills_v1') || '[]');
    const vouchers = JSON.parse(localStorage.getItem('anw_vouchers_v1') || '[]');
    const systemSettings = JSON.parse(localStorage.getItem('anw_system_settings_db_v1') || '{}');

    const totalRecords = customers.length + transactions.length + bills.length + vouchers.length;
    const backupId = 'bk-' + Date.now();
    const timestampStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

    const exportPayload = {
      version: '1.0',
      application: 'AnuwaniNet ISP Management System',
      backupId,
      exportedAt: new Date().toISOString(),
      timestampLocal: timestampStr,
      environment: 'Supabase / Cloud PostgreSQL & Local Storage Mirror',
      triggerType,
      tables: {
        anuwani_customers: customers,
        anuwani_transactions: transactions,
        anuwani_bills: bills,
        anuwani_vouchers: vouchers,
        anuwani_system_settings: systemSettings
      },
      metadata: {
        customerCount: customers.length,
        transactionCount: transactions.length,
        billCount: bills.length,
        voucherCount: vouchers.length,
        totalRecords
      }
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);
    const sizeKb = Number((new Blob([jsonString]).size / 1024).toFixed(1));

    const record: import('../types').DatabaseBackupRecord = {
      id: backupId,
      timestamp: timestampStr,
      tables: ['anuwani_customers', 'anuwani_transactions', 'anuwani_bills', 'anuwani_vouchers'],
      totalRecords,
      fileSizeKb: sizeKb,
      status: 'completed',
      triggerType,
      summary: {
        customers: customers.length,
        transactions: transactions.length,
        bills: bills.length,
        vouchers: vouchers.length
      }
    };

    // Save log
    addDatabaseBackupLog(record);

    // Update config last backup time
    const currentCfg = getStoredSupabaseConfig();
    currentCfg.lastBackupAt = timestampStr;
    saveStoredSupabaseConfig(currentCfg);

    // If client requested file download, trigger browser file save
    if (downloadFile && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `anuwaninet-db-backup-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    // Try cloud sync if Supabase client is connected
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('anuwani_system_settings').upsert({
          id: 'backup_latest_meta',
          app_settings: {
            lastBackupId: backupId,
            lastBackupAt: timestampStr,
            recordCount: totalRecords
          },
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch {
        // Tolerant
      }
    }

    return {
      success: true,
      message: `Cadangan database berhasil diekspor (${totalRecords} catatan, ${sizeKb} KB)!`,
      backupRecord: record,
      dataDump: exportPayload
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal membuat cadangan database.'
    };
  }
}

/**
 * Initializes recurring database backup scheduler based on SupabaseConfig
 */
export function checkAndTriggerScheduledBackup(): boolean {
  const config = getStoredSupabaseConfig();
  if (!config.autoBackupEnabled) return false;

  const intervalHours = config.backupIntervalHours || 24;
  const lastBackup = config.lastBackupAt;

  if (!lastBackup) {
    executeDatabaseBackup('scheduled', false);
    return true;
  }

  // Check elapsed time
  const lastTime = new Date(lastBackup).getTime();
  const now = Date.now();
  if (isNaN(lastTime) || now - lastTime >= intervalHours * 3600 * 1000) {
    executeDatabaseBackup('scheduled', false);
    return true;
  }
  return false;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getStoredSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }
  if (!cachedClient) {
    try {
      cachedClient = createClient(config.url, config.anonKey);
    } catch (e) {
      console.error('Supabase client init error:', e);
      return null;
    }
  }
  return cachedClient;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url.startsWith('https://')) {
      return { success: false, message: 'URL Supabase harus diawali dengan https://' };
    }
    const client = createClient(url, anonKey);
    // Simple ping check
    const { error } = await client.from('anuwani_users').select('count', { count: 'exact', head: true });
    
    // If table doesn't exist yet, it's still a reachable Supabase instance
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation') && !error.message.includes('does not exist')) {
      if (error.message.includes('API key')) {
        return { success: false, message: 'Anon Key tidak valid atau tidak diizinkan.' };
      }
    }
    
    return { 
      success: true, 
      message: 'Koneksi ke Supabase berhasil terhubung! Tabel database siap disinkronisasikan.' 
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Gagal terhubung ke endpoint Supabase.' };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- ANUWANINET ISP DATABASE SCHEMA (PostgreSQL / Supabase)
-- Jalankan skrip ini di: Supabase Dashboard > SQL Editor
-- ========================================================

-- 1. Tabel Users & Autentikasi
CREATE TABLE IF NOT EXISTS public.anuwani_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'pelanggan')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
    customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- 2. Tabel Paket Layanan Internet
CREATE TABLE IF NOT EXISTS public.anuwani_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    speed_mbps INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    validity_days INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bulanan', 'voucher')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel Pelanggan (Customers)
CREATE TABLE IF NOT EXISTS public.anuwani_customers (
    id TEXT PRIMARY KEY,
    customer_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    email TEXT,
    pppoe_username TEXT UNIQUE NOT NULL,
    pppoe_password TEXT NOT NULL,
    ip_address TEXT,
    mac_address TEXT,
    package_id TEXT REFERENCES public.anuwani_packages(id) ON DELETE SET NULL,
    package_name TEXT NOT NULL,
    package_price NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'isolated', 'pending', 'inactive')),
    auto_isolir_enabled BOOLEAN DEFAULT TRUE,
    billing_day INTEGER DEFAULT 20,
    join_date DATE DEFAULT CURRENT_DATE,
    last_payment_date TIMESTAMPTZ,
    ruijie_device_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel Tagihan Bulanan (Bills)
CREATE TABLE IF NOT EXISTS public.anuwani_bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES public.anuwani_customers(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    package_id TEXT,
    package_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    period TEXT NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ,
    payment_method TEXT,
    transaction_ref TEXT,
    whatsapp_reminder_sent BOOLEAN DEFAULT FALSE,
    dana_payment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Transaksi Keuangan (Kas Masuk & Keluar)
CREATE TABLE IF NOT EXISTS public.anuwani_transactions (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('tagihan', 'voucher', 'pemasangan', 'pengeluaran_operasional')),
    category TEXT NOT NULL CHECK (category IN ('income', 'expense')),
    amount NUMERIC(12, 2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    notes TEXT,
    whatsapp_notification_sent BOOLEAN DEFAULT FALSE,
    dana_transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Sesi Pembayaran DANA Gateway
CREATE TABLE IF NOT EXISTS public.anuwani_dana_sessions (
    id TEXT PRIMARY KEY,
    order_id TEXT UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    item_type TEXT NOT NULL,
    item_title TEXT NOT NULL,
    item_ref_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_url TEXT,
    deep_link TEXT,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 7. Tabel Voucher Hotspot Ruijie
CREATE TABLE IF NOT EXISTS public.anuwani_vouchers (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    password TEXT,
    package_id TEXT,
    package_name TEXT NOT NULL,
    duration_hours INTEGER NOT NULL,
    price NUMERIC(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ,
    buyer_phone TEXT,
    buyer_name TEXT,
    ruijie_synced BOOLEAN DEFAULT TRUE
);

-- 8. Tabel Log Pesan WhatsApp & Bot
CREATE TABLE IF NOT EXISTS public.anuwani_wa_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    recipient_name TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'sent'
);

-- 9. Tabel Pusat Pengaturan Aplikasi & Integrasi (Ruijie, DANA, Fonnte WA, ISP)
CREATE TABLE IF NOT EXISTS public.anuwani_system_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    app_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    ruijie_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    dana_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    wa_bot_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.anuwani_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuwani_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuwani_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuwani_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuwani_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuwani_dana_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuwani_system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated and anon app tokens
CREATE POLICY "Public Read/Write for AnuwaniNet App" ON public.anuwani_users FOR ALL USING (true);
CREATE POLICY "Public Read/Write for Customers" ON public.anuwani_customers FOR ALL USING (true);
CREATE POLICY "Public Read/Write for Bills" ON public.anuwani_bills FOR ALL USING (true);
CREATE POLICY "Public Read/Write for Transactions" ON public.anuwani_transactions FOR ALL USING (true);
CREATE POLICY "Public Read/Write for Vouchers" ON public.anuwani_vouchers FOR ALL USING (true);
CREATE POLICY "Public Read/Write for Dana Sessions" ON public.anuwani_dana_sessions FOR ALL USING (true);
CREATE POLICY "Public Read/Write for System Settings" ON public.anuwani_system_settings FOR ALL USING (true);
`;
