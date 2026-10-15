import React, { useState } from 'react';
import { Customer } from '../../types';
import { ReportService } from '../../services/reportService';
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  Users,
  ShieldAlert,
  ShieldCheck,
  Check,
  Filter,
  Layers,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ExportCustomerCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCustomers: Customer[];
  filteredCustomers: Customer[];
  isFiltered: boolean;
  onSuccessNotice: (msg: string) => void;
}

export const ExportCustomerCsvModal: React.FC<ExportCustomerCsvModalProps> = ({
  isOpen,
  onClose,
  allCustomers,
  filteredCustomers,
  isFiltered,
  onSuccessNotice
}) => {
  const [scope, setScope] = useState<'all' | 'filtered' | 'active' | 'isolated'>(
    isFiltered ? 'filtered' : 'all'
  );
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [customFilename, setCustomFilename] = useState(
    `Database_Pelanggan_AnuwaniNet_${today}`
  );

  if (!isOpen) return null;

  // Selected customers based on scope
  const targetCustomers = (() => {
    switch (scope) {
      case 'filtered':
        return filteredCustomers;
      case 'active':
        return allCustomers.filter(c => c.status === 'active');
      case 'isolated':
        return allCustomers.filter(c => c.status === 'isolated');
      case 'all':
      default:
        return allCustomers;
    }
  })();

  const activeInTarget = targetCustomers.filter(c => c.status === 'active').length;
  const isolatedInTarget = targetCustomers.filter(c => c.status === 'isolated').length;
  const pendingInTarget = targetCustomers.filter(c => c.status === 'pending').length;
  const totalRevenueInTarget = targetCustomers.reduce((acc, c) => acc + (c.packagePrice || 0), 0);

  const handleExport = () => {
    if (targetCustomers.length === 0) {
      alert('Tidak ada data pelanggan yang terpilih untuk diekspor.');
      return;
    }

    setIsExporting(true);

    try {
      const cleanName = (customFilename.trim() || `Database_Pelanggan_AnuwaniNet_${today}`)
        .replace(/\.(csv|xlsx)$/i, '');

      if (format === 'csv') {
        const fullFilename = `${cleanName}.csv`;
        const result = ReportService.exportCustomersToCsv(targetCustomers, fullFilename);
        onSuccessNotice(`Berhasil mengekspor ${result.count} data pelanggan ke file CSV (${result.filename})!`);
      } else {
        const fullFilename = `${cleanName}.xlsx`;
        const result = ReportService.exportCustomersToExcel(targetCustomers, fullFilename);
        onSuccessNotice(`Berhasil mengekspor ${result.count} data pelanggan ke file Excel (${result.filename})!`);
      }

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error('Export error:', err);
      alert(`Gagal mengekspor data: ${err.message || 'Terjadi kesalahan sistem'}`);
      setIsExporting(false);
    }
  };

  const columnsList = [
    'No', 'Kode Pelanggan', 'Nama Pelanggan', 'No. WhatsApp / HP', 'Alamat',
    'Email', 'Paket Internet', 'Tarif Bulanan (IDR)', 'Status Layanan',
    'Username PPPoE', 'Password PPPoE', 'IP Address', 'MAC Address',
    'Auto Isolir Ruijie', 'Tgl Jatuh Tempo', 'Tgl Bergabung', 'Pembayaran Terakhir',
    'ID Gateway Ruijie', 'Catatan'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-white">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between sticky top-0 bg-zinc-950/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Export Database Pelanggan
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                  CSV & Excel
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Ekspor data seluruh pelanggan atau hasil pencarian untuk pelaporan & rekapitulasi.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* 1. Pilih Scope Data */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-2.5">
              <Filter className="w-3.5 h-3.5 text-red-500" />
              <span>Pilih Ruang Lingkup Data (Scope):</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Filtered Scope */}
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                  scope === 'filtered'
                    ? 'bg-zinc-900 border-red-600 ring-1 ring-red-600/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Hasil Filter & Pencarian</span>
                    {isFiltered && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-900">
                        Aktif
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Hanya data yang sedang tampil di layar
                  </div>
                  <div className="text-xs font-mono font-bold text-red-400 mt-1.5">
                    {filteredCustomers.length} Pelanggan
                  </div>
                </div>
                {scope === 'filtered' && (
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* All Database Scope */}
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                  scope === 'all'
                    ? 'bg-zinc-900 border-red-600 ring-1 ring-red-600/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">Semua Data Pelanggan</div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Seluruh database tanpa batasan filter
                  </div>
                  <div className="text-xs font-mono font-bold text-zinc-200 mt-1.5">
                    {allCustomers.length} Pelanggan
                  </div>
                </div>
                {scope === 'all' && (
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* Active Only */}
              <button
                type="button"
                onClick={() => setScope('active')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                  scope === 'active'
                    ? 'bg-zinc-900 border-emerald-600 ring-1 ring-emerald-600/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Hanya Pelanggan Aktif</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Pelanggan status lancar/terhubung
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1.5">
                    {allCustomers.filter(c => c.status === 'active').length} Pelanggan
                  </div>
                </div>
                {scope === 'active' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              {/* Isolated Only */}
              <button
                type="button"
                onClick={() => setScope('isolated')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start justify-between ${
                  scope === 'isolated'
                    ? 'bg-zinc-900 border-red-600 ring-1 ring-red-600/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Hanya Terisolir</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-1">
                    Pelanggan tertunggak / isolir Ruijie
                  </div>
                  <div className="text-xs font-mono font-bold text-red-400 mt-1.5">
                    {allCustomers.filter(c => c.status === 'isolated').length} Pelanggan
                  </div>
                </div>
                {scope === 'isolated' && (
                  <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 2. Format File Selection */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 mb-2.5">
              <Layers className="w-3.5 h-3.5 text-red-500" />
              <span>Format Ekspor:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  format === 'csv'
                    ? 'bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-600/50 text-white'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>CSV (.csv)</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 font-mono">
                        UTF-8 BOM
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Kompatibel Excel, Google Sheets, LibreOffice
                    </div>
                  </div>
                </div>
                {format === 'csv' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  format === 'xlsx'
                    ? 'bg-emerald-950/40 border-emerald-600 ring-1 ring-emerald-600/50 text-white'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-white">Excel (.xlsx)</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Buku kerja spreadsheet Microsoft Excel
                    </div>
                  </div>
                </div>
                {format === 'xlsx' && (
                  <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* 3. Custom Filename */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
              Nama File Hasil Unduhan:
            </label>
            <div className="relative">
              <input
                type="text"
                value={customFilename}
                onChange={e => setCustomFilename(e.target.value)}
                placeholder="Database_Pelanggan_AnuwaniNet"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 transition-colors font-mono"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 pointer-events-none">
                .{format}
              </span>
            </div>
          </div>

          {/* 4. Target Summary Box */}
          <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Total Baris Pelanggan:</span>
              <strong className="text-white font-mono text-sm">{targetCustomers.length} Data</strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Rincian Status:</span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="text-emerald-400">{activeInTarget} Aktif</span>
                <span className="text-zinc-600">•</span>
                <span className="text-red-400">{isolatedInTarget} Terisolir</span>
                {pendingInTarget > 0 && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-amber-400">{pendingInTarget} Pending</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-zinc-800">
              <span className="text-zinc-400">Total Nilai Tagihan Bulanan:</span>
              <strong className="text-emerald-400 font-mono">
                {ReportService.formatCurrency(totalRevenueInTarget)}
              </strong>
            </div>
          </div>

          {/* 5. Kolom yang Dimasukkan dalam File */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-zinc-400">
                19 Kolom Database Lengkap yang Disertakan:
              </label>
              <span className="text-[10px] text-zinc-500">Standar Pelaporan ISP</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
              {columnsList.map((col, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || targetCustomers.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            <span>
              {isExporting
                ? 'Membuat File...'
                : `Unduh File ${format.toUpperCase()} (${targetCustomers.length} Data)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
