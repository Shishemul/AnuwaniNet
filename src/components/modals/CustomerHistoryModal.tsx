import React, { useState, useMemo } from 'react';
import { Customer, Bill, Transaction, BillStatus } from '../../types';
import { WhatsAppService } from '../../services/whatsappService';
import {
  X,
  Receipt,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Printer,
  Search,
  Filter,
  ArrowUpRight,
  Send,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  FileText,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  Info
} from 'lucide-react';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  bills: Bill[];
  transactions: Transaction[];
  onOpenRecordPayment?: (bill: Bill) => void;
  onPrintBill?: (bill: Bill) => void;
  onOpenDanaCheckout?: (session: any) => void;
}

type TabType = 'all' | 'bills' | 'transactions';
type StatusFilter = 'all' | 'paid_completed' | 'unpaid' | 'overdue';

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  customer,
  bills,
  transactions,
  onOpenRecordPayment,
  onPrintBill,
  onOpenDanaCheckout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [selectedItemDetail, setSelectedItemDetail] = useState<{
    type: 'bill' | 'transaction';
    data: any;
  } | null>(null);
  const [showPrintStatement, setShowPrintStatement] = useState(false);

  // Filter bills for this customer
  const customerBills = useMemo(() => {
    return bills.filter(b => b.customerId === customer.id);
  }, [bills, customer.id]);

  // Filter transactions for this customer
  const customerTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.customerId === customer.id ||
      t.customerName?.toLowerCase() === customer.name.toLowerCase() ||
      (t.notes && t.notes.toLowerCase().includes(customer.name.toLowerCase()))
    );
  }, [transactions, customer.id, customer.name]);

  // Financial KPI calculations
  const stats = useMemo(() => {
    const totalBillsCount = customerBills.length;
    const totalBilledAmount = customerBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    const paidBills = customerBills.filter(b => b.status === 'paid');
    const paidBillsCount = paidBills.length;
    const paidBillsAmount = paidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    const unpaidBills = customerBills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
    const unpaidBillsCount = unpaidBills.length;
    const unpaidBillsAmount = unpaidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    const completedTrxs = customerTransactions.filter(t => t.status === 'completed');
    const totalTransactionsCount = customerTransactions.length;
    const totalTransactionsAmount = completedTrxs.reduce((acc, t) => acc + (t.amount || 0), 0);

    return {
      totalBillsCount,
      totalBilledAmount,
      paidBillsCount,
      paidBillsAmount,
      unpaidBillsCount,
      unpaidBillsAmount,
      totalTransactionsCount,
      totalTransactionsAmount
    };
  }, [customerBills, customerTransactions]);

  // Combined timeline items
  const combinedTimeline = useMemo(() => {
    const items: Array<{
      id: string;
      itemType: 'bill' | 'transaction';
      date: string; // for sorting
      displayDate: string;
      title: string;
      subtitle: string;
      code: string;
      amount: number;
      status: string;
      statusLabel: string;
      statusColor: 'green' | 'amber' | 'red' | 'blue';
      method?: string;
      raw: Bill | Transaction;
    }> = [];

    // Add bills
    customerBills.forEach(b => {
      const isPaid = b.status === 'paid';
      const isOverdue = b.status === 'overdue';
      const sortDate = b.paidAt ? b.paidAt : b.dueDate;

      let statusColor: 'green' | 'amber' | 'red' | 'blue' = 'amber';
      let statusLabel = 'Belum Dibayar';
      if (isPaid) {
        statusColor = 'green';
        statusLabel = 'Lunas';
      } else if (isOverdue) {
        statusColor = 'red';
        statusLabel = 'Jatuh Tempo (Isolir)';
      }

      items.push({
        id: 'bill-' + b.id,
        itemType: 'bill',
        date: sortDate,
        displayDate: isPaid ? `Lunas: ${b.paidAt}` : `Jatuh Tempo: ${b.dueDate}`,
        title: `Tagihan ${b.period}`,
        subtitle: `${b.packageName} · Ref: ${b.billNumber}`,
        code: b.billNumber,
        amount: b.amount,
        status: b.status,
        statusLabel,
        statusColor,
        method: b.paymentMethod,
        raw: b
      });
    });

    // Add transactions
    customerTransactions.forEach(t => {
      const isCompleted = t.status === 'completed';
      const isFailed = t.status === 'failed';

      let statusColor: 'green' | 'amber' | 'red' | 'blue' = 'blue';
      let statusLabel = 'Menunggu';
      if (isCompleted) {
        statusColor = 'green';
        statusLabel = 'Selesai';
      } else if (isFailed) {
        statusColor = 'red';
        statusLabel = 'Gagal';
      }

      const typeLabel = t.type === 'tagihan' 
        ? 'Pembayaran Tagihan Bulanan'
        : t.type === 'voucher'
        ? 'Pembelian Voucher Wifi'
        : t.type === 'pemasangan'
        ? 'Biaya Registrasi / Pasang'
        : 'Transaksi';

      items.push({
        id: 'trx-' + t.id,
        itemType: 'transaction',
        date: t.date,
        displayDate: t.date,
        title: typeLabel,
        subtitle: `${t.notes || 'Pembayaran Internet'} · ${t.invoiceNumber}`,
        code: t.invoiceNumber,
        amount: t.amount,
        status: t.status,
        statusLabel,
        statusColor,
        method: t.paymentMethod,
        raw: t
      });
    });

    // Sort descending by date
    return items.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [customerBills, customerTransactions]);

  // Filtered lists based on search & status filter
  const filteredTimeline = useMemo(() => {
    return combinedTimeline.filter(item => {
      // Search filter
      const matchesSearch = 
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.method && item.method.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'paid_completed') {
        matchesStatus = item.status === 'paid' || item.status === 'completed';
      } else if (statusFilter === 'unpaid') {
        matchesStatus = item.status === 'unpaid' || item.status === 'pending';
      } else if (statusFilter === 'overdue') {
        matchesStatus = item.status === 'overdue';
      }

      return matchesSearch && matchesStatus;
    });
  }, [combinedTimeline, searchQuery, statusFilter]);

  const filteredBills = useMemo(() => {
    return customerBills.filter(b => {
      const matchesSearch =
        !searchQuery ||
        b.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.period.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.packageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.transactionRef && b.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'paid_completed') {
        matchesStatus = b.status === 'paid';
      } else if (statusFilter === 'unpaid') {
        matchesStatus = b.status === 'unpaid';
      } else if (statusFilter === 'overdue') {
        matchesStatus = b.status === 'overdue';
      }

      return matchesSearch && matchesStatus;
    });
  }, [customerBills, searchQuery, statusFilter]);

  const filteredTransactions = useMemo(() => {
    return customerTransactions.filter(t => {
      const matchesSearch =
        !searchQuery ||
        t.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'paid_completed') {
        matchesStatus = t.status === 'completed';
      } else if (statusFilter === 'unpaid') {
        matchesStatus = t.status === 'pending';
      } else if (statusFilter === 'overdue') {
        matchesStatus = false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [customerTransactions, searchQuery, statusFilter]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleSendWaConfirmation = (bill: Bill) => {
    const text = `Halo Admin AnuwaniNet, saya *${customer.name}* (${customer.customerCode}) ingin konfirmasi pembayaran tagihan *${bill.billNumber}* sebesar *${WhatsAppService.formatRupiah(bill.amount)}* periode *${bill.period}*. Mohon dicek. Terima kasih.`;
    WhatsAppService.openWhatsAppUrl('081234567890', text);
  };

  const getMethodBadge = (method?: string) => {
    if (!method) return null;
    const m = method.toLowerCase();
    let bg = 'bg-zinc-800 text-zinc-300 border-zinc-700';
    let label = method.toUpperCase();

    if (m === 'dana') {
      bg = 'bg-sky-950/80 text-sky-400 border-sky-800';
      label = 'DANA E-Wallet';
    } else if (m === 'qris') {
      bg = 'bg-purple-950/80 text-purple-400 border-purple-800';
      label = 'QRIS Instant';
    } else if (m === 'transfer') {
      bg = 'bg-blue-950/80 text-blue-400 border-blue-800';
      label = 'Transfer Bank';
    } else if (m === 'cash') {
      bg = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
      label = 'Tunai / Kasir';
    } else if (m === 'whatsapp_bot') {
      bg = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
      label = 'WhatsApp Bot';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${bg}`}>
        {label}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-400 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Riwayat Tagihan & Transaksi Pelanggan
                </h2>
                {customer.status === 'isolated' ? (
                  <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-[10px] font-bold flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    Terisolir
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2 flex-wrap font-mono">
                <span className="text-white font-semibold">{customer.name}</span>
                <span>•</span>
                <span>ID: {customer.customerCode}</span>
                <span>•</span>
                <span>PPPoE: {customer.pppoeUsername}</span>
                <span>•</span>
                <span>{customer.packageName} ({WhatsAppService.formatRupiah(customer.packagePrice)}/bln)</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setShowPrintStatement(true)}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Cetak Rekap Rekening Koran Pelanggan"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak Rekap</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="p-4 sm:p-5 bg-zinc-950/30 border-b border-zinc-800 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
            <div className="text-[11px] font-medium text-zinc-400 flex items-center justify-between">
              <span>Total Tagihan</span>
              <Receipt className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="text-base sm:text-lg font-bold text-white font-mono">
              {WhatsAppService.formatRupiah(stats.totalBilledAmount)}
            </div>
            <div className="text-[10px] text-zinc-500">
              {stats.totalBillsCount} Invoice diterbitkan
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 space-y-1">
            <div className="text-[11px] font-medium text-emerald-400 flex items-center justify-between">
              <span>Total Terbayar</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono">
              {WhatsAppService.formatRupiah(stats.paidBillsAmount)}
            </div>
            <div className="text-[10px] text-emerald-500/80">
              {stats.paidBillsCount} Tagihan lunas
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 space-y-1">
            <div className="text-[11px] font-medium text-red-400 flex items-center justify-between">
              <span>Tunggakan / Unpaid</span>
              <Clock className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-red-400 font-mono">
              {WhatsAppService.formatRupiah(stats.unpaidBillsAmount)}
            </div>
            <div className="text-[10px] text-red-500/80">
              {stats.unpaidBillsCount > 0 ? `${stats.unpaidBillsCount} Belum lunas` : 'Semua lunas'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-900/40 space-y-1">
            <div className="text-[11px] font-medium text-sky-400 flex items-center justify-between">
              <span>Riwayat Transaksi</span>
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-base sm:text-lg font-bold text-sky-400 font-mono">
              {WhatsAppService.formatRupiah(stats.totalTransactionsAmount)}
            </div>
            <div className="text-[10px] text-sky-500/80">
              {stats.totalTransactionsCount} Transaksi tercatat
            </div>
          </div>
        </div>

        {/* Filter and Tab Bar */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'all'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Semua Riwayat (Timeline)</span>
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px] text-zinc-300">
                  {combinedTimeline.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('bills')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'bills'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Tagihan Bulanan</span>
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px] text-zinc-300">
                  {customerBills.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'transactions'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Transaksi Bayar</span>
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px] text-zinc-300">
                  {customerTransactions.length}
                </span>
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
              >
                <option value="all">Semua Status</option>
                <option value="paid_completed">Lunas / Selesai</option>
                <option value="unpaid">Belum Bayar / Menunggu</option>
                <option value="overdue">Jatuh Tempo (Overdue)</option>
              </select>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor invoice, periode, metode bayar, atau catatan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                Hapus
              </button>
            )}
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          
          {/* TAB 1: ALL / COMBINED TIMELINE */}
          {activeTab === 'all' && (
            <div className="space-y-3">
              {filteredTimeline.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
                  <p>Tidak ada riwayat yang cocok dengan pencarian.</p>
                </div>
              ) : (
                <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                  {filteredTimeline.map(item => {
                    const isBill = item.itemType === 'bill';
                    const rawBill = isBill ? (item.raw as Bill) : null;
                    const rawTrx = !isBill ? (item.raw as Transaction) : null;

                    return (
                      <div
                        key={item.id}
                        className="relative group p-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-2.5"
                      >
                        {/* Timeline node icon */}
                        <div
                          className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center -translate-x-1/2 ${
                            item.statusColor === 'green'
                              ? 'bg-emerald-600 text-white'
                              : item.statusColor === 'red'
                              ? 'bg-red-600 text-white'
                              : item.statusColor === 'blue'
                              ? 'bg-sky-600 text-white'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          {isBill ? (
                            <Receipt className="w-3 h-3" />
                          ) : (
                            <CreditCard className="w-3 h-3" />
                          )}
                        </div>

                        {/* Top row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-xs sm:text-sm">
                                {item.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  item.statusColor === 'green'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : item.statusColor === 'red'
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : item.statusColor === 'blue'
                                    ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {item.statusLabel}
                              </span>
                              {getMethodBadge(item.method)}
                            </div>
                            <div className="text-[11px] text-zinc-400 flex items-center gap-2 font-mono">
                              <span>Ref: {item.code}</span>
                              <span>•</span>
                              <span>{item.displayDate}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-black text-white font-mono tabular-nums">
                              {WhatsAppService.formatRupiah(item.amount)}
                            </div>
                            <div className="text-[10px] text-zinc-500 capitalize">
                              {isBill ? 'Invoice Layanan' : 'Transaksi Kas/Bank'}
                            </div>
                          </div>
                        </div>

                        {/* Subtitle / Notes */}
                        <div className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 flex items-center justify-between gap-2">
                          <span className="truncate">{item.subtitle}</span>
                          <button
                            onClick={() => handleCopy(item.code)}
                            className="text-zinc-500 hover:text-zinc-300 text-[11px] flex items-center gap-1 shrink-0 font-mono"
                            title="Salin Kode Referensi"
                          >
                            {copiedText === item.code ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedText === item.code ? 'Tersalin' : 'Salin Ref'}</span>
                          </button>
                        </div>

                        {/* Actions for this item */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/60">
                          {isBill && rawBill && (
                            <>
                              {onPrintBill && (
                                <button
                                  onClick={() => onPrintBill(rawBill)}
                                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-800"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>Kuitansi</span>
                                </button>
                              )}

                              {(rawBill.status === 'unpaid' || rawBill.status === 'overdue') && (
                                <>
                                  <button
                                    onClick={() => handleSendWaConfirmation(rawBill)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1"
                                  >
                                    <Send className="w-3 h-3" />
                                    <span>Konfirmasi WA</span>
                                  </button>

                                  {onOpenDanaCheckout && (
                                    <button
                                      onClick={() => {
                                        const sess = {
                                          id: 'sess-' + Date.now(),
                                          orderId: 'DANA-TAG-' + rawBill.billNumber,
                                          amount: rawBill.amount,
                                          itemType: 'bill' as const,
                                          itemTitle: `Tagihan Internet ${rawBill.packageName} (${rawBill.period})`,
                                          itemRefId: rawBill.id,
                                          customerName: customer.name,
                                          customerPhone: customer.phone,
                                          status: 'pending' as const,
                                          paymentUrl: `https://link.dana.id/pay?order=${rawBill.billNumber}`,
                                          deepLink: `dana://pay?order=${rawBill.billNumber}`,
                                          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DANA-PAY-${rawBill.billNumber}-${rawBill.amount}`,
                                          createdAt: new Date().toLocaleString('id-ID')
                                        };
                                        onOpenDanaCheckout(sess);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                                    >
                                      Bayar DANA
                                    </button>
                                  )}

                                  {onOpenRecordPayment && (
                                    <button
                                      onClick={() => onOpenRecordPayment(rawBill)}
                                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1"
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      <span>Bayar Kasir</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}

                          {!isBill && rawTrx && (
                            <button
                              onClick={() => setSelectedItemDetail({ type: 'transaction', data: rawTrx })}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1 border border-zinc-800"
                            >
                              <Info className="w-3 h-3" />
                              <span>Lihat Detail Struk</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BILLS LIST */}
          {activeTab === 'bills' && (
            <div className="space-y-3">
              {filteredBills.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
                  <Receipt className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
                  <p>Tidak ada tagihan yang cocok.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredBills.map(b => {
                    const isPaid = b.status === 'paid';
                    const isOverdue = b.status === 'overdue';

                    return (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">
                                {b.period}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isPaid
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : isOverdue
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {isPaid ? 'Lunas' : isOverdue ? 'Jatuh Tempo' : 'Belum Bayar'}
                              </span>
                              {getMethodBadge(b.paymentMethod)}
                            </div>
                            <div className="text-xs text-zinc-400 mt-1 font-mono">
                              Invoice: <span className="text-zinc-200">{b.billNumber}</span> · {b.packageName}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-black text-white font-mono tabular-nums">
                              {WhatsAppService.formatRupiah(b.amount)}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              {isPaid ? (
                                <span className="text-emerald-400">Dibayar: {b.paidAt}</span>
                              ) : (
                                <span className="text-amber-400">Jatuh Tempo: {b.dueDate}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reference / Detail Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 font-mono">
                          <div>
                            <span className="text-zinc-500">Ref Transaksi:</span>{' '}
                            <span className="text-zinc-300">{b.transactionRef || '-'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Pengingat WhatsApp:</span>{' '}
                            <span className={b.whatsappReminderSent ? 'text-emerald-400' : 'text-zinc-400'}>
                              {b.whatsappReminderSent ? 'Terkirim' : 'Belum'}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-zinc-800/80">
                          {onPrintBill && (
                            <button
                              onClick={() => onPrintBill(b)}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cetak Kuitansi</span>
                            </button>
                          )}

                          {!isPaid && (
                            <>
                              <button
                                onClick={() => handleSendWaConfirmation(b)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Konfirmasi WA</span>
                              </button>

                              {onOpenDanaCheckout && (
                                <button
                                  onClick={() => {
                                    const sess = {
                                      id: 'sess-' + Date.now(),
                                      orderId: 'DANA-TAG-' + b.billNumber,
                                      amount: b.amount,
                                      itemType: 'bill' as const,
                                      itemTitle: `Tagihan Internet ${b.packageName} (${b.period})`,
                                      itemRefId: b.id,
                                      customerName: customer.name,
                                      customerPhone: customer.phone,
                                      status: 'pending' as const,
                                      paymentUrl: `https://link.dana.id/pay?order=${b.billNumber}`,
                                      deepLink: `dana://pay?order=${b.billNumber}`,
                                      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DANA-PAY-${b.billNumber}-${b.amount}`,
                                      createdAt: new Date().toLocaleString('id-ID')
                                    };
                                    onOpenDanaCheckout(sess);
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                                >
                                  Bayar via DANA
                                </button>
                              )}

                              {onOpenRecordPayment && (
                                <button
                                  onClick={() => onOpenRecordPayment(b)}
                                  className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Bayar Tunai / Kasir</span>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTIONS LIST */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs space-y-2">
                  <CreditCard className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
                  <p>Tidak ada riwayat transaksi pembayaran.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTransactions.map(t => {
                    const isCompleted = t.status === 'completed';

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm">
                                {t.type === 'tagihan'
                                  ? 'Pembayaran Tagihan Bulanan'
                                  : t.type === 'voucher'
                                  ? 'Voucher Internet Hotspot'
                                  : 'Biaya Pemasangan'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                  isCompleted
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : t.status === 'failed'
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-sky-950 text-sky-400 border border-sky-800'
                                }`}
                              >
                                {isCompleted ? 'Selesai' : t.status === 'failed' ? 'Gagal' : 'Menunggu'}
                              </span>
                              {getMethodBadge(t.paymentMethod)}
                            </div>
                            <div className="text-xs text-zinc-400 mt-1 font-mono">
                              No. Trx: <span className="text-zinc-200">{t.invoiceNumber}</span> · Tanggal: {t.date}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-base font-black text-emerald-400 font-mono tabular-nums">
                              +{WhatsAppService.formatRupiah(t.amount)}
                            </div>
                            <div className="text-[10px] text-zinc-500">
                              Kas Masuk (Income)
                            </div>
                          </div>
                        </div>

                        {t.notes && (
                          <div className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80">
                            <span className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold mr-1">Catatan:</span>
                            {t.notes}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-xs">
                          <span className="text-[11px] text-zinc-500 font-mono">
                            WhatsApp Notifikasi: {t.whatsappNotificationSent ? 'Terkirim' : 'Tidak'}
                          </span>
                          <button
                            onClick={() => setSelectedItemDetail({ type: 'transaction', data: t })}
                            className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs flex items-center gap-1 font-semibold"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>Detail Transaksi</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-zinc-400">
          <div>
            Menampilkan riwayat keuangan resmi untuk <span className="text-white font-semibold">{customer.name}</span> ({customer.customerCode})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* ITEM DETAIL POPUP (Receipt / Audit modal) */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-red-500" />
                Bukti Rincian Transaksi
              </h3>
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">No. Transaksi</span>
                <span className="text-white font-bold">{selectedItemDetail.data.invoiceNumber || selectedItemDetail.data.billNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Tanggal & Jam</span>
                <span className="text-white">{selectedItemDetail.data.date || selectedItemDetail.data.paidAt || selectedItemDetail.data.dueDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Pelanggan</span>
                <span className="text-white">{customer.name} ({customer.customerCode})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Metode Bayar</span>
                <span className="text-white uppercase">{selectedItemDetail.data.paymentMethod || 'Tunai'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Status</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedItemDetail.data.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Nominal</span>
                <span className="text-white font-black text-sm">
                  {WhatsAppService.formatRupiah(selectedItemDetail.data.amount)}
                </span>
              </div>
              {selectedItemDetail.data.notes && (
                <div className="py-1">
                  <span className="text-zinc-400 block mb-1">Catatan / Deskripsi:</span>
                  <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-zinc-200">
                    {selectedItemDetail.data.notes}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT STATEMENT MODAL (Rekening Koran Ringkas) */}
      {showPrintStatement && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-red-500" />
                Rekap Rekening Koran Pelanggan (Statement)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setShowPrintStatement(false)}
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Statement Sheet */}
            <div className="p-6 rounded-xl bg-white text-zinc-900 space-y-4 font-sans text-xs">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-red-600">ANUWANINET ISP</h2>
                  <p className="text-[11px] text-zinc-500">Laporan Rekening Tagihan & Pembayaran Pelanggan</p>
                  <p className="text-[10px] text-zinc-400">Dicetak pada: {new Date().toLocaleString('id-ID')}</p>
                </div>
                <div className="text-right text-[11px]">
                  <div className="font-bold">{customer.name}</div>
                  <div className="text-zinc-600">ID: {customer.customerCode}</div>
                  <div className="text-zinc-600">PPPoE: {customer.pppoeUsername}</div>
                  <div className="text-zinc-600">Paket: {customer.packageName}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 bg-zinc-100 p-3 rounded-lg text-center font-mono">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Total Tagihan</div>
                  <div className="font-bold text-zinc-900">{WhatsAppService.formatRupiah(stats.totalBilledAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Total Terbayar</div>
                  <div className="font-bold text-emerald-700">{WhatsAppService.formatRupiah(stats.paidBillsAmount)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">Tunggakan</div>
                  <div className="font-bold text-red-600">{WhatsAppService.formatRupiah(stats.unpaidBillsAmount)}</div>
                </div>
              </div>

              {/* Table of Bills */}
              <div className="space-y-1">
                <div className="font-bold text-zinc-800 text-xs uppercase">Daftar Tagihan & Transaksi:</div>
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b bg-zinc-50 text-zinc-600">
                      <th className="py-1.5 px-2">No. Ref</th>
                      <th className="py-1.5 px-2">Periode / Keterangan</th>
                      <th className="py-1.5 px-2">Tanggal</th>
                      <th className="py-1.5 px-2">Metode</th>
                      <th className="py-1.5 px-2">Status</th>
                      <th className="py-1.5 px-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedTimeline.map(item => (
                      <tr key={item.id} className="border-b border-zinc-100">
                        <td className="py-1.5 px-2 font-mono font-semibold">{item.code}</td>
                        <td className="py-1.5 px-2">{item.title}</td>
                        <td className="py-1.5 px-2">{item.displayDate}</td>
                        <td className="py-1.5 px-2 uppercase">{item.method || '-'}</td>
                        <td className="py-1.5 px-2 font-bold">
                          <span className={item.statusColor === 'green' ? 'text-emerald-700' : 'text-red-600'}>
                            {item.statusLabel}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold">
                          {WhatsAppService.formatRupiah(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-3 border-t text-[10px] text-zinc-400 text-center">
                Dokumen ini merupakan salinan resmi dari sistem penagihan AnuwaniNet ISP.
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
