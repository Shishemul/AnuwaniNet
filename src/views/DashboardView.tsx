import React, { useState, useMemo } from 'react';
import { Customer, Bill, Transaction, Voucher, RuijieDevice } from '../types';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  ShieldAlert,
  Server,
  Zap,
  Send,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  QrCode,
  Clock,
  CreditCard,
  Search,
  Filter,
  Activity,
  Database,
  TrendingUp,
  Sparkles,
  UserPlus,
  BarChart3,
  BellRing,
  FileText,
  Calendar,
  Layers,
  ChevronRight,
  AlertOctagon,
  Flame,
  Copy,
  Check,
  Eye,
  X
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { RuijieService } from '../services/ruijieService';
import { WhatsAppService } from '../services/whatsappService';
import { DanaService } from '../services/danaService';
import { WhatsAppTemplateModal } from '../components/modals/WhatsAppTemplateModal';
import { MonthlyRevenueSummaryChart } from '../components/dashboard/MonthlyRevenueSummaryChart';

interface DashboardViewProps {
  customers: Customer[];
  bills: Bill[];
  transactions: Transaction[];
  vouchers: Voucher[];
  devices: RuijieDevice[];
  onNavigate: (tab: string) => void;
  onRefreshData: () => void;
  onOpenNewTransaction: () => void;
  onOpenDanaGateway?: () => void;
  onOpenAddCustomer?: () => void;
  onOpenRecordPayment?: (bill?: Bill) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  bills,
  transactions,
  vouchers,
  devices,
  onNavigate,
  onRefreshData,
  onOpenNewTransaction,
  onOpenDanaGateway,
  onOpenAddCustomer,
  onOpenRecordPayment
}) => {
  const [transactionSearch, setTransactionSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'dana' | 'tagihan' | 'voucher' | 'expense'>('all');
  const [autoIsolirStatus, setAutoIsolirStatus] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'combined' | 'revenue' | 'customers'>('combined');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDueBillsList, setShowDueBillsList] = useState(true);
  const [showOverduePanel, setShowOverduePanel] = useState(true);
  const [previewUrgentItem, setPreviewUrgentItem] = useState<{ bill: Bill; customer: Customer; daysOverdue: number } | null>(null);
  const [copiedUrgentMsg, setCopiedUrgentMsg] = useState(false);
  const [urgentActionStatus, setUrgentActionStatus] = useState<string | null>(null);

  // Automated Overdue Detection & Analysis (Notification System)
  const overdueCustomersData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills
      .filter(b => {
        if (b.status === 'overdue') return true;
        if (b.status === 'unpaid' && b.dueDate) {
          const dueDate = new Date(b.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime();
        }
        return false;
      })
      .map(bill => {
        const customer = customers.find(c => c.id === bill.customerId) || {
          id: bill.customerId,
          customerCode: 'ANW-PEL',
          name: bill.customerName,
          phone: bill.customerPhone,
          packageName: bill.packageName,
          packagePrice: bill.amount,
          status: 'isolated' as const,
          address: 'Alamat Pelanggan',
          ipAddress: '192.168.10.x',
          macAddress: '-',
          billingDay: 20,
          autoIsolirEnabled: true,
          joinDate: '-',
          ruijieDeviceId: 'dev-1',
          pppoeUsername: '',
          pppoePassword: '',
          packageId: bill.packageId
        };

        let daysOverdue = 1;
        if (bill.dueDate) {
          const dueDate = new Date(bill.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          const diffTime = today.getTime() - dueDate.getTime();
          daysOverdue = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        }

        return {
          bill,
          customer,
          daysOverdue
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }, [bills, customers]);

  const totalOverdueAmount = useMemo(() => {
    return overdueCustomersData.reduce((sum, item) => sum + item.bill.amount, 0);
  }, [overdueCustomersData]);

  // 1. Tagihan Jatuh Tempo dalam 3 Hari ke Depan (Notification System)
  const upcomingDueBills = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bills
      .filter(b => (b.status === 'unpaid' || b.status === 'overdue') && b.dueDate)
      .map(b => {
        const dueDate = new Date(b.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgency: 'overdue' | 'today' | 'tomorrow' | 'soon';
        let label: string;

        if (diffDays < 0) {
          urgency = 'overdue';
          label = `Terlambat ${Math.abs(diffDays)} hari`;
        } else if (diffDays === 0) {
          urgency = 'today';
          label = 'Jatuh Tempo Hari Ini';
        } else if (diffDays === 1) {
          urgency = 'tomorrow';
          label = 'Jatuh Tempo Besok';
        } else {
          urgency = 'soon';
          label = `${diffDays} hari lagi (${b.dueDate})`;
        }

        return {
          bill: b,
          diffDays,
          urgency,
          label
        };
      })
      .filter(item => item.diffDays <= 3)
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [bills]);

  const upcomingDueTotalAmount = useMemo(() => {
    return upcomingDueBills.reduce((sum, item) => sum + item.bill.amount, 0);
  }, [upcomingDueBills]);

  // Chart Data: Monthly Revenue Trends & Customer Growth
  const monthlyPerformanceData = useMemo(() => {
    // 6-month historical & ongoing trend
    const months = [
      { key: '2026-05', month: 'Mei 2026', revenue: 1450000, expenses: 420000, customers: 3 },
      { key: '2026-06', month: 'Jun 2026', revenue: 1980000, expenses: 510000, customers: 4 },
      { key: '2026-07', month: 'Jul 2026', revenue: 2350000, expenses: 580000, customers: 4 },
      { key: '2026-08', month: 'Agu 2026', revenue: 2890000, expenses: 620000, customers: 5 },
      { key: '2026-09', month: 'Sep 2026', revenue: 3450000, expenses: 710000, customers: 5 },
      { key: '2026-10', month: 'Okt 2026', revenue: 0, expenses: 0, customers: customers.length }
    ];

    // Calculate current October revenue from real transactions
    const octIncome = transactions
      .filter(t => t.category === 'income' && t.status === 'completed')
      .reduce((s, t) => s + t.amount, 0);

    const octExpense = transactions
      .filter(t => t.category === 'expense' && t.status === 'completed')
      .reduce((s, t) => s + t.amount, 0);

    months[5].revenue = octIncome > 0 ? octIncome : 3920000;
    months[5].expenses = octExpense > 0 ? octExpense : 780000;
    months[5].customers = customers.length > 0 ? customers.length : 5;

    return months.map(m => ({
      ...m,
      netProfit: m.revenue - m.expenses
    }));
  }, [transactions, customers.length]);

  // Financial calculations
  const totalIncome = transactions
    .filter(t => t.category === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.category === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

  const unpaidBills = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
  const unpaidTotal = unpaidBills.reduce((sum, b) => sum + b.amount, 0);

  const activeCustomers = customers.filter(c => c.status === 'active');
  const isolatedCustomers = customers.filter(c => c.status === 'isolated');
  const pendingCustomers = customers.filter(c => c.status === 'pending');

  const vouchersSold = vouchers.filter(v => v.status === 'used');
  const vouchersSoldRevenue = vouchersSold.reduce((sum, v) => sum + v.price, 0);

  // DANA Gateway transactions
  const danaTransactions = transactions.filter(t => t.paymentMethod === 'dana');
  const totalDanaVolume = danaTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Categories breakdown
  const billRevenue = transactions
    .filter(t => t.type === 'tagihan' && t.category === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const voucherRevenue = transactions
    .filter(t => t.type === 'voucher' && t.category === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  // 2. Revenue Bulan Ini
  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const incomeThisMonth = transactions
      .filter(t => {
        if (t.category !== 'income' || t.status !== 'completed') return false;
        const d = new Date(t.date);
        return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const actualIncome = incomeThisMonth > 0 ? incomeThisMonth : (monthlyPerformanceData[5]?.revenue || 3920000);
    const prevMonthIncome = monthlyPerformanceData[4]?.revenue || 3450000;
    const growthPercent = prevMonthIncome > 0
      ? Math.round(((actualIncome - prevMonthIncome) / prevMonthIncome) * 100)
      : 14;

    return {
      current: actualIncome,
      previous: prevMonthIncome,
      growthPercent: growthPercent !== 0 ? growthPercent : 14,
      target: 5000000,
      targetProgress: Math.min(100, Math.round((actualIncome / 5000000) * 100))
    };
  }, [transactions, monthlyPerformanceData]);

  // 3. Pertumbuhan Pelanggan
  const customerGrowthStats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(c => c.status === 'active').length;
    const isolated = customers.filter(c => c.status === 'isolated').length;
    const pending = customers.filter(c => c.status === 'pending').length;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const newThisMonth = customers.filter(c => c.joinDate && c.joinDate.startsWith(currentYearMonth)).length || 1;

    const activeRate = total > 0 ? Math.round((active / total) * 100) : 100;
    const growthRate = total > 0 ? Math.round((newThisMonth / Math.max(1, total - newThisMonth)) * 100) : 15;

    return {
      total,
      active,
      isolated,
      pending,
      newThisMonth,
      activeRate,
      growthRate: growthRate > 0 ? growthRate : 15
    };
  }, [customers]);

  const handleRunAutoIsolir = () => {
    const res = RuijieService.runAutoIsolir();
    setAutoIsolirStatus(res.message);
    onRefreshData();
    setTimeout(() => setAutoIsolirStatus(null), 6000);
    alert(res.message);
  };

  const handleSendAllReminders = () => {
    const res = WhatsAppService.runAutoReminderPelanggan();
    setReminderStatus(res.message);
    onRefreshData();
    setTimeout(() => setReminderStatus(null), 6000);
  };

  const handleSendSingleUrgent = (bill: Bill, customer: Customer, daysOverdue: number) => {
    WhatsAppService.sendUrgentPaymentMessage(bill, customer, daysOverdue);
    setUrgentActionStatus(`⚡ Pesan 'Urgent Payment' WhatsApp berhasil dikirim ke ${customer.name} (${customer.phone}) untuk tagihan ${bill.billNumber}!`);
    onRefreshData();
    setTimeout(() => setUrgentActionStatus(null), 8000);
  };

  const handleSendAllUrgent = () => {
    if (overdueCustomersData.length === 0) return;
    const res = WhatsAppService.runBulkUrgentPaymentReminders(overdueCustomersData);
    setUrgentActionStatus(res.message);
    onRefreshData();
    setTimeout(() => setUrgentActionStatus(null), 8000);
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      t.invoiceNumber.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      t.customerName.toLowerCase().includes(transactionSearch.toLowerCase()) ||
      (t.notes && t.notes.toLowerCase().includes(transactionSearch.toLowerCase()));

    if (!matchesSearch) return false;

    if (methodFilter === 'dana') return t.paymentMethod === 'dana';
    if (methodFilter === 'tagihan') return t.type === 'tagihan';
    if (methodFilter === 'voucher') return t.type === 'voucher';
    if (methodFilter === 'expense') return t.category === 'expense';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Dashboard Transaksi Anuwani<span className="text-red-500">Net</span>
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-red-950 text-red-400 border border-red-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Live Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
            Laporan keuangan bulanan, monitoring tagihan, DANA payments gateway, dan sinkronisasi Ruijie.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('dana_gateway')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-950 border border-sky-800 text-sky-300 hover:bg-sky-900 transition-colors shadow-sm"
          >
            <CreditCard className="w-4 h-4 text-sky-400" />
            <span>DANA Gateway</span>
          </button>

          <button
            onClick={handleRunAutoIsolir}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-red-900/60 text-red-400 hover:bg-red-950/60 transition-colors shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 text-red-500" />
            <span>Auto-Isolir Ruijie</span>
          </button>

          {/* Auto Reminder Pelanggan with WhatsApp Bot */}
          <button
            onClick={handleSendAllReminders}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-950 border border-emerald-850 text-emerald-300 hover:bg-emerald-900 transition-colors shadow-sm"
            title="Kirim auto-reminder tagihan ke seluruh nomor WhatsApp pelanggan tertunggak via Bot WA / Fonnte"
          >
            <BellRing className="w-4 h-4 text-emerald-400" />
            <span>Auto-Reminder WA Bot</span>
          </button>

          {/* Template Pesan WA Button */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors shadow-sm"
            title="Kelola & gunakan template pesan WhatsApp kustom dengan placeholder dinamis"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Template WA</span>
          </button>

          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Catat Transaksi</span>
          </button>
        </div>
      </div>

      {autoIsolirStatus && (
        <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/80 text-xs text-red-200 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{autoIsolirStatus}</span>
        </div>
      )}

      {reminderStatus && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{reminderStatus}</span>
        </div>
      )}

      {urgentActionStatus && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-red-950 via-rose-950/80 to-zinc-900 border border-red-600/70 text-xs text-red-100 flex items-center justify-between gap-3 shadow-lg shadow-red-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-red-600/30 text-red-400 border border-red-500/50">
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300 animate-bounce" />
            </div>
            <span className="font-semibold">{urgentActionStatus}</span>
          </div>
          <button
            onClick={() => setUrgentActionStatus(null)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick Actions Panel */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Quick Actions / Tindakan Cepat
            </h2>
          </div>
          <span className="text-[11px] text-zinc-500 hidden sm:inline">Akses instan tugas rutin ISP dalam 1 klik</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Add Customer */}
          <button
            onClick={() => onOpenAddCustomer ? onOpenAddCustomer() : onNavigate('pelanggan')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all hover:border-red-900/60 group shadow-sm"
          >
            <div className="p-2 rounded-lg bg-red-950/60 text-red-400 group-hover:scale-105 transition-transform">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                Tambah Pelanggan
              </div>
              <div className="text-[10px] text-zinc-400">Registrasi akun baru</div>
            </div>
          </button>

          {/* Record Payment */}
          <button
            onClick={() => onOpenRecordPayment ? onOpenRecordPayment() : onNavigate('tagihan')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all hover:border-emerald-900/60 group shadow-sm"
          >
            <div className="p-2 rounded-lg bg-emerald-950/60 text-emerald-400 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                Catat Pembayaran
              </div>
              <div className="text-[10px] text-zinc-400">Pelunasan tagihan</div>
            </div>
          </button>

          {/* Send WhatsApp Blast */}
          <button
            onClick={handleSendAllReminders}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all hover:border-emerald-800 group shadow-sm"
            title="Kirim pengingat WhatsApp otomatis ke semua pelanggan menunggak / jatuh tempo via Bot WA"
          >
            <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 group-hover:scale-105 transition-transform">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Send WhatsApp Blast
              </div>
              <div className="text-[10px] text-zinc-400">Peringatan tagihan</div>
            </div>
          </button>

          {/* Bulk Billing Generation */}
          <button
            onClick={() => onNavigate('tagihan')}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all hover:border-amber-900/60 group shadow-sm"
          >
            <div className="p-2 rounded-lg bg-amber-950/60 text-amber-400 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                Generate Tagihan
              </div>
              <div className="text-[10px] text-zinc-400">Preview massal</div>
            </div>
          </button>

          {/* Add Expense / Trx */}
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800/80 text-left transition-all hover:border-sky-900/60 group shadow-sm col-span-2 sm:col-span-1"
          >
            <div className="p-2 rounded-lg bg-sky-950/60 text-sky-400 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                Catat Transaksi
              </div>
              <div className="text-[10px] text-zinc-400">Kas masuk / keluar</div>
            </div>
          </button>
        </div>
      </div>

      {/* NOTIFIKASI OTOMATIS: Pelanggan Menunggak (Overdue) dengan Warning Badge & Quick-Action 'Urgent Payment' WA */}
      {overdueCustomersData.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-red-950/90 via-zinc-900 to-zinc-950 border-2 border-red-600/70 space-y-4 shadow-xl shadow-red-950/50 relative overflow-hidden">
          {/* Ambient warning background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

          {/* Alert Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-3 rounded-xl bg-red-600/20 text-red-400 border border-red-500/50 shadow-inner shadow-red-950 shrink-0">
                <AlertOctagon className="w-6 h-6 animate-pulse text-red-500" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm flex items-center gap-1 animate-pulse">
                    <Flame className="w-3 h-3 fill-white" />
                    NOTIFIKASI OTOMATIS OVERDUE
                  </span>
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                    {overdueCustomersData.length} Pelanggan Melewati Jatuh Tempo
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                    Total Tunggakan: {WhatsAppService.formatRupiah(totalOverdueAmount)}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 max-w-3xl">
                  Sistem otomatis mendeteksi tagihan pelanggan yang telah melewati batas tanggal pembayaran. Pelanggan berikut berisiko tinggi pemutusan koneksi (Auto-Isolir Ruijie Gateway). Gunakan tombol quick-action di bawah untuk mengirimkan pesan peringatan 'Urgent Payment' WhatsApp.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons in Alert Header */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto shrink-0">
              <button
                onClick={handleSendAllUrgent}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-950/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
                title="Kirim pesan peringatan keras 'Urgent Payment' WhatsApp ke semua nomor pelanggan overdue sekaligus"
              >
                <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                <span>Kirim 'Urgent Payment' WA ke Semua ({overdueCustomersData.length})</span>
              </button>

              <button
                onClick={handleRunAutoIsolir}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 border border-red-900/80 text-red-400 hover:bg-red-950/60 text-xs font-semibold transition-colors"
                title="Jalankan sinkronisasi auto-isolir Ruijie Gateway"
              >
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>Isolir Ruijie</span>
              </button>

              <button
                onClick={() => setShowOverduePanel(!showOverduePanel)}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-medium transition-colors"
              >
                {showOverduePanel ? 'Sembunyikan' : `Buka Rincian (${overdueCustomersData.length})`}
              </button>
            </div>
          </div>

          {/* Overdue Customer Cards List */}
          {showOverduePanel && (
            <div className="pt-3 border-t border-red-900/40 relative z-10 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {overdueCustomersData.map(({ bill, customer, daysOverdue }) => {
                  const isIsolated = customer.status === 'isolated';

                  return (
                    <div
                      key={bill.id}
                      className="p-4 rounded-xl bg-zinc-950/85 border border-red-700/60 hover:border-red-500 transition-all space-y-3 shadow-md group relative"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Warning Badge */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/30 text-red-300 border border-red-500/80 animate-pulse shadow-sm">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            OVERDUE • TERLAMBAT {daysOverdue} HARI
                          </span>
                          {isIsolated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-900">
                              <ShieldAlert className="w-3 h-3" />
                              TERISOLIR RUIJIE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-900">
                              RISIKO ISOLIR
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-mono text-zinc-400 font-semibold">
                          {customer.customerCode}
                        </span>
                      </div>

                      {/* Customer & Bill Core Details */}
                      <div>
                        <div className="flex items-baseline justify-between gap-2">
                          <h4 className="text-sm font-bold text-white truncate group-hover:text-red-400 transition-colors">
                            {customer.name}
                          </h4>
                          <span className="text-sm font-black font-mono text-red-400 tabular-nums">
                            {WhatsAppService.formatRupiah(bill.amount)}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{customer.packageName}</span>
                          <span>•</span>
                          <span className="text-zinc-500">Invoice: {bill.billNumber}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-1 flex items-center justify-between">
                          <span>Batas Tempo: <strong className="text-zinc-300">{bill.dueDate}</strong></span>
                          <span className="font-mono text-zinc-500">{customer.phone}</span>
                        </div>
                      </div>

                      {/* Quick-Action Buttons */}
                      <div className="pt-2 border-t border-zinc-900 flex items-center gap-2">
                        {/* Primary Quick-Action Button: Send Urgent Payment WhatsApp */}
                        <button
                          onClick={() => handleSendSingleUrgent(bill, customer, daysOverdue)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-red-950/60 transition-all hover:scale-[1.02] active:scale-[0.98]"
                          title="Buka WhatsApp & kirim pesan peringatan Urgent Payment resmi"
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                          <span>Kirim 'Urgent Payment' WA</span>
                        </button>

                        {/* Preview draft */}
                        <button
                          onClick={() => setPreviewUrgentItem({ bill, customer, daysOverdue })}
                          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                          title="Preview draft pesan & salin teks"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Pay Now Button */}
                        {onOpenRecordPayment && (
                          <button
                            onClick={() => onOpenRecordPayment(bill)}
                            className="px-2.5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                            title="Catat pelunasan tagihan ini"
                          >
                            Bayar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {overdueCustomersData.length > 3 && (
                <div className="text-right pt-1">
                  <button
                    onClick={() => onNavigate('tagihan')}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1"
                  >
                    <span>Kelola seluruh tagihan overdue di menu Tagihan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notifikasi Otomatis: Tagihan Jatuh Tempo dalam 3 Hari ke Depan */}
      {upcomingDueBills.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">
                    Peringatan: {upcomingDueBills.length} Tagihan Jatuh Tempo dalam 3 Hari ke Depan
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    Total: {WhatsAppService.formatRupiah(upcomingDueTotalAmount)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Pelanggan berikut mendekati tanggal batas akhir pembayaran atau telah melewati tempo. Kirim pesan pengingat WA agar layanan tidak terisolir otomatis oleh Ruijie.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleSendAllReminders}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold shadow-sm"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Blast WA ke Semua ({upcomingDueBills.length})</span>
              </button>

              <button
                onClick={() => setShowDueBillsList(!showDueBillsList)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-medium"
              >
                {showDueBillsList ? 'Sembunyikan' : 'Buka Rincian'}
              </button>
            </div>
          </div>

          {showDueBillsList && (
            <div className="pt-2 border-t border-zinc-800/80">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {upcomingDueBills.slice(0, 6).map(({ bill, diffDays, urgency, label }) => {
                  const isOverdue = urgency === 'overdue';
                  const cust = customers.find(c => c.id === bill.customerId);

                  return (
                    <div
                      key={bill.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isOverdue
                          ? 'bg-red-950/20 border-red-700/60 hover:border-red-500'
                          : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white truncate">{bill.customerName}</span>
                          {isOverdue ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-600/30 text-red-300 border border-red-500/80 animate-pulse flex items-center gap-1">
                              <AlertOctagon className="w-2.5 h-2.5 text-red-400" />
                              OVERDUE • {label}
                            </span>
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${
                                urgency === 'today'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-900'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {label}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                          <span>{bill.packageName}</span>
                          <span>•</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {WhatsAppService.formatRupiah(bill.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isOverdue && cust ? (
                          <button
                            onClick={() => handleSendSingleUrgent(bill, cust, Math.abs(diffDays))}
                            title="Kirim Pesan 'Urgent Payment' WhatsApp"
                            className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white shadow-md shadow-red-950 transition-all hover:scale-105"
                          >
                            <Zap className="w-3 h-3 text-yellow-300 fill-yellow-300" />
                            <span>Urgent WA</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (cust) {
                                const msg = WhatsAppService.generateBillingMessage(bill, cust);
                                WhatsAppService.openWhatsAppUrl(cust.phone, msg);
                              }
                            }}
                            title="Kirim Pengingat WhatsApp"
                            className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-900/60 hover:bg-emerald-900 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onOpenRecordPayment && (
                          <button
                            onClick={() => onOpenRecordPayment(bill)}
                            title="Bayar Sekarang"
                            className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
                          >
                            Bayar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {upcomingDueBills.length > 6 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => onNavigate('tagihan')}
                    className="text-xs text-amber-400 hover:underline font-medium inline-flex items-center gap-1"
                  >
                    <span>Lihat seluruh {upcomingDueBills.length} tagihan jatuh tempo di menu Tagihan</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Komponen Ringkasan Cepat: Revenue Bulan Ini & Pertumbuhan Pelanggan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Card A: Revenue Bulan Ini */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-900/60">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Revenue Bulan Ini</h3>
                <span className="text-[11px] text-zinc-400">Omset & Pertumbuhan Finansial (Oktober 2026)</span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">
              <ArrowUpRight className="w-3.5 h-3.5" />
              +{currentMonthRevenue.growthPercent}% vs Bln Lalu
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-1">
            <div className="text-3xl font-black text-white font-mono tabular-nums tracking-tight">
              {WhatsAppService.formatRupiah(currentMonthRevenue.current)}
            </div>
            <div className="text-xs text-zinc-400 font-mono">
              Bulan Lalu: {WhatsAppService.formatRupiah(currentMonthRevenue.previous)}
            </div>
          </div>

          {/* Target Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Target Bulanan: {WhatsAppService.formatRupiah(currentMonthRevenue.target)}</span>
              <span className="font-mono text-emerald-400 font-bold">{currentMonthRevenue.targetProgress}% Tercapai</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentMonthRevenue.targetProgress}%` }}
              />
            </div>
          </div>

          {/* Revenue Breakdown Ribbon */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-zinc-500">Tagihan Bulanan</div>
              <div className="font-bold text-white font-mono mt-0.5">{WhatsAppService.formatRupiah(billRevenue)}</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-zinc-500">Voucher Hotspot</div>
              <div className="font-bold text-white font-mono mt-0.5">{WhatsAppService.formatRupiah(voucherRevenue)}</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-zinc-500">DANA Gateway</div>
              <div className="font-bold text-sky-400 font-mono mt-0.5">{WhatsAppService.formatRupiah(totalDanaVolume)}</div>
            </div>
          </div>
        </div>

        {/* Card B: Pertumbuhan Pelanggan */}
        <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-950 text-blue-400 border border-blue-900/60">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Pertumbuhan Pelanggan</h3>
                <span className="text-[11px] text-zinc-400">Total Basis Langganan & Kesehatan Jaringan</span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-400 border border-blue-900 font-mono">
              <UserPlus className="w-3.5 h-3.5" />
              +{customerGrowthStats.growthRate}% Pertumbuhan
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pt-1">
            <div className="text-3xl font-black text-white font-mono tabular-nums tracking-tight">
              {customerGrowthStats.total}{' '}
              <span className="text-sm font-normal text-zinc-400 font-sans">Pelanggan Terdaftar</span>
            </div>
            <div className="text-xs text-blue-400 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>+{customerGrowthStats.newThisMonth} Pelanggan Baru Bulan Ini</span>
            </div>
          </div>

          {/* Network Health Ratio Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Kesehatan Jaringan: {customerGrowthStats.activeRate}% Aktif Normal</span>
              <span className="font-mono text-zinc-300 font-semibold">{customerGrowthStats.active} Aktif / {customerGrowthStats.isolated} Isolir</span>
            </div>
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800 flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${customerGrowthStats.activeRate}%` }}
              />
              <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${100 - customerGrowthStats.activeRate}%` }}
              />
            </div>
          </div>

          {/* Status Breakdown Ribbon */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800 text-[11px]">
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-emerald-400 font-semibold">Aktif Normal</div>
              <div className="font-bold text-white font-mono mt-0.5">{customerGrowthStats.active} Akun</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-red-400 font-semibold">Terisolir Ruijie</div>
              <div className="font-bold text-white font-mono mt-0.5">{customerGrowthStats.isolated} Akun</div>
            </div>
            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
              <div className="text-amber-400 font-semibold">Pending Aktivasi</div>
              <div className="font-bold text-white font-mono mt-0.5">{customerGrowthStats.pending} Akun</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pemasukan Total */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Pemasukan Kas</span>
            <div className="p-1.5 rounded-md bg-emerald-950 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {WhatsAppService.formatRupiah(totalIncome)}
          </div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
            <span>Tagihan: {WhatsAppService.formatRupiah(billRevenue)}</span>
            <span className="text-emerald-400 font-semibold font-mono text-[11px]">Real-Time</span>
          </div>
        </div>

        {/* DANA Gateway Volume */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">DANA Payments Volume</span>
            <div className="p-1.5 rounded-md bg-sky-950 text-sky-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-400 font-mono tabular-nums">
            {WhatsAppService.formatRupiah(totalDanaVolume)}
          </div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
            <span>{danaTransactions.length} Transaksi DANA</span>
            <button
              onClick={() => onNavigate('dana_gateway')}
              className="text-sky-400 hover:underline text-[11px] font-medium"
            >
              Lihat Detail →
            </button>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Laba Bersih Kas</span>
            <div className="p-1.5 rounded-md bg-red-950 text-red-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold font-mono tabular-nums ${netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
            {WhatsAppService.formatRupiah(netProfit)}
          </div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
            <span>Pengeluaran:</span>
            <span className="font-mono text-rose-400 font-semibold tabular-nums">
              {WhatsAppService.formatRupiah(totalExpense)}
            </span>
          </div>
        </div>

        {/* Piutang / Tagihan Tertunggak */}
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Piutang Tagihan Warga</span>
            <div className="p-1.5 rounded-md bg-amber-950 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
            {WhatsAppService.formatRupiah(unpaidTotal)}
          </div>
          <div className="text-xs text-zinc-400 mt-2 flex items-center justify-between">
            <span>{unpaidBills.length} Belum Bayar</span>
            <button
              onClick={() => onNavigate('tagihan')}
              className="text-red-400 hover:text-red-300 font-medium hover:underline text-[11px]"
            >
              Kelola Tagihan →
            </button>
          </div>
        </div>
      </div>

      {/* Recharts Analytics: Monthly Revenue Summary (Incoming Payments vs Bills Issued over the last 6 months) */}
      <MonthlyRevenueSummaryChart
        bills={bills}
        transactions={transactions}
        customers={customers}
        onNavigate={onNavigate}
        onOpenRecordPayment={onOpenRecordPayment}
      />

      {/* Visual Monthly Financial Presentation (Bars & Ratio) */}
      <div className="p-5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-500" />
              Komposisi Pendapatan & Kas Masuk Bulanan
            </h3>
            <p className="text-xs text-zinc-400">
              Perbandingan pendapatan dari Tagihan Paket Bulanan, Penjualan Voucher Hotspot via DANA, dan Margin Kas.
            </p>
          </div>
          <div className="text-xs font-mono text-zinc-400">
            Total Perputaran: <span className="text-white font-bold">{WhatsAppService.formatRupiah(totalIncome)}</span>
          </div>
        </div>

        {/* Visual Progress Stacked Bar */}
        <div className="space-y-2">
          <div className="w-full h-4 rounded-full bg-zinc-950 overflow-hidden flex border border-zinc-800">
            <div
              style={{ width: `${totalIncome > 0 ? (billRevenue / totalIncome) * 100 : 70}%` }}
              className="bg-red-600 transition-all duration-500"
              title="Tagihan Bulanan"
            />
            <div
              style={{ width: `${totalIncome > 0 ? (voucherRevenue / totalIncome) * 100 : 20}%` }}
              className="bg-sky-500 transition-all duration-500"
              title="Voucher Hotspot"
            />
            <div
              style={{ width: `${totalIncome > 0 ? (totalDanaVolume / (totalIncome * 2)) * 100 : 10}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title="DANA Gateway"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-red-600" />
              <span>Tagihan ISP: <strong className="text-white font-mono tabular-nums">{WhatsAppService.formatRupiah(billRevenue)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-sky-500" />
              <span>Voucher Hotspot via DANA: <strong className="text-white font-mono tabular-nums">{WhatsAppService.formatRupiah(voucherRevenue)}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span>Volume DANA QRIS: <strong className="text-white font-mono tabular-nums">{WhatsAppService.formatRupiah(totalDanaVolume)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Pelanggan & Ruijie Hardware */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Pelanggan */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              Status Pelanggan ({customers.length} Total)
            </h3>
            <button
              onClick={() => onNavigate('pelanggan')}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Kelola
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-zinc-300">Aktif Normal</span>
              </div>
              <span className="text-xs font-mono font-bold text-white tabular-nums">
                {activeCustomers.length} Pelanggan
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-red-900/40">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-red-300 font-medium">Terisolir Ruijie</span>
              </div>
              <span className="text-xs font-mono font-bold text-red-400 tabular-nums">
                {isolatedCustomers.length} Pelanggan
              </span>
            </div>

            {overdueCustomersData.length > 0 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-red-950/40 border border-red-600/70 shadow-sm animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs text-red-200 font-bold flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                    Menunggak (Overdue)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-black text-red-300 tabular-nums">
                    {overdueCustomersData.length} Tagihan
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white">
                    PERINGATAN
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-zinc-300">Menunggu Aktivasi</span>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-300 tabular-nums">
                {pendingCustomers.length} Pelanggan
              </span>
            </div>
          </div>
        </div>

        {/* Ruijie Reyee Hardware Status */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-red-500" />
              Perangkat Ruijie Reyee
            </h3>
            <button
              onClick={() => onNavigate('ruijie')}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Setting API
            </button>
          </div>

          <div className="space-y-2.5">
            {devices.map(dev => (
              <div key={dev.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate max-w-[190px]">
                    {dev.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono">
                    Online
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <span>IP: {dev.ip}</span>
                  <span className="text-zinc-300 font-semibold">{dev.connectedUsers} Klien</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp & DANA Voucher Summary */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-red-500" />
              Voucher & Bot WhatsApp
            </h3>
            <button
              onClick={() => onNavigate('voucher_wa')}
              className="text-xs text-red-400 hover:text-red-300 font-medium"
            >
              Buka Bot Simulator
            </button>
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 space-y-2 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Voucher Terjual via Bot:</span>
              <span className="font-mono text-white font-bold tabular-nums">
                {vouchersSold.length} Voucher
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Stok Voucher Siap Pakai:</span>
              <span className="font-mono text-emerald-400 font-bold tabular-nums">
                {vouchers.filter(v => v.status === 'available').length} Voucher
              </span>
            </div>
            <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
              💳 Integrasi DANA E-Wallet & QRIS aktif: Pembeli voucher langsung menerima kode setelah pembayaran DANA terverifikasi.
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Customer Transaction History */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Histori Transaksi Pelanggan Real-Time
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Feed
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Semua mutasi pembayaran tagihan, pembelian voucher, dan transaksi DANA secara langsung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi..."
                value={transactionSearch}
                onChange={e => setTransactionSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs">
              <button
                onClick={() => setMethodFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  methodFilter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setMethodFilter('dana')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  methodFilter === 'dana' ? 'bg-sky-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                DANA
              </button>
              <button
                onClick={() => setMethodFilter('tagihan')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  methodFilter === 'tagihan' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Tagihan
              </button>
              <button
                onClick={() => setMethodFilter('voucher')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  methodFilter === 'voucher' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Voucher
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View: Touch-Friendly Transaction Cards (< md) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <div className="py-6 text-center text-zinc-500 font-sans text-xs">
              Tidak ada transaksi yang cocok dengan filter.
            </div>
          ) : (
            filteredTransactions.slice(0, 10).map(t => {
              const isIncome = t.category === 'income';
              const isDana = t.paymentMethod === 'dana';

              return (
                <div
                  key={'trx-mob-' + t.id}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-white">{t.invoiceNumber}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{t.date}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white text-xs">{t.customerName}</div>
                      <div className="text-[10px] text-zinc-400 capitalize">{t.type.replace('_', ' ')}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold text-sm tabular-nums ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIncome ? '+' : '-'}{WhatsAppService.formatRupiah(t.amount)}
                      </div>
                      <div className="text-[10px]">
                        {isDana ? (
                          <span className="text-sky-400 font-semibold font-mono">DANA E-Wallet</span>
                        ) : (
                          <span className="text-zinc-400 uppercase font-mono">{t.paymentMethod}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-[10px]">
                    <span className="text-emerald-400 font-medium">Selesai (Kasir)</span>
                    {t.whatsappNotificationSent ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-sans">
                        <CheckCircle2 className="w-3 h-3" /> Notifikasi WA Terkirim
                      </span>
                    ) : (
                      <span className="text-zinc-500">Tanpa Notifikasi WA</span>
                    )}
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
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Invoice</th>
                <th className="py-2.5 px-3">Tanggal</th>
                <th className="py-2.5 px-3">Pelanggan / Keterangan</th>
                <th className="py-2.5 px-3">Tipe</th>
                <th className="py-2.5 px-3">Metode Bayar</th>
                <th className="py-2.5 px-3 text-right">Nominal</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Notifikasi WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-zinc-500 font-sans">
                    Tidak ada transaksi yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 10).map(t => {
                  const isIncome = t.category === 'income';
                  const isDana = t.paymentMethod === 'dana';
                  return (
                    <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {t.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400">
                        {t.date}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-white font-medium">
                        {t.customerName}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-zinc-300 capitalize">
                        {t.type.replace('_', ' ')}
                      </td>
                      <td className="py-2.5 px-3">
                        {isDana ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-400 border border-sky-800">
                            DANA E-Wallet
                          </span>
                        ) : (
                          <span className="text-zinc-300 uppercase">
                            {t.paymentMethod}
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isIncome ? '+' : '-'}{WhatsAppService.formatRupiah(t.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[11px] font-medium text-emerald-400 font-sans">
                          Selesai
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {t.whatsappNotificationSent ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-sans">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terkirim
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500">-</span>
                        )}
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
        customer={customers[0] || null}
        bill={bills[0] || null}
        onSelectAndSend={(renderedMsg) => {
          if (customers[0]) {
            WhatsAppService.openWhatsAppUrl(customers[0].phone, renderedMsg);
          }
        }}
        onTemplatesUpdated={onRefreshData}
      />

      {/* Modal Preview & Quick-Dispatch Urgent Payment WhatsApp */}
      {previewUrgentItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-zinc-950 border border-red-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-red-900/50 bg-gradient-to-r from-red-950/80 via-zinc-900 to-zinc-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/40">
                  <AlertOctagon className="w-5 h-5 text-red-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    Draft Pesan 'Urgent Payment' WhatsApp
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Kirim ke {previewUrgentItem.customer.name} ({previewUrgentItem.customer.phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setPreviewUrgentItem(null);
                  setCopiedUrgentMsg(false);
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* Target Customer & Bill Summary Pill */}
              <div className="p-3 rounded-xl bg-zinc-900/90 border border-red-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-zinc-400">Pelanggan:</span>{' '}
                  <strong className="text-white">{previewUrgentItem.customer.name}</strong> ({previewUrgentItem.customer.customerCode})
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-600/30 text-red-300 border border-red-500/60">
                    OVERDUE {previewUrgentItem.daysOverdue} HARI
                  </span>
                  <span className="font-mono font-bold text-red-400">
                    {WhatsAppService.formatRupiah(previewUrgentItem.bill.amount)}
                  </span>
                </div>
              </div>

              {/* Message Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Pratinjau Pesan yang Akan Dikirim:</span>
                  <span className="text-[11px] text-emerald-400 font-mono">Format Resmi WhatsApp ISP</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-200 whitespace-pre-wrap select-all leading-relaxed max-h-72 overflow-y-auto">
                  {WhatsAppService.generateUrgentPaymentMessage(
                    previewUrgentItem.bill,
                    previewUrgentItem.customer,
                    previewUrgentItem.daysOverdue
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={() => {
                  const text = WhatsAppService.generateUrgentPaymentMessage(
                    previewUrgentItem.bill,
                    previewUrgentItem.customer,
                    previewUrgentItem.daysOverdue
                  );
                  navigator.clipboard.writeText(text);
                  setCopiedUrgentMsg(true);
                  setTimeout(() => setCopiedUrgentMsg(false), 3000);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-colors"
              >
                {copiedUrgentMsg ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin ke Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setPreviewUrgentItem(null);
                    setCopiedUrgentMsg(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Tutup
                </button>

                <button
                  onClick={() => {
                    handleSendSingleUrgent(
                      previewUrgentItem.bill,
                      previewUrgentItem.customer,
                      previewUrgentItem.daysOverdue
                    );
                    setPreviewUrgentItem(null);
                    setCopiedUrgentMsg(false);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-950 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Kirim WhatsApp Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
