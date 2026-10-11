import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AppSettings,
  RuijieConfig,
  DanaGatewayConfig,
  WhatsAppBotConfig,
  SupabaseConfig,
  DanaPaymentSession
} from '../types';
import { DataService } from '../services/dataService';
import { RuijieService } from '../services/ruijieService';
import { DanaService } from '../services/danaService';
import { FonnteService } from '../services/fonnteService';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA
} from '../services/supabaseService';
import {
  Settings,
  Sliders,
  Server,
  CreditCard,
  Smartphone,
  Database,
  CheckCircle,
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
  Zap,
  Radio,
  Send
} from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState<'app' | 'ruijie' | 'dana' | 'whatsapp'>('app');

  // States
  const [appSettings, setAppSettings] = useState<AppSettings>(() => DataService.getAppSettings());
  const [ruijieConfig, setRuijieConfig] = useState<RuijieConfig>(() => DataService.getRuijieConfig());
  const [danaConfig, setDanaConfig] = useState<DanaGatewayConfig>(() => DanaService.getConfig());
  const [waBotConfig, setWaBotConfig] = useState<WhatsAppBotConfig>(() => DataService.getWhatsAppBotConfig());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());

  const [notice, setNotice] = useState<string | null>(null);
  const [ruijieTestResult, setRuijieTestResult] = useState<{ success: boolean; latency?: number; message: string } | null>(null);
  const [isTestingRuijie, setIsTestingRuijie] = useState(false);

  const [fonnteTestResult, setFonnteTestResult] = useState<{ status: boolean; message?: string; device?: string; quota?: number } | null>(null);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);
  const [testFonntePhone, setTestFonntePhone] = useState('081234567890');
  const [isSendingFonnteTest, setIsSendingFonnteTest] = useState(false);

  const [supabaseTestResult, setSupabaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isLoadingFromDb, setIsLoadingFromDb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

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

  // Save Handlers
  const handleSaveAppSettings = (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveAppSettings(appSettings);
    setNotice('Pengaturan identitas aplikasi berhasil disimpan!');
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSaveRuijieConfig = (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveRuijieConfig(ruijieConfig);
    setNotice('Pengaturan Ruijie Reyee & Auto-Isolir berhasil disimpan!');
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSaveDanaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    DanaService.saveConfig(danaConfig);
    setNotice('Pengaturan DANA Payment Gateway berhasil disimpan!');
    setTimeout(() => setNotice(null), 4000);
  };

  const handleSaveWaBotConfig = (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveWhatsAppBotConfig(waBotConfig);
    setNotice('Pengaturan WhatsApp Bot via Fonnte berhasil disimpan ke database!');
    setTimeout(() => setNotice(null), 4000);
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

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
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

        <button
          type="button"
          onClick={handleReloadFromCloudDatabase}
          disabled={isLoadingFromDb}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-red-500 ${isLoadingFromDb ? 'animate-spin' : ''}`} />
          <span>{isLoadingFromDb ? 'Membaca Database...' : 'Baca dari Database'}</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-800 text-xs text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* 4-Tab Section Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
        <button
          onClick={() => setActiveSection('app')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSection === 'app'
              ? 'bg-red-600 text-white shadow-md shadow-red-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Aplikasi & Supabase</span>
        </button>

        <button
          onClick={() => setActiveSection('ruijie')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSection === 'ruijie'
              ? 'bg-red-600 text-white shadow-md shadow-red-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Ruijie & Isolir</span>
        </button>

        <button
          onClick={() => setActiveSection('dana')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSection === 'dana'
              ? 'bg-sky-600 text-white shadow-md shadow-sky-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4 text-sky-400" />
          <span>DANA Gateways</span>
        </button>

        <button
          onClick={() => setActiveSection('whatsapp')}
          className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
            activeSection === 'whatsapp'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
          }`}
        >
          <Smartphone className="w-4 h-4 text-emerald-400" />
          <span>WhatsApp Bot</span>
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

          {/* Konfigurasi Supabase Database */}
          <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-red-500" />
                <span>Pengaturan Database Supabase (Cloud PostgreSQL)</span>
              </h3>
              <span className={`w-2.5 h-2.5 rounded-full ${supabaseConfig.isConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            </div>

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

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestSupabase}
                disabled={isTestingSupabase}
                className="flex-1 py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
              >
                {isTestingSupabase ? 'Mengetes...' : 'Simpan & Tes Koneksi Supabase'}
              </button>
            </div>

            {supabaseTestResult && (
              <div className={`p-2.5 rounded-lg text-[11px] ${
                supabaseTestResult.success ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
              }`}>
                {supabaseTestResult.message}
              </div>
            )}

            {/* Skrip SQL Copy */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-300">Skrip DDL Schema Supabase:</span>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-[11px] font-semibold flex items-center gap-1"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql ? 'Tersalin' : 'Salin SQL'}</span>
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 max-h-24 overflow-y-auto font-mono text-[10px] text-zinc-500 whitespace-pre">
                {SUPABASE_SQL_SCHEMA.slice(0, 300)}...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SECTION 2: PENGATURAN RUIJIE REYEE & AUTO-ISOLIR
      ============================================================ */}
      {activeSection === 'ruijie' && (
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
                <label className="block text-zinc-400 mb-1">
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
                <label className="block text-zinc-400 mb-1">
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

              <div>
                <label className="block text-zinc-400 mb-1">Cloud Open API URL</label>
                <input
                  type="text"
                  value={ruijieConfig.cloudUrl}
                  onChange={e => setRuijieConfig({ ...ruijieConfig, cloudUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Site ID</label>
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
                  Simpan App ID & Secret Key
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
                <label className="block text-zinc-400 mb-1">Template Tagihan Bulanan</label>
                <textarea
                  rows={2}
                  value={waBotConfig.billingTemplate}
                  onChange={e => setWaBotConfig({ ...waBotConfig, billingTemplate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px] focus:border-emerald-600 focus:outline-none"
                />
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
    </div>
  );
};
