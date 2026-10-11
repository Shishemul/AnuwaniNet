import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Customer, Bill } from '../types';
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
  Sparkles
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsappService';

interface CustomerPortalViewProps {
  customers: Customer[];
  bills: Bill[];
  onOpenRecordPayment: (bill: Bill) => void;
  onPrintBill: (bill: Bill) => void;
  onNavigateToWaBot: () => void;
  onOpenDanaCheckout?: (session: any) => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  customers,
  bills,
  onOpenRecordPayment,
  onPrintBill,
  onNavigateToWaBot,
  onOpenDanaCheckout
}) => {
  const { currentUser } = useAuth();

  // Find customer tied to current user, or pick demo customer (Budi Santoso)
  const currentCustomer = customers.find(c => 
    c.id === currentUser?.customerId ||
    c.phone === currentUser?.phone ||
    c.name.toLowerCase().includes(currentUser?.name.toLowerCase() || '')
  ) || customers[0];

  const customerBills = bills.filter(b => b.customerId === currentCustomer.id);
  const activeUnpaidBill = customerBills.find(b => b.status === 'unpaid' || b.status === 'overdue');

  const isIsolated = currentCustomer.status === 'isolated';

  const handleKonfirmasiBayarWa = (bill: Bill) => {
    const text = `Halo Admin AnuwaniNet, saya *${currentCustomer.name}* (${currentCustomer.customerCode}) ingin mengonfirmasi pembayaran tagihan *${bill.billNumber}* sebesar *${WhatsAppService.formatRupiah(bill.amount)}* periode *${bill.period}*. Mohon segera diproses dan dipulihkan koneksinya jika terisolir. Terima kasih.`;
    WhatsAppService.openWhatsAppUrl('081234567890', text);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 space-y-2">
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
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-emerald-950 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Semua Tagihan Anda Lunas!</h3>
              <p className="text-xs text-zinc-400">Tidak ada tunggakan pembayaran saat ini. Terima kasih!</p>
            </div>
          </div>
          <button
            onClick={onNavigateToWaBot}
            className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200"
          >
            Beli Voucher Tambahan
          </button>
        </div>
      )}

      {/* Bill History */}
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Receipt className="w-4 h-4 text-red-500" />
          Riwayat Tagihan & Pembayaran Anda
        </h3>

        <div className="space-y-2">
          {customerBills.map(b => {
            const isPaid = b.status === 'paid';
            return (
              <div
                key={b.id}
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-white">{b.period} ({b.billNumber})</div>
                  <div className="text-[11px] text-zinc-400">
                    {isPaid ? `Dibayar pada: ${b.paidAt} via ${b.paymentMethod?.toUpperCase()}` : `Batas Bayar: ${b.dueDate}`}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono font-bold text-white tabular-nums">
                    {WhatsAppService.formatRupiah(b.amount)}
                  </div>
                  <button
                    onClick={() => onPrintBill(b)}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                    title="Cetak Kuitansi"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
