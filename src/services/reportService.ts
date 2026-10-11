import { Transaction, Bill, Voucher } from '../types';
import { DataService } from './dataService';
import * as XLSX from 'xlsx';

export interface ReportSummary {
  periodLabel: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  unpaidDues: number;
  billsIncome: number;
  voucherIncome: number;
  installationIncome: number;
  transactionsCount: number;
  vouchersSold: number;
}

// Helper to robustly extract year, month (1-12), day (1-31) from diverse date strings
function extractDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // 1. Check ISO format: YYYY-MM-DD (e.g. 2026-10-10 or 2026-10-05 14:10)
  const isoMatch = dateStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10)
    };
  }

  // 2. Check DD/MM/YYYY or DD/MM/YY (e.g. 10/10/2026 or 05/10/26)
  const dmyMatch = dateStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (dmyMatch) {
    let yr = parseInt(dmyMatch[3], 10);
    if (yr < 100) yr += 2000;
    return {
      year: yr,
      month: parseInt(dmyMatch[2], 10),
      day: parseInt(dmyMatch[1], 10)
    };
  }

  // 3. Fallback to native Date parser
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth() + 1,
      day: parsed.getDate()
    };
  }

  return null;
}

export class ReportService {
  static formatCurrency(num: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(num);
  }

