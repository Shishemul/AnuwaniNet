import React, { useState, useMemo } from 'react';
import { Customer, InternetPackage } from '../types';
import {
  Users,
  Search,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Send,
  Edit2,
  Trash2,
  Wifi,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  FileText,
  Filter,
  X,
  RotateCcw,
  SlidersHorizontal,
  ArrowUpDown,
  UserCheck,
  UserX,
  Clock,
  Router,
  Download,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { RuijieService } from '../services/ruijieService';
import { WhatsAppService } from '../services/whatsappService';
import { DataService } from '../services/dataService';
import { ReportService } from '../services/reportService';
import { WhatsAppTemplateModal } from '../components/modals/WhatsAppTemplateModal';
import { RuijieImportModal } from '../components/modals/RuijieImportModal';
import { ExportCustomerCsvModal } from '../components/modals/ExportCustomerCsvModal';

interface PelangganViewProps {
  customers: Customer[];
  packages: InternetPackage[];
  onRefreshData: () => void;
  onOpenAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export const PelangganView: React.FC<PelangganViewProps> = ({
  customers,
  packages,
  onRefreshData,
  onOpenAddCustomer,
  onEditCustomer
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'isolated' | 'pending'>('all');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'join_desc' | 'billing_day'>('name_asc');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showRuijieImportModal, setShowRuijieImportModal] = useState(false);
  const [ruijieModalTab, setRuijieModalTab] = useState<'sync' | 'import' | 'export' | 'template'>('import');
  const [isSyncingRuijie, setIsSyncingRuijie] = useState(false);
  const [showExportCsvModal, setShowExportCsvModal] = useState(false);
  const [selectedCustomerForTemplate, setSelectedCustomerForTemplate] = useState<Customer | null>(null);

  // Status metrics counts
  const activeCount = useMemo(() => customers.filter(c => c.status === 'active').length, [customers]);
  const isolatedCount = useMemo(() => customers.filter(c => c.status === 'isolated').length, [customers]);
  const pendingCount = useMemo(() => customers.filter(c => c.status === 'pending').length, [customers]);

  const isFiltered = Boolean(search.trim() || statusFilter !== 'all' || packageFilter !== 'all');

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPackageFilter('all');
    setSortBy('name_asc');
  };

  // Filter and sort customer list
  const filteredCustomers = useMemo(() => {
    return customers
      .filter(c => {
        // Search by Name, Phone Number, Customer Code, PPPoE username, or Address
        const query = search.toLowerCase().trim();
        const cleanQueryDigits = query.replace(/\D/g, '');
        const cleanPhoneDigits = c.phone.replace(/\D/g, '');

        const matchesName = c.name.toLowerCase().includes(query);
        const matchesPhone = c.phone.toLowerCase().includes(query) || (cleanQueryDigits.length > 2 && cleanPhoneDigits.includes(cleanQueryDigits));
        const matchesCode = c.customerCode.toLowerCase().includes(query);
        const matchesPppoe = (c.pppoeUsername || '').toLowerCase().includes(query);
        const matchesAddress = (c.address || '').toLowerCase().includes(query);

        const matchesSearch = !query || matchesName || matchesPhone || matchesCode || matchesPppoe || matchesAddress;

        // Filter by Status: all | active | isolated | pending
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

        // Filter by Package
        const matchesPackage = packageFilter === 'all' || c.packageId === packageFilter;

        return matchesSearch && matchesStatus && matchesPackage;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'id');
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'id');
        if (sortBy === 'join_desc') return (b.joinDate || '').localeCompare(a.joinDate || '');
        if (sortBy === 'billing_day') return (a.billingDay || 0) - (b.billingDay || 0);
        return 0;
      });
  }, [customers, search, statusFilter, packageFilter, sortBy]);

  const handleManualIsolir = (c: Customer) => {
    if (confirm(`Apakah Anda yakin ingin MENGISOLIR layanan ${c.name} (${c.customerCode}) pada Ruijie Gateway?`)) {
      const res = RuijieService.isolateCustomer(c, 'Isolir manual oleh Admin');
      setActionMessage(res.message);
      onRefreshData();
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleRestoreIsolir = (c: Customer) => {
    const res = RuijieService.restoreCustomer(c, 'Layanan dipulihkan secara manual');
    setActionMessage(res.message);
    onRefreshData();
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleActivateAccount = (c: Customer) => {
    const updated: Customer = {
      ...c,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0]
    };
    DataService.updateCustomer(updated);

    // Send WhatsApp notification
    const msg = `Halo Bpk/Ibu *${c.name}*,\n\nSelamat! Akun internet AnuwaniNet Anda (*${c.customerCode}*) telah *DIAKTIFKAN*.\n\nDetail Langganan:\n• Paket: *${c.packageName}*\n• Username PPPoE: *${c.pppoeUsername}*\n• Tanggal Jatuh Tempo: Setiap tanggal ${c.billingDay}\n\nSelamat menikmati koneksi internet AnuwaniNet!`;
    WhatsAppService.sendAutomatedNotification(c.phone, c.name, 'bukti_bayar', msg);

    setActionMessage(`Akun ${c.name} berhasil diaktifkan dan notifikasi WA dikirimkan!`);
    onRefreshData();
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Hapus pelanggan ${name}? Data histori tagihan mungkin terhapus.`)) {
      DataService.deleteCustomer(id);
      setActionMessage(`Pelanggan ${name} berhasil dihapus.`);
      onRefreshData();
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleSendWaDirect = (c: Customer) => {
    const defaultMsg = `Halo Bpk/Ibu ${c.name} (${c.customerCode}), perkenalkan kami dari Customer Support AnuwaniNet. Ada yang bisa kami bantu perihal koneksi internet Anda?`;
    WhatsAppService.openWhatsAppUrl(c.phone, defaultMsg);
  };

  const handleDirectSyncRuijie = async () => {
    setIsSyncingRuijie(true);
    setActionMessage('Menyinkronkan data dengan Ruijie Reyee Cloud...');
    try {
      const res = await RuijieService.executeRuijieCloudSync('manual');
      setActionMessage(res.message);
      onRefreshData();
    } catch (e: any) {
      setActionMessage('Gagal sinkronisasi Ruijie: ' + (e?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSyncingRuijie(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleOpenRuijieModal = (tab: 'sync' | 'import' | 'export' | 'template') => {
    setRuijieModalTab(tab);
    setShowRuijieImportModal(true);
  };

  const handleQuickExportCsv = () => {
    const target = isFiltered ? filteredCustomers : customers;
    if (target.length === 0) {
      setActionMessage('Tidak ada data pelanggan untuk diekspor.');
      setTimeout(() => setActionMessage(null), 3000);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    const prefix = isFiltered ? 'Pelanggan_Terfilter' : 'Database_Pelanggan';
    const filename = `${prefix}_AnuwaniNet_${today}.csv`;
    const res = ReportService.exportCustomersToCsv(target, filename);
    setActionMessage(`Berhasil mengekspor ${res.count} data pelanggan ke format CSV (${res.filename})!`);
    setTimeout(() => setActionMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-red-500" />
            Manajemen Pelanggan & Aktivasi
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Daftar pelanggan, kredensial PPPoE Ruijie, isolir/un-isolir manual, dan integrasi WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Direct Auto-Sync with Ruijie Cloud */}
          <button
            onClick={handleDirectSyncRuijie}
            disabled={isSyncingRuijie}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all shadow-md shadow-red-950 cursor-pointer disabled:opacity-60"
            title="Sinkronisasi otomatis dua arah akun pelanggan PPPoE dan voucher dengan Ruijie Reyee Cloud"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRuijie ? 'animate-spin' : ''}`} />
            <span>{isSyncingRuijie ? 'Menyinkronkan...' : '⚡ Sync Ruijie Cloud'}</span>
          </button>

          {/* Tarik / Import from Ruijie Gateway / Cloud */}
          <button
            onClick={() => handleOpenRuijieModal('import')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 hover:border-sky-500 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            title="Pindai live gateway atau upload file CSV/JSON Ruijie untuk menarik akun PPPoE"
          >
            <Router className="w-3.5 h-3.5 text-sky-400" />
            <span>Tarik / Import Ruijie</span>
          </button>

          {/* Kirim / Export to Ruijie Gateway / Cloud */}
          <button
            onClick={() => handleOpenRuijieModal('export')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-700 hover:border-emerald-500 text-zinc-200 hover:text-white hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            title="Kirim akun pelanggan ke Ruijie Cloud via API atau unduh CSV siap impor ke Ruijie eWeb"
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export ke Ruijie</span>
          </button>

          {/* Export Database Pelanggan to CSV */}
          <button
            onClick={() => setShowExportCsvModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-950/80 border border-emerald-800/90 text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors shadow-sm cursor-pointer"
            title="Ekspor seluruh database pelanggan atau hasil filter ke format file CSV untuk pelaporan & analisis spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => {
              setSelectedCustomerForTemplate(customers[0] || null);
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 transition-colors shadow-sm cursor-pointer"
            title="Kelola, simpan, dan pilih template pesan WhatsApp dengan placeholder dinamis"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Template WA</span>
          </button>

          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-red-900/60 text-xs text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Status Overview Metric Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-zinc-800/80 border-zinc-700 shadow-sm'
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Pelanggan</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1 tabular-nums">{customers.length}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Semua data terdaftar</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'active'
              ? 'bg-emerald-950/40 border-emerald-800 shadow-sm'
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 text-xs">
            <span>Aktif Normal</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">{activeCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Koneksi lancar Ruijie</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('isolated')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'isolated'
              ? 'bg-red-950/40 border-red-800 shadow-sm'
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-red-400 text-xs">
            <span>Terisolir</span>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <div className="text-xl font-bold font-mono text-red-400 mt-1 tabular-nums">{isolatedCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Menunggak / manual isolir</div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            statusFilter === 'pending'
              ? 'bg-amber-950/40 border-amber-800 shadow-sm'
              : 'bg-zinc-900/60 border-zinc-800/80 hover:bg-zinc-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 text-xs">
            <span>Pending Aktivasi</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">{pendingCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Menunggu verifikasi teknisi</div>
        </button>
      </div>

      {/* Comprehensive Search & Filter Control Bar */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Main Search Input: Name, Phone number, Customer Code, PPPoE */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama pelanggan, nomor HP (08xx), ID pelanggan, atau PPPoE..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Controls Grid */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <label htmlFor="filter-status-select" className="text-zinc-500 text-[11px] font-medium hidden sm:inline">Status:</label>
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="all" className="bg-zinc-900 text-white">Semua Status ({customers.length})</option>
                <option value="active" className="bg-zinc-900 text-emerald-400">Aktif Normal ({activeCount})</option>
                <option value="isolated" className="bg-zinc-900 text-red-400">Terisolir ({isolatedCount})</option>
                <option value="pending" className="bg-zinc-900 text-amber-400">Pending Aktivasi ({pendingCount})</option>
              </select>
            </div>

            {/* Package Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
              <Wifi className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <label htmlFor="filter-package-select" className="text-zinc-500 text-[11px] font-medium hidden sm:inline">Paket:</label>
              <select
                id="filter-package-select"
                value={packageFilter}
                onChange={e => setPackageFilter(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-xs max-w-[140px] truncate"
              >
                <option value="all" className="bg-zinc-900 text-white">Semua Paket</option>
                {packages.map(p => (
                  <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="name_asc" className="bg-zinc-900 text-white">Nama (A - Z)</option>
                <option value="name_desc" className="bg-zinc-900 text-white">Nama (Z - A)</option>
                <option value="join_desc" className="bg-zinc-900 text-white">Tgl Gabung (Terbaru)</option>
                <option value="billing_day" className="bg-zinc-900 text-white">Jatuh Tempo (Tgl)</option>
              </select>
            </div>

            {/* Reset Filter Button */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                title="Reset seluruh filter dan kembalikan semua data pelanggan"
              >
                <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Tags & Count Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-zinc-500 font-medium">Filter Aktif:</span>
            {statusFilter !== 'all' && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                statusFilter === 'active'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : statusFilter === 'isolated'
                  ? 'bg-red-950 text-red-400 border border-red-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}>
                <span>Status: {statusFilter === 'active' ? 'Aktif' : statusFilter === 'isolated' ? 'Terisolir' : 'Pending'}</span>
                <button type="button" onClick={() => setStatusFilter('all')} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {search.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                <span>Pencarian: "{search}"</span>
                <button type="button" onClick={() => setSearch('')} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {packageFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                <span>Paket: {packages.find(p => p.id === packageFilter)?.name || packageFilter}</span>
                <button type="button" onClick={() => setPackageFilter('all')} className="hover:opacity-75 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {!isFiltered && (
              <span className="text-[11px] text-zinc-400 italic">Menampilkan semua pelanggan tanpa batasan filter</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-[11px] text-zinc-400 font-medium">
              Menampilkan <strong className="text-white font-mono">{filteredCustomers.length}</strong> dari <span className="font-mono">{customers.length}</span> pelanggan
            </div>

            <button
              type="button"
              onClick={handleQuickExportCsv}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800/80 text-[11px] font-semibold text-emerald-300 hover:text-white transition-colors cursor-pointer shadow-xs"
              title="Unduh langsung data pelanggan yang sedang tampil ke file CSV"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Unduh CSV ({filteredCustomers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers List: Mobile Cards + Desktop Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        {/* Mobile View: Touch-Friendly Customer Cards (< md) */}
        <div className="block md:hidden p-3 space-y-3">
          {filteredCustomers.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 space-y-2">
              <Search className="w-8 h-8 mx-auto text-zinc-600" />
              <div className="text-white font-medium text-xs">Tidak ditemukan data pelanggan</div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold text-white mt-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>
          ) : (
            filteredCustomers.map(c => {
              return (
                <div
                  key={'card-' + c.id}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 space-y-2.5 shadow-sm"
                >
                  {/* Card Header: Name, Code & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-white text-sm">{c.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-red-400 font-bold bg-red-950/80 border border-red-900 px-1.5 py-0.2 rounded">
                          {c.customerCode}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Tgl {c.billingDay}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {c.status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-900">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Aktif
                        </span>
                      )}
                      {c.status === 'isolated' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-red-400 bg-red-950 border border-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Terisolir
                        </span>
                      )}
                      {c.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold text-amber-400 bg-amber-950/80 border border-amber-900">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-zinc-800/60 font-mono">
                    <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60">
                      <div className="text-[9px] text-zinc-500 uppercase font-sans">Paket & Tarif</div>
                      <div className="text-white font-sans font-medium truncate">{c.packageName}</div>
                      <div className="text-zinc-300 font-bold tabular-nums">
                        {WhatsAppService.formatRupiah(c.packagePrice)}
                      </div>
                    </div>

                    <div className="p-1.5 rounded bg-zinc-900/60 border border-zinc-800/60">
                      <div className="text-[9px] text-zinc-500 uppercase font-sans">PPPoE & IP</div>
                      <div className="text-zinc-200 truncate">{c.pppoeUsername}</div>
                      <div className="text-zinc-400 text-[10px] truncate">{c.ipAddress}</div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex items-center justify-between text-xs text-zinc-300 pt-0.5">
                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-300">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                    {c.autoIsolirEnabled ? (
                      <span className="text-[10px] text-emerald-400 font-mono">Auto-Isolir (H+2)</span>
                    ) : (
                      <span className="text-[10px] text-zinc-500 font-mono">VIP (No Isolir)</span>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-800/60">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSendWaDirect(c)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Chat WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Chat WA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerForTemplate(c);
                          setShowTemplateModal(true);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 cursor-pointer"
                        title="Template Pesan WA"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      {c.status === 'isolated' ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreIsolir(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Buka Isolir
                        </button>
                      ) : c.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleActivateAccount(c)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          Aktifkan
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleManualIsolir(c)}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-red-900/60 text-red-400 hover:bg-red-950 cursor-pointer"
                          title="Isolir Manual"
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditCustomer(c)}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white cursor-pointer"
                        title="Edit Data Pelanggan"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(c.id, c.name)}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">ID & Nama</th>
                <th className="py-3 px-4">Kontak / Alamat</th>
                <th className="py-3 px-4">Paket & Biaya</th>
                <th className="py-3 px-4">Akun PPPoE / IP</th>
                <th className="py-3 px-4 text-center">Status Sambungan</th>
                <th className="py-3 px-4 text-center">Auto-Isolir</th>
                <th className="py-3 px-4 text-right">Aksi & WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <div className="space-y-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center mx-auto">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="text-white font-semibold text-sm">Tidak ditemukan data pelanggan</div>
                      <p className="text-xs text-zinc-400">
                        Tidak ada pelanggan yang cocok dengan pencarian{' '}
                        {search ? <strong className="text-white">"{search}"</strong> : ''}{' '}
                        {statusFilter !== 'all' ? `dan status "${statusFilter}"` : ''}.
                      </p>
                      {isFiltered && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                            <span>Reset Semua Filter</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* ID & Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="font-mono text-[11px] text-red-400 font-bold">{c.customerCode}</div>
                        <div className="text-[10px] text-zinc-500">Tgl Gabung: {c.joinDate}</div>
                      </td>

                      {/* Contact & Address */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="text-zinc-300 font-mono flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5" title={c.address}>
                          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{c.address}</span>
                        </div>
                      </td>

                      {/* Package & Price */}
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{c.packageName}</div>
                        <div className="font-mono text-zinc-300 tabular-nums">
                          {WhatsAppService.formatRupiah(c.packagePrice)} / bln
                        </div>
                        <div className="text-[10px] text-zinc-500">Jatuh tempo tgl {c.billingDay}</div>
                      </td>

                      {/* PPPoE & IP */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-zinc-300">User: <span className="text-white">{c.pppoeUsername}</span></div>
                        <div className="text-zinc-400">IP: {c.ipAddress}</div>
                      </td>

                      {/* Status Sambungan */}
                      <td className="py-3 px-4 text-center">
                        {c.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Aktif Normal
                          </span>
                        )}
                        {c.status === 'isolated' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-red-400 bg-red-950/80 border border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Terisolir Ruijie
                          </span>
                        )}
                        {c.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-900/60">
                            Menunggu Aktivasi
                          </span>
                        )}
                      </td>

                      {/* Auto-Isolir Rule */}
                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        {c.autoIsolirEnabled ? (
                          <span className="text-emerald-400 font-medium">Aktif (Tgl {c.billingDay + 2})</span>
                        ) : (
                          <span className="text-zinc-500">Nonaktif (VIP)</span>
                        )}
                      </td>

                      {/* Actions & WhatsApp Direct */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat WA */}
                          <button
                            onClick={() => handleSendWaDirect(c)}
                            title="Chat Cepat WhatsApp Pelanggan"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-800 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Pilih Template WA Kustom */}
                          <button
                            onClick={() => {
                              setSelectedCustomerForTemplate(c);
                              setShowTemplateModal(true);
                            }}
                            title="Pilih & Sesuaikan Template Pesan Kustom untuk Pelanggan Ini"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Isolir / Restore Buttons */}
                          {c.status === 'isolated' ? (
                            <button
                              onClick={() => handleRestoreIsolir(c)}
                              title="Buka Isolir Ruijie Sekarang"
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                            >
                              Buka Isolir
                            </button>
                          ) : c.status === 'pending' ? (
                            <button
                              onClick={() => handleActivateAccount(c)}
                              title="Aktivasi Akun Pelanggan"
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-500 transition-colors shadow-sm"
                            >
                              Aktifkan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleManualIsolir(c)}
                              title="Isolir Manual pada Gateway Ruijie"
                              className="p-1.5 rounded-md bg-zinc-900 border border-red-900/60 text-red-400 hover:bg-red-950/70 hover:border-red-700 transition-colors"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onEditCustomer(c)}
                            title="Edit Data Pelanggan"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            title="Hapus Pelanggan"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/60 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* WhatsApp Custom Template Modal */}
      <WhatsAppTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        customer={selectedCustomerForTemplate}
        onSelectAndSend={(renderedMsg) => {
          if (selectedCustomerForTemplate) {
            WhatsAppService.openWhatsAppUrl(selectedCustomerForTemplate.phone, renderedMsg);
          }
        }}
        onTemplatesUpdated={onRefreshData}
      />

      {/* Ruijie Customer Import Modal */}
      <RuijieImportModal
        isOpen={showRuijieImportModal}
        onClose={() => setShowRuijieImportModal(false)}
        packages={packages}
        onImportSuccess={(count) => {
          setActionMessage(`Berhasil mengimpor ${count} data pelanggan dari Ruijie Gateway dan data telah tersimpan di Database!`);
          onRefreshData();
          setTimeout(() => setActionMessage(null), 5000);
        }}
      />

      {/* Export Customer Database to CSV / Excel Modal */}
      <ExportCustomerCsvModal
        isOpen={showExportCsvModal}
        onClose={() => setShowExportCsvModal(false)}
        allCustomers={customers}
        filteredCustomers={filteredCustomers}
        isFiltered={isFiltered}
        onSuccessNotice={(msg) => {
          setActionMessage(msg);
          setTimeout(() => setActionMessage(null), 6000);
        }}
      />
    </div>
  );
};
