import React, { useState } from 'react';
import { Bill, Customer, Transaction, PaymentMethod } from '../../types';
import { DataService } from '../../services/dataService';
import { WhatsAppService } from '../../services/whatsappService';
import { RuijieService } from '../../services/ruijieService';
import { NotificationService } from '../../services/notificationService';
import { X, CheckCircle2, Receipt, Send, ShieldCheck, DollarSign } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: Bill | null;
  customer: Customer | null;
  onPaymentSuccess: (paidBill: Bill) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  bill,
  customer,
  onPaymentSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dana');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [autoRestoreIsolir, setAutoRestoreIsolir] = useState(true);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !bill) return null;

  const isCustomerIsolated = customer?.status === 'isolated';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const paidAtString = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
    const trxRef = `${paymentMethod.toUpperCase()}-ANW-${Date.now().toString().slice(-6)}`;

    // 1. Update Bill
    const updatedBill: Bill = {
      ...bill,
      status: 'paid',
      paidAt: paidAtString,
      paymentMethod,
      transactionRef: trxRef,
      whatsappReminderSent: true
    };
    DataService.updateBill(updatedBill);

    // 2. Add Transaction to Finance Ledger
    const newTrx: Transaction = {
      id: 'trx-' + Date.now(),
      invoiceNumber: 'TRX-' + Date.now().toString().slice(-6),
      customerId: bill.customerId,
      customerName: bill.customerName,
      type: 'tagihan',
      category: 'income',
      amount: bill.amount,
      date: paidAtString,
      paymentMethod,
      status: 'completed',
      notes: notes || `Pembayaran Tagihan ${bill.period} (${bill.billNumber})`,
      whatsappNotificationSent: sendWhatsApp
    };
    DataService.addTransaction(newTrx);

    // Log to Notification Center
    NotificationService.logPaymentReceived({
      billNumber: bill.billNumber,
      customerName: bill.customerName,
      amount: bill.amount,
      paymentMethod: paymentMethod === 'cash' ? 'Tunai (Kasir)' : paymentMethod === 'transfer' ? 'Transfer Bank' : paymentMethod === 'dana' ? 'DANA E-Wallet & QRIS' : paymentMethod
    });

    // 3. Auto restore Ruijie isolation if customer is currently isolated
    if (customer && isCustomerIsolated && autoRestoreIsolir) {
      RuijieService.restoreCustomer(customer, 'Auto-pulihkan isolir setelah pembayaran tagihan ' + bill.billNumber);
    }

    // 4. Send WhatsApp Notification
    if (sendWhatsApp && customer) {
      const receiptMsg = WhatsAppService.generateReceiptMessage(updatedBill, customer.name);
      WhatsAppService.sendAutomatedNotification(customer.phone, customer.name, 'bukti_bayar', receiptMsg);
    }

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }

    setIsProcessing(false);
    onPaymentSuccess(updatedBill);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Catat Pembayaran Tagihan
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bill Summary Card */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">No. Tagihan:</span>
            <span className="font-mono font-bold text-white">{bill.billNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Pelanggan:</span>
            <span className="font-semibold text-white">{bill.customerName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Paket:</span>
            <span className="text-zinc-300">{bill.packageName}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
            <span className="text-zinc-400 font-medium">Total yang Dibayar:</span>
            <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
              {WhatsAppService.formatRupiah(bill.amount)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1">Metode Pembayaran</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            >
              <option value="dana">DANA E-Wallet & QRIS Gateway (Otomatis)</option>
              <option value="transfer">Transfer Bank (BCA / BRI / Mandiri)</option>
              <option value="qris">QRIS / E-Wallet Umum (GoPay, OVO, ShopeePay)</option>
              <option value="cash">Tunai (Bayar di Kantor / Pos)</option>
              <option value="whatsapp_bot">Pembayaran via WhatsApp Bot</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Catatan Transaksi (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Bukti transfer terlampir via WA"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-1 border-t border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sendWaReceipt"
                checked={sendWhatsApp}
                onChange={e => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-zinc-950 border-zinc-800"
              />
              <label htmlFor="sendWaReceipt" className="text-zinc-300 select-none flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kirim notifikasi otomatis kuitansi WhatsApp ke {bill.customerPhone}</span>
              </label>
            </div>

            {isCustomerIsolated && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRestore"
                  checked={autoRestoreIsolir}
                  onChange={e => setAutoRestoreIsolir(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-950 border-zinc-800"
                />
                <label htmlFor="autoRestore" className="text-emerald-300 select-none flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-buka isolir Ruijie Gateway untuk pelanggan ini</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors shadow-sm"
            >
              {isProcessing ? 'Memproses...' : 'Konfirmasi Lunas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
