import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AppSettings,
  RuijieConfig,
  DanaGatewayConfig,
  WhatsAppBotConfig,
  SupabaseConfig,
  DanaPaymentSession,
  Customer,
  Bill
} from '../types';
import { DataService } from '../services/dataService';
import { RuijieService } from '../services/ruijieService';
import { DanaService } from '../services/danaService';
import { FonnteService } from '../services/fonnteService';
import { WhatsAppService } from '../services/whatsappService';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  testMySQLConnection,
  SUPABASE_SQL_SCHEMA,
  MYSQL_SQL_SCHEMA,
  executeDatabaseBackup,
  getDatabaseBackupLogs,
  clearDatabaseBackupLogs,
  downloadDatabaseBackupFile,
  checkAndTriggerScheduledBackup
} from '../services/supabaseService';
import {
  Settings,
  Sliders,
  Server,
  CreditCard,
  Smartphone,
  Database,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Key,
  Globe,
  Phone,
  Building,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Radio,
  Send,
  Download,
  HardDriveDownload,
  HardDrive,
  Clock,
  Timer,
  History,
  Archive,
  FileText,
  BookOpen,
  Receipt,
  Calendar,
  Play,
  Sparkles,
  Layers,
  ArrowRight,
  ChevronRight,
  Filter,
  Trash2,
  Activity,
  Info,
  User,
  Lock,
  Eye,
  EyeOff,
  MessageSquare,
  BellRing,
  Router,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { WhatsAppTemplateModal } from '../components/modals/WhatsAppTemplateModal';
import { RuijieImportModal } from '../components/modals/RuijieImportModal';
import { HostingTutorialSection } from '../components/HostingTutorialSection';

interface PengaturanSuperadminViewProps {
  onOpenDanaCheckout?: (session: DanaPaymentSession) => void;
  onRefreshData: () => void;
}

export const PengaturanSuperadminView: React.FC<PengaturanSuperadminViewProps> = ({
  onOpenDanaCheckout,
  onRefreshData
}) => {
  const { currentUser } = useAuth();

  // Tab inside unified settings
  const [activeSection, setActiveSection] = useState<'app' | 'backup' | 'ruijie' | 'dana' | 'whatsapp' | 'templates' | 'tutorial'>('app');

  // Dedicated WhatsApp Message Templates States
  const [templateActiveTab, setTemplateActiveTab] = useState<'reminder' | 'urgent' | 'receipt' | 'isolir'>('reminder');
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState<string | null>(null);
  const [previewCustomerScenario, setPreviewCustomerScenario] = useState<'normal' | 'overdue'>('normal');
  const [previewTestPhone, setPreviewTestPhone] = useState<string>('081234567890');
  const [isSendingPreviewTest, setIsSendingPreviewTest] = useState(false);
  const templateTextareaRef = useRef<HTMLTextAreaElement>(null);

  // States
  const [appSettings, setAppSettings] = useState<AppSettings>(() => DataService.getAppSettings());
  const [ruijieConfig, setRuijieConfig] = useState<RuijieConfig>(() => DataService.getRuijieConfig());
  const [danaConfig, setDanaConfig] = useState<DanaGatewayConfig>(() => DanaService.getConfig());
  const [waBotConfig, setWaBotConfig] = useState<WhatsAppBotConfig>(() => DataService.getWhatsAppBotConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());

  const [notice, setNotice] = useState<string | null>(null);
  const [ruijieTestResult, setRuijieTestResult] = useState<{ success: boolean; latency?: number; message: string } | null>(null);
  const [isTestingRuijie, setIsTestingRuijie] = useState(false);
  const [showRuijiePassword, setShowRuijiePassword] = useState(false);
  const [showRuijieHubModal, setShowRuijieHubModal] = useState(false);
  const [ruijieHubInitialTab, setRuijieHubInitialTab] = useState<'sync' | 'import' | 'export' | 'template'>('sync');
  const [isSyncingRuijie, setIsSyncingRuijie] = useState(false);

  const [fonnteTestResult, setFonnteTestResult] = useState<{ status: boolean; message?: string; device?: string; quota?: number } | null>(null);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);
  const [testFonntePhone, setTestFonntePhone] = useState('081234567890');
  const [isSendingFonnteTest, setIsSendingFonnteTest] = useState(false);

  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [isSyncingAllDb, setIsSyncingAllDb] = useState(false);
  const [dbSyncSummary, setDbSyncSummary] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedMysqlSql, setCopiedMysqlSql] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState<'supabase' | 'mysql'>('supabase');
  const [dbEngine, setDbEngine] = useState<'supabase' | 'mysql'>(() => supabaseConfig.engine || 'supabase');
  const [isSavingAllSettingsDb, setIsSavingAllSettingsDb] = useState(false);

  // Dedicated Database Backup Configuration States
  const [backupLogs, setBackupLogs] = useState(() => getDatabaseBackupLogs());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [backupFilter, setBackupFilter] = useState<'all' | 'scheduled' | 'manual'>('all');
  const [isTestingScheduler, setIsTestingScheduler] = useState(false);
  const [schedulerNotice, setSchedulerNotice] = useState<string | null>(null);
  const [backupPreset, setBackupPreset] = useState<string>(() => {
    const hours = supabaseConfig.backupIntervalHours || 24;
    if (hours === 1) return '1';
    if (hours === 6) return '6';
    if (hours === 12) return '12';
    if (hours === 24) return '24';
    if (hours === 48) return '48';
    if (hours === 168) return '168';
    return 'custom';
  });

  // Template Manager Modal State
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  // Auto-Generate Bills States
  const [isTestingAutoBilling, setIsTestingAutoBilling] = useState(false);
  const [autoBillingNotice, setAutoBillingNotice] = useState<string | null>(null);

  // Security guard: Only Superadmin
  if (currentUser?.role !== 'superadmin') {
    return (
      <div className="p-8 rounded-2xl bg-zinc-900 border border-red-900/40 text-center max-w-lg mx-auto space-y-3">
        <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-white">Akses Dibatasi</h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Menu Pengaturan Terpadu (Aplikasi, Ruijie Reyee, DANA Gateways, dan WhatsApp Bot) hanya dapat diakses oleh akun dengan peran <strong>Superadmin</strong>.
        </p>
      </div>
    );
  }

  // Save Handlers - All settings save directly to Database
  const handleSaveAppSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveAppSettings(appSettings);
    const syncRes = await DataService.syncSystemSettingsToDatabase();
    setNotice(`Pengaturan identitas ISP berhasil disimpan langsung ke Database (${syncRes.timestamp})!`);
    setSupabaseConfig(getStoredSupabaseConfig());
    setTimeout(() => setNotice(null), 4500);
  };

  const handleToggleAutoGenerateBills = async () => {
    const updated: AppSettings = {
      ...appSettings,
      autoGenerateBillsEnabled: !appSettings.autoGenerateBillsEnabled
    };
    DataService.saveAppSettings(updated);
    setAppSettings(updated);
    const syncRes = await DataService.syncSystemSettingsToDatabase();
    setAutoBillingNotice(
      updated.autoGenerateBillsEnabled
        ? `Auto-Generate Bills AKTIF: Tagihan bulanan otomatis di awal bulan (Tersimpan ke Database: ${syncRes.timestamp}).`
        : `Auto-Generate Bills DINONAKTIFKAN: Pembuatan tagihan massal kini manual (Tersimpan ke Database: ${syncRes.timestamp}).`
    );
    setSupabaseConfig(getStoredSupabaseConfig());
    onRefreshData();
    setTimeout(() => setAutoBillingNotice(null), 5000);
  };

  const handleTriggerAutoBillingNow = () => {
    setIsTestingAutoBilling(true);
    const res = DataService.checkAndRunAutoBilling(true);
    setIsTestingAutoBilling(false);
    setAutoBillingNotice(res.message);
    setAppSettings(DataService.getAppSettings());
    onRefreshData();
    setTimeout(() => setAutoBillingNotice(null), 6000);
  };

  const handleResetAutoBillingPeriod = () => {
    const updated: AppSettings = {
      ...appSettings,
      lastAutoGeneratedPeriod: undefined
    };
    DataService.saveAppSettings(updated);
    setAppSettings(updated);
    setAutoBillingNotice('Riwayat periode auto-generate berhasil di-reset. Anda dapat menguji kembali pemicu otomatis untuk bulan berjalan.');
    onRefreshData();
    setTimeout(() => setAutoBillingNotice(null), 4500);
  };

  const handleSaveRuijieConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveRuijieConfig(ruijieConfig);
    const syncRes = await DataService.syncSystemSettingsToDatabase();
    setNotice(`Pengaturan Ruijie Reyee & Auto-Isolir berhasil disimpan langsung ke Database (${syncRes.timestamp})!`);
    setSupabaseConfig(getStoredSupabaseConfig());
    setTimeout(() => setNotice(null), 4500);
  };

  const handleSyncRuijieNow = async () => {
    setIsSyncingRuijie(true);
    try {
      const res = await RuijieService.executeRuijieCloudSync('manual');
      setNotice(res.message);
      setRuijieConfig(DataService.getRuijieConfig());
      onRefreshData();
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setNotice(`Gagal sinkronisasi Ruijie: ${e?.message}`);
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setIsSyncingRuijie(false);
    }
  };

  const handleSaveDanaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    DanaService.saveConfig(danaConfig);
    const syncRes = await DataService.syncSystemSettingsToDatabase();
    setNotice(`Pengaturan DANA Payment Gateway berhasil disimpan langsung ke Database (${syncRes.timestamp})!`);
    setSupabaseConfig(getStoredSupabaseConfig());
    setTimeout(() => setNotice(null), 4500);
  };

  const handleSaveWaBotConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveWhatsAppBotConfig(waBotConfig);
    const syncRes = await DataService.syncSystemSettingsToDatabase();
    setNotice(`Pengaturan WhatsApp Bot via Fonnte berhasil disimpan langsung ke Database (${syncRes.timestamp})!`);
    setSupabaseConfig(getStoredSupabaseConfig());
    setTimeout(() => setNotice(null), 4500);
  };

  // Default official templates for reset
  const DEFAULT_REMINDER_TMPL = `Halo Kak *{{customer_name}}* ({{customer_code}}) 😊,
Kami menginformasikan bahwa tagihan internet AnuwaniNet untuk periode *{{period}}* sebesar *{{bill_amount}}* telah terbit.

Batas jatuh tempo: *{{due_date}}*.
Paket Layanan: *{{package_name}}*

Pembayaran praktis & otomatis via DANA & QRIS:
👉 {{payment_link}}

Rekening Bank Resmi AnuwaniNet:
• BCA: 8291-039-112 a/n AnuwaniNet
• BRI: 0021-01-082910-50-1 a/n AnuwaniNet

Abaikan pesan ini apabila Kakak sudah melakukan pembayaran. Terima kasih banyak!`;

  const DEFAULT_URGENT_TMPL = `🚨 *PERINGATAN PEMBAYARAN MENDESAK (URGENT PAYMENT)* 🚨
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

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = templateTextareaRef.current;
    if (!textarea) {
      if (templateActiveTab === 'reminder') {
        setWaBotConfig(prev => ({
          ...prev,
          reminderTemplate: (prev.reminderTemplate || DEFAULT_REMINDER_TMPL) + ' ' + placeholder
        }));
      } else if (templateActiveTab === 'urgent') {
        setWaBotConfig(prev => ({
          ...prev,
          urgentNoticeTemplate: (prev.urgentNoticeTemplate || DEFAULT_URGENT_TMPL) + ' ' + placeholder
        }));
      } else if (templateActiveTab === 'receipt') {
        setWaBotConfig(prev => ({
          ...prev,
          receiptTemplate: (prev.receiptTemplate || '') + ' ' + placeholder
        }));
      } else if (templateActiveTab === 'isolir') {
        setWaBotConfig(prev => ({
          ...prev,
          isolirTemplate: (prev.isolirTemplate || '') + ' ' + placeholder
        }));
      }
    } else {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const currentVal = textarea.value;
      const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);

      if (templateActiveTab === 'reminder') {
        setWaBotConfig(prev => ({ ...prev, reminderTemplate: newVal }));
      } else if (templateActiveTab === 'urgent') {
        setWaBotConfig(prev => ({ ...prev, urgentNoticeTemplate: newVal }));
      } else if (templateActiveTab === 'receipt') {
        setWaBotConfig(prev => ({ ...prev, receiptTemplate: newVal }));
      } else if (templateActiveTab === 'isolir') {
        setWaBotConfig(prev => ({ ...prev, isolirTemplate: newVal }));
      }

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 50);
    }

    try {
      navigator.clipboard.writeText(placeholder);
      setCopiedPlaceholder(placeholder);
      setTimeout(() => setCopiedPlaceholder(null), 2500);
    } catch (err) {}
  };

  const handleSaveTemplates = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    DataService.saveWhatsAppBotConfig(waBotConfig);
    const syncRes = await DataService.syncSystemSettingsToDatabase();
    setTemplateNotice(`✅ Template WhatsApp berhasil disimpan & disinkronkan ke Database (${syncRes.timestamp})!`);
    onRefreshData();
    setTimeout(() => setTemplateNotice(null), 5000);
  };

  const handleResetActiveTemplateToDefault = () => {
    if (templateActiveTab === 'reminder') {
      setWaBotConfig(prev => ({ ...prev, reminderTemplate: DEFAULT_REMINDER_TMPL }));
      setTemplateNotice('Template Pengingat Pembayaran (Payment Reminder) telah di-reset ke format default resmi.');
    } else if (templateActiveTab === 'urgent') {
      setWaBotConfig(prev => ({ ...prev, urgentNoticeTemplate: DEFAULT_URGENT_TMPL }));
      setTemplateNotice('Template Peringatan Mendesak (Urgent Notice) telah di-reset ke format default resmi.');
    } else if (templateActiveTab === 'receipt') {
      setWaBotConfig(prev => ({ ...prev, receiptTemplate: 'Halo {{customer_name}}, pembayaran tagihan {{bill_number}} sebesar {{bill_amount}} telah LUNAS terverifikasi. Terima kasih!' }));
      setTemplateNotice('Template Kuitansi telah di-reset ke format default.');
    } else if (templateActiveTab === 'isolir') {
      setWaBotConfig(prev => ({ ...prev, isolirTemplate: 'Pemberitahuan Isolir: Layanan internet AnuwaniNet ID {{customer_code}} telah dialihkan sementara karena tunggakan tagihan {{bill_amount}}.' }));
      setTemplateNotice('Template Isolir telah di-reset ke format default.');
    }
    setTimeout(() => setTemplateNotice(null), 4000);
  };

  // Sample Data for Real-Time WhatsApp Live Simulation
  const sampleCustNormal: Customer = {
    id: 'sample-norm',
    customerCode: 'ANW-1082',
    name: 'Budi Santoso',
    phone: previewTestPhone || '085711223344',
    address: 'Perum Grand Anuwani Blok B2 No. 14, Tangerang',
    email: 'budi.santoso@example.com',
    pppoeUsername: 'budi_santoso',
    pppoePassword: 'pass_budi_01',
    ipAddress: '192.168.10.25',
    macAddress: 'BC:24:11:8A:92:01',
    packageId: 'pkg-2',
    packageName: 'Paket Keluarga Ultra 20 Mbps',
    packagePrice: 165000,
    status: 'active',
    autoIsolirEnabled: true,
    billingDay: 20,
    joinDate: '2026-01-15',
    ruijieDeviceId: 'dev-gw-01'
  };

  const sampleCustOverdue: Customer = {
    id: 'sample-od',
    customerCode: 'ANW-2041',
    name: 'Ahmad Fauzi',
    phone: previewTestPhone || '081299887766',
    address: 'Jl. Melati Raya No. 45 RT 03/07, Jakarta Barat',
    email: 'ahmad.fauzi@example.com',
    pppoeUsername: 'ahmad_fauzi',
    pppoePassword: 'pass_ahmad_02',
    ipAddress: '192.168.10.44',
    macAddress: 'BC:24:11:8A:92:02',
    packageId: 'pkg-3',
    packageName: 'Paket Bisnis Cepat 50 Mbps',
    packagePrice: 325000,
    status: 'isolated',
    autoIsolirEnabled: true,
    billingDay: 15,
    joinDate: '2025-11-10',
    ruijieDeviceId: 'dev-gw-01'
  };

  const activeSampleCustomer = previewCustomerScenario === 'overdue' ? sampleCustOverdue : sampleCustNormal;
  const activeSampleBill: Bill = {
    id: 'bill-preview-01',
    billNumber: previewCustomerScenario === 'overdue' ? 'INV-202610-042' : 'INV-202610-088',
    customerId: activeSampleCustomer.id,
    customerName: activeSampleCustomer.name,
    customerPhone: activeSampleCustomer.phone,
    packageId: activeSampleCustomer.packageId,
    packageName: activeSampleCustomer.packageName,
    amount: activeSampleCustomer.packagePrice,
    period: 'Oktober 2026',
    dueDate: previewCustomerScenario === 'overdue' ? '2026-10-15' : '2026-10-20',
    status: previewCustomerScenario === 'overdue' ? 'overdue' : 'unpaid'
  };

  // Current active template content
  const currentTemplateText =
    templateActiveTab === 'reminder'
      ? (waBotConfig.reminderTemplate || DEFAULT_REMINDER_TMPL)
      : templateActiveTab === 'urgent'
      ? (waBotConfig.urgentNoticeTemplate || DEFAULT_URGENT_TMPL)
      : templateActiveTab === 'receipt'
      ? waBotConfig.receiptTemplate
      : waBotConfig.isolirTemplate;

  // Live evaluated preview text
  const evaluatedPreviewText = WhatsAppService.renderTemplate(currentTemplateText, {
    customer: activeSampleCustomer,
    bill: activeSampleBill,
    daysOverdue: previewCustomerScenario === 'overdue' ? 3 : 0
  });

  const handleSendTemplateTestWeb = () => {
    const phone = previewTestPhone || activeSampleCustomer.phone;
    WhatsAppService.openWhatsAppUrl(phone, evaluatedPreviewText);
  };

  const handleSendTemplateTestFonnte = async () => {
    if (!previewTestPhone) {
      alert('Masukkan nomor WhatsApp tujuan terlebih dahulu.');
      return;
    }
    setIsSendingPreviewTest(true);
    const res = await FonnteService.sendMessage(previewTestPhone, evaluatedPreviewText, waBotConfig.fonnteToken);
    setIsSendingPreviewTest(false);
    if (res.status) {
      setTemplateNotice(`✅ Pesan uji coba berhasil dikirim via Fonnte Gateway ke ${previewTestPhone}!`);
    } else {
      setTemplateNotice(`⚠️ Status Fonnte: ${res.message}. Anda juga dapat mengklik 'Kirim via WhatsApp Web'.`);
    }
    setTimeout(() => setTemplateNotice(null), 6000);
  };

  // Dedicated Save All Settings to Database handler
  const handleSaveAllSettingsDirectlyToDatabase = async () => {
    setIsSavingAllSettingsDb(true);
    try {
      const res = await DataService.saveAllSettingsDirectlyToDatabase();
      setIsSavingAllSettingsDb(false);
      setNotice(res.message);
      setSupabaseConfig(getStoredSupabaseConfig());
      onRefreshData();
      setTimeout(() => setNotice(null), 5500);
    } catch (e: any) {
      setIsSavingAllSettingsDb(false);
      setNotice(e?.message || 'Gagal menyimpan pengaturan ke database.');
    }
  };

  const handleTestRuijie = async () => {
    setIsTestingRuijie(true);
    setRuijieTestResult(null);
    const res = await RuijieService.testRuijieConnection(ruijieConfig);
    setIsTestingRuijie(false);
    setRuijieTestResult({
      success: res.success,
      latency: res.latencyMs,
      message: res.message
    });
  };

  const handleTestFonnteDevice = async () => {
    setIsTestingFonnte(true);
    setFonnteTestResult(null);
    const res = await FonnteService.checkDeviceStatus(waBotConfig.fonnteToken);
    setIsTestingFonnte(false);
    setFonnteTestResult(res);
  };

  const handleSendTestMessageFonnte = async () => {
    if (!testFonntePhone) return;
    setIsSendingFonnteTest(true);
    const testMsg = `*ANUWANINET TEST BOT*\nHalo, ini pesan pengujian gateway WhatsApp via layanan *Fonnte*.\nSistem tagihan & isolir Ruijie terhubung sukses!\nWaktu: ${new Date().toLocaleString('id-ID')}`;
    const res = await FonnteService.sendMessage(testFonntePhone, testMsg, waBotConfig.fonnteToken);
    setIsSendingFonnteTest(false);
    setNotice(res.status ? `Pesan tes Fonnte berhasil diproses ke ${testFonntePhone}` : `Gagal: ${res.message}`);
    setTimeout(() => setNotice(null), 4500);
    onRefreshData();
  };

  const handleReloadFromCloudDatabase = async () => {
    setIsLoadingFromDb(true);
    const ok = await DataService.loadSettingsFromSupabase();
    setIsLoadingFromDb(false);
    if (ok) {
      setAppSettings(DataService.getAppSettings());
      setRuijieConfig(DataService.getRuijieConfig());
      setDanaConfig(DanaService.getConfig());
      setWaBotConfig(DataService.getWhatsAppBotConfig());
      setNotice('Berhasil membaca & menyinkronkan seluruh pengaturan dari Database Cloud!');
    } else {
      setNotice('Database lokal sedang aktif. Simpan koneksi Supabase untuk sinkronisasi cloud real-time.');
    }
    setTimeout(() => setNotice(null), 4000);
  };

  const handleTestSupabase = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    const res = await testSupabaseConnection(supabaseConfig.url, supabaseConfig.anonKey);
    setIsTestingSupabase(false);
    setSupabaseTestResult(res);

    const updated = {
      ...supabaseConfig,
      isConnected: res.success,
      lastTested: new Date().toLocaleString('id-ID')
    };
    saveStoredSupabaseConfig(updated);
    setSupabaseConfig(updated);
    onRefreshData();
  };

  const handleSyncAllDataToDb = async () => {
    setIsSyncingAllDb(true);
    setDbSyncSummary(null);
    try {
      const res = await DataService.syncAllToDatabase();
      setIsSyncingAllDb(false);
      setDbSyncSummary(res.message);
      onRefreshData();
      setTimeout(() => setDbSyncSummary(null), 6000);
    } catch (e: any) {
      setIsSyncingAllDb(false);
      setDbSyncSummary(e?.message || 'Gagal menyinkronkan data ke database.');
    }
  };

  const handlePullAllDataFromDb = async () => {
    setIsLoadingFromDb(true);
    setDbSyncSummary(null);
    try {
      const ok = await DataService.loadAllFromDatabase();
      setIsLoadingFromDb(false);
      if (ok) {
        setDbSyncSummary('Seluruh data aplikasi (Pelanggan, Paket, Tagihan, Transaksi, Voucher, Perangkat, Pengguna, Pengaturan) berhasil dimuat dari Database Cloud Supabase!');
        onRefreshData();
      } else {
        setDbSyncSummary('Gagal membaca data dari database cloud atau endpoint belum terhubung.');
      }
      setTimeout(() => setDbSyncSummary(null), 6000);
    } catch (e: any) {
      setIsLoadingFromDb(false);
      setDbSyncSummary(e?.message || 'Gagal membaca data dari database.');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleCopyMysqlSql = () => {
    navigator.clipboard.writeText(MYSQL_SQL_SCHEMA);
    setCopiedMysqlSql(true);
    setTimeout(() => setCopiedMysqlSql(false), 3000);
  };

  const handleTestMySQL = async () => {
    setIsTestingSupabase(true);
    setSupabaseTestResult(null);
    const res = await testMySQLConnection(
      supabaseConfig.mysqlHost || 'localhost',
      supabaseConfig.mysqlPort || 3306,
      supabaseConfig.mysqlDatabase || 'anuwani_isp',
      supabaseConfig.mysqlUser || 'root',
      supabaseConfig.mysqlPassword
    );
    setIsTestingSupabase(false);
    setSupabaseTestResult(res);

    const updated: SupabaseConfig = {
      ...supabaseConfig,
      engine: 'mysql',
      isConnected: res.success,
      lastTested: new Date().toLocaleString('id-ID')
    };
    saveStoredSupabaseConfig(updated);
    setSupabaseConfig(updated);
    onRefreshData();
  };

  const handleBackupNow = async (downloadFile: boolean = true) => {
    setIsBackingUp(true);
    setBackupNotice(null);
    const result = await executeDatabaseBackup('manual', downloadFile);
    setIsBackingUp(false);
    setBackupLogs(getDatabaseBackupLogs());
    setBackupNotice(result.message);
    setSupabaseConfig(getStoredSupabaseConfig());
    onRefreshData();
    setTimeout(() => setBackupNotice(null), 5000);
  };

  const handleSaveBackupSchedule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveStoredSupabaseConfig(supabaseConfig);
    DataService.syncSystemSettingsToDatabase();
    setBackupNotice('Konfigurasi interval & frekuensi backup otomatis berhasil disimpan ke sistem!');
    setSupabaseConfig(getStoredSupabaseConfig());
    onRefreshData();
    setTimeout(() => setBackupNotice(null), 5000);
  };

  const handleTestSchedulerNow = () => {
    setIsTestingScheduler(true);
    setSchedulerNotice(null);
    const res = checkAndTriggerScheduledBackup();
    setIsTestingScheduler(false);
    setBackupLogs(getDatabaseBackupLogs());
    setSupabaseConfig(getStoredSupabaseConfig());
    setSchedulerNotice(res.message);
    onRefreshData();
    setTimeout(() => setSchedulerNotice(null), 6000);
  };

  const handleClearBackupHistory = () => {
    if (confirm('Apakah Anda yakin ingin membersihkan riwayat log pencadangan database?')) {
      clearDatabaseBackupLogs();
      setBackupLogs(getDatabaseBackupLogs());
      setBackupNotice('Riwayat log pencadangan berhasil dikosongkan.');
      setTimeout(() => setBackupNotice(null), 4000);
    }
  };

  const handleDownloadLogFile = (log: import('../types').DatabaseBackupRecord) => {
    downloadDatabaseBackupFile(log);
  };

  const handleSetFrequencyPreset = (preset: string, hours: number) => {
    setBackupPreset(preset);
    const updated = {
      ...supabaseConfig,
      backupIntervalHours: hours,
      backupFrequency: (preset === '1' ? 'hourly' :
        preset === '6' ? 'every_6_hours' :
        preset === '12' ? 'every_12_hours' :
        preset === '24' ? 'daily' :
        preset === '48' ? 'every_2_days' :
        preset === '168' ? 'weekly' : 'custom') as any
    };
    setSupabaseConfig(updated);
    saveStoredSupabaseConfig(updated);
  };

  const handleTestDanaSession = () => {
    if (!onOpenDanaCheckout) return;
    const sess = DanaService.createPaymentSession({
      itemType: 'voucher',
      itemTitle: 'Uji Coba DANA Checkout Gateway (Rp 5.000)',
      itemRefId: 'pkg-v2',
      amount: 5000,
      customerName: 'Superadmin Test (' + (currentUser?.name || 'Admin') + ')',
      customerPhone: currentUser?.phone || '081298765432'
    });
    onOpenDanaCheckout(sess);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sliders className="w-6 h-6 text-red-500" />
              <span>Pengaturan Sistem Terpadu</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-900 uppercase">
              Superadmin Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Pusat konfigurasi terpadu: identitas ISP, App ID & Secret Key Ruijie Reyee, DANA Payments, WhatsApp Bot via Fonnte, dan Database Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={handleSaveAllSettingsDirectlyToDatabase}
            disabled={isSavingAllSettingsDb}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-sm shadow-red-950"
            title="Simpan seluruh pengaturan sistem (Identitas ISP, Ruijie, DANA, WA Bot, Database) langsung ke Database"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSavingAllSettingsDb ? 'Menyimpan ke DB...' : 'Simpan Seluruh Pengaturan ke DB'}</span>
          </button>

          <button
            type="button"
            onClick={handleReloadFromCloudDatabase}
            disabled={isLoadingFromDb}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
            title="Muat ulang seluruh konfigurasi pengaturan dari Database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-red-500 ${isLoadingFromDb ? 'animate-spin' : ''}`} />
            <span>{isLoadingFromDb ? 'Membaca Database...' : 'Baca dari Database'}</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-800 text-xs text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 7-Tab Section Selector: Smooth horizontal scroll on mobile & grid on desktop */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 lg:grid lg:grid-cols-7 scrollbar-none">
        <button
          onClick={() => setActiveSection('app')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 lg:shrink ${
            activeSection === 'app'
              ? 'bg-red-600 text-white shadow-md shadow-red-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Building className="w-4 h-4 shrink-0" />
          <span>Aplikasi & DB</span>
        </button>

        <button
          onClick={() => setActiveSection('backup')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 relative shrink-0 lg:shrink ${
            activeSection === 'backup'
              ? 'bg-red-600 text-white shadow-md shadow-red-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Archive className="w-4 h-4 shrink-0 text-amber-400" />
          <span className="flex items-center gap-1">
            <span>Backup DB</span>
            <span className={`w-2 h-2 rounded-full ${supabaseConfig.autoBackupEnabled !== false ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} title={supabaseConfig.autoBackupEnabled !== false ? 'Auto-backup Aktif' : 'Auto-backup Nonaktif'} />
          </span>
        </button>

        <button
          onClick={() => setActiveSection('ruijie')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 lg:shrink ${
            activeSection === 'ruijie'
              ? 'bg-red-600 text-white shadow-md shadow-red-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Server className="w-4 h-4 shrink-0" />
          <span>Ruijie & Isolir</span>
        </button>

        <button
          onClick={() => setActiveSection('dana')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 lg:shrink ${
            activeSection === 'dana'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4 shrink-0 text-sky-400" />
          <span>DANA Gateway</span>
        </button>

        <button
          onClick={() => setActiveSection('whatsapp')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 lg:shrink ${
            activeSection === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>WhatsApp Bot</span>
        </button>

        <button
          onClick={() => setActiveSection('templates')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 relative shrink-0 lg:shrink ${
            activeSection === 'templates'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950 font-bold'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <MessageSquare className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="flex items-center gap-1">
            <span>Template WA</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </button>

        <button
          onClick={() => setActiveSection('tutorial')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 lg:shrink ${
            activeSection === 'tutorial'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950 font-bold'
              : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-900/40'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Tutorial Hosting</span>
        </button>
      </div>

      {/* ============================================================
          SECTION 1: PENGATURAN APLIKASI & SUPABASE
      ============================================================ */}
      {activeSection === 'app' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Identitas ISP */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-red-500" />
              <span>Identitas ISP & Rekening Kasir</span>
            </h3>

            <form onSubmit={handleSaveAppSettings} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Nama Aplikasi / Brand ISP</label>
                <input
                  type="text"
                  value={appSettings.appName}
                  onChange={e => setAppSettings({ ...appSettings, appName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-semibold focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Nama Perusahaan / Legalitas</label>
                <input
                  type="text"
                  value={appSettings.companyName}
                  onChange={e => setAppSettings({ ...appSettings, companyName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Nomor CS / NOC</label>
                  <input
                    type="text"
                    value={appSettings.phoneCs}
                    onChange={e => setAppSettings({ ...appSettings, phoneCs: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Rekening Bank BCA</label>
                  <input
                    type="text"
                    value={appSettings.bcaAccount}
                    onChange={e => setAppSettings({ ...appSettings, bcaAccount: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Rekening Bank BRI</label>
                <input
                  type="text"
                  value={appSettings.briAccount}
                  onChange={e => setAppSettings({ ...appSettings, briAccount: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Alamat Kantor / Server NOC</label>
                <textarea
                  rows={2}
                  value={appSettings.addressNoc}
                  onChange={e => setAppSettings({ ...appSettings, addressNoc: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:border-red-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-sm"
              >
                Simpan Identitas ISP
              </button>
            </form>
          </div>

          {/* Konfigurasi Database Terpadu (Supabase & MySQL) */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold text-white">
                  Database Pengaturan Sistem (Supabase & MySQL)
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                <span className="text-[11px] text-zinc-400 font-medium">
                  {supabaseConfig.isConnected ? 'Terhubung' : 'Lokal / Siap Replikasi'}
                </span>
              </div>
            </div>

            {/* Engine Switcher */}
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setDbEngine('supabase');
                  setSupabaseConfig({ ...supabaseConfig, engine: 'supabase' });
                }}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  dbEngine === 'supabase'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Supabase (PostgreSQL)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDbEngine('mysql');
                  setSupabaseConfig({ ...supabaseConfig, engine: 'mysql' });
                }}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                  dbEngine === 'mysql'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>MySQL / MariaDB</span>
              </button>
            </div>

            {dbEngine === 'supabase' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-zinc-400 mb-1">Supabase Project URL</label>
                  <input
                    type="text"
                    placeholder="https://xyz.supabase.co"
                    value={supabaseConfig.url}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Supabase Anon Public API Key</label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseConfig.anonKey}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, anonKey: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none text-[11px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestSupabase}
                    disabled={isTestingSupabase}
                    className="w-full sm:flex-1 py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
                  >
                    {isTestingSupabase ? 'Mengetes...' : 'Simpan & Tes Koneksi Supabase'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-zinc-400 mb-1">Host MySQL Server</label>
                    <input
                      type="text"
                      placeholder="localhost / 127.0.0.1 / IP"
                      value={supabaseConfig.mysqlHost || 'localhost'}
                      onChange={e => setSupabaseConfig({ ...supabaseConfig, mysqlHost: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-amber-600 focus:outline-none text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Port</label>
                    <input
                      type="number"
                      placeholder="3306"
                      value={supabaseConfig.mysqlPort || 3306}
                      onChange={e => setSupabaseConfig({ ...supabaseConfig, mysqlPort: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-amber-600 focus:outline-none text-[11px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Database MySQL</label>
                    <input
                      type="text"
                      placeholder="anuwani_isp"
                      value={supabaseConfig.mysqlDatabase || 'anuwani_isp'}
                      onChange={e => setSupabaseConfig({ ...supabaseConfig, mysqlDatabase: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-amber-600 focus:outline-none text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Username MySQL</label>
                    <input
                      type="text"
                      placeholder="root"
                      value={supabaseConfig.mysqlUser || 'root'}
                      onChange={e => setSupabaseConfig({ ...supabaseConfig, mysqlUser: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-amber-600 focus:outline-none text-[11px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Password MySQL</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={supabaseConfig.mysqlPassword || ''}
                    onChange={e => setSupabaseConfig({ ...supabaseConfig, mysqlPassword: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-amber-600 focus:outline-none text-[11px]"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestMySQL}
                    disabled={isTestingSupabase}
                    className="w-full sm:flex-1 py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
                  >
                    {isTestingSupabase ? 'Mengetes...' : 'Simpan & Tes Konfigurasi MySQL'}
                  </button>
                </div>
              </div>
            )}

            {/* Direct Save All Settings To Database CTA */}
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-red-500" />
                  <span>Simpan Langsung ke Database</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {supabaseConfig.lastSettingsSavedAt ? `Saved: ${supabaseConfig.lastSettingsSavedAt}` : 'Real-time sync'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleSaveAllSettingsDirectlyToDatabase}
                disabled={isSavingAllSettingsDb}
                className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-sm shadow-red-950 flex items-center justify-center gap-1.5"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{isSavingAllSettingsDb ? 'Menyimpan ke Database...' : 'Simpan Seluruh Pengaturan Sekarang ke Database'}</span>
              </button>
            </div>

            {/* Sync All Database Tables Actions */}
            <div className="pt-2 border-t border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sinkronisasi Seluruh Tabel Database</span>
                </span>
                <span className="text-[10px] text-zinc-400">9 Tabel Aplikasi</span>
              </div>

              {/* Table Record Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Pelanggan:</span>
                  <span className="text-emerald-400 font-bold">{DataService.getCustomers().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Paket:</span>
                  <span className="text-white font-bold">{DataService.getPackages().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Tagihan:</span>
                  <span className="text-amber-400 font-bold">{DataService.getBills().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Transaksi:</span>
                  <span className="text-blue-400 font-bold">{DataService.getTransactions().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Voucher:</span>
                  <span className="text-rose-400 font-bold">{DataService.getVouchers().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Ruijie:</span>
                  <span className="text-purple-400 font-bold">{DataService.getRuijieDevices().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">User:</span>
                  <span className="text-zinc-300 font-bold">{DataService.getUsers().length}</span>
                </div>
                <div className="p-1.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between">
                  <span className="text-zinc-500">Pengaturan:</span>
                  <span className="text-emerald-400 font-bold">Tersimpan</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncAllDataToDb}
                  disabled={isSyncingAllDb}
                  className="w-full sm:flex-1 py-2 px-3 rounded-lg bg-zinc-800 text-zinc-100 hover:bg-zinc-700 font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-1.5"
                  title="Simpan seluruh pelanggan, paket, tagihan, transaksi, voucher, dan pengaturan ke Database"
                >
                  <Database className="w-3.5 h-3.5 text-red-500" />
                  <span>{isSyncingAllDb ? 'Menyimpan...' : 'Replikasi Semua Tabel ke Database'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePullAllDataFromDb}
                  disabled={isLoadingFromDb}
                  className="w-full sm:w-auto py-2 px-3 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 font-semibold transition-colors flex items-center justify-center gap-1.5"
                  title="Tarik data terbaru dari Database Cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFromDb ? 'animate-spin text-red-400' : ''}`} />
                  <span>{isLoadingFromDb ? 'Memuat...' : 'Tarik dari Database'}</span>
                </button>
              </div>

              {dbSyncSummary && (
                <div className="p-2.5 rounded-lg text-[11px] bg-emerald-950/70 border border-emerald-800 text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{dbSyncSummary}</span>
                </div>
              )}
            </div>

            {supabaseTestResult && (
              <div className={`p-2.5 rounded-lg text-[11px] ${
                supabaseTestResult.success ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}>
                {supabaseTestResult.message}
              </div>
            )}

            {/* Skrip DDL Schema: Supabase (PostgreSQL) & MySQL */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSchemaTab('supabase')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      activeSchemaTab === 'supabase'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    PostgreSQL / Supabase
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSchemaTab('mysql')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      activeSchemaTab === 'mysql'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    MySQL / MariaDB
                  </button>
                </div>

                {activeSchemaTab === 'supabase' ? (
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Tersalin' : 'Salin PostgreSQL SQL'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCopyMysqlSql}
                    className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-[11px] font-semibold flex items-center gap-1"
                  >
                    {copiedMysqlSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedMysqlSql ? 'Tersalin' : 'Salin MySQL SQL'}</span>
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 max-h-24 overflow-y-auto font-mono text-[10px] text-zinc-500 whitespace-pre">
                {activeSchemaTab === 'supabase'
                  ? `${SUPABASE_SQL_SCHEMA.slice(0, 350)}...`
                  : `${MYSQL_SQL_SCHEMA.slice(0, 350)}...`}
              </div>
            </div>
          </div>

          {/* Fitur Otomasi Tagihan Bulanan Massal (Auto-Generate Bills) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Otomasi Tagihan Bulanan (Auto-Generate Bills)
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                        appSettings.autoGenerateBillsEnabled
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {appSettings.autoGenerateBillsEnabled ? '● AKTIF OTOMATIS' : '○ NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Memicu pembuatan tagihan bulanan seluruh pelanggan aktif secara otomatis di awal bulan berdasarkan paket internet yang berlangganan.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-zinc-400 font-medium">
                  {appSettings.autoGenerateBillsEnabled ? 'Otomasi Aktif' : 'Otomasi Mati'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleAutoGenerateBills}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none cursor-pointer ${
                    appSettings.autoGenerateBillsEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}
                  title="Klik untuk mengaktifkan / menonaktifkan auto-generate bills setiap awal bulan"
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                      appSettings.autoGenerateBillsEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {autoBillingNotice && (
              <div className="p-3 rounded-lg bg-zinc-950 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
                <span>{autoBillingNotice}</span>
              </div>
            )}

            {/* Kontrol & Konfigurasi Eksekusi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tanggal Eksekusi Bulanan</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={appSettings.autoGenerateBillsDay || 1}
                    onChange={e => {
                      const val = Math.min(28, Math.max(1, parseInt(e.target.value) || 1));
                      const updated = { ...appSettings, autoGenerateBillsDay: val };
                      DataService.saveAppSettings(updated);
                      setAppSettings(updated);
                    }}
                    className="w-20 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono text-center font-bold focus:border-red-600 focus:outline-none"
                  />
                  <span className="text-[11px] text-zinc-400">Setiap awal bulan (Tgl 1)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1">
                <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Periode Terakhir Diproses</span>
                </div>
                <div className="pt-1 font-mono font-bold text-white text-sm">
                  {appSettings.lastAutoGeneratedPeriod || 'Belum pernah diproses'}
                </div>
                <div className="text-[10px] text-zinc-500">Mencegah tagihan ganda pada bulan yang sama</div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2 flex flex-col justify-between">
                <div className="text-zinc-400 text-[11px] font-medium">Pemicu Uji Coba Manual</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTriggerAutoBillingNow}
                    disabled={isTestingAutoBilling}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors shadow-sm cursor-pointer"
                    title="Jalankan pembuatan tagihan massal untuk bulan berjalan sekarang"
                  >
                    <Play className={`w-3.5 h-3.5 ${isTestingAutoBilling ? 'animate-spin' : ''}`} />
                    <span>{isTestingAutoBilling ? 'Memproses...' : 'Jalankan Sekarang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetAutoBillingPeriod}
                    className="py-2 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Reset riwayat periode agar dapat di-trigger kembali"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Alur Kerja Penjelasan */}
            <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-[11px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300">Bagaimana Cara Kerja Auto-Generate Bills?</span>
              <ul className="list-disc pl-4 space-y-0.5 text-zinc-400">
                <li>Sistem membaca seluruh pelanggan dengan status <strong>Aktif</strong> atau <strong>Terisolir</strong>.</li>
                <li>Tagihan baru (INV-...) dibuat otomatis dengan nominal sesuai paket internet langganan masing-masing.</li>
                <li>Tanggal jatuh tempo disetel berdasarkan tanggal penagihan pelanggan (billing day, default tgl 20).</li>
                <li>Ketika gateway WhatsApp Fonnte aktif, notifikasi rincian tagihan beserta link pembayaran DANA akan dikirim otomatis ke pelanggan.</li>
              </ul>
            </div>
          </div>

          {/* Ringkasan & Pintasan Pencadangan Database (Quick Card di Tab Aplikasi) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Pencadangan Database Otomatis & Ekspor Berkala
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      supabaseConfig.autoBackupEnabled !== false
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {supabaseConfig.autoBackupEnabled !== false
                        ? `● AUTO-BACKUP AKTIF (${supabaseConfig.backupIntervalHours || 24} JAM)`
                        : '○ NONAKTIF'}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    Timestamp Terakhir Berhasil: <strong className="text-emerald-400 font-mono">{supabaseConfig.lastSuccessfulBackupAt || supabaseConfig.lastBackupAt || '10 Okt 2026, 18:00 WIB'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('backup')}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors border border-zinc-700 cursor-pointer"
                  title="Buka panel konfigurasi lengkap untuk interval, frekuensi, dan log pencadangan"
                >
                  <span>Kelola Konfigurasi Lengkap</span>
                  <ArrowRight className="w-3.5 h-3.5 text-red-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleBackupNow(true)}
                  disabled={isBackingUp}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors shadow-sm shadow-red-950 cursor-pointer"
                  title="Ekspor seluruh database sekarang dan unduh file JSON"
                >
                  <HardDriveDownload className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-bounce' : ''}`} />
                  <span>{isBackingUp ? 'Memproses...' : 'Backup Now'}</span>
                </button>
              </div>
            </div>

            {backupNotice && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{backupNotice}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>Interval Otomatis</span>
                </span>
                <span className="font-mono font-bold text-white text-sm block">
                  Setiap {supabaseConfig.backupIntervalHours || 24} Jam
                </span>
                <span className="text-[10px] text-zinc-500">
                  {supabaseConfig.backupFrequency === 'hourly' ? 'High-frequency 1 Jam' :
                   supabaseConfig.backupFrequency === 'every_6_hours' ? '4x Sehari' :
                   supabaseConfig.backupFrequency === 'every_12_hours' ? '2x Sehari' :
                   supabaseConfig.backupFrequency === 'weekly' ? 'Mingguan' : 'Harian (Standar ISP)'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Snapshot Terakhir</span>
                </span>
                <span className="font-mono font-bold text-emerald-400 text-xs block truncate" title={supabaseConfig.lastSuccessfulBackupAt || supabaseConfig.lastBackupAt}>
                  {supabaseConfig.lastSuccessfulBackupAt || supabaseConfig.lastBackupAt || '10 Okt 2026, 18:00 WIB'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Ukuran: {supabaseConfig.lastBackupSizeKb || 14.8} KB ({supabaseConfig.lastBackupRecordCount || 48} data)
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="text-zinc-500 flex items-center gap-1">
                  <Timer className="w-3 h-3 text-amber-400" />
                  <span>Jadwal Berikutnya</span>
                </span>
                <span className="font-mono font-bold text-amber-300 text-xs block truncate">
                  {supabaseConfig.autoBackupEnabled !== false
                    ? 'Terjadwal otomatis via background scheduler'
                    : 'Nonaktif'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Semua tabel (Pelanggan, Tagihan, Transaksi, Voucher)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION DEDIKASI: PUSAT KONFIGURASI PENCADANGAN DATABASE
          (Dedicated Database Backup Intervals, Frequency & Timestamp)
      ============================================================ */}
      {activeSection === 'backup' && (
        <div className="space-y-6">
          {/* Hero Section: Tampilan Utama Timestamp Cadangan Terakhir Berhasil */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-emerald-900/40 p-6 shadow-xl">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500/5 rounded-full blur-2xl pointer-events-none -ml-20 -mb-20" />

            <div className="relative z-10 space-y-6">
              {/* Header Hero */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/80 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Status Sistem: Snapshot Valid
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      supabaseConfig.autoBackupEnabled !== false
                        ? 'bg-blue-950 text-blue-400 border-blue-800/80'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                    }`}>
                      {supabaseConfig.autoBackupEnabled !== false
                        ? `Scheduler Otomatis: AKTIF (Tiap ${supabaseConfig.backupIntervalHours || 24} Jam)`
                        : 'Scheduler Otomatis: NONAKTIF'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    <Archive className="w-6 h-6 text-red-500 shrink-0" />
                    <span>Pusat Konfigurasi & Pencadangan Otomatis Database</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
                    Kelola frekuensi ekspor terjadwal, tentukan interval waktu otomatis pencadangan seluruh tabel inti (Pelanggan, Tagihan, Transaksi, Voucher, Pengaturan ISP), serta pantau verifikasi timestamp cadangan terakhir yang sukses.
                  </p>
                </div>

                {/* Quick Actions Header */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleBackupNow(true)}
                    disabled={isBackingUp}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-lg shadow-red-950 hover:shadow-red-900/50 cursor-pointer active:scale-95"
                    title="Jalankan pencadangan manual sekarang dan unduh file JSON"
                  >
                    <HardDriveDownload className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
                    <span>{isBackingUp ? 'Mencadangkan Database...' : '⚡ Backup Sekarang & Unduh JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSchedulerNow}
                    disabled={isTestingScheduler}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors border border-zinc-700 cursor-pointer"
                    title="Uji kondisi interval scheduler otomatis tanpa perlu menunggu timer"
                  >
                    <Timer className={`w-4 h-4 text-amber-400 ${isTestingScheduler ? 'animate-spin' : ''}`} />
                    <span>{isTestingScheduler ? 'Menguji...' : 'Uji Pemicu Scheduler'}</span>
                  </button>
                </div>
              </div>

              {/* Status Banner Notifikasi */}
              {backupNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2.5 shadow-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">{backupNotice}</span>
                </div>
              )}

              {schedulerNotice && (
                <div className="p-3.5 rounded-xl bg-blue-950/70 border border-blue-800 text-xs text-blue-200 flex items-center gap-2.5 shadow-sm">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-medium">{schedulerNotice}</span>
                </div>
              )}

              {/* TAMPILAN UTAMA: Timestamp Cadangan Terakhir Berhasil (Highlight Hero Card) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Kartu Utama Timestamp */}
                <div className="lg:col-span-7 p-5 rounded-xl bg-zinc-950/80 border border-emerald-800/40 relative overflow-hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span>Timestamp Cadangan Terakhir Berhasil</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      BERHASIL
                    </span>
                  </div>

                  <div className="py-1">
                    <div className="text-2xl sm:text-3xl font-mono font-extrabold text-white tracking-tight text-emerald-400 drop-shadow-sm">
                      {supabaseConfig.lastSuccessfulBackupAt || supabaseConfig.lastBackupAt || '10 Okt 2026, 18:00 WIB'}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        Tersimpan di Penyimpanan Snapshot Lokal & Mirror Cloud PostgreSQL Supabase
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Timer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Jadwal Eksekusi Berikutnya:</span>
                      <strong className="text-amber-300 font-mono font-medium">
                        {supabaseConfig.autoBackupEnabled !== false
                          ? (() => {
                              const lastMs = supabaseConfig.lastSuccessfulBackupTimestamp || 1791655200000;
                              const intervalMs = (supabaseConfig.backupIntervalHours || 24) * 3600 * 1000;
                              const nextMs = lastMs + intervalMs;
                              if (Date.now() >= nextMs) {
                                return 'Siap dieksekusi pada siklus scheduler berikutnya';
                              }
                              const d = new Date(nextMs);
                              return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                            })()
                          : 'Otomasi Dinonaktifkan'}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleBackupNow(false)}
                      disabled={isBackingUp}
                      className="text-xs text-zinc-300 hover:text-white underline underline-offset-2 flex items-center gap-1 font-medium cursor-pointer"
                      title="Buat snapshot cadangan tanpa mengunduh file JSON ke komputer"
                    >
                      <Database className="w-3 h-3 text-red-400" />
                      <span>Snapshot Senyap (Tanpa Unduh)</span>
                    </button>
                  </div>
                </div>

                {/* Ringkasan Metrik Data Cadangan */}
                <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-zinc-500 text-[11px] font-medium flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-sky-400" />
                      <span>Ukuran File Cadangan</span>
                    </span>
                    <div className="mt-1">
                      <span className="text-xl font-mono font-bold text-white">
                        {supabaseConfig.lastBackupSizeKb || 14.8}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">KB</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 mt-1">Format JSON Terkompresi</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-zinc-500 text-[11px] font-medium flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Total Rekor Tersimpan</span>
                    </span>
                    <div className="mt-1">
                      <span className="text-xl font-mono font-bold text-white">
                        {supabaseConfig.lastBackupRecordCount || (backupLogs[0]?.totalRecords || 48)}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">Catatan</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">5 Tabel Inti Aplikasi</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-zinc-500 text-[11px] font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Frekuensi Aktif</span>
                    </span>
                    <div className="mt-1">
                      <span className="text-base font-mono font-bold text-amber-300">
                        {supabaseConfig.backupIntervalHours || 24} Jam
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      {supabaseConfig.backupIntervalHours === 1 ? '1x Tiap Jam' :
                       supabaseConfig.backupIntervalHours === 6 ? '4x Sehari' :
                       supabaseConfig.backupIntervalHours === 12 ? '2x Sehari' :
                       supabaseConfig.backupIntervalHours === 24 ? '1x Tiap Hari' :
                       supabaseConfig.backupIntervalHours === 168 ? '1x Tiap Minggu' : 'Interval Kustom'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col justify-between">
                    <span className="text-zinc-500 text-[11px] font-medium flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      <span>Mode Eksekusi</span>
                    </span>
                    <div className="mt-1">
                      <span className="text-xs font-mono font-bold text-zinc-200">
                        {backupLogs[0]?.triggerType === 'manual' ? 'MANUAL SUPERADMIN' : 'OTOMATIS SCHEDULER'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400">Status 100% Siap</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Konfigurasi Otomasi Pencadangan: Interval & Frekuensi */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-red-500" />
                  <span>Konfigurasi Interval & Frekuensi Otomasi Database</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Atur seberapa sering sistem akan mencadangkan data dan tentukan preferensi interval otomatis.
                </p>
              </div>

              {/* Master Toggle Switch */}
              <div className="flex items-center gap-3 bg-zinc-950 px-3.5 py-2 rounded-xl border border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">
                  {supabaseConfig.autoBackupEnabled !== false ? 'Otomasi Aktif' : 'Otomasi Nonaktif'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = supabaseConfig.autoBackupEnabled === false;
                    const updated: SupabaseConfig = {
                      ...supabaseConfig,
                      autoBackupEnabled: nextVal
                    };
                    setSupabaseConfig(updated);
                    saveStoredSupabaseConfig(updated);
                    setBackupNotice(
                      nextVal
                        ? 'Pencadangan database otomatis berhasil DIAKTIFKAN!'
                        : 'Pencadangan database otomatis DINONAKTIFKAN.'
                    );
                    setTimeout(() => setBackupNotice(null), 4000);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative p-0.5 focus:outline-none cursor-pointer ${
                    supabaseConfig.autoBackupEnabled !== false ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}
                  title="Klik untuk mengaktifkan / menonaktifkan pencadangan otomatis berkala"
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white transition-transform shadow-sm ${
                      supabaseConfig.autoBackupEnabled !== false ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveBackupSchedule} className="space-y-6 text-xs">
              {/* Preset Frekuensi Cepat (Frequency Preset Selector) */}
              <div className="space-y-2.5">
                <label className="block text-zinc-300 font-semibold text-xs flex items-center justify-between">
                  <span>Pilih Preset Frekuensi Pencadangan</span>
                  <span className="text-[11px] text-zinc-500 font-normal">Klik untuk memilih frekuensi cepat</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[
                    { key: '1', hours: 1, label: '1 Jam', desc: 'Setiap Jam', badge: 'High-Freq' },
                    { key: '6', hours: 6, label: '6 Jam', desc: '4x Sehari', badge: 'Intensif' },
                    { key: '12', hours: 12, label: '12 Jam', desc: '2x Sehari', badge: 'Pagi-Malam' },
                    { key: '24', hours: 24, label: '24 Jam', desc: 'Harian', badge: 'Rekomendasi' },
                    { key: '48', hours: 48, label: '48 Jam', desc: '2 Hari Sekali', badge: 'Ringan' },
                    { key: '168', hours: 168, label: '7 Hari', desc: 'Mingguan', badge: 'Hemat' },
                    { key: 'custom', hours: supabaseConfig.backupIntervalHours || 24, label: 'Kustom', desc: 'Input Jam', badge: 'Manual' }
                  ].map(item => {
                    const isSelected =
                      item.key === 'custom'
                        ? !['1', '6', '12', '24', '48', '168'].includes(String(supabaseConfig.backupIntervalHours))
                        : supabaseConfig.backupIntervalHours === item.hours;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSetFrequencyPreset(item.key, item.hours)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'bg-red-950/40 border-red-600 text-white shadow-md shadow-red-950/50 ring-1 ring-red-500/50'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-white">{item.label}</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            isSelected ? 'bg-red-900 text-red-200' : 'bg-zinc-900 text-zinc-500'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail Interval Input & Waktu Eksekusi Harian */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Input Interval Eksak (Jam) */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="block text-zinc-300 font-semibold text-xs">
                    Interval Waktu Eksekusi (Jam)
                  </label>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="number"
                      min={1}
                      max={720}
                      value={supabaseConfig.backupIntervalHours || 24}
                      onChange={e => {
                        const val = Math.min(720, Math.max(1, parseInt(e.target.value) || 1));
                        const updated: SupabaseConfig = {
                          ...supabaseConfig,
                          backupIntervalHours: val,
                          backupFrequency: (val === 1 ? 'hourly' : val === 6 ? 'every_6_hours' : val === 12 ? 'every_12_hours' : val === 24 ? 'daily' : val === 48 ? 'every_2_days' : val === 168 ? 'weekly' : 'custom') as any
                        };
                        setSupabaseConfig(updated);
                        setBackupPreset(String(val));
                      }}
                      className="w-28 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono font-bold text-center text-sm focus:border-red-600 focus:outline-none"
                    />
                    <span className="text-zinc-400 font-mono text-xs">Jam per Siklus</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Contoh: <strong>24 jam</strong> = 1 hari penuh, <strong>168 jam</strong> = 7 hari (mingguan).
                  </p>
                </div>

                {/* Waktu Eksekusi Pilihan */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="block text-zinc-300 font-semibold text-xs">
                    Waktu Eksekusi Harian Pilihan
                  </label>
                  <select
                    value={supabaseConfig.backupExecutionTime || '02:00'}
                    onChange={e => {
                      const updated = {
                        ...supabaseConfig,
                        backupExecutionTime: e.target.value
                      };
                      setSupabaseConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-red-600 focus:outline-none"
                  >
                    <option value="00:00">00:00 WIB (Tengah Malam)</option>
                    <option value="01:00">01:00 WIB (Dini Hari)</option>
                    <option value="02:00">02:00 WIB (Rekomendasi - Trafik Terendah)</option>
                    <option value="03:00">03:00 WIB (Dini Hari)</option>
                    <option value="04:00">04:00 WIB (Subuh)</option>
                    <option value="06:00">06:00 WIB (Pagi Hari)</option>
                    <option value="12:00">12:00 WIB (Siang Hari)</option>
                    <option value="18:00">18:00 WIB (Sore Hari)</option>
                    <option value="23:00">23:00 WIB (Malam Hari)</option>
                  </select>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Waktu di luar jam sibuk meminimalkan risiko latensi router Ruijie & DANA gateway.
                  </p>
                </div>

                {/* Batas Retensi Log Cadangan */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <label className="block text-zinc-300 font-semibold text-xs">
                    Batas Retensi Riwayat Log
                  </label>
                  <select
                    value={supabaseConfig.backupRetentionCount || 50}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 50;
                      const updated = {
                        ...supabaseConfig,
                        backupRetentionCount: val
                      };
                      setSupabaseConfig(updated);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:border-red-600 focus:outline-none"
                  >
                    <option value={10}>Simpan 10 Log Terakhir</option>
                    <option value={25}>Simpan 25 Log Terakhir</option>
                    <option value={50}>Simpan 50 Log Terakhir (Rekomendasi)</option>
                    <option value={100}>Simpan 100 Log Terakhir</option>
                  </select>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">
                    Log yang lebih tua dari batas akan dirotasi otomatis untuk menghemat ruang memori.
                  </p>
                </div>
              </div>

              {/* Cakupan Tabel & Entitas yang Dicadangkan */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-xs flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>Cakupan Tabel & Entitas yang Disertakan dalam Setiap Snapshot</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono font-medium">
                    5 dari 5 Tabel Aktif
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {[
                    { name: 'Data Pelanggan & Paket', key: 'customers', count: DataService.getCustomers().length, color: 'text-emerald-400' },
                    { name: 'Tagihan & Jatuh Tempo', key: 'bills', count: DataService.getBills().length, color: 'text-amber-400' },
                    { name: 'Transaksi & DANA Logs', key: 'transactions', count: DataService.getTransactions().length, color: 'text-blue-400' },
                    { name: 'Voucher Hotspot Ruijie', key: 'vouchers', count: DataService.getVouchers().length, color: 'text-rose-400' },
                    { name: 'Konfigurasi Sistem ISP', key: 'settings', count: 'Tersinkron', color: 'text-purple-400' }
                  ].map(tab => (
                    <div key={tab.key} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-zinc-300 font-medium truncate">{tab.name}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${tab.color} shrink-0`}>
                        {tab.count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Checkbox Opsi Download Otomatis */}
                <div className="pt-2 border-t border-zinc-900 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="autoDownloadOnScheduledCheck"
                    checked={supabaseConfig.autoDownloadOnScheduled === true}
                    onChange={e => {
                      const updated = {
                        ...supabaseConfig,
                        autoDownloadOnScheduled: e.target.checked
                      };
                      setSupabaseConfig(updated);
                    }}
                    className="w-4 h-4 rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                  <label htmlFor="autoDownloadOnScheduledCheck" className="text-zinc-300 text-xs select-none cursor-pointer">
                    Unduh file JSON cadangan secara otomatis ke komputer ketika scheduler dieksekusi di sesi browser admin ini
                  </label>
                </div>
              </div>

              {/* Tombol Simpan Konfigurasi */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-zinc-500">
                  Perubahan interval dan frekuensi langsung disinkronkan ke Cloud Supabase & Local Database.
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-lg shadow-red-950 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>Simpan Konfigurasi & Jadwal Backup</span>
                </button>
              </div>
            </form>
          </div>

          {/* Riwayat & Log Ekspor Database Cadangan */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-red-500" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Riwayat & Log Arsip Ekspor Database
                  </h3>
                  <p className="text-zinc-400 text-[11px]">
                    Daftar seluruh pencadangan database yang pernah dieksekusi (Otomatis & Manual).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                {/* Filter Selector */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBackupFilter('all')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      backupFilter === 'all' ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Semua ({backupLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupFilter('scheduled')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      backupFilter === 'scheduled' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Otomatis ({backupLogs.filter(l => l.triggerType === 'scheduled').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBackupFilter('manual')}
                    className={`px-2.5 py-1 rounded transition-colors ${
                      backupFilter === 'manual' ? 'bg-zinc-800 text-sky-400 font-bold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Manual ({backupLogs.filter(l => l.triggerType === 'manual').length})
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleClearBackupHistory}
                  className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-red-900/60 hover:text-red-400 text-zinc-400 text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Bersihkan riwayat log pencadangan"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Bersihkan Log</span>
                </button>
              </div>
            </div>

            {/* List Log Items */}
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {backupLogs
                .filter(log => {
                  if (backupFilter === 'scheduled') return log.triggerType === 'scheduled';
                  if (backupFilter === 'manual') return log.triggerType === 'manual';
                  return true;
                })
                .map((log, idx) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs">{log.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          log.triggerType === 'manual'
                            ? 'bg-sky-950 text-sky-400 border border-sky-900'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                        }`}>
                          {log.triggerType === 'manual' ? 'MANUAL' : 'OTOMATIS'}
                        </span>
                        <span className="text-zinc-400 font-mono text-[11px] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{log.timestamp}</span>
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-900">
                            TERAKHIR
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Snapshot mencakup: <strong className="text-zinc-300">{log.summary.customers} Pelanggan</strong> · <strong className="text-zinc-300">{log.summary.bills} Tagihan</strong> · <strong className="text-zinc-300">{log.summary.transactions} Transaksi</strong> · <strong className="text-zinc-300">{log.summary.vouchers} Voucher Hotspot</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <span className="font-mono text-zinc-200 text-xs font-semibold block">
                          {log.fileSizeKb} KB
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">
                          {log.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadLogFile(log)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
                        title="Unduh salinan berkas cadangan JSON ini"
                      >
                        <Download className="w-3.5 h-3.5 text-red-400" />
                        <span>Unduh JSON</span>
                      </button>
                    </div>
                  </div>
                ))}

              {backupLogs.length === 0 && (
                <div className="p-8 text-center text-zinc-500 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <Archive className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-xs">Belum ada riwayat log pencadangan database.</p>
                  <button
                    type="button"
                    onClick={() => handleBackupNow(true)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Jalankan pencadangan perdana sekarang
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 2: PENGATURAN RUIJIE REYEE & AUTO-ISOLIR
      ============================================================ */}
      {activeSection === 'ruijie' && (
        <div className="space-y-6">
          {/* Section Banner Header with Direct Action Buttons */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/60 via-zinc-900 to-zinc-900 border border-red-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-900/50 text-red-400 border border-red-800">
                  <Router className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  Ruijie Reyee Cloud Management, Auto-Sync & Hub Data
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-800">
                  Reyee Cloud API
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Kelola kredensial Ruijie Reyee Cloud, jadwal auto-sinkronisasi dua arah, aturan auto-isolir tagihan jatuh tempo, serta ekspor & impor akun pelanggan PPPoE dan pool voucher hotspot.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={handleSyncRuijieNow}
                disabled={isSyncingRuijie}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-950 flex items-center gap-1.5 cursor-pointer"
                title="Jalankan sinkronisasi dua arah dengan Ruijie Reyee Cloud sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRuijie ? 'animate-spin' : ''}`} />
                <span>{isSyncingRuijie ? 'Menyinkronkan...' : '⚡ Sinkronkan Sekarang'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRuijieHubInitialTab('import');
                  setShowRuijieHubModal(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Tarik data pelanggan dari Ruijie Gateway atau unggah file CSV/JSON"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>Tarik / Import Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRuijieHubInitialTab('export');
                  setShowRuijieHubModal(true);
                }}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Kirim akun PPPoE dan voucher ke Ruijie Cloud atau unduh berkas CSV"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kirim / Export Data</span>
              </button>
            </div>
          </div>

          {/* Hero Card: Auto-Sinkronisasi Terjadwal dengan Ruijie Cloud */}
          <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-5 h-5 text-red-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      Auto-Sinkronisasi Terjadwal dengan Ruijie Cloud
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-900 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      AKTIF BERKALA
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Sistem otomatis memperbarui client PPPoE, router gateway online, dan pool voucher hotspot secara periodik.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSyncEnabledSectionCheck"
                    checked={ruijieConfig.autoSyncEnabled !== false}
                    onChange={e => {
                      const updated = { ...ruijieConfig, autoSyncEnabled: e.target.checked };
                      setRuijieConfig(updated);
                      DataService.saveRuijieConfig(updated);
                    }}
                    className="w-4 h-4 rounded text-red-600 bg-zinc-950 border-zinc-700"
                  />
                  <label htmlFor="autoSyncEnabledSectionCheck" className="text-xs text-zinc-200 font-semibold cursor-pointer select-none">
                    Aktifkan Daemon Auto-Sync
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setRuijieHubInitialTab('sync');
                    setShowRuijieHubModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Detail & Hub Cloud</span>
                </button>
              </div>
            </div>

            {/* Metrik & Status Terakhir Sinkronisasi */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-medium">Timestamp Sinkronisasi Terakhir:</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">
                    SUKSES
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-mono font-extrabold text-white text-emerald-400">
                  {ruijieConfig.lastSuccessfulSyncAt || ruijieConfig.lastSyncAt || '15 Okt 2026, 10:30 WIB'}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-2 pt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Interval Waktu: <strong className="text-zinc-200">{ruijieConfig.autoSyncIntervalMinutes || 30} Menit per Siklus</strong></span>
                </div>
              </div>

              <div className="md:col-span-6 grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-zinc-500 text-[10px] font-semibold uppercase">Akun PPPoE</span>
                  <span className="text-lg font-mono font-bold text-white mt-1">
                    {DataService.getCustomers().length} User
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono">Tersinkronisasi</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-zinc-500 text-[10px] font-semibold uppercase">Gateway Online</span>
                  <span className="text-lg font-mono font-bold text-white mt-1">
                    {DataService.getRuijieDevices().length} Unit
                  </span>
                  <span className="text-[10px] text-sky-400 font-mono">RG-EG3250</span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-zinc-500 text-[10px] font-semibold uppercase">Voucher Hotspot</span>
                  <span className="text-lg font-mono font-bold text-white mt-1">
                    {DataService.getVouchers().length} Pool
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono">Radius Sync</span>
                </div>
              </div>
            </div>

            {/* Quick Interval Preset Selector */}
            <div className="pt-2 border-t border-zinc-800/70 space-y-2">
              <label className="block text-zinc-400 text-xs font-medium">
                Pilih Frekuensi Interval Auto-Sinkronisasi:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {[
                  { mins: 15, label: '15 Menit', freq: 'every_15_mins', desc: 'Realtime' },
                  { mins: 30, label: '30 Menit', freq: 'every_30_mins', desc: 'Rekomendasi' },
                  { mins: 60, label: '1 Jam', freq: 'hourly', desc: 'Standar' },
                  { mins: 360, label: '6 Jam', freq: 'every_6_hours', desc: '4x Sehari' },
                  { mins: 720, label: '12 Jam', freq: 'every_12_hours', desc: '2x Sehari' },
                  { mins: 1440, label: '24 Jam', freq: 'daily', desc: 'Harian' }
                ].map(item => {
                  const isSelected = ruijieConfig.autoSyncIntervalMinutes === item.mins;
                  return (
                    <button
                      key={item.mins}
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...ruijieConfig,
                          autoSyncIntervalMinutes: item.mins,
                          autoSyncFrequency: item.freq as any
                        };
                        setRuijieConfig(updated);
                        DataService.saveRuijieConfig(updated);
                        setNotice(`Interval auto-sync Ruijie Cloud disetel ke ${item.label}!`);
                        setTimeout(() => setNotice(null), 3000);
                      }}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-950/60 border-red-600 text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs">{item.label}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Aturan Auto-Isolir */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>Aturan Auto-Isolir Gateway Ruijie Reyee</span>
              </h3>

              <form onSubmit={handleSaveRuijieConfig} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1">Tanggal Jatuh Tempo Bulanan</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={ruijieConfig.autoIsolirDay}
                      onChange={e => setRuijieConfig({ ...ruijieConfig, autoIsolirDay: parseInt(e.target.value) || 20 })}
                      className="w-24 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                    />
                    <span className="text-zinc-400">setiap bulan (default tanggal 20)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Masa Tenggang / Grace Period</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={ruijieConfig.gracePeriodDays}
                      onChange={e => setRuijieConfig({ ...ruijieConfig, gracePeriodDays: parseInt(e.target.value) || 2 })}
                      className="w-24 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                    />
                    <span className="text-zinc-400">hari (Isolir dieksekusi tgl {ruijieConfig.autoIsolirDay + ruijieConfig.gracePeriodDays})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Profil PPPoE Isolir Ruijie</label>
                  <input
                    type="text"
                    value={ruijieConfig.isolirProfileName}
                    onChange={e => setRuijieConfig({ ...ruijieConfig, isolirProfileName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Profil PPPoE Normal (Default)</label>
                  <input
                    type="text"
                    value={ruijieConfig.normalProfileName}
                    onChange={e => setRuijieConfig({ ...ruijieConfig, normalProfileName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="autoIsolirActiveCheck"
                    checked={ruijieConfig.autoIsolirActive}
                    onChange={e => setRuijieConfig({ ...ruijieConfig, autoIsolirActive: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 bg-zinc-950 border-zinc-800"
                  />
                  <label htmlFor="autoIsolirActiveCheck" className="text-zinc-300 select-none">
                    Aktifkan daemon auto-isolir otomatis
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-sm"
                >
                  Simpan Aturan Isolir
                </button>
              </form>
            </div>

            {/* Kredensial Ruijie Cloud API */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-red-500" />
                <span>Kredensial Ruijie Reyee Cloud API (App ID & Secret Key)</span>
              </h3>

              <form onSubmit={handleSaveRuijieConfig} className="space-y-3">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Ruijie App ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: rj_app_anuwani_882910398"
                    value={ruijieConfig.appId || ruijieConfig.apiKey || ''}
                    onChange={e => setRuijieConfig({
                      ...ruijieConfig,
                      appId: e.target.value,
                      apiKey: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">App ID yang diterbitkan oleh Ruijie Cloud Platform</span>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">
                    Ruijie Secret Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Contoh: rj_sec_778120392819039129x88a"
                    value={ruijieConfig.secretKey || ruijieConfig.apiSecret || ''}
                    onChange={e => setRuijieConfig({
                      ...ruijieConfig,
                      secretKey: e.target.value,
                      apiSecret: e.target.value
                    })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-500">Secret Key API untuk enkripsi HMAC otorisasi Cloud</span>
                </div>

                {/* Form Username dan Password Ruijie Reyee Cloud */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800/60 mt-1">
                  <div>
                    <label className="block text-zinc-400 mb-1 flex items-center gap-1.5 font-medium">
                      <User className="w-3.5 h-3.5 text-red-400" />
                      <span>Username Ruijie Cloud</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: noc.admin@anuwani.net"
                      value={ruijieConfig.username || ''}
                      onChange={e => setRuijieConfig({
                        ...ruijieConfig,
                        username: e.target.value
                      })}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-zinc-500">Username atau email login akun Ruijie Reyee Cloud</span>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1 flex items-center gap-1.5 font-medium">
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      <span>Password Ruijie Cloud</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showRuijiePassword ? 'text' : 'password'}
                        placeholder="Masukkan password akun Ruijie Cloud"
                        value={ruijieConfig.password || ''}
                        onChange={e => setRuijieConfig({
                          ...ruijieConfig,
                          password: e.target.value
                        })}
                        className="w-full px-3 py-2 pr-9 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRuijiePassword(!showRuijiePassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer p-0.5"
                        title={showRuijiePassword ? 'Sembunyikan password' : 'Lihat password'}
                      >
                        {showRuijiePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <span className="text-[10px] text-zinc-500">Kata sandi akun pengelola Ruijie Reyee Cloud</span>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Cloud Open API URL</label>
                  <input
                    type="text"
                    value={ruijieConfig.cloudUrl}
                    onChange={e => setRuijieConfig({ ...ruijieConfig, cloudUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Site ID</label>
                  <input
                    type="text"
                    value={ruijieConfig.siteId}
                    onChange={e => setRuijieConfig({ ...ruijieConfig, siteId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-sm"
                  >
                    Simpan Kredensial Ruijie Cloud
                  </button>
                  <button
                    type="button"
                    onClick={handleTestRuijie}
                    disabled={isTestingRuijie}
                    className="px-3.5 py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
                  >
                    {isTestingRuijie ? 'Mengetes...' : 'Test Handshake Cloud'}
                  </button>
                </div>
              </form>

              {ruijieTestResult && (
                <div className={`p-2.5 rounded-lg text-[11px] ${
                  ruijieTestResult.success ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}>
                  {ruijieTestResult.message} {ruijieTestResult.latency ? `(${ruijieTestResult.latency} ms)` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 3: PENGATURAN DANA GATEWAYS
      ============================================================ */}
      {activeSection === 'dana' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              <span>Konfigurasi Akun Merchant DANA</span>
            </h3>

            <form onSubmit={handleSaveDanaConfig} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Environment Gateway</label>
                <select
                  value={danaConfig.environment}
                  onChange={e => setDanaConfig({ ...danaConfig, environment: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="sandbox">Sandbox (Lingkungan Pengujian)</option>
                  <option value="production">Production (Merchant Live)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">DANA Merchant ID</label>
                <input
                  type="text"
                  value={danaConfig.merchantId}
                  onChange={e => setDanaConfig({ ...danaConfig, merchantId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Client ID</label>
                <input
                  type="text"
                  value={danaConfig.clientId}
                  onChange={e => setDanaConfig({ ...danaConfig, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-sky-500 focus:outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Client Secret</label>
                <input
                  type="password"
                  value={danaConfig.clientSecret}
                  onChange={e => setDanaConfig({ ...danaConfig, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-sky-500 focus:outline-none text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Notification Webhook URL</label>
                <input
                  type="text"
                  value={danaConfig.notificationUrl}
                  onChange={e => setDanaConfig({ ...danaConfig, notificationUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[10px] focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="danaAutoSettle"
                  checked={danaConfig.autoSettle}
                  onChange={e => setDanaConfig({ ...danaConfig, autoSettle: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600 bg-zinc-950 border-zinc-800"
                />
                <label htmlFor="danaAutoSettle" className="text-zinc-300 select-none">
                  Auto-settle pembayaran secara real-time
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-500 transition-colors shadow-sm"
              >
                Simpan Konfigurasi DANA
              </button>
            </form>
          </div>

          {/* Quick Simulation & Info */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400" />
              <span>Simulasi & Validasi DANA Gateway</span>
            </h3>

            <p className="text-zinc-400 leading-relaxed">
              DANA Gateway terintegrasi penuh untuk pembayaran tagihan bulanan dan pembelian voucher hotspot dari WhatsApp bot.
            </p>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="font-semibold text-white">Alur Transaksi Otomatis:</div>
              <ol className="list-decimal list-inside space-y-1 text-zinc-400 text-[11px]">
                <li>Pelanggan menerima link DANA di WhatsApp atau memilih Bayar DANA di aplikasi.</li>
                <li>Halaman checkout DANA E-Wallet & QRIS menerima pembayaran.</li>
                <li>Callback/Webhook DANA memvalidasi transaksi dalam 1-2 detik.</li>
                <li>Tagihan lunas, isolir Ruijie terbuka otomatis, & bukti kuitansi terkirim ke WhatsApp.</li>
              </ol>
            </div>

            <button
              type="button"
              onClick={handleTestDanaSession}
              className="w-full py-2.5 rounded-lg bg-sky-950 border border-sky-800 text-sky-300 font-bold hover:bg-sky-900 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Uji Coba Popup Checkout DANA (Rp 5.000)</span>
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 4: PENGATURAN WHATSAPP BOT & LAYANAN FONNTE
      ============================================================ */}
      {activeSection === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form WhatsApp Gateway via Fonnte */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Integrasi WhatsApp Bot Layanan Fonnte</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900">
                Fonnte Gateway
              </span>
            </div>

            <form onSubmit={handleSaveWaBotConfig} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">
                  Fonnte API Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Contoh: FNTE_89a128bc991024_live..."
                  value={waBotConfig.fonnteToken || ''}
                  onChange={e => setWaBotConfig({ ...waBotConfig, fonnteToken: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-emerald-600 focus:outline-none text-[11px]"
                />
                <span className="text-[10px] text-zinc-500">
                  Dapatkan Token API resmi dari portal <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Fonnte.com</a>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 mb-1">Nomor Pengirim Bot WhatsApp</label>
                  <input
                    type="text"
                    value={waBotConfig.senderNumber}
                    onChange={e => setWaBotConfig({ ...waBotConfig, senderNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 mb-1">Device ID Fonnte</label>
                  <input
                    type="text"
                    placeholder="DEV-ANUWANINET-01"
                    value={waBotConfig.fonnteDevice || ''}
                    onChange={e => setWaBotConfig({ ...waBotConfig, fonnteDevice: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSendBillCheck"
                    checked={waBotConfig.autoSendOnBillCreated}
                    onChange={e => setWaBotConfig({ ...waBotConfig, autoSendOnBillCreated: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 bg-zinc-950 border-zinc-800"
                  />
                  <label htmlFor="autoSendBillCheck" className="text-zinc-300 select-none">
                    Kirim otomatis saat Generate Tagihan Bulanan Baru
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSendDueAlertCheck"
                    checked={waBotConfig.autoSendOnDueAlert}
                    onChange={e => setWaBotConfig({ ...waBotConfig, autoSendOnDueAlert: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 bg-zinc-950 border-zinc-800"
                  />
                  <label htmlFor="autoSendDueAlertCheck" className="text-zinc-300 select-none">
                    Kirim otomatis saat pelanggan terisolir Ruijie
                  </label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-zinc-400">Template Tagihan Bulanan (Default Bot)</label>
                  <button
                    type="button"
                    onClick={() => setActiveSection('templates')}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Kustomisasi di Bagian Template WA →</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={waBotConfig.billingTemplate}
                  onChange={e => setWaBotConfig({ ...waBotConfig, billingTemplate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-emerald-600 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 block mt-0.5">
                  Gunakan placeholder: <code>{'{NAMA}'}</code>, <code>{'{JUMLAH}'}</code>, <code>{'{NO_TAGIHAN}'}</code>, <code>{'{PERIODE}'}</code>, <code>{'{JATUH_TEMPO}'}</code>, <code>{'{LINK_DANA}'}</code>.
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Template Kuitansi Pembayaran Lunas</label>
                <textarea
                  rows={2}
                  value={waBotConfig.receiptTemplate}
                  onChange={e => setWaBotConfig({ ...waBotConfig, receiptTemplate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Template Notifikasi Isolir</label>
                <textarea
                  rows={2}
                  value={waBotConfig.isolirTemplate}
                  onChange={e => setWaBotConfig({ ...waBotConfig, isolirTemplate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-sm"
                >
                  Simpan Konfigurasi Fonnte ke Database
                </button>
                <button
                  type="button"
                  onClick={handleTestFonnteDevice}
                  disabled={isTestingFonnte}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
                >
                  {isTestingFonnte ? 'Cek...' : 'Cek Status Device'}
                </button>
              </div>
            </form>

            {fonnteTestResult && (
              <div className={`p-2.5 rounded-lg text-[11px] ${
                fonnteTestResult.status ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}>
                <div className="font-semibold">{fonnteTestResult.message}</div>
                {fonnteTestResult.device && <div>Device: {fonnteTestResult.device}</div>}
                {fonnteTestResult.quota !== undefined && <div>Sisa Kuota: {fonnteTestResult.quota} pesan</div>}
              </div>
            )}
          </div>

          {/* Test Kirim Pesan Langsung via Fonnte & Panduan Keywords */}
          <div className="space-y-4">
            {/* Box Test Kirim Fonnte */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span>Kirim Pesan Uji Coba WhatsApp (Fonnte API)</span>
              </h3>
              <p className="text-zinc-400 text-[11px]">
                Kirim pesan langsung ke nomor WhatsApp Anda untuk memverifikasi token dan integrasi Fonnte.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="081234567890"
                  value={testFonntePhone}
                  onChange={e => setTestFonntePhone(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-emerald-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSendTestMessageFonnte}
                  disabled={isSendingFonnteTest}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold hover:bg-emerald-600 transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSendingFonnteTest ? 'Mengirim...' : 'Kirim Uji'}</span>
                </button>
              </div>
            </div>

            {/* Panduan Keywords Bot */}
            <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-3 text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Perintah Bot 24 Jam via Webhook Fonnte</span>
              </h3>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-0.5">
                  <span className="font-mono text-emerald-400 font-bold">MENU / BANTUAN</span>
                  <p className="text-zinc-400 text-[11px]">Menampilkan menu utama pembelian voucher dan cek tagihan.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-0.5">
                  <span className="font-mono text-emerald-400 font-bold">BELI 3K / BELI 5K / BELI 25K</span>
                  <p className="text-zinc-400 text-[11px]">Memesan voucher hotspot instan yang terintegrasi dengan DANA QRIS.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-0.5">
                  <span className="font-mono text-emerald-400 font-bold">TAGIHAN</span>
                  <p className="text-zinc-400 text-[11px]">Mengecek nominal tagihan dan tanggal jatuh tempo pelanggan.</p>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-0.5">
                  <span className="font-mono text-emerald-400 font-bold">STATUS</span>
                  <p className="text-zinc-400 text-[11px]">Mengecek status koneksi (Aktif Normal atau Terisolir Ruijie).</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 5: WHATSAPP MESSAGE TEMPLATES (KUSTOMISASI PESAN)
      ============================================================ */}
      {activeSection === 'templates' && (
        <div className="space-y-6">
          {/* Section Banner Header */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900 border border-emerald-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-900/50 text-emerald-400 border border-emerald-800">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white">
                  WhatsApp Message Templates (Kustomisasi Pesan Tagihan)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                Sesuaikan isi template pesan WhatsApp otomatis untuk <strong>Payment Reminders</strong> (pengingat tagihan) dan <strong>Urgent Notices</strong> (peringatan mendesak overdue). Gunakan placeholder dinamis seperti <code className="text-emerald-300 font-mono">{"{{customer_name}}"}</code>, <code className="text-emerald-300 font-mono">{"{{bill_amount}}"}</code>, dan <code className="text-emerald-300 font-mono">{"{{due_date}}"}</code> yang akan diganti otomatis saat pesan dikirimkan.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowTemplateManager(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white hover:border-zinc-500 transition-colors flex items-center gap-1.5"
                title="Buka pustaka semua template kustom"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pustaka Template</span>
              </button>
              <button
                type="button"
                onClick={handleSaveTemplates}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-950 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Template</span>
              </button>
            </div>
          </div>

          {templateNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 flex items-center justify-between gap-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{templateNotice}</span>
              </div>
              <button
                onClick={() => setTemplateNotice(null)}
                className="text-emerald-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>
          )}

          {/* Sub-Tabs: Pilih Template yang ingin dikustomisasi */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setTemplateActiveTab('reminder')}
              className={`p-3 rounded-lg text-left transition-all relative ${
                templateActiveTab === 'reminder'
                  ? 'bg-zinc-800 border border-emerald-500/50 shadow-sm'
                  : 'hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <BellRing className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pengingat Pembayaran</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                  Reminder
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                Notifikasi tagihan baru & pengingat ramah sebelum jatuh tempo
              </p>
            </button>

            <button
              onClick={() => setTemplateActiveTab('urgent')}
              className={`p-3 rounded-lg text-left transition-all relative ${
                templateActiveTab === 'urgent'
                  ? 'bg-zinc-800 border border-red-500/50 shadow-sm'
                  : 'hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  <span>Pemberitahuan Mendesak</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-800 font-mono">
                  Urgent
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                Peringatan keras tagihan overdue & ancaman isolir Ruijie
              </p>
            </button>

            <button
              onClick={() => setTemplateActiveTab('receipt')}
              className={`p-3 rounded-lg text-left transition-all relative ${
                templateActiveTab === 'receipt'
                  ? 'bg-zinc-800 border border-sky-500/50 shadow-sm'
                  : 'hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <Receipt className="w-3.5 h-3.5 text-sky-400" />
                  <span>Kuitansi Pembayaran</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                  Receipt
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                Bukti pelunasan sah setelah diverifikasi kasir / DANA
              </p>
            </button>

            <button
              onClick={() => setTemplateActiveTab('isolir')}
              className={`p-3 rounded-lg text-left transition-all relative ${
                templateActiveTab === 'isolir'
                  ? 'bg-zinc-800 border border-amber-500/50 shadow-sm'
                  : 'hover:bg-zinc-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                  <Server className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notifikasi Isolir</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800 font-mono">
                  Isolir
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-1">
                Pemberitahuan pemutusan sementara oleh router Ruijie
              </p>
            </button>
          </div>

          {/* Interactive Placeholder Chips Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Placeholder Tersedia (Klik untuk Menyisipkan & Menyalin):
                </h4>
              </div>
              <span className="text-[11px] text-zinc-400">
                {copiedPlaceholder ? (
                  <span className="text-emerald-400 font-semibold animate-pulse">
                    ✓ Disisipkan & Tersalin: <code className="font-mono">{copiedPlaceholder}</code>
                  </span>
                ) : (
                  'Klik tag di bawah untuk menempelkannya langsung ke posisi kursor'
                )}
              </span>
            </div>

            {/* Primary placeholders requested by user */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Placeholder Utama:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: '{{customer_name}}', label: 'Nama Pelanggan', desc: 'Contoh: Budi Santoso' },
                  { tag: '{{bill_amount}}', label: 'Nominal Tagihan', desc: 'Contoh: Rp 165.000' },
                  { tag: '{{due_date}}', label: 'Tanggal Jatuh Tempo', desc: 'Contoh: 2026-10-20' },
                  { tag: '{{customer_code}}', label: 'ID Pelanggan', desc: 'Contoh: ANW-1082' },
                  { tag: '{{bill_number}}', label: 'No. Tagihan / Invoice', desc: 'Contoh: INV-202610-088' },
                  { tag: '{{period}}', label: 'Periode Tagihan', desc: 'Contoh: Oktober 2026' },
                  { tag: '{{package_name}}', label: 'Nama Paket', desc: 'Contoh: Paket Keluarga 20 Mbps' },
                  { tag: '{{payment_link}}', label: 'Link Bayar DANA & QRIS', desc: 'Link verifikasi otomatis' },
                  { tag: '{{days_overdue}}', label: 'Hari Overdue', desc: 'Contoh: 3' },
                  { tag: '{{customer_phone}}', label: 'Nomor WhatsApp', desc: 'Nomor HP pelanggan' },
                  { tag: '{{isolir_date}}', label: 'Tanggal Isolir', desc: 'Jadwal putus otomatis' }
                ].map(item => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => handleInsertPlaceholder(item.tag)}
                    title={`${item.label} (${item.desc})`}
                    className="group px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-600 hover:bg-emerald-950/40 text-left transition-all flex items-center gap-1.5"
                  >
                    <code className="text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
                      {item.tag}
                    </code>
                    <span className="text-[10px] text-zinc-400 group-hover:text-zinc-200">
                      ({item.label})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Split Screen: Left Textarea Editor, Right WhatsApp Simulator */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Template Editor */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    {templateActiveTab === 'reminder' && 'Editor Template: Pengingat Pembayaran (Payment Reminder)'}
                    {templateActiveTab === 'urgent' && 'Editor Template: Peringatan Mendesak (Urgent Notice)'}
                    {templateActiveTab === 'receipt' && 'Editor Template: Kuitansi Lunas (Payment Receipt)'}
                    {templateActiveTab === 'isolir' && 'Editor Template: Notifikasi Isolir (Isolir Alert)'}
                  </h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetActiveTemplateToDefault}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                    title="Kembalikan format teks ini ke standar resmi AnuwaniNet"
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Reset Default</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentTemplateText);
                      setTemplateNotice('Isi template berhasil disalin ke clipboard!');
                      setTimeout(() => setTemplateNotice(null), 3000);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3 text-zinc-400" />
                    <span>Salin</span>
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Isi Konten Pesan WhatsApp:</span>
                  <span>{currentTemplateText.length} karakter • {currentTemplateText.split('\n').length} baris</span>
                </div>
                <textarea
                  ref={templateTextareaRef}
                  rows={14}
                  value={
                    templateActiveTab === 'reminder'
                      ? (waBotConfig.reminderTemplate || DEFAULT_REMINDER_TMPL)
                      : templateActiveTab === 'urgent'
                      ? (waBotConfig.urgentNoticeTemplate || DEFAULT_URGENT_TMPL)
                      : templateActiveTab === 'receipt'
                      ? waBotConfig.receiptTemplate
                      : waBotConfig.isolirTemplate
                  }
                  onChange={e => {
                    const val = e.target.value;
                    if (templateActiveTab === 'reminder') {
                      setWaBotConfig({ ...waBotConfig, reminderTemplate: val });
                    } else if (templateActiveTab === 'urgent') {
                      setWaBotConfig({ ...waBotConfig, urgentNoticeTemplate: val });
                    } else if (templateActiveTab === 'receipt') {
                      setWaBotConfig({ ...waBotConfig, receiptTemplate: val });
                    } else if (templateActiveTab === 'isolir') {
                      setWaBotConfig({ ...waBotConfig, isolirTemplate: val });
                    }
                  }}
                  className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-xs leading-relaxed focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600/40 resize-y"
                  placeholder="Ketik isi template pesan WhatsApp..."
                />
              </div>

              {/* Tip Formatting & Save Action */}
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">Format WhatsApp:</span>
                  <span><code className="text-emerald-400 font-mono">*tebal*</code></span>
                  <span><code className="text-emerald-400 font-mono">_miring_</code></span>
                  <span><code className="text-emerald-400 font-mono">~coret~</code></span>
                  <span><code className="text-emerald-400 font-mono">```monospace```</code></span>
                </div>
                <span className="text-zinc-500">
                  Placeholder otomatis dirender saat dikirimkan.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleSaveTemplates}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-950 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan Template ke Database</span>
                </button>
              </div>
            </div>

            {/* RIGHT: Live WhatsApp Chat Simulator */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">
                    Live Simulator Pesan WhatsApp
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900">
                  Evaluasi Real-Time
                </span>
              </div>

              {/* Scenario Toggle */}
              <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                <span className="text-zinc-400 text-[11px]">Pratinjau Data:</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewCustomerScenario('normal')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      previewCustomerScenario === 'normal'
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Budi (Normal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewCustomerScenario('overdue')}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      previewCustomerScenario === 'overdue'
                        ? 'bg-red-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Ahmad (Overdue 3 Hari)
                  </button>
                </div>
              </div>

              {/* WhatsApp Phone Mockup Canvas */}
              <div className="rounded-2xl border border-zinc-800 bg-[#0b141a] overflow-hidden shadow-xl">
                {/* Mockup WhatsApp Header */}
                <div className="px-4 py-3 bg-[#202c33] border-b border-zinc-800 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-xs text-white shadow">
                      AN
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                        <span>AnuwaniNet Official Bot</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono">
                        Akun Bisnis Resmi • Online
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400">WhatsApp Web</span>
                </div>

                {/* Chat Bubble Area with subtle WhatsApp dark theme */}
                <div className="p-4 bg-[#0b141a] min-h-[300px] max-h-[460px] overflow-y-auto space-y-3">
                  {/* Date badge */}
                  <div className="flex justify-center">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#182229] text-[10px] text-zinc-400 border border-zinc-800/60">
                      HARI INI
                    </span>
                  </div>

                  {/* Outgoing Message Bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[92%] p-3.5 rounded-2xl rounded-tr-sm bg-[#005c4b] text-white shadow-md relative space-y-2">
                      <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed break-words text-zinc-100">
                        {evaluatedPreviewText || 'Template kosong...'}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/80 pt-1">
                        <span>10:45</span>
                        <span className="text-sky-300 font-bold" title="Terkirim & Terbaca">✓✓</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulator Footer: Quick Test Action */}
                <div className="p-3 bg-[#202c33] border-t border-zinc-800 space-y-2.5">
                  <div className="text-[11px] font-semibold text-zinc-300">
                    Kirim Uji Coba Template Ini:
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nomor WhatsApp (0812xxx)"
                      value={previewTestPhone}
                      onChange={e => setPreviewTestPhone(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendTemplateTestWeb}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Buka WhatsApp Web dengan pesan ini"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WA Web</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSendTemplateTestFonnte}
                      disabled={isSendingPreviewTest}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Kirim otomatis menggunakan API Token Fonnte"
                    >
                      <span>{isSendingPreviewTest ? 'Mengirim...' : 'Kirim Bot'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 6: TUTORIAL & PANDUAN DEPLOYMENT HOSTING
      ============================================================ */}
      {activeSection === 'tutorial' && <HostingTutorialSection />}

      {/* WhatsApp Template Management Modal */}
      <WhatsAppTemplateModal
        isOpen={showTemplateManager}
        onClose={() => setShowTemplateManager(false)}
        onTemplatesUpdated={() => {
          setWaBotConfig(DataService.getWhatsAppBotConfig());
          onRefreshData();
        }}
      />

      {/* Ruijie Reyee Cloud Hub: Sinkronisasi, Ekspor & Impor Modal */}
      <RuijieImportModal
        isOpen={showRuijieHubModal}
        onClose={() => setShowRuijieHubModal(false)}
        packages={DataService.getPackages()}
        onImportSuccess={() => {
          onRefreshData();
          setRuijieConfig(DataService.getRuijieConfig());
        }}
        initialTab={ruijieHubInitialTab}
      />
    </div>
  );
};