  // Calculate stats for daily, monthly, yearly, or all
  static calculateReport(type: 'daily' | 'monthly' | 'yearly' | 'all', dateFilterString: string): {
    summary: ReportSummary;
    transactions: Transaction[];
    bills: Bill[];
  } {
    const allTrxs = DataService.getTransactions();
    const allBills = DataService.getBills();
    const allVouchers = DataService.getVouchers();

    // Filter transactions based on date string
    const filteredTrxs = allTrxs.filter(t => {
      if (!t.date) return false;
      if (type === 'all') return true;

      const parts = extractDateParts(t.date);

      if (type === 'daily') {
        // dateFilterString is usually YYYY-MM-DD
        const filterParts = extractDateParts(dateFilterString);
        if (parts && filterParts) {
          return parts.year === filterParts.year &&
                 parts.month === filterParts.month &&
                 parts.day === filterParts.day;
        }
        return t.date.includes(dateFilterString);
      } else if (type === 'monthly') {
        // dateFilterString is usually YYYY-MM
        const filterParts = dateFilterString.match(/^(\d{4})[-/](\d{1,2})/);
        if (parts && filterParts) {
          const filterYear = parseInt(filterParts[1], 10);
          const filterMonth = parseInt(filterParts[2], 10);
          return parts.year === filterYear && parts.month === filterMonth;
        }
        return t.date.includes(dateFilterString) || (t.notes && t.notes.toLowerCase().includes(dateFilterString.toLowerCase()));
      } else if (type === 'yearly') {
        // dateFilterString is YYYY
        const filterYear = parseInt(dateFilterString, 10);
        if (parts && !isNaN(filterYear)) {
          return parts.year === filterYear;
        }
        return t.date.includes(dateFilterString);
      }

      return true;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    let billsIncome = 0;
    let voucherIncome = 0;
    let installationIncome = 0;

    filteredTrxs.forEach(t => {
      if (t.status === 'completed') {
        if (t.category === 'income') {
          totalIncome += t.amount;
          if (t.type === 'tagihan') billsIncome += t.amount;
          else if (t.type === 'voucher') voucherIncome += t.amount;
          else if (t.type === 'pemasangan') installationIncome += t.amount;
        } else if (t.category === 'expense') {
          totalExpense += t.amount;
        }
      }
    });

    // Unpaid bills in this period
    const unpaidDues = allBills
      .filter(b => b.status === 'unpaid' || b.status === 'overdue')
      .reduce((sum, b) => sum + b.amount, 0);

    const vouchersSold = allVouchers.filter(v => v.status === 'used').length;

    const summary: ReportSummary = {
      periodLabel: dateFilterString,
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      unpaidDues,
      billsIncome,
      voucherIncome,
      installationIncome,
      transactionsCount: filteredTrxs.length,
      vouchersSold
    };

    return {
      summary,
      transactions: filteredTrxs,
      bills: allBills
    };
  }

  // 1. Export Transactions to Native Excel (.xlsx) with multi-sheet support
  static exportTransactionsToExcel(
    transactions: Transaction[],
    filename: string = 'Laporan_Transaksi_AnuwaniNet.xlsx',
    summary?: ReportSummary,
    periodType: string = 'Bulanan'
  ) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary Sheet
    if (summary) {
      const summaryRows = [
        ['LAPORAN KEUANGAN & TRANSAKSI ANUWANINET ISP'],
        ['Periode Laporan', `${periodType.toUpperCase()} (${summary.periodLabel})`],
        ['Tanggal Dibuat', new Date().toLocaleString('id-ID')],
        ['Unit Usaha', 'PT Anuwani Lintas Network (RT-RW Net)'],
        [''],
        ['METRIK UTAMA KEUANGAN', 'NOMINAL (IDR)'],
        ['Total Pemasukan Kas', summary.totalIncome],
        ['Total Pengeluaran Operasional', summary.totalExpense],
        ['Laba Bersih Kas', summary.netProfit],
        ['Pemasukan Tagihan Bulanan', summary.billsIncome],
        ['Pemasukan Voucher Hotspot', summary.voucherIncome],
        ['Pemasukan Instalasi Baru', summary.installationIncome],
        ['Piutang Tagihan Tertunggak', summary.unpaidDues],
        ['Total Jumlah Transaksi', summary.transactionsCount],
        ['Jumlah Voucher Terjual', summary.vouchersSold]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
    }

    // Sheet 2: Detail Transactions Sheet
    const dataRows = transactions.map((t, idx) => ({
      No: idx + 1,
      'No Invoice': t.invoiceNumber,
      Tanggal: t.date,
      'Nama Pelanggan/Keterangan': t.customerName,
      Kategori: t.category === 'income' ? 'Pemasukan' : 'Pengeluaran',
      'Tipe Transaksi': t.type,
      'Metode Pembayaran': (t.paymentMethod || '').toUpperCase(),
      'Nominal (IDR)': t.amount,
      Status: t.status,
      'Notifikasi WA': t.whatsappNotificationSent ? 'Terkirim' : '-',
      Catatan: t.notes || ''
    }));

    const wsData = XLSX.utils.json_to_sheet(dataRows.length > 0 ? dataRows : [{ Keterangan: 'Tidak ada data transaksi pada periode ini' }]);
    XLSX.utils.book_append_sheet(wb, wsData, 'Semua Transaksi');

    // Sheet 3: Income only
    const incomeRows = dataRows.filter(r => r.Kategori === 'Pemasukan');
    if (incomeRows.length > 0) {
      const wsIncome = XLSX.utils.json_to_sheet(incomeRows);
      XLSX.utils.book_append_sheet(wb, wsIncome, 'Pemasukan');
    }

    // Sheet 4: Expense only
    const expenseRows = dataRows.filter(r => r.Kategori === 'Pengeluaran');
    if (expenseRows.length > 0) {
      const wsExpense = XLSX.utils.json_to_sheet(expenseRows);
      XLSX.utils.book_append_sheet(wb, wsExpense, 'Pengeluaran');
    }

    XLSX.writeFile(wb, filename);
  }

  // 2. Export Transactions to CSV
  static exportTransactionsToCsv(
    transactions: Transaction[],
    filename: string = 'Laporan_Transaksi_AnuwaniNet.csv'
  ) {
    const headers = [
      'No Invoice',
      'Tanggal',
      'Nama Pelanggan / Keterangan',
      'Kategori',
      'Tipe Transaksi',
      'Metode Bayar',
      'Nominal (IDR)',
      'Status',
      'Notifikasi WA',
      'Catatan'
    ];

    const rows = transactions.map(t => [
      `"${t.invoiceNumber}"`,
      `"${t.date}"`,
      `"${(t.customerName || '').replace(/"/g, '""')}"`,
      `"${t.category === 'income' ? 'Pemasukan' : 'Pengeluaran'}"`,
      `"${t.type}"`,
      `"${t.paymentMethod}"`,
      t.amount,
      `"${t.status}"`,
      `"${t.whatsappNotificationSent ? 'Terkirim' : '-'}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 3. Export Bills to Excel (.xlsx)
  static exportBillsToExcel(bills: Bill[], filename: string = 'Laporan_Tagihan_AnuwaniNet.xlsx') {
    const wb = XLSX.utils.book_new();
    const dataRows = bills.map((b, idx) => ({
      No: idx + 1,
      'No Tagihan': b.billNumber,
      'Nama Pelanggan': b.customerName,
      'Nomor HP': b.customerPhone,
      Paket: b.packageName,
      Periode: b.period,
      'Jatuh Tempo': b.dueDate,
      'Nominal (IDR)': b.amount,
      Status: b.status === 'paid' ? 'LUNAS' : b.status === 'overdue' ? 'TERTUNGGAK' : 'BELUM BAYAR',
      'Tanggal Bayar': b.paidAt || '-',
      Metode: (b.paymentMethod || '-').toUpperCase(),
      'Ref Transaksi': b.transactionRef || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(dataRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Data Tagihan');
    XLSX.writeFile(wb, filename);
  }

  // 4. Export customer bills report to CSV
  static exportBillsToCsv(bills: Bill[], filename: string = 'Laporan_Tagihan_AnuwaniNet.csv') {
    const headers = [
      'No Tagihan',
      'Nama Pelanggan',
      'No HP',
      'Paket',
      'Periode',
      'Jatuh Tempo',
      'Nominal (IDR)',
      'Status',
      'Tanggal Bayar',
      'Metode'
    ];

    const rows = bills.map(b => [
      `"${b.billNumber}"`,
      `"${b.customerName.replace(/"/g, '""')}"`,
      `"${b.customerPhone}"`,
      `"${b.packageName}"`,
      `"${b.period}"`,
      `"${b.dueDate}"`,
      b.amount,
      `"${b.status === 'paid' ? 'LUNAS' : b.status === 'overdue' ? 'TERTUNGGAK' : 'BELUM DIBAYAR'}"`,
      `"${b.paidAt || '-'}"`,
      `"${b.paymentMethod || '-'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
