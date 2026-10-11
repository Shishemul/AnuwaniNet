import React, { useState } from 'react';
import { Voucher, WhatsAppMessageLog, InternetPackage, DanaPaymentSession } from '../types';
import {
  Smartphone,
  QrCode,
  Send,
  Plus,
  RefreshCw,
  MessageSquare,
  CheckCircle,
  Copy,
  Printer,
  Sparkles,
  User,
  Bot,
  CreditCard
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsappService';
import { DataService } from '../services/dataService';
import { RuijieService } from '../services/ruijieService';
import { DanaService } from '../services/danaService';

interface VoucherWhatsAppViewProps {
  vouchers: Voucher[];
  packages: InternetPackage[];
  waLogs: WhatsAppMessageLog[];
  onRefreshData: () => void;
  onOpenDanaCheckout?: (session: DanaPaymentSession) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

export const VoucherWhatsAppView: React.FC<VoucherWhatsAppViewProps> = ({
  vouchers,
  packages,
  waLogs,
  onRefreshData,
  onOpenDanaCheckout
}) => {
  // Simulator State
  const [userPhone, setUserPhone] = useState('081299881122');
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'bot',
      text: '👋 *Halo! Selamat Datang di WhatsApp Bot AnuwaniNet.*\nLayanan otomatis pembelian voucher Wi-Fi & cek tagihan.\n\nKetik *MENU* atau klik tombol di bawah untuk mulai memesan voucher tanpa aplikasi.',
      time: '19:45'
    }
  ]);

  // Batch voucher generation state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [genPackageId, setGenPackageId] = useState('pkg-v2');
  const [genCount, setGenCount] = useState(10);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const voucherPackages = packages.filter(p => p.type === 'voucher');

  const handleSendChatMessage = (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text) return;

    const timeNow = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // User message
    const userMsg: ChatMessage = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text,
      time: timeNow
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setChatInput('');

    // Process Bot reply
    setTimeout(() => {
      const result = WhatsAppService.processBotMessage(userPhone, text);
      const botMsg: ChatMessage = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: result.replyText,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, botMsg]);

      // If voucher was bought or payment recorded, refresh app state
      if (result.actionTaken) {
        onRefreshData();
      }
    }, 500);
  };

  const handleBatchGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPkg = packages.find(p => p.id === genPackageId) || packages[3];
    const newVouchers: Voucher[] = [];

    const prefix = targetPkg.price >= 20000 ? '25K' : targetPkg.price >= 5000 ? '5K' : '3K';

    for (let i = 0; i < genCount; i++) {
      const code = `ANW-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
      const password = `${Math.floor(100 + Math.random() * 900)}`;
      newVouchers.push({
        id: 'vch-' + Date.now() + '-' + i,
        code,
        password,
        packageId: targetPkg.id,
        packageName: targetPkg.name,
        durationHours: targetPkg.id === 'pkg-v1' ? 3 : targetPkg.id === 'pkg-v2' ? 24 : 168,
        price: targetPkg.price,
        status: 'available',
        generatedAt: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        ruijieSynced: true
      });
    }

    DataService.addVouchers(newVouchers);
    RuijieService.syncVouchersWithRuijie();
    onRefreshData();
    setShowGenerateModal(false);
    setActionNotice(`Berhasil generate ${genCount} voucher ${targetPkg.name} dan disinkronkan ke Ruijie Reyee!`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const copyVoucherCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setActionNotice(`Kode ${code} disalin ke clipboard!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-red-500" />
            Voucher Hotspot & WhatsApp Bot Simulator
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Transaksi pembelian voucher warga via pesan WhatsApp tanpa install aplikasi & integrasi Ruijie Reyee.
          </p>
        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Generate Batch Voucher</span>
        </button>
      </div>

      {actionNotice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-800/80 text-xs text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Main Grid: WA Simulator & Voucher Pool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: WhatsApp Bot Simulator (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>AnuwaniNet Bot WA</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 font-mono">Fonnte API</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">Layanan Otomatis 24 Jam via Fonnte Gateway</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono">
                <span>No HP:</span>
                <input
                  type="text"
                  value={userPhone}
                  onChange={e => setUserPhone(e.target.value)}
                  className="w-24 px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-white text-[10px]"
                />
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="my-3 h-80 overflow-y-auto space-y-2.5 p-2 rounded-lg bg-zinc-950 border border-zinc-900 text-xs font-sans">
              {messages.map(m => {
                const isBot = m.sender === 'bot';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isBot ? 'items-start' : 'items-end'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-2.5 whitespace-pre-line leading-relaxed ${
                        isBot
                          ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/60'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-zinc-500 mt-0.5 px-1 font-mono">
                      {m.time}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap gap-1.5 pb-2">
              <button
                onClick={() => handleSendChatMessage('MENU')}
                className="px-2 py-1 rounded-md bg-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-700"
              >
                MENU
              </button>
              <button
                onClick={() => handleSendChatMessage('BELI 5K')}
                className="px-2 py-1 rounded-md bg-red-950 border border-red-800 text-[11px] text-red-300 font-semibold hover:bg-red-900"
              >
                BELI 5K (24 Jam)
              </button>
              {onOpenDanaCheckout && (
                <button
                  onClick={() => {
                    const sess = DanaService.createPaymentSession({
                      itemType: 'voucher',
                      itemTitle: 'Voucher Harian 24 Jam',
                      itemRefId: 'pkg-v2',
                      amount: 5000,
                      customerName: 'Pembeli WA (' + userPhone + ')',
                      customerPhone: userPhone
                    });
                    onOpenDanaCheckout(sess);
                  }}
                  className="px-2 py-1 rounded-md bg-sky-950 border border-sky-800 text-[11px] text-sky-300 font-semibold hover:bg-sky-900 flex items-center gap-1"
                >
                  <CreditCard className="w-3 h-3 text-sky-400" />
                  <span>Bayar DANA (5K)</span>
                </button>
              )}
              <button
                onClick={() => handleSendChatMessage('BELI 3K')}
                className="px-2 py-1 rounded-md bg-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-700"
              >
                BELI 3K (3 Jam)
              </button>
              <button
                onClick={() => handleSendChatMessage('BELI 25K')}
                className="px-2 py-1 rounded-md bg-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-700"
              >
                BELI 25K (7 Hari)
              </button>
              <button
                onClick={() => handleSendChatMessage('TAGIHAN')}
                className="px-2 py-1 rounded-md bg-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-700"
              >
                TAGIHAN
              </button>
              <button
                onClick={() => handleSendChatMessage('STATUS')}
                className="px-2 py-1 rounded-md bg-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-700"
              >
                STATUS
              </button>
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800">
              <input
                type="text"
                placeholder="Ketik pesan seperti di WhatsApp..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
              />
              <button
                onClick={() => handleSendChatMessage()}
                className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Voucher Inventory Table & Sync (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-red-500" />
                  Stok & Daftar Voucher Hotspot ({vouchers.length} Total)
                </h3>
                <p className="text-xs text-zinc-400">
                  Semua voucher terintegrasi otomatis dengan Captive Portal Ruijie Reyee.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                {vouchers.filter(v => v.status === 'available').length} Tersedia
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Kode Voucher</th>
                    <th className="py-2.5 px-3">Password</th>
                    <th className="py-2.5 px-3">Paket</th>
                    <th className="py-2.5 px-3 text-right">Harga</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3">Pembeli / Waktu</th>
                    <th className="py-2.5 px-3 text-right">Salin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                  {vouchers.map(v => {
                    const isAvailable = v.status === 'available';
                    return (
                      <tr key={v.id} className="hover:bg-zinc-800/30">
                        <td className="py-2.5 px-3 font-bold text-white">
                          {v.code}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          {v.password || v.code}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-200">
                          {v.packageName} ({v.durationHours} Jam)
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white tabular-nums">
                          {WhatsAppService.formatRupiah(v.price)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isAvailable ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              Tersedia
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                              Terpakai
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-[11px] text-zinc-400">
                          {v.buyerName ? (
                            <div>
                              <div className="text-zinc-200 font-medium">{v.buyerName}</div>
                              <div className="text-[10px] text-zinc-500">{v.usedAt}</div>
                            </div>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => copyVoucherCode(v.code)}
                            title="Salin Kode Voucher"
                            className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Outbound WhatsApp Notification Logs */}
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Log Notifikasi WhatsApp Terkirim
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 text-xs">
              {waLogs.slice(0, 5).map(log => (
                <div key={log.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] space-y-1">
                  <div className="flex items-center justify-between text-zinc-400 font-mono">
                    <span className="text-emerald-400 font-semibold">{log.recipientName} ({log.phone})</span>
                    <span className="text-[10px] text-zinc-500">{log.timestamp}</span>
                  </div>
                  <p className="text-zinc-300 font-sans text-xs truncate">{log.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-red-500" />
                Generate Batch Voucher Ruijie
              </h3>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchGenerate} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Pilih Paket Hotspot</label>
                <select
                  value={genPackageId}
                  onChange={e => setGenPackageId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  {voucherPackages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {WhatsAppService.formatRupiah(p.price)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Jumlah Voucher yang Dibuat</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={genCount}
                  onChange={e => setGenCount(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed">
                Voucher yang dibuat akan otomatis memiliki username & password unik, dan disinkronkan langsung ke akun portal Ruijie Reyee Gateway.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500"
                >
                  Generate & Sync Ruijie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
