import React, { useState } from 'react';
import { Transaction, Bill, Voucher } from '../types';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { ReportService, ReportSummary } from '../services/reportService';
import { WhatsAppService } from '../services/whatsappService';
import { DataService } from '../services/dataService';

interface LaporanViewProps {
  transactions: Transaction[];
  bills: Bill[];
  vouchers: Voucher[];
  onRefreshData: () => void;
  onOpenNewTransaction: () => void;
}

export const LaporanView: React.FC<LaporanViewProps> = ({
  transactions,
  bills,
  vouchers,
  onRefreshData,
  onOpenNewTransaction
}) => {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly' | 'all'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>('2026-10'); // Default current month
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'income' | 'expense'>('all');
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    notes: '',
    paymentMethod: 'transfer'
  });
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Calculate report
  const reportData = ReportService.calculateReport(reportType, selectedDate);
  const { summary } = reportData;

  // Filter table rows by search query and category
  const displayedTransactions = reportData.transactions.filter(t => {
    const matchesSearch =
      !searchQuery ||
      t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      filterCategory === 'all' || t.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const handlePrintReport = () => {
    window.print();
  };

  // Export current period
  const handleExportCsv = () => {
    const filename = `Laporan_Transaksi_AnuwaniNet_${reportType.toUpperCase()}_${selectedDate || 'Semua'}.csv`;
    ReportService.exportTransactionsToCsv(reportData.transactions, filename);
    setActionNotice(`Laporan transaksi ${reportType} (${selectedDate}) berhasil diunduh dalam format CSV!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleExportExcel = () => {
    const filename = `Laporan_Transaksi_AnuwaniNet_${reportType.toUpperCase()}_${selectedDate || 'Semua'}.xlsx`;
    ReportService.exportTransactionsToExcel(
      reportData.transactions,
      filename,
      summary,
      reportType
    );
    setActionNotice(`Laporan transaksi ${reportType} (${selectedDate}) berhasil diunduh dalam format Excel (.xlsx)!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Specific Direct Exports
  const handleExportSpecific = (type: 'daily' | 'monthly' | 'yearly' | 'all', dateVal: string, format: 'xlsx' | 'csv') => {
    const targetData = ReportService.calculateReport(type, dateVal);
    const label = type === 'daily' ? `Harian_${dateVal}` : type === 'monthly' ? `Bulanan_${dateVal}` : type === 'yearly' ? `Tahunan_${dateVal}` : 'Seluruh_Data';
    if (format === 'xlsx') {
      ReportService.exportTransactionsToExcel(
        targetData.transactions,
        `Laporan_Transaksi_AnuwaniNet_${label}.xlsx`,
        targetData.summary,
        type
      );
      setActionNotice(`Laporan transaksi ${label} berhasil diunduh dalam format Excel (.xlsx)!`);
    } else {
      ReportService.exportTransactionsToCsv(
        targetData.transactions,
        `Laporan_Transaksi_AnuwaniNet_${label}.csv`
      );
      setActionNotice(`Laporan transaksi ${label} berhasil diunduh dalam format CSV!`);
    }
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleExportBillsCsv = () => {
    ReportService.exportBillsToCsv(
      bills,
      `Laporan_Tagihan_Pelanggan_AnuwaniNet.csv`
    );
    setActionNotice('Laporan tagihan pelanggan berhasil diunduh dalam format CSV!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleExportBillsExcel = () => {
    ReportService.exportBillsToExcel(
      bills,
      `Laporan_Tagihan_Pelanggan_AnuwaniNet.xlsx`
    );
    setActionNotice('Laporan tagihan pelanggan berhasil diunduh dalam format Excel (.xlsx)!');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(expenseForm.amount);
    if (!expenseForm.title || isNaN(amountNum) || amountNum <= 0) {
      alert('Mohon isi nama pengeluaran dan nominal dengan benar.');
      return;
    }

    const newExpense: Transaction = {
      id: 'trx-exp-' + Date.now(),
      invoiceNumber: 'EXP-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000),
      customerName: expenseForm.title,
      type: 'pengeluaran_operasional',
      category: 'expense',
      amount: amountNum,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      paymentMethod: expenseForm.paymentMethod as any,
      status: 'completed',
      notes: expenseForm.notes || 'Pengeluaran operasional ISP',
      whatsappNotificationSent: false
    };

    DataService.addTransaction(newExpense);
    onRefreshData();
    setShowExpenseModal(false);
    setExpenseForm({ title: '', amount: '', notes: '', paymentMethod: 'transfer' });
    setActionNotice(`Pengeluaran sebesar ${WhatsAppService.formatRupiah(amountNum)} berhasil dicatat.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-red-500" />
            Laporan Keuangan & Export Data
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Pelaporan kas masuk, kas keluar, laba bersih harian, bulanan, dan tahunan serta cetak resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-rose-400 hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pengeluaran Kas</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrintReport}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Laporan (Print / PDF)</span>
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-800/80 text-xs text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Pusat Export Cepat: Daily, Monthly, Yearly Cards */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Pusat Unduh Laporan Transaksi (CSV & Excel)
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500">Tersedia format Microsoft Excel (.xlsx) dan CSV Spreadsheet</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Card 1: Daily */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Laporan Harian
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">10 Okt 2026</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Rekap mutasi transaksi per hari untuk tutup buku kas harian.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => handleExportSpecific('daily', '2026-10-10', 'xlsx')}
                className="py-1.5 px-2 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleExportSpecific('daily', '2026-10-10', 'csv')}
                className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3 text-zinc-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Card 2: Monthly */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Laporan Bulanan
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Okt 2026</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Rekap omset tagihan & voucher, beban operasional, dan margin laba.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => handleExportSpecific('monthly', '2026-10', 'xlsx')}
                className="py-1.5 px-2 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleExportSpecific('monthly', '2026-10', 'csv')}
                className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3 text-zinc-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Card 3: Yearly */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-red-500" />
                Laporan Tahunan
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Tahun 2026</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Evaluasi kinerja tahunan, laporan laba rugi, dan pertumbuhan ISP.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={() => handleExportSpecific('yearly', '2026', 'xlsx')}
                className="py-1.5 px-2 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Excel</span>
              </button>
              <button
                onClick={() => handleExportSpecific('yearly', '2026', 'csv')}
                className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3 text-zinc-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>

          {/* Card 4: Bills & Tagihan */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                Data Tagihan
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">{bills.length} tagihan</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Export data tagihan lunas, belum bayar, dan piutang tertunggak.
            </p>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                onClick={handleExportBillsExcel}
                className="py-1.5 px-2 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Excel</span>
              </button>
              <button
                onClick={handleExportBillsCsv}
                className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-[11px] font-semibold flex items-center justify-center gap-1"
              >
                <Download className="w-3 h-3 text-zinc-400" />
                <span>CSV</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Ribbon: Daily / Monthly / Yearly / All */}
      <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-zinc-300">Filter Periode:</span>
          <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-lg">
            <button
              onClick={() => {
                setReportType('daily');
                setSelectedDate('2026-10-10');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                reportType === 'daily' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Harian
            </button>
            <button
              onClick={() => {
                setReportType('monthly');
                setSelectedDate('2026-10');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                reportType === 'monthly' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => {
                setReportType('yearly');
                setSelectedDate('2026');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                reportType === 'yearly' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tahunan
            </button>
            <button
              onClick={() => {
                setReportType('all');
                setSelectedDate('');
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                reportType === 'all' ? 'bg-red-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Date Selector & Quick Presets */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-zinc-300">Pilih Waktu:</span>
          {reportType === 'daily' && (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
              />
              <button
                onClick={() => setSelectedDate('2026-10-10')}
                className="px-2 py-1 text-[11px] rounded bg-zinc-800 text-zinc-300 hover:text-white"
              >
                Hari Ini
              </button>
              <button
                onClick={() => setSelectedDate('2026-10-09')}
                className="px-2 py-1 text-[11px] rounded bg-zinc-800 text-zinc-300 hover:text-white"
              >
                Kemarin
              </button>
            </div>
          )}
          {reportType === 'monthly' && (
            <div className="flex items-center gap-1.5">
              <input
                type="month"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
              />
              <button
                onClick={() => setSelectedDate('2026-10')}
                className="px-2 py-1 text-[11px] rounded bg-zinc-800 text-zinc-300 hover:text-white"
              >
                Okt 2026
              </button>
              <button
                onClick={() => setSelectedDate('2026-09')}
                className="px-2 py-1 text-[11px] rounded bg-zinc-800 text-zinc-300 hover:text-white"
              >
                Sept 2026
              </button>
            </div>
          )}
          {reportType === 'yearly' && (
            <select
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
            >
              <option value="2026">Tahun 2026</option>
              <option value="2025">Tahun 2025</option>
              <option value="2024">Tahun 2024</option>
            </select>
          )}
          {reportType === 'all' && (
            <span className="text-zinc-400 italic">Semua transaksi sejak awal operasional</span>
          )}
        </div>
      </div>

      {/* Printable Report Sheet Layout */}
      <div className="print-container p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
        {/* Printable Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div>
            <div className="text-xl font-black text-white tracking-tight">
              ANUWANINET <span className="text-red-500">ISP</span>
            </div>
            <div className="text-xs text-zinc-400">
              Laporan Keuangan Resmi & Manajemen Pelanggan RT-RW Net
            </div>
            <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Periode Laporan: <span className="text-zinc-200 font-semibold uppercase">{reportType} ({selectedDate})</span>
            </div>
          </div>
          <div className="text-right text-xs text-zinc-400 font-mono">
            <div>Dicetak pada: {new Date().toLocaleString('id-ID')}</div>
            <div className="text-emerald-400 font-semibold">Status: Terverifikasi</div>
          </div>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Pemasukan Kas</span>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-1 tabular-nums">
              {WhatsAppService.formatRupiah(summary.totalIncome)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Tagihan: {WhatsAppService.formatRupiah(summary.billsIncome)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Pengeluaran Operasional</span>
            <div className="text-xl font-bold text-rose-400 font-mono mt-1 tabular-nums">
              {WhatsAppService.formatRupiah(summary.totalExpense)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              Bandwidth & Pemeliharaan
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Laba Bersih</span>
            <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${summary.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
              {WhatsAppService.formatRupiah(summary.netProfit)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {summary.totalIncome > 0 ? `${Math.round((summary.netProfit / summary.totalIncome) * 100)}% Rasio Margin` : '0%'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Voucher Hotspot Terjual</span>
            <div className="text-xl font-bold text-amber-400 font-mono mt-1 tabular-nums">
              {WhatsAppService.formatRupiah(summary.voucherIncome)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">
              {summary.vouchersSold} Kode voucher aktif
            </div>
          </div>
        </div>

        {/* Detailed Transactions in this period */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">
              Rincian Transaksi ({displayedTransactions.length} dari {reportData.transactions.length} Entri)
            </h3>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterCategory('all')}
                  className={`px-2 py-1 rounded font-medium ${
                    filterCategory === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('income')}
                  className={`px-2 py-1 rounded font-medium ${
                    filterCategory === 'income' ? 'bg-emerald-950 text-emerald-300 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory('expense')}
                  className={`px-2 py-1 rounded font-medium ${
                    filterCategory === 'expense' ? 'bg-rose-950 text-rose-300 font-bold' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Pengeluaran
                </button>
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder="Cari invoice/nama..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-2.5 py-1 text-xs rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">No Invoice</th>
                  <th className="py-2.5 px-3">Waktu</th>
                  <th className="py-2.5 px-3">Keterangan / Pelanggan</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Metode</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                {displayedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-zinc-500 font-sans">
                      Tidak ada transaksi yang cocok pada filter periode atau pencarian ini.
                    </td>
                  </tr>
                ) : (
                  displayedTransactions.map(t => {
                    const isIncome = t.category === 'income';
                    return (
                      <tr key={t.id} className="hover:bg-zinc-800/30">
                        <td className="py-2 px-3 font-semibold text-white">{t.invoiceNumber}</td>
                        <td className="py-2 px-3 text-zinc-400">{t.date}</td>
                        <td className="py-2 px-3 font-sans font-medium text-white">{t.customerName}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] font-semibold uppercase ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isIncome ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="py-2 px-3 uppercase text-zinc-400">{t.paymentMethod}</td>
                        <td className={`py-2 px-3 text-right font-bold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isIncome ? '+' : '-'}{WhatsAppService.formatRupiah(t.amount)}
                        </td>
                        <td className="py-2 px-3 font-sans text-zinc-400 text-[10px]">{t.notes || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formal Signature box for physical report printout */}
        <div className="pt-8 grid grid-cols-2 text-center text-xs text-zinc-400 border-t border-zinc-800">
          <div>
            <div>Dibuat Oleh:</div>
            <div className="mt-14 font-semibold text-white underline">Petugas Kasir / Admin</div>
            <div className="text-[10px] text-zinc-500">AnuwaniNet Financial Unit</div>
          </div>
          <div>
            <div>Mengetahui:</div>
            <div className="mt-14 font-semibold text-white underline">Manager Operasional / Superadmin</div>
            <div className="text-[10px] text-zinc-500">PT Anuwani Lintas Network</div>
          </div>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                Catat Pengeluaran Operasional
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Nama / Keperluan Pengeluaran</label>
                <input
                  type="text"
                  placeholder="Contoh: Tagihan Bandwidth Upstream / Listrik NOC"
                  value={expenseForm.title}
                  onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Nominal (Rupiah)</label>
                <input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Metode Pembayaran</label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={e => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  <option value="transfer">Transfer Bank (BCA/BRI)</option>
                  <option value="cash">Tunai Kas Kecil</option>
                  <option value="qris">QRIS / E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  placeholder="Nomor resi, keterangan teknisi..."
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
