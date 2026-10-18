import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Customer, Bill, Transaction } from '../types';
import {
  Wifi,
  ShieldCheck,
  ShieldAlert,
  Receipt,
  Download,
  Send,
  Phone,
  QrCode,
  CreditCard,
  CheckCircle2,
  Clock,
  Sparkles,
  Maximize2,
  Printer,
  Search,
  Filter,
  History,
  TrendingUp,
  UserCheck,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsappService';
import { CustomerHistoryModal } from '../components/modals/CustomerHistoryModal';
import { DataService } from '../services/dataService';

interface CustomerPortalViewProps {
  customers: Customer[];
  bills: Bill[];
  transactions?: Transaction[];
  onOpenRecordPayment: (bill: Bill) => void;
  onPrintBill: (bill: Bill) => void;
  onNavigateToWaBot: () => void;
  onOpenDanaCheckout?: (session: any) => void;
}

type PanelTab = 'all' | 'bills' | 'transactions';
type PanelFilter = 'all' | 'paid_completed' | 'unpaid' | 'overdue';

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  customers,
  bills,
  transactions,
  onOpenRecordPayment,
  onPrintBill,
  onNavigateToWaBot,
  onOpenDanaCheckout
}) => {
  const { currentUser } = useAuth();

  // Fallback to DataService if transactions not passed
  const allTransactions = useMemo(() => {
    return transactions || DataService.getTransactions();
  }, [transactions]);

  // Selected customer state: default to logged in customer, or first customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    const defaultCust = customers.find(c => 
      c.id === currentUser?.customerId ||
      c.phone === currentUser?.phone ||
      c.name.toLowerCase().includes(currentUser?.name.toLowerCase() || '')
    ) || customers[0];
    return defaultCust?.id || '';
  });

  const currentCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [customers, selectedCustomerId]);

  // Modal State
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);

  // In-page panel state
  const [panelTab, setPanelTab] = useState<PanelTab>('all');
  const [panelSearch, setPanelSearch] = useState<string>('');
  const [panelFilter, setPanelFilter] = useState<PanelFilter>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Customer bills & transactions
  const customerBills = useMemo(() => {
    if (!currentCustomer) return [];
    return bills.filter(b => b.customerId === currentCustomer.id);
  }, [bills, currentCustomer]);

  const customerTransactions = useMemo(() => {
    if (!currentCustomer) return [];
    return allTransactions.filter(t => 
      t.customerId === currentCustomer.id ||
      t.customerName?.toLowerCase() === currentCustomer.name.toLowerCase() ||
      (t.notes && t.notes.toLowerCase().includes(currentCustomer.name.toLowerCase()))
    );
  }, [allTransactions, currentCustomer]);

  const activeUnpaidBill = useMemo(() => {
    return customerBills.find(b => b.status === 'unpaid' || b.status === 'overdue');
  }, [customerBills]);

  const isIsolated = currentCustomer?.status === 'isolated';

  // KPI Calculations
  const stats = useMemo(() => {
    const totalBills = customerBills.length;
    const totalBilled = customerBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    const paidBills = customerBills.filter(b => b.status === 'paid');
    const paidAmount = paidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    const unpaidBills = customerBills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
    const unpaidAmount = unpaidBills.reduce((acc, b) => acc + (b.amount || 0), 0);

    const completedTrxs = customerTransactions.filter(t => t.status === 'completed');
    const trxsAmount = completedTrxs.reduce((acc, t) => acc + (t.amount || 0), 0);

    return {
      totalBills,
      totalBilled,
      paidCount: paidBills.length,
      paidAmount,
      unpaidCount: unpaidBills.length,
      unpaidAmount,
      trxsCount: customerTransactions.length,
      trxsAmount
    };
  }, [customerBills, customerTransactions]);

  // Combined timeline items for panel
  const combinedTimeline = useMemo(() => {
    const list: Array<{
      id: string;
      itemType: 'bill' | 'transaction';
      date: string;
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

    customerBills.forEach(b => {
      const isPaid = b.status === 'paid';
      const isOverdue = b.status === 'overdue';
      const sortDate = b.paidAt ? b.paidAt : b.dueDate;

      let statusColor: 'green' | 'amber' | 'red' | 'blue' = 'amber';
      let statusLabel = 'Belum Lunas';
      if (isPaid) {
        statusColor = 'green';
        statusLabel = 'Lunas';
      } else if (isOverdue) {
        statusColor = 'red';
        statusLabel = 'Jatuh Tempo';
      }

      list.push({
        id: 'bill-' + b.id,
        itemType: 'bill',
        date: sortDate,
        displayDate: isPaid ? `Dibayar: ${b.paidAt}` : `Batas Bayar: ${b.dueDate}`,
        title: `Tagihan ${b.period}`,
        subtitle: `${b.packageName} (${b.billNumber})`,
        code: b.billNumber,
        amount: b.amount,
        status: b.status,
        statusLabel,
        statusColor,
        method: b.paymentMethod,
        raw: b
      });
    });

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
        ? 'Biaya Registrasi Baru'
        : 'Transaksi';

      list.push({
        id: 'trx-' + t.id,
        itemType: 'transaction',
        date: t.date,
        displayDate: t.date,
        title: typeLabel,
        subtitle: `${t.notes || 'Pembayaran Kas/E-Wallet'} (${t.invoiceNumber})`,
        code: t.invoiceNumber,
        amount: t.amount,
        status: t.status,
        statusLabel,
        statusColor,
        method: t.paymentMethod,
        raw: t
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerBills, customerTransactions]);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    return combinedTimeline.filter(item => {
      const matchesSearch =
        !panelSearch ||
        item.title.toLowerCase().includes(panelSearch.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(panelSearch.toLowerCase()) ||
        item.code.toLowerCase().includes(panelSearch.toLowerCase()) ||
        (item.method && item.method.toLowerCase().includes(panelSearch.toLowerCase()));

      let matchesStatus = true;
      if (panelFilter === 'paid_completed') {
        matchesStatus = item.status === 'paid' || item.status === 'completed';
      } else if (panelFilter === 'unpaid') {
        matchesStatus = item.status === 'unpaid' || item.status === 'pending';
      } else if (panelFilter === 'overdue') {
        matchesStatus = item.status === 'overdue';
      }

      return matchesSearch && matchesStatus;
    });
  }, [combinedTimeline, panelSearch, panelFilter]);

  // Filtered bills
  const filteredBills = useMemo(() => {
    return customerBills.filter(b => {
      const matchesSearch =
        !panelSearch ||
        b.billNumber.toLowerCase().includes(panelSearch.toLowerCase()) ||
        b.period.toLowerCase().includes(panelSearch.toLowerCase()) ||
        b.packageName.toLowerCase().includes(panelSearch.toLowerCase());

      let matchesStatus = true;
      if (panelFilter === 'paid_completed') {
        matchesStatus = b.status === 'paid';
      } else if (panelFilter === 'unpaid') {
        matchesStatus = b.status === 'unpaid';
      } else if (panelFilter === 'overdue') {
        matchesStatus = b.status === 'overdue';
      }

      return matchesSearch && matchesStatus;
    });
  }, [customerBills, panelSearch, panelFilter]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return customerTransactions.filter(t => {
      const matchesSearch =
        !panelSearch ||
        t.invoiceNumber.toLowerCase().includes(panelSearch.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(panelSearch.toLowerCase())) ||
        t.paymentMethod.toLowerCase().includes(panelSearch.toLowerCase());

      let matchesStatus = true;
      if (panelFilter === 'paid_completed') {
        matchesStatus = t.status === 'completed';
      } else if (panelFilter === 'unpaid') {
        matchesStatus = t.status === 'pending';
      } else if (panelFilter === 'overdue') {
        matchesStatus = false;
      }

      return matchesSearch && matchesStatus;
    });
  }, [customerTransactions, panelSearch, panelFilter]);

  const handleKonfirmasiBayarWa = (bill: Bill) => {
    if (!currentCustomer) return;
    const text = `Halo Admin AnuwaniNet, saya *${currentCustomer.name}* (${currentCustomer.customerCode}) ingin mengonfirmasi pembayaran tagihan *${bill.billNumber}* sebesar *${WhatsAppService.formatRupiah(bill.amount)}* periode *${bill.period}*. Mohon segera diproses dan dipulihkan koneksinya jika terisolir. Terima kasih.`;
    WhatsAppService.openWhatsAppUrl('081234567890', text);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const renderMethodBadge = (method?: string) => {
    if (!method) return null;
    const m = method.toLowerCase();
    let style = 'bg-zinc-800 text-zinc-300 border-zinc-700';
    let label = method.toUpperCase();

    if (m === 'dana') {
      style = 'bg-sky-950/80 text-sky-400 border-sky-800';
      label = 'DANA';
    } else if (m === 'qris') {
      style = 'bg-purple-950/80 text-purple-400 border-purple-800';
      label = 'QRIS';
    } else if (m === 'transfer') {
      style = 'bg-blue-950/80 text-blue-400 border-blue-800';
      label = 'Transfer';
    } else if (m === 'cash') {
      style = 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
      label = 'Tunai';
    } else if (m === 'whatsapp_bot') {
      style = 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
      label = 'Bot WA';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${style}`}>
        {label}
      </span>
    );
  };

  if (!currentCustomer) {
    return (
      <div className="p-8 text-center text-zinc-400">
        Belum ada data pelanggan yang terdaftar.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Bar: Customer Selector (if multiple customers) & Quick Modal Trigger */}
      <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
              Akun Pelanggan Terpilih
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                className="w-full max-w-full sm:max-w-xs md:max-w-md bg-zinc-950 border border-zinc-700 text-white font-bold text-xs sm:text-sm rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer truncate"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customerCode}) - {c.packageName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Quick Launch Full Modal History */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-950 transition-all cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>Buka Modal Riwayat Lengkap</span>
            <span className="px-1.5 py-0.5 rounded-full bg-black/30 text-[10px]">
              {combinedTimeline.length}
            </span>
          </button>
        </div>
      </div>

      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              Portal Mandiri Pelanggan
            </span>
            <h1 className="text-2xl font-bold text-white">
              Halo, {currentCustomer.name}!
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              ID Pelanggan: <span className="text-white font-bold">{currentCustomer.customerCode}</span> · PPPoE: {currentCustomer.pppoeUsername}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isIsolated ? (
              <div className="px-3 py-1.5 rounded-lg bg-red-950/80 border border-red-800 text-red-400 text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Koneksi Terisolir</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Koneksi Aktif Normal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isIsolated && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-800 text-xs text-red-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-red-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>Pemberitahuan Isolir Ruijie Gateway:</span>
          </div>
          <p className="leading-relaxed">
            Layanan internet Anda sementara dialihkan karena tagihan bulan ini telah melewati jatuh tempo. Silakan lakukan pembayaran tagihan di bawah ini untuk membuka isolir secara otomatis.
          </p>
        </div>
      )}

      {/* Package & Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Paket Internet</div>
          <div className="text-lg font-bold text-white">{currentCustomer.packageName}</div>
          <div className="text-xs text-zinc-400 font-mono tabular-nums">
            {WhatsAppService.formatRupiah(currentCustomer.packagePrice)} / Bulan
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Jatuh Tempo Tagihan</div>
          <div className="text-lg font-bold text-white">Tgl {currentCustomer.billingDay} Setiap Bulan</div>
          <div className="text-xs text-zinc-400">Toleransi isolir H+2</div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Alamat Terpasang</div>
          <div className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">{currentCustomer.address}</div>
          <div className="text-[10px] text-zinc-500 font-mono">IP: {currentCustomer.ipAddress}</div>
        </div>
      </div>

      {/* Active Unpaid Bill Banner if Any */}
      {activeUnpaidBill ? (
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Tagihan Perlu Dibayar
              </span>
              <h3 className="text-base font-bold text-white mt-0.5">
                {activeUnpaidBill.period} · {activeUnpaidBill.billNumber}
              </h3>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-amber-400 font-mono tabular-nums">
                {WhatsAppService.formatRupiah(activeUnpaidBill.amount)}
              </div>
              <div className="text-[11px] text-zinc-400">Jatuh tempo: {activeUnpaidBill.dueDate}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
            <div className="font-semibold text-white">Nomor Rekening Pembayaran Resmi AnuwaniNet:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">Bank BCA:</span> 8291-039-112 (AnuwaniNet)
              </div>
              <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                <span className="text-zinc-400">Bank BRI:</span> 0021-01-082910-50-1 (AnuwaniNet)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              onClick={() => onPrintBill(activeUnpaidBill)}
              className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Tagihan</span>
            </button>

            {onOpenDanaCheckout && (
              <button
                onClick={() => {
                  const sess = {
                    id: 'sess-' + Date.now(),
                    orderId: 'DANA-TAG-' + activeUnpaidBill.billNumber,
                    amount: activeUnpaidBill.amount,
                    itemType: 'bill' as const,
                    itemTitle: `Tagihan Internet ${activeUnpaidBill.packageName} (${activeUnpaidBill.period})`,
                    itemRefId: activeUnpaidBill.id,
                    customerName: currentCustomer.name,
                    customerPhone: currentCustomer.phone,
                    status: 'pending' as const,
                    paymentUrl: `https://link.dana.id/pay?order=${activeUnpaidBill.billNumber}`,
                    deepLink: `dana://pay?order=${activeUnpaidBill.billNumber}`,
                    qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=DANA-PAY-${activeUnpaidBill.billNumber}-${activeUnpaidBill.amount}`,
                    createdAt: new Date().toLocaleString('id-ID')
                  };
                  onOpenDanaCheckout(sess);
                }}
                className="px-3.5 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-500 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-950"
              >
                <span>Bayar via DANA E-Wallet</span>
              </button>
            )}

            <button
              onClick={() => handleKonfirmasiBayarWa(activeUnpaidBill)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Konfirmasi via WhatsApp</span>
            </button>

            <button
              onClick={() => onOpenRecordPayment(activeUnpaidBill)}
              className="px-3.5 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-red-950"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Kasir / Tunai</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-950 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Semua Tagihan Anda Lunas!</h3>
              <p className="text-xs text-zinc-400">Tidak ada tunggakan pembayaran saat ini. Terima kasih!</p>
            </div>
          </div>
          <button
            onClick={onNavigateToWaBot}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 self-start sm:self-auto cursor-pointer"
          >
            Beli Voucher Tambahan
          </button>
        </div>
      )}

      {/* COMPREHENSIVE HISTORY PANEL */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-5 shadow-xl">
        
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-white">
                Riwayat Lengkap Tagihan & Transaksi Pembayaran
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Catatan lengkap riwayat invoice tagihan dan histori transaksi kasir, QRIS, & DANA untuk{' '}
              <span className="text-zinc-200 font-semibold">{currentCustomer.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-zinc-700 transition-colors"
              title="Buka tampilan modal penuh dengan filter dan pencarian"
            >
              <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Buka Modal Penuh</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1">
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Total Tagihan</span>
              <Receipt className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="text-base font-bold text-white font-mono">
              {WhatsAppService.formatRupiah(stats.totalBilled)}
            </div>
            <div className="text-[10px] text-zinc-500">
              {stats.totalBills} Invoice tercatat
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 space-y-1">
            <div className="text-[11px] text-emerald-400 flex items-center justify-between">
              <span>Lunas Terbayar</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-emerald-400 font-mono">
              {WhatsAppService.formatRupiah(stats.paidAmount)}
            </div>
            <div className="text-[10px] text-emerald-500/80">
              {stats.paidCount} Tagihan lunas
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 space-y-1">
            <div className="text-[11px] text-red-400 flex items-center justify-between">
              <span>Belum Lunas</span>
              <Clock className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-base font-bold text-red-400 font-mono">
              {WhatsAppService.formatRupiah(stats.unpaidAmount)}
            </div>
            <div className="text-[10px] text-red-500/80">
              {stats.unpaidCount > 0 ? `${stats.unpaidCount} Perlu dibayar` : 'Semua lunas'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-900/50 space-y-1">
            <div className="text-[11px] text-sky-400 flex items-center justify-between">
              <span>Transaksi Sukses</span>
              <CreditCard className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-base font-bold text-sky-400 font-mono">
              {WhatsAppService.formatRupiah(stats.trxsAmount)}
            </div>
            <div className="text-[10px] text-sky-500/80">
              {stats.trxsCount} Transaksi
            </div>
          </div>
        </div>

        {/* Panel Tab & Filter Controls */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 overflow-x-auto">
              <button
                onClick={() => setPanelTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  panelTab === 'all'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Semua Riwayat</span>
                <span className="px-1.5 py-0.2 rounded-full bg-zinc-700 text-[10px] text-zinc-300">
                  {combinedTimeline.length}
                </span>
              </button>

              <button
                onClick={() => setPanelTab('bills')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  panelTab === 'bills'
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
                onClick={() => setPanelTab('transactions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  panelTab === 'transactions'
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
                value={panelFilter}
                onChange={e => setPanelFilter(e.target.value as PanelFilter)}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-red-500"
              >
                <option value="all">Semua Status</option>
                <option value="paid_completed">Lunas / Selesai</option>
                <option value="unpaid">Belum Lunas</option>
                <option value="overdue">Jatuh Tempo</option>
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor tagihan/invoice, periode, metode bayar..."
              value={panelSearch}
              onChange={e => setPanelSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-500"
            />
            {panelSearch && (
              <button
                onClick={() => setPanelSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Panel Content List */}
        <div className="space-y-3 pt-2">
          
          {/* TAB 1: ALL / COMBINED TIMELINE */}
          {panelTab === 'all' && (
            <div className="space-y-2.5">
              {filteredTimeline.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Tidak ada riwayat tagihan atau transaksi yang sesuai.
                </div>
              ) : (
                filteredTimeline.map(item => {
                  const isBill = item.itemType === 'bill';
                  const rawBill = isBill ? (item.raw as Bill) : null;

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isBill
                              ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                              : 'bg-sky-950/80 text-sky-400 border border-sky-800/60'
                          }`}
                        >
                          {isBill ? (
                            <Receipt className="w-4 h-4" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white">
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
                            {renderMethodBadge(item.method)}
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-2 flex-wrap font-mono">
                            <span>Ref: {item.code}</span>
                            <span>•</span>
                            <span>{item.displayDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                        <div className="text-right">
                          <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                            {WhatsAppService.formatRupiah(item.amount)}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {isBill ? 'Tagihan' : 'Transaksi'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isBill && rawBill && (
                            <>
                              <button
                                onClick={() => onPrintBill(rawBill)}
                                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
                                title="Cetak Kuitansi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>

                              {(rawBill.status === 'unpaid' || rawBill.status === 'overdue') && (
                                <button
                                  onClick={() => onOpenRecordPayment(rawBill)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                                  title="Bayar Tagihan"
                                >
                                  Bayar
                                </button>
                              )}
                            </>
                          )}

                          <button
                            onClick={() => handleCopy(item.code)}
                            className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
                            title="Salin Kode Referensi"
                          >
                            {copiedCode === item.code ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: BILLS LIST */}
          {panelTab === 'bills' && (
            <div className="space-y-2.5">
              {filteredBills.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Tidak ada data tagihan yang sesuai.
                </div>
              ) : (
                filteredBills.map(b => {
                  const isPaid = b.status === 'paid';
                  const isOverdue = b.status === 'overdue';

                  return (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">
                            {b.period} ({b.billNumber})
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
                          {renderMethodBadge(b.paymentMethod)}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                          {isPaid ? (
                            <span className="text-emerald-400">Dibayar pada: {b.paidAt}</span>
                          ) : (
                            <span className="text-amber-400">Batas Bayar: {b.dueDate}</span>
                          )}
                          {b.transactionRef && <span> · Ref: {b.transactionRef}</span>}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                        <div className="text-right font-mono font-bold text-white tabular-nums text-sm">
                          {WhatsAppService.formatRupiah(b.amount)}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onPrintBill(b)}
                            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                            title="Cetak Kuitansi"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {!isPaid && (
                            <button
                              onClick={() => onOpenRecordPayment(b)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                            >
                              Bayar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: TRANSACTIONS LIST */}
          {panelTab === 'transactions' && (
            <div className="space-y-2.5">
              {filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Tidak ada riwayat transaksi pembayaran.
                </div>
              ) : (
                filteredTransactions.map(t => {
                  const isCompleted = t.status === 'completed';

                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white">
                            {t.type === 'tagihan'
                              ? 'Pembayaran Tagihan Bulanan'
                              : t.type === 'voucher'
                              ? 'Voucher Hotspot'
                              : 'Biaya Pasang'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-red-950 text-red-400 border border-red-800'
                            }`}
                          >
                            {isCompleted ? 'Selesai' : t.status}
                          </span>
                          {renderMethodBadge(t.paymentMethod)}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                          {t.date} · {t.invoiceNumber} {t.notes ? `· ${t.notes}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                        <div className="text-right font-mono font-bold text-emerald-400 tabular-nums text-sm">
                          +{WhatsAppService.formatRupiah(t.amount)}
                        </div>
                        <button
                          onClick={() => handleCopy(t.invoiceNumber)}
                          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                          title="Salin No. Transaksi"
                        >
                          {copiedCode === t.invoiceNumber ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

      </div>

      {/* FULL CUSTOMER HISTORY MODAL */}
      <CustomerHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        customer={currentCustomer}
        bills={bills}
        transactions={allTransactions}
        onOpenRecordPayment={onOpenRecordPayment}
        onPrintBill={onPrintBill}
        onOpenDanaCheckout={onOpenDanaCheckout}
      />
    </div>
  );
};
