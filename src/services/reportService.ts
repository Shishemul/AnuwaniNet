import { Transaction, Bill, Voucher } from '../types';
import { DataService } from './dataService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // 5. Professional PDF Export for Transactions
  static exportTransactionsToPdf(
    transactions: Transaction[],
    summary?: ReportSummary,
    periodLabel: string = 'Semua Periode',
    filename: string = 'Laporan_Transaksi_AnuwaniNet.pdf'
  ) {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4: 297mm x 210mm
    const appSettings = DataService.getAppSettings();
    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Brand Header Bar
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 297, 24, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${appSettings.companyName.toUpperCase()} - LAPORAN KEUANGAN TRANSAKSI`, 14, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text(`ISP & Billing Manager | NOC: ${appSettings.phoneCs} | ${appSettings.addressNoc}`, 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(`PERIODE: ${periodLabel.toUpperCase()}`, 283, 11, { align: 'right' });
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Dicetak pada: ${currentDateStr}`, 283, 18, { align: 'right' });

    // Financial Recap Box
    let startY = 28;
    if (summary) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(14, startY, 269, 14, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);

      const colWidth = 269 / 5;
      // 1. Total Pemasukan
      doc.text('TOTAL PEMASUKAN:', 18, startY + 5.5);
      doc.setTextColor(22, 101, 52); // green-800
      doc.text(this.formatCurrency(summary.totalIncome), 18, startY + 10.5);

      // 2. Total Pengeluaran
      doc.setTextColor(15, 23, 42);
      doc.text('TOTAL PENGELUARAN:', 18 + colWidth, startY + 5.5);
      doc.setTextColor(153, 27, 27); // red-800
      doc.text(this.formatCurrency(summary.totalExpense), 18 + colWidth, startY + 10.5);

      // 3. Laba Bersih
      doc.setTextColor(15, 23, 42);
      doc.text('LABA BERSIH (NET):', 18 + colWidth * 2, startY + 5.5);
      doc.setTextColor(summary.netProfit >= 0 ? 21 : 185, summary.netProfit >= 0 ? 128 : 28, summary.netProfit >= 0 ? 61 : 28);
      doc.text(this.formatCurrency(summary.netProfit), 18 + colWidth * 2, startY + 10.5);

      // 4. Tagihan Tertunggak
      doc.setTextColor(15, 23, 42);
      doc.text('TAGIHAN TERTUNGGAK:', 18 + colWidth * 3, startY + 5.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(this.formatCurrency(summary.unpaidDues), 18 + colWidth * 3, startY + 10.5);

      // 5. Total Transaksi
      doc.setTextColor(15, 23, 42);
      doc.text('JUMLAH TRANSAKSI:', 18 + colWidth * 4, startY + 5.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${transactions.length} Transaksi`, 18 + colWidth * 4, startY + 10.5);

      startY += 18;
    }

    // Transactions Table
    const tableHeaders = [
      ['No', 'Tanggal', 'No. Transaksi', 'Pelanggan / Keterangan', 'Tipe', 'Kategori', 'Metode', 'Jumlah (IDR)', 'Status']
    ];

    const tableRows = transactions.map((t, idx) => [
      String(idx + 1),
      t.date || '-',
      t.invoiceNumber || '-',
      t.customerName || (t.notes ? t.notes.slice(0, 30) : '-'),
      (t.type || '-').toUpperCase(),
      t.category === 'income' ? 'PEMASUKAN' : 'PENGELUARAN',
      (t.paymentMethod || '-').toUpperCase(),
      this.formatCurrency(t.amount),
      t.status === 'completed' ? 'SUKSES' : (t.status || '-').toUpperCase()
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: startY,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 26, halign: 'center' },
        2: { cellWidth: 35, fontStyle: 'bold' },
        3: { cellWidth: 65 },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 26, halign: 'center' },
        6: { cellWidth: 24, halign: 'center' },
        7: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 24, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        // Color amount depending on category
        if (data.section === 'body' && data.column.index === 7) {
          const rowCat = (data.row.raw as any)?.[5];
          if (rowCat === 'PEMASUKAN') {
            data.cell.styles.textColor = [22, 101, 52];
          } else {
            data.cell.styles.textColor = [153, 27, 27];
          }
        }
      },
      didDrawPage: (data) => {
        // Footer on each page
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Dokumen resmi ${appSettings.companyName} | Halaman ${data.pageNumber} dari ${pageCount}`,
          14,
          204
        );
        doc.text('Valid & Terverifikasi Otomatis oleh Sistem Keuangan AnuwaniNet', 283, 204, { align: 'right' });
      }
    });

    // Verification signatures block at end of table
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : 160;
    if (finalY < 185) {
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('Dibuat & Divalidasi Oleh:', 35, finalY);
      doc.text('Mengetahui (Pimpinan / Superadmin):', 215, finalY);

      doc.setFont('helvetica', 'bold');
      doc.text('( Bagian Keuangan / Kasir )', 35, finalY + 14);
      doc.text(`( ${appSettings.appName} Management )`, 215, finalY + 14);
    }

    doc.save(filename);
  }

  // 6. Professional PDF Export for Bills
  static exportBillsToPdf(
    bills: Bill[],
    periodLabel: string = 'Semua Periode',
    filename: string = 'Laporan_Tagihan_AnuwaniNet.pdf'
  ) {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape A4
    const appSettings = DataService.getAppSettings();
    const currentDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Header Bar
    doc.setFillColor(185, 28, 28); // red-700
    doc.rect(0, 0, 297, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${appSettings.companyName.toUpperCase()} - REKAPITULASI TAGIHAN PELANGGAN`, 14, 11);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(254, 226, 226); // red-100
    doc.text(`ISP & Billing Manager | Rekening BCA: ${appSettings.bcaAccount} | BRI: ${appSettings.briAccount}`, 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`PERIODE: ${periodLabel.toUpperCase()}`, 283, 11, { align: 'right' });
    doc.setTextColor(254, 202, 202);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`Dicetak pada: ${currentDateStr}`, 283, 18, { align: 'right' });

    // Summary Metric Ribbon
    const paidBills = bills.filter(b => b.status === 'paid');
    const unpaidBills = bills.filter(b => b.status === 'unpaid');
    const overdueBills = bills.filter(b => b.status === 'overdue');
    const totalAmount = bills.reduce((s, b) => s + b.amount, 0);
    const paidAmount = paidBills.reduce((s, b) => s + b.amount, 0);
    const unpaidAmount = [...unpaidBills, ...overdueBills].reduce((s, b) => s + b.amount, 0);

    const startY = 28;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, startY, 269, 14, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);

    const colWidth = 269 / 4;
    doc.text('TOTAL TAGIHAN:', 18, startY + 5.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${this.formatCurrency(totalAmount)} (${bills.length} Lembar)`, 18, startY + 10.5);

    doc.setTextColor(15, 23, 42);
    doc.text('TAGIHAN LUNAS:', 18 + colWidth, startY + 5.5);
    doc.setTextColor(22, 101, 52); // green-800
    doc.text(`${this.formatCurrency(paidAmount)} (${paidBills.length} Lembar)`, 18 + colWidth, startY + 10.5);

    doc.setTextColor(15, 23, 42);
    doc.text('BELUM LUNAS / TERTUNGGAK:', 18 + colWidth * 2, startY + 5.5);
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`${this.formatCurrency(unpaidAmount)} (${unpaidBills.length + overdueBills.length} Lembar)`, 18 + colWidth * 2, startY + 10.5);

    doc.setTextColor(15, 23, 42);
    doc.text('PERSENTASE PELUNASAN:', 18 + colWidth * 3, startY + 5.5);
    const percent = bills.length > 0 ? Math.round((paidBills.length / bills.length) * 100) : 0;
    doc.setTextColor(percent >= 70 ? 22 : 180, percent >= 70 ? 101 : 83, percent >= 70 ? 52 : 9);
    doc.text(`${percent}% Terbayar`, 18 + colWidth * 3, startY + 10.5);

    // Table
    const tableHeaders = [
      ['No', 'No. Invoice', 'Nama Pelanggan', 'No. HP', 'Paket Internet', 'Periode', 'Jatuh Tempo', 'Jumlah (IDR)', 'Status', 'Tgl Bayar / Metode']
    ];

    const tableRows = bills.map((b, idx) => [
      String(idx + 1),
      b.billNumber,
      b.customerName,
      b.customerPhone,
      b.packageName,
      b.period,
      b.dueDate,
      this.formatCurrency(b.amount),
      b.status === 'paid' ? 'LUNAS' : b.status === 'overdue' ? 'TERTUNGGAK' : 'BELUM BAYAR',
      b.paidAt ? `${b.paidAt} (${(b.paymentMethod || 'CASH').toUpperCase()})` : '-'
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: startY + 18,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [185, 28, 28], // red-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 34, fontStyle: 'bold' },
        2: { cellWidth: 42 },
        3: { cellWidth: 28, halign: 'center' },
        4: { cellWidth: 38 },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 24, halign: 'center' },
        7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        9: { cellWidth: 32, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 8) {
          const statusVal = data.cell.raw;
          if (statusVal === 'LUNAS') {
            data.cell.styles.textColor = [22, 101, 52];
          } else if (statusVal === 'TERTUNGGAK') {
            data.cell.styles.textColor = [185, 28, 28];
          } else {
            data.cell.styles.textColor = [180, 83, 9];
          }
        }
      },
      didDrawPage: (data) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Rekapitulasi Tagihan ${appSettings.companyName} | Halaman ${data.pageNumber} dari ${pageCount}`,
          14,
          204
        );
        doc.text('AnuwaniNet ISP Billing & Ruijie Management System', 283, 204, { align: 'right' });
      }
    });

    doc.save(filename);
  }
}

