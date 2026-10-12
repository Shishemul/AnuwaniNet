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
  ChevronRight
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
    alert(res.message);
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
                {upcomingDueBills.slice(0, 6).map(({ bill, diffDays, urgency, label }) => (
                  <div
                    key={bill.id}
                    className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between text-xs hover:border-zinc-700 transition-colors"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white truncate">{bill.customerName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-semibold whitespace-nowrap ${
                            urgency === 'overdue'
                              ? 'bg-red-950 text-red-400 border border-red-900'
                              : urgency === 'today'
                              ? 'bg-amber-950 text-amber-400 border border-amber-900'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {label}
                        </span>
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
                      <button
                        onClick={() => {
                          const cust = customers.find(c => c.id === bill.customerId);
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
                ))}
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

      {/* Recharts Analytics: Monthly Revenue Trends & Customer Growth */}
      <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-red-950/80 text-red-400 border border-red-900/40">
                <BarChart3 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-white">
                Analisis Kinerja Bisnis: Tren Pendapatan & Pertumbuhan Pelanggan
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Visualisasi performa finansial 6 bulan terakhir dan penambahan pelanggan aktif secara real-time.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs self-start sm:self-auto">
            <button
              onClick={() => setChartViewMode('combined')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                chartViewMode === 'combined'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Semua Metrik
            </button>
            <button
              onClick={() => setChartViewMode('revenue')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                chartViewMode === 'revenue'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Tren Finansial
            </button>
            <button
              onClick={() => setChartViewMode('customers')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                chartViewMode === 'customers'
                  ? 'bg-red-600 text-white shadow-sm shadow-red-950'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              Pertumbuhan Pelanggan
            </button>
          </div>
        </div>

        {/* Chart View Area */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartViewMode === 'customers' ? (
              <LineChart data={monthlyPerformanceData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                  formatter={(val: any) => [`${val} Pelanggan Aktif`, 'Pelanggan']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="customers"
                  name="Jumlah Pelanggan Aktif"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#38bdf8', strokeWidth: 2, stroke: '#0284c7' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            ) : chartViewMode === 'revenue' ? (
              <AreaChart data={monthlyPerformanceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}Jt`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                  formatter={(val: any) => [WhatsAppService.formatRupiah(Number(val)), '']}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Total Pemasukan (Omset)"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  name="Laba Bersih Kas"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorNet)"
                />
              </AreaChart>
            ) : (
              <BarChart data={monthlyPerformanceData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(1)}Jt`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#38bdf8"
                  fontSize={11}
                  tickLine={false}
                  allowDecimals={false}
                  tickFormatter={(val) => `${val} cust`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: '#27272a',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    color: '#fff'
                  }}
                  formatter={(val: any, name: any) => {
                    if (name.includes('Pelanggan')) return [`${val} Pelanggan`, name];
                    return [WhatsAppService.formatRupiah(Number(val)), name];
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar yAxisId="left" dataKey="revenue" name="Pemasukan Kas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="expenses" name="Pengeluaran" fill="#64748b" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="customers"
                  name="Pertumbuhan Pelanggan"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#38bdf8' }}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Highlight Insights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/60 flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-zinc-500 uppercase">Pertumbuhan Pelanggan</span>
              <span className="text-sm font-bold text-sky-400 font-mono">+{customers.length} Warga Terpasang</span>
            </div>
            <Users className="w-5 h-5 text-sky-500/40" />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/60 flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-zinc-500 uppercase">Tren Omset Terkini</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">
                {WhatsAppService.formatRupiah(totalIncome)}
              </span>
            </div>
            <ArrowUpRight className="w-5 h-5 text-emerald-500/40" />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/60 flex items-center justify-between">
            <div>
              <span className="block text-[11px] text-zinc-500 uppercase">Margin Laba Kas</span>
              <span className="text-sm font-bold text-white font-mono">
                {totalIncome > 0 ? `${Math.round((netProfit / totalIncome) * 100)}% Bersih` : '100%'}
              </span>
            </div>
            <Wallet className="w-5 h-5 text-red-500/40" />
          </div>
        </div>
      </div>

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

        <div className="overflow-x-auto">
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
    </div>
  );
};
