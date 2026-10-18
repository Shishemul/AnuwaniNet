import React, { useState, useEffect, useMemo } from 'react';
import {
  RuijieService,
  DiscoveredRuijieCustomer
} from '../../services/ruijieService';
import { InternetPackage, RuijieConfig } from '../../types';
import { DataService } from '../../services/dataService';
import {
  Router,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  Database,
  Check,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  Wifi,
  Search,
  Filter,
  Send,
  SlidersHorizontal,
  Clock,
  Layers,
  HardDriveDownload,
  Key,
  Shield,
  FileText
} from 'lucide-react';

interface RuijieImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  packages: InternetPackage[];
  onImportSuccess: (count: number) => void;
  initialTab?: 'sync' | 'import' | 'export' | 'template';
}

export const RuijieImportModal: React.FC<RuijieImportModalProps> = ({
  isOpen,
  onClose,
  packages,
  onImportSuccess,
  initialTab = 'import'
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'import' | 'export' | 'template'>(initialTab);
  const [importSubTab, setImportSubTab] = useState<'scan' | 'upload'>('scan');
  
  // Ruijie Config State
  const [ruijieConfig, setRuijieConfig] = useState<RuijieConfig>(() => DataService.getRuijieConfig());

  // Discovery / Import States
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredList, setDiscoveredList] = useState<DiscoveredRuijieCustomer[]>([]);
  const [selectedUsernames, setSelectedUsernames] = useState<Set<string>>(new Set());
  const [gatewayInfo, setGatewayInfo] = useState<{ model: string; ip: string; siteId: string; totalDetected: number } | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [saveToDb, setSaveToDb] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [filterNewOnly, setFilterNewOnly] = useState(false);

  // Auto-Sync States
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncStatusNotice, setSyncStatusNotice] = useState<string | null>(null);

  // Push / Export States
  const [isPushingCloud, setIsPushingCloud] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  // Reset tab when modal opens with initialTab
  useEffect(() => {
    if (isOpen) {
      setRuijieConfig(DataService.getRuijieConfig());
      if (initialTab) setActiveTab(initialTab);
      if (discoveredList.length === 0) {
        handleScanRuijieGateway();
      }
    }
  }, [isOpen, initialTab]);

  const handleScanRuijieGateway = async () => {
    setIsScanning(true);
    setNotice(null);
    try {
      const res = await RuijieService.fetchCustomersFromRuijieGateway();
      if (res.success) {
        setDiscoveredList(res.customers);
        setGatewayInfo(res.gatewayInfo);
        // Default select all discovered customers
        setSelectedUsernames(new Set(res.customers.map(c => c.pppoeUsername)));
        setNotice({
          type: 'success',
          message: `${res.message}`
        });
      } else {
        setNotice({
          type: 'error',
          message: 'Gagal terhubung ke gateway Ruijie Reyee.'
        });
      }
    } catch (e: any) {
      setNotice({
        type: 'error',
        message: e?.message || 'Terjadi kesalahan saat memindai gateway.'
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (!content) return;

      const isJson = file.name.endsWith('.json');
      const res = RuijieService.parseRuijieFile(content, isJson ? 'json' : 'csv');

      if (res.success && res.customers.length > 0) {
        setDiscoveredList(res.customers);
        setSelectedUsernames(new Set(res.customers.map(c => c.pppoeUsername)));
        setNotice({
          type: 'success',
          message: `Berhasil memuat ${res.customers.length} data pelanggan dari file ${file.name}!`
        });
        setImportSubTab('scan'); // Switch to preview table
      } else {
        setNotice({
          type: 'error',
          message: res.error || 'Format file Ruijie tidak sesuai atau data kosong.'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Execute Ruijie Cloud Sync Now
  const handleExecuteSyncNow = async () => {
    setIsSyncingNow(true);
    setSyncStatusNotice(null);
    try {
      const result = await RuijieService.executeRuijieCloudSync('manual');
      if (result.success) {
        setSyncStatusNotice(result.message);
        setRuijieConfig(DataService.getRuijieConfig());
        // Refresh scan list
        handleScanRuijieGateway();
      } else {
        setSyncStatusNotice(`Sinkronisasi gagal: ${result.message}`);
      }
    } catch (err: any) {
      setSyncStatusNotice(`Terjadi kesalahan: ${err?.message}`);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Save Auto-Sync settings
  const handleSaveAutoSyncSettings = () => {
    DataService.saveRuijieConfig(ruijieConfig);
    setSyncStatusNotice('Preferensi Auto-Sinkronisasi Ruijie Cloud berhasil disimpan ke Database!');
    setTimeout(() => setSyncStatusNotice(null), 4000);
  };

  // Push Data to Ruijie Cloud via API
  const handlePushDataToCloud = async () => {
    setIsPushingCloud(true);
    setPushResult(null);
    try {
      const res = await RuijieService.pushDataToRuijieCloudAPI({ customers: true, vouchers: true });
      setPushResult({
        success: res.success,
        message: res.message,
        latency: res.latencyMs
      });
    } catch (err: any) {
      setPushResult({
        success: false,
        message: err?.message || 'Gagal mengekspor data ke Ruijie Cloud API.'
      });
    } finally {
      setIsPushingCloud(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = RuijieService.generateRuijieSampleCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ruijie_pelanggan_template_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (selectedUsernames.size === filteredList.length) {
      setSelectedUsernames(new Set());
    } else {
      setSelectedUsernames(new Set(filteredList.map(c => c.pppoeUsername)));
    }
  };

  const toggleSelectOne = (username: string) => {
    const next = new Set(selectedUsernames);
    if (next.has(username)) {
      next.delete(username);
    } else {
      next.add(username);
    }
    setSelectedUsernames(next);
  };

  const handlePackageChange = (username: string, packageId: string) => {
    const selectedPkg = packages.find(p => p.id === packageId);
    if (!selectedPkg) return;

    setDiscoveredList(prev =>
      prev.map(item => {
        if (item.pppoeUsername === username) {
          return {
            ...item,
            packageId: selectedPkg.id,
            packageName: selectedPkg.name,
            packagePrice: selectedPkg.price,
            rateLimit: `${selectedPkg.speedMbps} Mbps`
          };
        }
        return item;
      })
    );
  };

  const filteredList = useMemo(() => {
    return discoveredList.filter(item => {
      const q = searchFilter.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.pppoeUsername.toLowerCase().includes(q) ||
        item.customerCode.toLowerCase().includes(q) ||
        item.phone.includes(q) ||
        item.ipAddress.includes(q);

      const matchNew = !filterNewOnly || !item.isExisting;
      return matchSearch && matchNew;
    });
  }, [discoveredList, searchFilter, filterNewOnly]);

  const selectedCount = selectedUsernames.size;
  const newCount = discoveredList.filter(d => !d.isExisting && selectedUsernames.has(d.pppoeUsername)).length;
  const updateCount = discoveredList.filter(d => d.isExisting && selectedUsernames.has(d.pppoeUsername)).length;

  const handleExecuteImport = () => {
    if (selectedCount === 0) {
      setNotice({ type: 'error', message: 'Silakan pilih setidaknya 1 pelanggan untuk diimpor.' });
      return;
    }

    setIsSubmitting(true);
    const toImport = discoveredList.filter(d => selectedUsernames.has(d.pppoeUsername));

    try {
      const result = RuijieService.importCustomers(toImport, { saveToDatabase: saveToDb });

      if (result.success) {
        setNotice({
          type: 'success',
          message: result.message
        });
        onImportSuccess(result.importedCount + result.updatedCount);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setNotice({
          type: 'error',
          message: result.message
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err?.message || 'Gagal mengimpor data pelanggan.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const allCustomers = DataService.getCustomers();
  const allVouchers = DataService.getVouchers();
  const allDevices = DataService.getRuijieDevices();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-zinc-200">
        {/* Header Zone */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-600/20 text-red-500 border border-red-600/30">
              <Router className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Ruijie Reyee Cloud Hub: Sinkronisasi, Ekspor & Impor
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-400 border border-red-900">
                  Reyee Cloud API
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Otomasi auto-sinkronisasi data, tarik (import) dan kirim (export) akun PPPoE & voucher dari/ke Ruijie Cloud.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Tab Navigation Selector */}
        <div className="px-4 sm:px-5 pt-3 bg-zinc-950/60 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('sync')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'sync'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-red-500" />
              <span>Auto-Sinkronisasi Cloud</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('import')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'import'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Tarik / Import dari Ruijie ({discoveredList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'export'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kirim / Export ke Ruijie</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 shrink-0 ${
                activeTab === 'template'
                  ? 'border-red-600 text-white bg-zinc-900'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>Panduan Format CSV</span>
            </button>
          </div>

          <div className="flex items-center gap-2 pb-2 sm:pb-0 text-xs">
            {gatewayInfo && (
              <div className="text-[11px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{gatewayInfo.model}</span>
                <span className="text-zinc-500 font-mono">({gatewayInfo.ip})</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            TAB 1: AUTO-SINKRONISASI DENGAN DATA RUIJIE CLOUD
        ======================================================== */}
        {activeTab === 'sync' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
            {/* Banner Status Notifikasi Sinkronisasi */}
            {syncStatusNotice && (
              <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2.5 shadow-sm">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-medium">{syncStatusNotice}</span>
              </div>
            )}

            {/* Hero Card: Status & Tombol Sinkronisasi Sekarang */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 font-medium text-xs">Status Sinkronisasi Ruijie Reyee Cloud:</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      CLOUD CONNECTED
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white tracking-tight">
                    {ruijieConfig.lastSuccessfulSyncAt || ruijieConfig.lastSyncAt || '15 Okt 2026, 10:30 WIB'}
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Timestamp sinkronisasi dua arah terakhir yang terverifikasi dengan gateway NOC dan Reyee Cloud.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteSyncNow}
                  disabled={isSyncingNow}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>{isSyncingNow ? 'Menyinkronkan Cloud...' : '⚡ Sinkronkan Sekarang'}</span>
                </button>
              </div>

              {/* Ringkasan Objek Sinkronisasi */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Pelanggan PPPoE</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">{allCustomers.length} Akun</div>
                  <div className="text-[10px] text-emerald-400 font-medium">Tersinkron Gateway</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Perangkat Router</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">{allDevices.length} Online</div>
                  <div className="text-[10px] text-sky-400 font-medium">Gateway EG3250 & AP</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Pool Voucher</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">{allVouchers.length} Unit</div>
                  <div className="text-[10px] text-amber-400 font-medium">Hotspot Radius Sync</div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                  <div className="text-[10px] text-zinc-400 uppercase font-semibold">Auto-Isolir Daemon</div>
                  <div className="text-lg font-mono font-bold text-white mt-0.5">
                    {ruijieConfig.autoIsolirActive ? 'AKTIF' : 'NONAKTIF'}
                  </div>
                  <div className="text-[10px] text-zinc-400 font-medium">Tgl {ruijieConfig.autoIsolirDay} tiap bulan</div>
                </div>
              </div>
            </div>

            {/* Konfigurasi Daemon Auto-Sinkronisasi Berkala */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  <h3 className="font-bold text-white text-xs sm:text-sm">
                    Pengaturan Frekuensi & Otomasi Sinkronisasi Berkala
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSyncEnableToggle"
                    checked={ruijieConfig.autoSyncEnabled !== false}
                    onChange={e => setRuijieConfig({ ...ruijieConfig, autoSyncEnabled: e.target.checked })}
                    className="w-4 h-4 rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                  <label htmlFor="autoSyncEnableToggle" className="text-xs text-zinc-200 font-semibold cursor-pointer">
                    Aktifkan Auto-Sync Otomatis
                  </label>
                </div>
              </div>

              {/* Preset Interval Frekuensi */}
              <div className="space-y-2">
                <label className="block text-zinc-400 text-xs font-medium">
                  Pilih Interval Waktu Auto-Sinkronisasi:
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
                        onClick={() =>
                          setRuijieConfig({
                            ...ruijieConfig,
                            autoSyncIntervalMinutes: item.mins,
                            autoSyncFrequency: item.freq as any
                          })
                        }
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-950/60 border-red-600 text-white shadow-md'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
                        }`}
                      >
                        <div className="font-mono font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cakupan Sinkronisasi */}
              <div className="space-y-2 pt-1">
                <label className="block text-zinc-400 text-xs font-medium">
                  Cakupan Data yang Disinkronkan:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Akun PPPoE & Profil IP</span>
                      <span className="text-[10px] text-zinc-400">Pindai client baru & status MAC</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Status Gateway & AP</span>
                      <span className="text-[10px] text-zinc-400">Trafik, user online & CPU/RAM</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-semibold text-white block">Radius Voucher Hotspot</span>
                      <span className="text-[10px] text-zinc-400">Penyelarasan kode voucher</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAutoSyncSettings}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Pengaturan Auto-Sync</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: TARIK / IMPORT DARI RUIJIE CLOUD
        ======================================================== */}
        {activeTab === 'import' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Sub-tab Import: Live Gateway vs Upload File */}
            <div className="p-3 sm:px-5 bg-zinc-950/40 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportSubTab('scan')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    importSubTab === 'scan'
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
                  }`}
                >
                  <Wifi className="w-3.5 h-3.5 inline mr-1 text-red-500" />
                  Pindai Gateway Langsung (Live API)
                </button>
                <button
                  type="button"
                  onClick={() => setImportSubTab('upload')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    importSubTab === 'upload'
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 inline mr-1 text-blue-400" />
                  Unggah Berkas File (CSV / JSON)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScanRuijieGateway}
                  disabled={isScanning}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-red-500' : 'text-zinc-400'}`} />
                  <span>{isScanning ? 'Memindai...' : 'Pindai Ulang'}</span>
                </button>
              </div>
            </div>

            {/* Sub-tab Upload File View */}
            {importSubTab === 'upload' && (
              <div className="p-6 text-center space-y-4">
                <div className="max-w-md mx-auto p-8 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-red-600/70 bg-zinc-950/60 transition-colors space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-950/70 border border-blue-800 text-blue-400 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Unggah File Ekspor Ruijie Reyee (.csv atau .json)
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Mendukung file ekspor user PPPoE dari web console Ruijie RG-EG3250 maupun Reyee Cloud.
                    </p>
                  </div>
                  <label className="inline-block px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md shadow-red-950">
                    <span>Pilih Berkas Komputer</span>
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Notice Message */}
            {notice && (
              <div
                className={`mx-4 sm:mx-5 mt-3 p-3 rounded-xl text-xs flex items-center gap-2.5 ${
                  notice.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                    : notice.type === 'error'
                    ? 'bg-red-950/80 border border-red-800 text-red-200'
                    : 'bg-blue-950/80 border border-blue-800 text-blue-200'
                }`}
              >
                {notice.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{notice.message}</span>
              </div>
            )}

            {/* Filter and Search Bar for Table */}
            <div className="px-4 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama, username PPPoE, IP, HP..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterNewOnly}
                    onChange={e => setFilterNewOnly(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-950 border-zinc-800"
                  />
                  <span>Tampilkan Pelanggan Baru Saja</span>
                </label>
              </div>
            </div>

            {/* Discovered Customers Table */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-3">
              <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950/50">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 font-medium">
                      <th className="p-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedUsernames.size === filteredList.length && filteredList.length > 0}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-900 border-zinc-700"
                        />
                      </th>
                      <th className="p-3">Pelanggan / PPPoE</th>
                      <th className="p-3">Kontak & Alamat</th>
                      <th className="p-3">IP & MAC Ruijie</th>
                      <th className="p-3">Paket Layanan</th>
                      <th className="p-3 text-center">Status Cloud</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-zinc-500">
                          {isScanning ? 'Sedang memindai router Ruijie...' : 'Tidak ada data pelanggan yang cocok dengan pencarian.'}
                        </td>
                      </tr>
                    ) : (
                      filteredList.map(item => {
                        const isSelected = selectedUsernames.has(item.pppoeUsername);
                        return (
                          <tr
                            key={item.pppoeUsername}
                            onClick={() => toggleSelectOne(item.pppoeUsername)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-red-950/20 hover:bg-red-950/30' : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectOne(item.pppoeUsername)}
                                className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-900 border-zinc-700"
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                <span>{item.name}</span>
                                {item.isExisting ? (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                                    Sudah Ada
                                  </span>
                                ) : (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 font-mono font-bold border border-emerald-900">
                                    Baru
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-400 font-mono">
                                User: <strong className="text-red-400">{item.pppoeUsername}</strong> · Pass: <span className="text-zinc-500">{item.pppoePassword}</span>
                              </div>
                            </td>
                            <td className="p-3 text-[11px] text-zinc-400">
                              <div className="text-zinc-300 font-mono">{item.phone}</div>
                              <div className="truncate max-w-xs">{item.address}</div>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-zinc-300">
                              <div>{item.ipAddress}</div>
                              <div className="text-[10px] text-zinc-500">{item.macAddress}</div>
                            </td>
                            <td className="p-3" onClick={e => e.stopPropagation()}>
                              <select
                                value={item.packageId}
                                onChange={e => handlePackageChange(item.pppoeUsername, e.target.value)}
                                className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white font-medium text-[11px] focus:outline-none focus:border-red-600"
                              >
                                {packages.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} - Rp {p.price.toLocaleString('id-ID')}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  item.status === 'active'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                                    : 'bg-rose-950 text-rose-400 border border-rose-900'
                                }`}
                              >
                                {item.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Import Footer Actions */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="text-zinc-300 font-medium">
                  Dipilih: <strong className="text-white font-mono">{selectedCount}</strong> pelanggan
                  ({newCount} baru, {updateCount} update)
                </span>
                <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveToDb}
                    onChange={e => setSaveToDb(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                  <span>Simpan permanen ke Database & Supabase</span>
                </label>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isSubmitting || selectedCount === 0}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-md shadow-red-950 flex items-center gap-1.5"
                >
                  <Database className="w-4 h-4" />
                  <span>{isSubmitting ? 'Menyimpan...' : `Impor ${selectedCount} Pelanggan ke Database`}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: KIRIM / EXPORT KE RUIJIE CLOUD
        ======================================================== */}
        {activeTab === 'export' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
            {/* Banner Status Push API */}
            {pushResult && (
              <div
                className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 shadow-sm ${
                  pushResult.success
                    ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-200'
                    : 'bg-red-950/80 border border-red-800 text-red-200'
                }`}
              >
                {pushResult.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1">
                  <span className="font-semibold">{pushResult.message}</span>
                  {pushResult.latency && (
                    <span className="text-[11px] text-zinc-400 block font-mono">
                      Waktu respon API: {pushResult.latency} ms
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* OPSI 1: Push Langsung ke Ruijie Reyee Cloud API */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-red-950 text-red-400 border border-red-900">
                      <Send className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-white text-sm">
                      Kirim Langsung ke Ruijie Cloud API (Online Push)
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 max-w-xl">
                    Unggah seluruh data kredensial PPPoE pelanggan ({allCustomers.length} akun) dan pool voucher hotspot ({allVouchers.length} unit) langsung ke Ruijie Reyee Gateway EG3250 melalui protokol Cloud Open API.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handlePushDataToCloud}
                  disabled={isPushingCloud}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all shadow-md shadow-red-950 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  <Send className={`w-4 h-4 ${isPushingCloud ? 'animate-bounce' : ''}`} />
                  <span>{isPushingCloud ? 'Mengirim Data...' : '🚀 Push ke Ruijie Cloud'}</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400 font-mono">
                <span>Site Target: <strong className="text-zinc-200">{ruijieConfig.siteId}</strong></span>
                <span>Gateway: <strong className="text-zinc-200">RG-EG3250 (192.168.10.1)</strong></span>
                <span>Akun Cloud: <strong className="text-zinc-200">{ruijieConfig.username || 'noc.admin@anuwani.net'}</strong></span>
              </div>
            </div>

            {/* OPSI 2: Unduh Berkas Ekspor Format Ruijie Reyee */}
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Unduh Berkas Ekspor Format Ruijie Reyee (Offline Import / Arsip)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* PPPoE CSV Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>Akun PPPoE (CSV Ruijie eWeb)</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">.csv</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Format kolom standar: <code className="text-emerald-300">Username, Password, Group, IP, MAC, Status</code> siap diimpor batch di menu eWeb Ruijie Gateway.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => RuijieService.downloadRuijieExportFile('pppoe_csv')}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unduh CSV Akun PPPoE ({allCustomers.length})</span>
                  </button>
                </div>

                {/* PPPoE JSON Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span>Payload Cloud API (JSON Ruijie)</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">.json</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Payload data terstruktur lengkap dengan konfigurasi bandwidth rate-limit, profile, dan Site ID untuk integrasi REST API Ruijie Reyee Cloud.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => RuijieService.downloadRuijieExportFile('pppoe_json')}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Unduh JSON Ruijie Cloud</span>
                  </button>
                </div>

                {/* Hotspot Voucher CSV Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <Wifi className="w-4 h-4 text-amber-400" />
                        <span>Pool Voucher Hotspot (CSV)</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">.csv</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Daftar kode voucher, durasi jam, harga, dan password yang siap diimpor ke Captive Portal Ruijie Hotspot Server.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => RuijieService.downloadRuijieExportFile('vouchers_csv')}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unduh CSV Voucher ({allVouchers.length})</span>
                  </button>
                </div>

                {/* Full Sync Backup Dump Card */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <HardDriveDownload className="w-4 h-4 text-red-400" />
                        <span>Cadangan Sinkronisasi Lengkap (JSON)</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">.json</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Ekspor gabungan seluruh data pelanggan, perangkat gateway aktif, pool voucher, dan log histori eksekusi Ruijie.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => RuijieService.downloadRuijieExportFile('full_backup_json')}
                    className="w-full py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-red-400" />
                    <span>Unduh Dump Sinkronisasi Lengkap</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: PANDUAN FORMAT & TEMPLATE CSV
        ======================================================== */}
        {activeTab === 'template' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Struktur Format CSV Ruijie Reyee eWeb
                  </h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Gunakan template ini saat mengimpor akun pelanggan baru secara batch dari berkas spreadsheet.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File Template (.csv)</span>
                </button>
              </div>

              {/* Sample Code Block */}
              <div className="p-3.5 rounded-xl bg-zinc-900 font-mono text-[11px] text-zinc-300 border border-zinc-800 overflow-x-auto leading-relaxed">
                <div className="text-zinc-500 font-semibold mb-1"># Format Baris Header & Contoh Data:</div>
                <span className="text-emerald-400">username</span>,
                <span className="text-emerald-400">password</span>,
                <span className="text-emerald-400">name</span>,
                <span className="text-emerald-400">phone</span>,
                <span className="text-emerald-400">address</span>,
                <span className="text-emerald-400">ip_address</span>,
                <span className="text-emerald-400">mac_address</span>,
                <span className="text-emerald-400">package_name</span>,
                <span className="text-emerald-400">status</span>
                <br />
                ahmad_rj01,passAhmad2026,Ahmad Supriyadi,081299887711,Jl. Melati No. 10,192.168.10.40,E4:AA:5D:89:12:01,Paket Keluarga 20 Mbps,active
                <br />
                rina_rj02,passRina2026,Rina Marlina,085712349988,Komplek Griya Asri Blok A-3,192.168.10.41,BC:30:7D:99:44:11,Paket Hemat 10 Mbps,active
              </div>
            </div>

            {/* Penjelasan Kolom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-mono font-bold text-white text-xs text-red-400">username & password</span>
                <p className="text-[11px] text-zinc-400">
                  Kredensial login PPPoE untuk autentikasi client di router Ruijie Reyee Gateway.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-mono font-bold text-white text-xs text-sky-400">package_name</span>
                <p className="text-[11px] text-zinc-400">
                  Nama paket internet (e.g. Paket Hemat 10 Mbps) yang akan dipetakan otomatis ke profil bandwidth.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-mono font-bold text-white text-xs text-amber-400">ip_address & mac_address</span>
                <p className="text-[11px] text-zinc-400">
                  Static IP address dan MAC address perangkat ONT/modem pelanggan untuk pemantauan ARP & isolir.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
                <span className="font-mono font-bold text-white text-xs text-emerald-400">status</span>
                <p className="text-[11px] text-zinc-400">
                  Pilihan status layanan: <strong>active</strong> (normal lancar) atau <strong>isolated</strong> (terisolir).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
