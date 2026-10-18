import React, { useState } from 'react';
import { Customer, Transaction } from '../../types';
import { DataService } from '../../services/dataService';
import { WhatsAppService } from '../../services/whatsappService';
import { X, Receipt, Plus } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onTransactionAdded: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  customers,
  onTransactionAdded
}) => {
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    type: 'tagihan' as 'tagihan' | 'voucher' | 'pemasangan' | 'pengeluaran_operasional',
    category: 'income' as 'income' | 'expense',
    amount: '',
    paymentMethod: 'cash' as 'cash' | 'transfer' | 'qris' | 'whatsapp_bot',
    notes: '',
    sendWa: true
  });

  if (!isOpen) return null;

  const handleCustomerSelect = (custId: string) => {
    if (!custId) {
      setFormData(prev => ({ ...prev, customerId: '', customerName: '' }));
      return;
    }
    const cust = customers.find(c => c.id === custId);
    if (cust) {
      setFormData(prev => ({
        ...prev,
        customerId: cust.id,
        customerName: cust.name,
        amount: cust.packagePrice.toString()
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Masukkan nominal transaksi yang valid.');
      return;
    }

    const isExpense = formData.type === 'pengeluaran_operasional';
    const category = isExpense ? 'expense' : 'income';

    const newTrx: Transaction = {
      id: 'trx-' + Date.now(),
      invoiceNumber: `TRX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: formData.customerId || undefined,
      customerName: formData.customerName || (isExpense ? 'Pengeluaran Operasional' : 'Pelanggan Umum'),
      type: formData.type,
      category,
      amount: amountNum,
      date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      paymentMethod: formData.paymentMethod,
      status: 'completed',
      notes: formData.notes || `Transaksi ${formData.type}`,
      whatsappNotificationSent: formData.sendWa && !isExpense
    };

    DataService.addTransaction(newTrx);

    // Send WhatsApp if customer selected and income
    if (formData.sendWa && formData.customerId && !isExpense) {
      const cust = customers.find(c => c.id === formData.customerId);
      if (cust) {
        const msg = `Halo Bpk/Ibu *${cust.name}*,\n\nTerima kasih! Transaksi sebesar *${WhatsAppService.formatRupiah(amountNum)}* (${formData.type}) telah *DITERIMA* dan dibukukan ke sistem AnuwaniNet.\nRef: *${newTrx.invoiceNumber}*.`;
        WhatsAppService.sendAutomatedNotification(cust.phone, cust.name, 'bukti_bayar', msg);
      }
    }

    onTransactionAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-4 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">
              Catat Transaksi Keuangan
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1">Jenis Transaksi</label>
            <select
              value={formData.type}
              onChange={e => {
                const val = e.target.value as any;
                setFormData(prev => ({
                  ...prev,
                  type: val,
                  category: val === 'pengeluaran_operasional' ? 'expense' : 'income'
                }));
              }}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            >
              <option value="tagihan">Pemasukan: Pembayaran Tagihan Internet</option>
              <option value="voucher">Pemasukan: Penjualan Voucher Hotspot</option>
              <option value="pemasangan">Pemasukan: Biaya Pasang Baru / Registrasi</option>
              <option value="pengeluaran_operasional">Pengeluaran: Biaya Operasional / Bandwidth NOC</option>
            </select>
          </div>

          {formData.type !== 'pengeluaran_operasional' ? (
            <div>
              <label className="block text-zinc-400 mb-1">Pilih Pelanggan (Opsional)</label>
              <select
                value={formData.customerId}
                onChange={e => handleCustomerSelect(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              >
                <option value="">-- Pelanggan Umum / Non-terdaftar --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.customerCode} - {c.name} ({c.packageName})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-zinc-400 mb-1">Nama Vendor / Keperluan</label>
              <input
                type="text"
                placeholder="Contoh: Upstream FiberStar / Token Listrik"
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>
          )}

          <div>
            <label className="block text-zinc-400 mb-1">Nominal (Rupiah)</label>
            <input
              type="number"
              placeholder="Contoh: 165000"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
              required
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Metode Pembayaran</label>
            <select
              value={formData.paymentMethod}
              onChange={e => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            >
              <option value="dana">DANA E-Wallet & QRIS Gateway</option>
              <option value="cash">Tunai (Cash)</option>
              <option value="transfer">Transfer Bank (BCA/BRI)</option>
              <option value="qris">QRIS / E-Wallet</option>
              <option value="whatsapp_bot">WhatsApp Bot</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Catatan</label>
            <input
              type="text"
              placeholder="Keterangan tambahan..."
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors shadow-sm shadow-red-950"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
