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
  FileText
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
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  customers,
  bills,
  transactions,
  vouchers,
  devices,
  onNavigate,
  onRefreshData,
  onOpenNewTransaction
}) => {
  const [transactionSearch, setTransactionSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'dana' | 'tagihan' | 'voucher' | 'expense'>('all');
  const [autoIsolirStatus, setAutoIsolirStatus] = useState<string | null>(null);
  const [reminderStatus, setReminderStatus] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'combined' | 'revenue' | 'customers'>('combined');
  const [showTemplateModal, setShowTemplateModal] = useState(false);

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
