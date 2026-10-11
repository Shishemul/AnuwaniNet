import React, { useState } from 'react';
import { DanaPaymentSession, DanaGatewayConfig, Bill, Customer } from '../types';
import { DanaService } from '../services/danaService';
import { WhatsAppService } from '../services/whatsappService';
import {
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle,
  Clock,
  Settings,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  Zap
} from 'lucide-react';

interface DanaGatewayViewProps {
  bills: Bill[];
  customers: Customer[];
  onOpenDanaCheckout: (session: DanaPaymentSession) => void;
  onRefreshData: () => void;
}

export const DanaGatewayView: React.FC<DanaGatewayViewProps> = ({
  bills,
  customers,
  onOpenDanaCheckout,
  onRefreshData
}) => {
  const [config, setConfig] = useState<DanaGatewayConfig>(() => DanaService.getConfig());
  const [sessions, setSessions] = useState<DanaPaymentSession[]>(() => DanaService.getSessions());
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // Quick payment test form
  const [testAmount, setTestAmount] = useState('5000');
  const [testItem, setTestItem] = useState('Voucher Harian 24 Jam');
  const [testCustomerPhone, setTestCustomerPhone] = useState('081299881122');

  const unpaidBills = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    DanaService.saveConfig(config);
    setSavedNotice('Pengaturan DANA Payment Gateway berhasil disimpan!');
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const handleCreateTestVoucherSession = () => {
    const session = DanaService.createPaymentSession({
      itemType: 'voucher',
      itemTitle: testItem,
      itemRefId: 'pkg-v2',
      amount: parseFloat(testAmount) || 5000,
      customerName: 'Warga Hotspot (' + testCustomerPhone + ')',
      customerPhone: testCustomerPhone
    });
    setSessions(DanaService.getSessions());
    onOpenDanaCheckout(session);
  };

  const handleCreateBillSession = (bill: Bill) => {
    const session = DanaService.createPaymentSession({
      itemType: 'bill',
      itemTitle: `Tagihan ${bill.packageName} (${bill.period})`,
      itemRefId: bill.id,
      amount: bill.amount,
      customerName: bill.customerName,
      customerPhone: bill.customerPhone
    });
    setSessions(DanaService.getSessions());
    onOpenDanaCheckout(session);
  };

  const totalDanaVolume = sessions
    .filter(s => s.status === 'success')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalSuccess = sessions.filter(s => s.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center font-black text-white text-xs">
              D
            </div>
            <span>DANA Payment Gateway</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Integrasi pembayaran tagihan internet bulanan & pembelian voucher via DANA E-Wallet, QRIS, dan WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateTestVoucherSession}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 text-white hover:bg-sky-500 transition-colors shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>+ Buat Sesi DANA Cepat</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-sky-800 text-xs text-sky-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Total Transaksi DANA Lunas
          </span>
          <div className="text-2xl font-bold text-sky-400 font-mono mt-1 tabular-nums">
            {WhatsAppService.formatRupiah(totalDanaVolume)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            {totalSuccess} Transaksi Berhasil (Auto-Settled)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Status Gateway DANA
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-base font-bold text-white uppercase font-mono">
              {config.environment} (Aktif)
            </span>
          </div>
          <div className="text-xs text-zinc-400 mt-1 font-mono text-[11px]">
            Merchant: {config.merchantId}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Integrasi WhatsApp Bot
          </span>
          <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            <span>Otomatis Terhubung</span>
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Pesan via WA langsung terhubung ke DANA Checkout
          </div>
        </div>
      </div>

      {/* 2-Column: Fast Pay Bills & DANA Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Quick Bill Payment with DANA (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  Tagihan Belum Lunas (Bayar via DANA Gateway)
                </h3>
                <p className="text-xs text-zinc-400">
                  Pilih tagihan untuk membuka popup checkout DANA dengan QRIS dan Saldo E-Wallet.
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 font-bold">
                {unpaidBills.length} Tagihan
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {unpaidBills.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-500">
                  Semua tagihan telah lunas!
                </div>
              ) : (
                unpaidBills.map(b => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{b.customerName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {b.billNumber} · {b.period} ({b.packageName})
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right font-mono font-bold text-white tabular-nums">
                        {WhatsAppService.formatRupiah(b.amount)}
                      </div>
                      <button
                        onClick={() => handleCreateBillSession(b)}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-500 transition-colors shadow-sm text-xs flex items-center gap-1.5"
                      >
                        <span>Bayar DANA</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DANA Payment Sessions History */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" />
              Riwayat Sesi Transaksi DANA Gateway
            </h3>

            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[10px]">
                    <th className="py-2 px-3">Order ID</th>
                    <th className="py-2 px-3">Pelanggan / Item</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-3 text-center">Status</th>
                    <th className="py-2 px-3">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-zinc-500 font-sans">
                        Belum ada riwayat transaksi DANA.
                      </td>
                    </tr>
                  ) : (
                    sessions.map(s => (
                      <tr key={s.id} className="hover:bg-zinc-800/30">
                        <td className="py-2 px-3 font-semibold text-white">{s.orderId}</td>
                        <td className="py-2 px-3 font-sans">
                          <div className="text-white font-medium">{s.customerName}</div>
                          <div className="text-[10px] text-zinc-400">{s.itemTitle}</div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-white tabular-nums">
                          {WhatsAppService.formatRupiah(s.amount)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {s.status === 'success' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                              Lunas
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-400 border border-amber-800">
                              Menunggu
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-zinc-400 text-[10px]">{s.paidAt || s.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: DANA Merchant Credentials Config (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-sky-400" />
              Konfigurasi DANA Merchant API
            </h3>

            <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Environment DANA</label>
                <select
                  value={config.environment}
                  onChange={e => setConfig({ ...config, environment: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="sandbox">Sandbox (Pengujian API / Simulasi)</option>
                  <option value="production">Production (Live Merchant)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">DANA Merchant ID</label>
                <input
                  type="text"
                  value={config.merchantId}
                  onChange={e => setConfig({ ...config, merchantId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">DANA Client ID</label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={e => setConfig({ ...config, clientId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-sky-500 text-[11px]"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">DANA Client Secret</label>
                <input
                  type="password"
                  value={config.clientSecret}
                  onChange={e => setConfig({ ...config, clientSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Webhook Notification Callback URL</label>
                <input
                  type="text"
                  value={config.notificationUrl}
                  onChange={e => setConfig({ ...config, notificationUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-[10px] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="autoSettleCheck"
                  checked={config.autoSettle}
                  onChange={e => setConfig({ ...config, autoSettle: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600 bg-zinc-950 border-zinc-800"
                />
                <label htmlFor="autoSettleCheck" className="text-zinc-300 select-none">
                  Auto-Settlement instan saat callback DANA diterima
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-lg bg-sky-600 text-white font-bold hover:bg-sky-500 transition-colors shadow-sm"
                >
                  Simpan Pengaturan DANA
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
