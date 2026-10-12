import React, { useState } from 'react';
import { Bill, Customer, Transaction, DanaPaymentSession } from '../types';
import {
  Receipt,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  Printer,
  Plus,
  ArrowUpDown,
  Calendar,
  DollarSign,
  CreditCard,
  BellRing,
  FileText,
  Download
} from 'lucide-react';
import { WhatsAppService } from '../services/whatsappService';
import { DataService } from '../services/dataService';
import { DanaService } from '../services/danaService';
import { ReportService } from '../services/reportService';
import { WhatsAppTemplateModal } from '../components/modals/WhatsAppTemplateModal';
import { BulkGenerateBillsModal } from '../components/modals/BulkGenerateBillsModal';

interface TagihanViewProps {
  bills: Bill[];
  customers: Customer[];
  onRefreshData: () => void;
  onOpenRecordPayment: (bill: Bill) => void;
  onPrintBill: (bill: Bill) => void;
  onOpenDanaCheckout?: (session: DanaPaymentSession) => void;
}

export const TagihanView: React.FC<TagihanViewProps> = ({
  bills,
  customers,
  onRefreshData,
  onOpenRecordPayment,
  onPrintBill,
  onOpenDanaCheckout
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'overdue' | 'paid'>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  // Modal States
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedBillForTemplate, setSelectedBillForTemplate] = useState<Bill | null>(null);
  const [selectedCustomerForTemplate, setSelectedCustomerForTemplate] = useState<Customer | null>(null);

  // Periods list
  const uniquePeriods = Array.from(new Set(bills.map(b => b.period)));

  const filteredBills = bills.filter(b => {
    const matchSearch =
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.customerPhone.includes(search) ||
      b.packageName.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchPeriod = periodFilter === 'all' || b.period === periodFilter;

    return matchSearch && matchStatus && matchPeriod;
  });

  const unpaidCount = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue').length;
  const unpaidTotal = bills
    .filter(b => b.status === 'unpaid' || b.status === 'overdue')
    .reduce((sum, b) => sum + b.amount, 0);

  const paidTotal = bills
    .filter(b => b.status === 'paid')
    .reduce((sum, b) => sum + b.amount, 0);

  // Send WhatsApp Reminder
  const handleSendWaReminder = (bill: Bill) => {
    const cust = customers.find(c => c.id === bill.customerId);
    if (!cust) return;

    const message = WhatsAppService.generateBillingMessage(bill, cust);
    WhatsAppService.openWhatsAppUrl(bill.customerPhone, message);

    // Update reminder sent flag
    bill.whatsappReminderSent = true;
    DataService.updateBill(bill);
    onRefreshData();
  };

  // Generate monthly bills for all active customers
  const handleGenerateMonthlyBills = () => {
    const currentMonthYear = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());
    
    // Check which customers don't have a bill for this period yet
    let generatedCount = 0;
    const existingBills = DataService.getBills();

    customers.forEach(cust => {
      if (cust.status === 'active' || cust.status === 'isolated') {
        const hasBill = existingBills.some(b => b.customerId === cust.id && b.period === currentMonthYear);
        if (!hasBill) {
          const newBill: Bill = {
            id: 'bill-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            billNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(existingBills.length + generatedCount + 1).padStart(3, '0')}`,
            customerId: cust.id,
            customerName: cust.name,
            customerPhone: cust.phone,
            packageId: cust.packageId,
            packageName: cust.packageName,
            amount: cust.packagePrice,
            period: currentMonthYear,
            dueDate: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(cust.billingDay).padStart(2, '0')}`,
            status: 'unpaid',
            whatsappReminderSent: true
          };
          existingBills.push(newBill);
          generatedCount++;

          // Automated WhatsApp notification on bill generation
          const autoMsg = WhatsAppService.generateBillingMessage(newBill, cust);
          WhatsAppService.sendAutomatedNotification(cust.phone, cust.name, 'tagihan', autoMsg);
        }
      }
    });

    if (generatedCount > 0) {
      DataService.saveBills(existingBills);
      onRefreshData();
      setNotificationStatus(`Berhasil membuat ${generatedCount} tagihan baru untuk ${currentMonthYear} & notifikasi WhatsApp otomatis telah dikirim ke nomor pelanggan!`);
      setTimeout(() => setNotificationStatus(null), 5000);
    } else {
      alert(`Semua pelanggan aktif sudah memiliki tagihan untuk periode ${currentMonthYear}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-red-500" />
              Pemantauan Tagihan Bulanan
            </h1>
            {DataService.getAppSettings().autoGenerateBillsEnabled ? (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800"
                title="Auto-Generate Bills aktif di Pengaturan: tagihan dibuat otomatis setiap awal bulan"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Generate: AKTIF
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700"
                title="Auto-Generate Bills dinonaktifkan di Pengaturan: generate massal manual"
              >
                Auto-Generate: Manual
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400">
            Pencatatan pembayaran, kuitansi WhatsApp otomatis, dan status jatuh tempo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Kelola Template Pesan WhatsApp */}
          <button
            onClick={() => {
              setSelectedBillForTemplate(bills[0] || null);
              const cust = customers.find(c => c.id === bills[0]?.customerId) || customers[0] || null;
              setSelectedCustomerForTemplate(cust);
              setShowTemplateModal(true);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 transition-colors shadow-sm"
            title="Kelola, simpan, dan pilih template pesan WhatsApp dengan placeholder dinamis"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Template Pesan WA</span>
          </button>

          <button
            onClick={() => {
              const res = WhatsAppService.runAutoReminderPelanggan();
              setNotificationStatus(res.message);
              onRefreshData();
              setTimeout(() => setNotificationStatus(null), 6000);
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 transition-colors shadow-sm"
            title="Kirim pesan peringatan jatuh tempo otomatis ke nomor WhatsApp pelanggan tertunggak"
          >
            <BellRing className="w-4 h-4 text-emerald-400" />
            <span>Auto-Reminder Bot WA</span>
          </button>

          {/* Export PDF Tagihan */}
          <button
            onClick={() => {
              ReportService.exportBillsToPdf(
                filteredBills,
                periodFilter === 'all' ? 'Semua Periode' : periodFilter,
                `Laporan_Tagihan_${periodFilter === 'all' ? 'Semua' : periodFilter}.pdf`
              );
              setNotificationStatus(`Berhasil mengekspor ${filteredBills.length} data tagihan ke format PDF siap cetak!`);
              setTimeout(() => setNotificationStatus(null), 4000);
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-950 border border-rose-850 text-rose-300 hover:bg-rose-900 transition-colors shadow-sm"
            title="Ekspor seluruh tagihan yang terfilter saat ini ke format PDF profesional siap cetak"
          >
            <Download className="w-4 h-4 text-rose-400" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950"
            title="Generate tagihan bulanan massal dengan opsi pratinjau dan konfirmasi"
          >
            <Plus className="w-4 h-4" />
            <span>+ Generate Tagihan Massal</span>
          </button>
        </div>
      </div>

      {notificationStatus && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-800/80 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notificationStatus}</span>
        </div>
      )}

      {/* Mini Stat Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Total Tagihan Lunas</div>
            <div className="text-lg font-bold text-emerald-400 font-mono tabular-nums">{WhatsAppService.formatRupiah(paidTotal)}</div>
          </div>
          <CheckCircle className="w-6 h-6 text-emerald-500/40" />
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Tertunggak / Belum Bayar</div>
            <div className="text-lg font-bold text-amber-400 font-mono tabular-nums">{WhatsAppService.formatRupiah(unpaidTotal)}</div>
          </div>
          <AlertTriangle className="w-6 h-6 text-amber-500/40" />
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Jumlah Lembar Tagihan</div>
            <div className="text-lg font-bold text-white font-mono tabular-nums">{bills.length} Lembar ({unpaidCount} Belum Lunas)</div>
          </div>
          <Receipt className="w-6 h-6 text-red-500/40" />
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari No Invoice (INV-...), nama pelanggan, no HP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <select
            value={periodFilter}
            onChange={e => setPeriodFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-red-600"
          >
            <option value="all">Semua Periode</option>
            {uniquePeriods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* Status filter */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                statusFilter === 'unpaid' ? 'bg-zinc-800 text-amber-400 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Belum Bayar
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                statusFilter === 'overdue' ? 'bg-zinc-800 text-red-400 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tertunggak
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
                statusFilter === 'paid' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lunas
            </button>
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">No. Tagihan</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Periode & Jatuh Tempo</th>
                <th className="py-3 px-4 text-right">Nominal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Metode & Bayar</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Tidak ada tagihan yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredBills.map(bill => {
                  const isPaid = bill.status === 'paid';
                  const isOverdue = bill.status === 'overdue';

                  return (
                    <tr key={bill.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* Invoice No */}
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {bill.billNumber}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{bill.customerName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono">{bill.customerPhone}</div>
                        <div className="text-[10px] text-zinc-500">{bill.packageName}</div>
                      </td>

                      {/* Period & Due Date */}
                      <td className="py-3 px-4">
                        <div className="text-zinc-200 font-medium">{bill.period}</div>
                        <div className={`font-mono text-[11px] ${isOverdue ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                          Due: {bill.dueDate}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-white tabular-nums">
                        {WhatsAppService.formatRupiah(bill.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60">
                            <CheckCircle className="w-3 h-3" />
                            Lunas
                          </span>
                        )}
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-red-400 bg-red-950/80 border border-red-800">
                            <AlertTriangle className="w-3 h-3" />
                            Tertunggak
                          </span>
                        )}
                        {!isPaid && !isOverdue && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-900/60">
                            <Clock className="w-3 h-3" />
                            Menunggu Bayar
                          </span>
                        )}
                      </td>

                      {/* Payment detail */}
                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {isPaid ? (
                          <>
                            <div className="font-semibold text-zinc-200 uppercase">{bill.paymentMethod}</div>
                            <div className="text-zinc-500">{bill.paidAt}</div>
                          </>
                        ) : (
                          <span className="text-zinc-600">-</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Choose Template & Send WhatsApp */}
                          {!isPaid ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSendWaReminder(bill)}
                                title="Kirim Cepat via WhatsApp Default"
                                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-800 transition-colors"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedBillForTemplate(bill);
                                  const cust = customers.find(c => c.id === bill.customerId) || null;
                                  setSelectedCustomerForTemplate(cust);
                                  setShowTemplateModal(true);
                                }}
                                title="Pilih / Edit Template Pesan Kustom untuk Pelanggan Ini"
                                className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                const msg = WhatsAppService.generateReceiptMessage(bill, bill.customerName);
                                WhatsAppService.openWhatsAppUrl(bill.customerPhone, msg);
                              }}
                              title="Kirim Kuitansi Lunas ke WhatsApp Pelanggan"
                              className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-800 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* DANA Payment Gateway Button */}
                          {!isPaid && onOpenDanaCheckout && (
                            <button
                              onClick={() => {
                                const session = DanaService.createPaymentSession({
                                  itemType: 'bill',
                                  itemTitle: `Tagihan ${bill.packageName} (${bill.period})`,
                                  itemRefId: bill.id,
                                  amount: bill.amount,
                                  customerName: bill.customerName,
                                  customerPhone: bill.customerPhone
                                });
                                onOpenDanaCheckout(session);
                              }}
                              title="Bayar Instan via DANA E-Wallet & QRIS"
                              className="px-2 py-1 text-[11px] font-bold rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors shadow-sm"
                            >
                              DANA
                            </button>
                          )}

                          {/* Record Payment Button */}
                          {!isPaid && (
                            <button
                              onClick={() => onOpenRecordPayment(bill)}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm"
                            >
                              Bayar
                            </button>
                          )}

                          {/* Print Invoice/Receipt */}
                          <button
                            onClick={() => onPrintBill(bill)}
                            title="Cetak Kuitansi / Invoice Resmi"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
        bill={selectedBillForTemplate}
        customer={selectedCustomerForTemplate}
        onSelectAndSend={(renderedMsg) => {
          if (selectedCustomerForTemplate) {
            WhatsAppService.openWhatsAppUrl(selectedCustomerForTemplate.phone, renderedMsg);
            if (selectedBillForTemplate) {
              selectedBillForTemplate.whatsappReminderSent = true;
              DataService.updateBill(selectedBillForTemplate);
              onRefreshData();
            }
          }
        }}
        onTemplatesUpdated={onRefreshData}
      />

      {/* Bulk Generate Bills with Preview & Confirmation Modal */}
      <BulkGenerateBillsModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        customers={customers}
        existingBills={bills}
        onBillsGenerated={(_newBills, message) => {
          setNotificationStatus(message);
          onRefreshData();
          setTimeout(() => setNotificationStatus(null), 6000);
        }}
      />
    </div>
  );
};
