import React, { useState, useEffect } from 'react';
import { DanaPaymentSession } from '../../types';
import { DanaService } from '../../services/danaService';
import { WhatsAppService } from '../../services/whatsappService';
import { X, CheckCircle, ShieldCheck, QrCode, Smartphone, ArrowRight, RefreshCw, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DanaCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: DanaPaymentSession | null;
  onPaymentCompleted: (session: DanaPaymentSession) => void;
}

export const DanaCheckoutModal: React.FC<DanaCheckoutModalProps> = ({
  isOpen,
  onClose,
  session,
  onPaymentCompleted
}) => {
  const [activeTab, setActiveTab] = useState<'balance' | 'qris'>('balance');
  const [danaPhone, setDanaPhone] = useState('0812-9876-5432');
  const [danaPin, setDanaPin] = useState('******');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    if (session) {
      setDanaPhone(session.customerPhone || '0812-9876-5432');
      setPaymentSuccess(session.status === 'success');
    }
  }, [session]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !session) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handlePayNow = () => {
    setIsProcessing(true);

    setTimeout(() => {
      const res = DanaService.settleDanaPayment(session.orderId, danaPhone);
      setIsProcessing(false);

      if (res.success && res.session) {
        setPaymentSuccess(true);
        try {
          confetti({
            particleCount: 70,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}

        setTimeout(() => {
          onPaymentCompleted(res.session!);
          onClose();
        }, 1800);
      } else {
        alert(res.message);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden font-sans">
        {/* DANA Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-sky-600 flex items-center justify-center font-black text-sm shadow-sm">
              D
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight flex items-center gap-1.5">
                <span>DANA Payment Gateway</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 font-mono">Sandbox</span>
              </div>
              <div className="text-[10px] text-sky-100">Merchant: AnuwaniNet Broadband</div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {paymentSuccess ? (
          /* Payment Success Confirmation */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pembayaran DANA Berhasil!</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Ref: <span className="font-mono text-white">{session.orderId}</span>
              </p>
              <div className="text-xl font-black text-emerald-400 font-mono mt-2 tabular-nums">
                {WhatsAppService.formatRupiah(session.amount)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
              {session.itemType === 'bill'
                ? 'Tagihan Anda telah LUNAS & koneksi internet diaktifkan normal.'
                : 'Kode Voucher Hotspot telah dikirimkan ke WhatsApp Anda!'}
            </div>
          </div>
        ) : (
          /* Checkout View */
          <div className="p-5 space-y-4 text-xs">
            {/* Amount & Timer */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <span className="text-[11px] text-zinc-400">Total Pembayaran</span>
                <div className="text-xl font-black text-white font-mono tabular-nums">
                  {WhatsAppService.formatRupiah(session.amount)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500">Batas Waktu Bayar</span>
                <div className="text-xs font-mono font-bold text-red-400">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Item details */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-400">Item Layanan:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{session.itemTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Order ID:</span>
                <span className="font-mono text-zinc-300">{session.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Pelanggan:</span>
                <span className="text-zinc-200">{session.customerName}</span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              <button
                onClick={() => setActiveTab('balance')}
                className={`py-1.5 px-3 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'balance'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Saldo DANA</span>
              </button>
              <button
                onClick={() => setActiveTab('qris')}
                className={`py-1.5 px-3 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'qris'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan DANA QRIS</span>
              </button>
            </div>

            {/* Tab 1: DANA E-Wallet direct charge */}
            {activeTab === 'balance' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-zinc-400 mb-1">Nomor Akun DANA</label>
                  <input
                    type="text"
                    value={danaPhone}
                    onChange={e => setDanaPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1 flex items-center justify-between">
                    <span>PIN DANA (Keamanan)</span>
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Enkripsi SSL 256-bit
                    </span>
                  </label>
                  <input
                    type="password"
                    value={danaPin}
                    onChange={e => setDanaPin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono tracking-widest focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-800/40 text-[11px] text-sky-200">
                  💡 Saldo DANA akan otomatis dipotong dan layanan internet/voucher aktif secara instan dalam 2 detik.
                </div>

                <button
                  onClick={handlePayNow}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 transition-colors shadow-lg shadow-sky-950 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memproses Pembayaran DANA...</span>
                    </>
                  ) : (
                    <>
                      <span>Bayar Sekarang ({WhatsAppService.formatRupiah(session.amount)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Tab 2: DANA QRIS barcode scan */}
            {activeTab === 'qris' && (
              <div className="space-y-3 pt-1 text-center">
                <div className="bg-white p-4 rounded-xl inline-block mx-auto shadow-md">
                  <img
                    src={session.qrCodeUrl}
                    alt="DANA QRIS"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                  <div className="text-[10px] text-gray-800 font-mono font-bold mt-1">
                    NMID: ID1020088921820
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 leading-tight">
                  Buka aplikasi DANA di HP Anda, pilih menu <strong>Scan / Bayar</strong>, lalu arahkan kamera ke kode QR di atas.
                </div>

                <button
                  onClick={handlePayNow}
                  disabled={isProcessing}
                  className="w-full py-2.5 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-500 transition-colors shadow-lg shadow-sky-950 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi QRIS DANA...</span>
                    </>
                  ) : (
                    <span>Simulasi Scan QR Selesai</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
