import React, { useState } from 'react';
import { Customer, RuijieConfig, RuijieDevice, InternetPackage } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Server,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Cpu,
  HardDrive,
  Wifi,
  Settings,
  Activity,
  CheckCircle,
  AlertCircle,
  Key,
  Globe,
  Sliders,
  Send,
  Network,
  Download,
  Zap,
  Router,
  User,
  Lock,
  Eye,
  EyeOff,
  Clock,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';
import { RuijieService, RuijieExecutionLog } from '../services/ruijieService';
import { DataService } from '../services/dataService';
import { WhatsAppService } from '../services/whatsappService';
import { NetworkTopologyView } from '../components/NetworkTopologyView';
import { RuijieImportModal } from '../components/modals/RuijieImportModal';

interface RuijieViewProps {
  devices: RuijieDevice[];
  customers: Customer[];
  packages?: InternetPackage[];
  onRefreshData: () => void;
}

export const RuijieView: React.FC<RuijieViewProps> = ({
  devices,
  customers,
  packages,
  onRefreshData
}) => {
  const { currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === 'superadmin';

  const [config, setConfig] = useState<RuijieConfig>(() => DataService.getRuijieConfig());
  const [logs, setLogs] = useState<RuijieExecutionLog[]>(() => RuijieService.getLogs());
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportingRealData, setIsImportingRealData] = useState(false);
  const [showRuijieImportModal, setShowRuijieImportModal] = useState(false);
  const [ruijieHubTab, setRuijieHubTab] = useState<'sync' | 'import' | 'export' | 'template'>('sync');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const isolatedCustomers = customers.filter(c => c.status === 'isolated');
  const activeCustomers = customers.filter(c => c.status === 'active');
  const availablePackages = packages || DataService.getPackages();

  const handleOpenRuijieHub = (tab: 'sync' | 'import' | 'export' | 'template') => {
    setRuijieHubTab(tab);
    setShowRuijieImportModal(true);
  };

  const handleSyncCloudNow = async () => {
    setIsSyncingCloud(true);
    setActionNotice('Menjalankan auto-sinkronisasi dua arah dengan Ruijie Reyee Cloud...');
    try {
      const res = await RuijieService.executeRuijieCloudSync('manual');
      setConfig(DataService.getRuijieConfig());
      setLogs(RuijieService.getLogs());
      onRefreshData();
      setActionNotice(res.message);
    } catch (err: any) {
      setActionNotice('Gagal sinkronisasi Ruijie: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleImportRealDataDirect = async () => {
    setIsImportingRealData(true);
    setActionNotice('Memindai Ruijie Reyee Gateway RG-EG3250 & Reyee Cloud...');
    try {
      const res = await RuijieService.importRealRuijieDataNow();
      setLogs(RuijieService.getLogs());
      onRefreshData();
      setActionNotice(res.message);
    } catch (e: any) {
      setActionNotice(e?.message || 'Gagal mengimpor real data Ruijie');
    } finally {
      setIsImportingRealData(false);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    DataService.saveRuijieConfig(config);
    setActionNotice('Konfigurasi Ruijie Reyee berhasil disimpan!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const res = await RuijieService.testRuijieConnection(config);
    setIsTesting(false);
    setTestResult({
      success: res.success,
      message: res.message,
      latency: res.latencyMs
    });
  };

  const handleRunAutoIsolirNow = () => {
    const res = RuijieService.runAutoIsolir();
    setLogs(RuijieService.getLogs());
    onRefreshData();
    setActionNotice(res.message);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const handleSyncVouchers = () => {
    setIsSyncing(true);
    setTimeout(() => {
      const res = RuijieService.syncVouchersWithRuijie();
      setIsSyncing(false);
      setLogs(RuijieService.getLogs());
      setActionNotice(res.message);
      setTimeout(() => setActionNotice(null), 4000);
    }, 600);
  };

  const handleQuickToggleIsolir = (c: Customer) => {
    if (c.status === 'isolated') {
      RuijieService.restoreCustomer(c, 'Pulihkan manual dari panel Ruijie');
      setActionNotice(`Isolir ${c.name} telah dipulihkan.`);
    } else {
      RuijieService.isolateCustomer(c, 'Isolir manual dari panel Ruijie');
      setActionNotice(`${c.name} telah diisolir di Ruijie Gateway.`);
    }
    setLogs(RuijieService.getLogs());
    onRefreshData();
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {isSuperadmin ? (
                <>
                  <Server className="w-6 h-6 text-red-500" />
                  <span>Integrasi Ruijie Reyee & Auto Isolir</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-6 h-6 text-red-500" />
                  <span>Manajemen Isolir & Auto Isolir Pelanggan</span>
                </>
              )}
            </h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              isSuperadmin ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}>
              {isSuperadmin ? 'Superadmin Full Access' : 'Admin Operator'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            {isSuperadmin
              ? 'Konfigurasi integrasi Ruijie Cloud OpenAPI, otomasi isolir jatuh tempo, sinkronisasi profil hotspot voucher, dan pemantauan gateway.'
              : 'Fitur eksekusi isolir manual & auto isolir pelanggan tertunggak via gateway Ruijie Reyee.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Auto-Sync Cloud */}
          <button
            onClick={handleSyncCloudNow}
            disabled={isSyncingCloud}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-950 cursor-pointer disabled:opacity-60"
            title="Sinkronisasi dua arah dengan Ruijie Reyee Cloud (PPPoE, Router Gateway, dan Voucher Hotspot)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : '⚡ Sync Ruijie Cloud'}</span>
          </button>

          {/* Tarik / Import Ruijie */}
          <button
            onClick={() => handleOpenRuijieHub('import')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 hover:border-sky-500 text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            title="Tarik data pelanggan dari router Ruijie Gateway atau unggah berkas CSV/JSON"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Tarik / Import Data</span>
          </button>

          {/* Kirim / Export Ruijie */}
          <button
            onClick={() => handleOpenRuijieHub('export')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 hover:border-emerald-500 text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            title="Kirim akun PPPoE dan voucher ke Ruijie Cloud API atau unduh file CSV/JSON"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Kirim / Export Data</span>
          </button>

          {/* 1-Click Fast Import */}
          <button
            onClick={handleImportRealDataDirect}
            disabled={isImportingRealData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer disabled:opacity-60"
            title="Tarik langsung seluruh data real pelanggan PPPoE dari Ruijie Gateway EG3250 dan simpan ke Database dalam 1-Klik"
          >
            {isImportingRealData ? (
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>1-Klik Real Data</span>
          </button>

          {isSuperadmin && (
            <button
              onClick={handleSyncVouchers}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
              title="Sinkronisasi kode voucher hotspot ke Cloud Ruijie Reyee"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sinkron Voucher</span>
            </button>
          )}

          <button
            onClick={handleRunAutoIsolirNow}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 hover:border-red-600/80 text-red-400 hover:text-white transition-colors cursor-pointer"
            title="Jalankan isolir otomatis tagihan tertunggak sekarang"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Auto Isolir</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-red-900/60 text-xs text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Hero Card: Auto-Sinkronisasi Terjadwal dengan Ruijie Cloud */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-red-500" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Auto-Sinkronisasi Data Ruijie Cloud & Hub Gateway
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
                  config.autoSyncEnabled !== false
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-900'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  {config.autoSyncEnabled !== false ? 'AUTO-SYNC AKTIF' : 'AUTO-SYNC NONAKTIF'}
                </span>
              </div>
              <p className="text-zinc-400 text-[11px] mt-0.5">
                Sistem otomatis menyelaraskan akun pelanggan PPPoE, router gateway online, dan pool voucher hotspot secara berkala.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenRuijieHub('sync')}
              className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Detail Cloud Hub</span>
            </button>

            <button
              type="button"
              onClick={handleSyncCloudNow}
              disabled={isSyncingCloud}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Metrik & Status Terakhir Sinkronisasi */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          <div className="md:col-span-5 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Timestamp Sinkronisasi Terakhir:</span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">
                CLOUD SYNCED
              </span>
            </div>
            <div className="text-lg sm:text-xl font-mono font-extrabold text-white text-emerald-400">
              {config.lastSuccessfulSyncAt || config.lastSyncAt || '15 Okt 2026, 10:30 WIB'}
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Interval Rutin: <strong className="text-zinc-200 font-mono">{config.autoSyncIntervalMinutes || 30} Menit</strong> per Siklus</span>
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div
              onClick={() => handleOpenRuijieHub('import')}
              className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors flex flex-col justify-between"
              title="Klik untuk membuka penarikan data pelanggan PPPoE dari Ruijie"
            >
              <span className="text-zinc-500 text-[10px] font-semibold uppercase">Akun PPPoE</span>
              <span className="text-lg font-mono font-bold text-white mt-0.5">
                {customers.length} User
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Tarik / Import ↗</span>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
              <span className="text-zinc-500 text-[10px] font-semibold uppercase">Gateway Online</span>
              <span className="text-lg font-mono font-bold text-white mt-0.5">
                {devices.length} Unit
              </span>
              <span className="text-[10px] text-sky-400 font-mono">RG-EG3250</span>
            </div>

            <div
              onClick={() => handleOpenRuijieHub('export')}
              className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition-colors flex flex-col justify-between"
              title="Klik untuk membuka ekspor data ke Ruijie Cloud"
            >
              <span className="text-zinc-500 text-[10px] font-semibold uppercase">Voucher Hotspot</span>
              <span className="text-lg font-mono font-bold text-white mt-0.5">
                {DataService.getVouchers().length} Pool
              </span>
              <span className="text-[10px] text-amber-400 font-mono">Kirim / Export ↗</span>
            </div>
          </div>
        </div>

        {/* Quick Interval Preset Selector */}
        <div className="pt-2 border-t border-zinc-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400 text-xs font-medium">Ubah Frekuensi Interval Auto-Sync:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { mins: 15, label: '15 M' },
              { mins: 30, label: '30 M (Rek)' },
              { mins: 60, label: '1 Jam' },
              { mins: 360, label: '6 Jam' },
              { mins: 720, label: '12 Jam' },
              { mins: 1440, label: '24 Jam' }
            ].map(item => {
              const isSelected = config.autoSyncIntervalMinutes === item.mins;
              return (
                <button
                  key={item.mins}
                  type="button"
                  onClick={() => {
                    const updated = {
                      ...config,
                      autoSyncIntervalMinutes: item.mins
                    };
                    setConfig(updated);
                    DataService.saveRuijieConfig(updated);
                    setActionNotice(`Interval auto-sync Ruijie Cloud diubah ke ${item.label}!`);
                    setTimeout(() => setActionNotice(null), 3000);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-950 text-white border border-red-600 shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Visual Topology Representation */}
      <NetworkTopologyView
        devices={devices}
        config={config}
        onRefresh={onRefreshData}
        isLiveConnected={true}
      />

      {/* Hardware Monitoring Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map(dev => (
          <div key={dev.id} className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-950/60 text-red-400 border border-red-900/40">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{dev.name}</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">{dev.model} · SN: {dev.serialNumber}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-900/60">
                Online
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
              <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-zinc-400" /> CPU
                </div>
                <div className="font-mono font-bold text-white mt-1 tabular-nums">{dev.cpuUsage}%</div>
              </div>

              <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <HardDrive className="w-3 h-3 text-zinc-400" /> Memori
                </div>
                <div className="font-mono font-bold text-white mt-1 tabular-nums">{dev.memUsage}%</div>
              </div>

              <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/60">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                  <Wifi className="w-3 h-3 text-emerald-400" /> Klien Aktif
                </div>
                <div className="font-mono font-bold text-emerald-400 mt-1 tabular-nums">{dev.connectedUsers} Klien</div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
              <span>Pool Isolir: <span className="font-mono text-red-400">{dev.isolirPoolName}</span></span>
              <span className="text-zinc-500">Sync: {dev.lastSync}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2-Column: Auto-Isolir Rules & Quick Isolir Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Rules & Ruijie API Settings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Rules Form */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-red-500" />
              Aturan Auto-Isolir Ruijie
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Tanggal Jatuh Tempo Bulanan</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={config.autoIsolirDay}
                    onChange={e => setConfig({ ...config, autoIsolirDay: parseInt(e.target.value) || 20 })}
                    className="w-24 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                  <span className="text-zinc-400">setiap bulan (default tanggal 20)</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Masa Tenggang / Toleransi (Hari)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={config.gracePeriodDays}
                    onChange={e => setConfig({ ...config, gracePeriodDays: parseInt(e.target.value) || 2 })}
                    className="w-24 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                  />
                  <span className="text-zinc-400">hari setelah jatuh tempo (Isolir tgl {config.autoIsolirDay + config.gracePeriodDays})</span>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Profil PPPoE Isolir Ruijie Reyee</label>
                <input
                  type="text"
                  value={config.isolirProfileName}
                  onChange={e => setConfig({ ...config, isolirProfileName: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:border-red-600 focus:outline-none"
                />
                <span className="text-[10px] text-zinc-500 mt-0.5 block">
                  Profil di router yang membatasi bandwith dan mengarahkan DNS ke halaman tagihan
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-zinc-800 text-white font-semibold hover:bg-zinc-700 transition-colors"
                >
                  Simpan Aturan Auto-Isolir
                </button>
              </div>
            </form>
          </div>

          {/* Cloud API Credentials (Superadmin Only) */}
          {isSuperadmin ? (
            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-red-500" />
                  Kredensial Ruijie Reyee Cloud API (App ID & Secret Key)
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-400 border border-red-900">
                  Superadmin
                </span>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Ruijie App ID</label>
                <input
                  type="text"
                  placeholder="rj_app_anuwani_882910398"
                  value={config.appId || config.apiKey || ''}
                  onChange={e => setConfig({ ...config, appId: e.target.value, apiKey: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Ruijie Secret Key</label>
                <input
                  type="password"
                  placeholder="rj_sec_778120392819039129x88a"
                  value={config.secretKey || config.apiSecret || ''}
                  onChange={e => setConfig({ ...config, secretKey: e.target.value, apiSecret: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                <div>
                  <label className="block text-zinc-400 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3 text-red-400" />
                    <span>Username Ruijie Cloud</span>
                  </label>
                  <input
                    type="text"
                    placeholder="noc.admin@anuwani.net"
                    value={config.username || ''}
                    onChange={e => setConfig({ ...config, username: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-red-400" />
                    <span>Password Ruijie Cloud</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Kata sandi akun cloud"
                      value={config.password || ''}
                      onChange={e => setConfig({ ...config, password: e.target.value })}
                      className="w-full px-3 py-1.5 pr-8 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Cloud Open API URL</label>
                <input
                  type="text"
                  value={config.cloudUrl}
                  onChange={e => setConfig({ ...config, cloudUrl: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Site ID</label>
                <input
                  type="text"
                  value={config.siteId}
                  onChange={e => setConfig({ ...config, siteId: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[11px]"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-colors font-medium text-xs flex items-center justify-center gap-1.5"
                >
                  {isTesting ? 'Mengetes...' : 'Test Koneksi Ruijie Cloud'}
                </button>
              </div>

              {testResult && (
                <div className={`p-2 rounded-lg text-[11px] font-mono ${
                  testResult.success ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
                }`}>
                  {testResult.message} {testResult.latency ? `(${testResult.latency} ms)` : ''}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs space-y-2 text-zinc-400">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Key className="w-4 h-4 text-zinc-500" />
                <span>Pengaturan API Ruijie Dibatasi</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Menu konfigurasi integrasi Ruijie (App ID, Secret Key, dan Cloud URL) hanya tersedia untuk peran <strong>Superadmin</strong>. Akun Operator Admin hanya dapat mengeksekusi <strong>Isolir Manual</strong> dan <strong>Auto Isolir</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Fast Isolir Control & Live Execution Logs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick isolir status */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Daftar Pelanggan Terisolir ({isolatedCustomers.length})
              </h3>
              <span className="text-[11px] text-zinc-400">
                Layanan dibatasi ke portal bayar
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {isolatedCustomers.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-500">
                  Tidak ada pelanggan yang sedang terisolir saat ini.
                </div>
              ) : (
                isolatedCustomers.map(c => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg bg-zinc-950 border border-red-900/40 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{c.name} ({c.customerCode})</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        PPPoE: {c.pppoeUsername} · {c.phone}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickToggleIsolir(c)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                    >
                      Buka Isolir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ruijie Real-time Execution Logs */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-red-500" />
                Audit Log Eksekusi Ruijie Reyee
              </h3>
              <span className="text-[11px] font-mono text-zinc-500">Live API trace</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1 font-mono text-[11px]">
              {logs.map(log => (
                <div key={log.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span className="text-red-400 font-bold uppercase">{log.action.replace('_', ' ')}</span>
                    <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                  </div>
                  <p className="text-zinc-300 font-sans text-xs">{log.details}</p>
                  {log.customerName && (
                    <div className="text-[10px] text-zinc-500">
                      Target: {log.customerName} ({log.customerCode})
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ruijie Real Customer Discovery & Import Modal */}
      <RuijieImportModal
        isOpen={showRuijieImportModal}
        onClose={() => setShowRuijieImportModal(false)}
        packages={availablePackages}
        initialTab={ruijieHubTab}
        onImportSuccess={count => {
          setLogs(RuijieService.getLogs());
          onRefreshData();
          setActionNotice(`Berhasil mengimpor ${count} data real pelanggan dari Ruijie Reyee ke Database!`);
          setTimeout(() => setActionNotice(null), 5000);
        }}
      />
    </div>
  );
};
