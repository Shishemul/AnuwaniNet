import React, { useState, useMemo, useEffect } from 'react';
import { Bill, Customer, WhatsAppCustomTemplate } from '../../types';
import { DataService } from '../../services/dataService';
import { WhatsAppService } from '../../services/whatsappService';
import {
  X,
  Send,
  CheckCircle,
  AlertTriangle,
  Clock,
  Search,
  CheckSquare,
  Square,
  Users,
  DollarSign,
  Receipt,
  MessageSquare,
  Sparkles,
  Zap,
  Phone,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface BulkWaNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  customers: Customer[];
  onNotificationComplete: (sentCount: number, message: string) => void;
}

type ReminderTemplateType = 'standard' | 'urgent_isolir' | 'friendly' | 'custom';

export const BulkWaNotifyModal: React.FC<BulkWaNotifyModalProps> = ({
  isOpen,
  onClose,
  bills,
  customers,
  onNotificationComplete
}) => {
  // Filter only unpaid or overdue bills
  const unpaidBills = useMemo(() => {
    return bills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
  }, [bills]);

  // Selection state
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all_unpaid' | 'not_reminded_yet' | 'overdue_only'>('all_unpaid');
  
  // Template state
  const [templateType, setTemplateType] = useState<ReminderTemplateType>('standard');
  const [customTemplates, setCustomTemplates] = useState<WhatsAppCustomTemplate[]>([]);
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string>('');
  
  // Custom message override text
  const [customMessageDraft, setCustomMessageDraft] = useState<string>('');

  // Active preview bill
  const [previewBillId, setPreviewBillId] = useState<string | null>(null);

  // Sending progress state
  const [isSending, setIsSending] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentRecipientName, setCurrentRecipientName] = useState('');
  const [sendSuccessCount, setSendSuccessCount] = useState<number | null>(null);

  // Initialize selection when modal opens
  useEffect(() => {
    if (isOpen) {
      const templates = DataService.getCustomTemplates();
      setCustomTemplates(templates);
      if (templates.length > 0) {
        setSelectedCustomTemplateId(templates[0].id);
      }

      // Default select all unpaid bills
      const allIds = new Set(unpaidBills.map(b => b.id));
      setSelectedBillIds(allIds);
      setPreviewBillId(unpaidBills[0]?.id || null);
      setSendSuccessCount(null);
      setIsSending(false);
      setCurrentProgress(0);
    }
  }, [isOpen, unpaidBills]);

  // Map customer by ID for rapid lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach(c => map.set(c.id, c));
    return map;
  }, [customers]);

  // Filtered unpaid bills for the checklist table
  const displayedBills = useMemo(() => {
    return unpaidBills.filter(b => {
      const cust = customerMap.get(b.customerId);
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.billNumber.toLowerCase().includes(q) ||
        b.customerName.toLowerCase().includes(q) ||
        b.customerPhone.includes(q) ||
        b.packageName.toLowerCase().includes(q);

      let matchFilter = true;
      if (filterMode === 'not_reminded_yet') {
        matchFilter = !b.whatsappReminderSent;
      } else if (filterMode === 'overdue_only') {
        matchFilter = b.status === 'overdue';
      }

      return matchSearch && matchFilter;
    });
  }, [unpaidBills, customerMap, searchQuery, filterMode]);

  // Statistics calculation
  const totalUnpaidNominal = useMemo(() => {
    return unpaidBills.reduce((acc, b) => acc + b.amount, 0);
  }, [unpaidBills]);

  const selectedNominal = useMemo(() => {
    return unpaidBills
      .filter(b => selectedBillIds.has(b.id))
      .reduce((acc, b) => acc + b.amount, 0);
  }, [unpaidBills, selectedBillIds]);

  const selectedCount = selectedBillIds.size;
  const isAllDisplayedSelected = displayedBills.length > 0 && displayedBills.every(b => selectedBillIds.has(b.id));

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      const next = new Set(selectedBillIds);
      displayedBills.forEach(b => next.delete(b.id));
      setSelectedBillIds(next);
    } else {
      const next = new Set(selectedBillIds);
      displayedBills.forEach(b => next.add(b.id));
      setSelectedBillIds(next);
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedBillIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedBillIds(next);
    setPreviewBillId(id);
  };

  // Generate reminder message text based on selected template type
  const getMessageForBill = (bill: Bill, customer: Customer): string => {
    const danaLink = `https://link.dana.id/pay?order=${bill.billNumber}&amount=${bill.amount}`;
    const amountStr = WhatsAppService.formatRupiah(bill.amount);

    if (templateType === 'custom' && selectedCustomTemplateId) {
      const customTpl = customTemplates.find(t => t.id === selectedCustomTemplateId);
      if (customTpl) {
        return WhatsAppService.renderTemplate(customTpl.content, { customer, bill });
      }
    }

    if (templateType === 'urgent_isolir') {
      return (
        `⚠️ *PERINGATAN JATUH TEMPO & ISOLIR ANUWANINET*\n` +
        `----------------------------------------\n` +
        `Yth. Bpk/Ibu *${customer.name}* (${customer.customerCode}),\n\n` +
        `Kami menginformasikan bahwa tagihan internet Anda belum terselesaikan:\n` +
        `📄 No. Tagihan: *${bill.billNumber}*\n` +
        `📦 Paket: *${customer.packageName}*\n` +
        `💰 Total: *${amountStr}*\n` +
        `📅 Jatuh Tempo: *${bill.dueDate}*\n\n` +
        `🚨 *Pemberitahuan Sistem Ruijie Reyee:*\n` +
        `Sesuai SOP, layanan internet akan *DIISOLIR OTOMATIS* oleh sistem apabila pembayaran belum tervalidasi setelah jatuh tempo.\n\n` +
        `💳 *Bayar Cepat via DANA (Bebas Biaya Admin):*\n` +
        `👉 ${danaLink}\n\n` +
        `Abaikan pesan ini jika Anda telah melakukan pembayaran. Terima kasih!`
      );
    }

    if (templateType === 'friendly') {
      return (
        `Halo Bpk/Ibu *${customer.name}*! 😊\n` +
        `Semoga hari Anda menyenangkan.\n\n` +
        `Sekadar mengingatkan ramah dari AnuwaniNet mengenai tagihan internet rumah periode *${bill.period}* sebesar *${amountStr}*.\n\n` +
        `Pembayaran dapat dilakukan melalui transfer atau link dompet digital DANA:\n` +
        `👉 ${danaLink}\n\n` +
        `Jika membutuhkan bantuan atau konfirmasi transfer, silakan balas pesan ini ya. Selamat beraktivitas! 🚀`
      );
    }

    // Default 'standard'
    return WhatsAppService.generateBillingMessage(bill, customer);
  };

  // Preview bill customer
  const previewBill = useMemo(() => {
    if (!previewBillId) return unpaidBills[0] || null;
    return unpaidBills.find(b => b.id === previewBillId) || unpaidBills[0] || null;
  }, [previewBillId, unpaidBills]);

  const previewCustomer = useMemo(() => {
    if (!previewBill) return null;
    return customerMap.get(previewBill.customerId) || null;
  }, [previewBill, customerMap]);

  const previewMessageText = useMemo(() => {
    if (!previewBill || !previewCustomer) return 'Tidak ada data tagihan tertunggak untuk ditampilkan.';
    return getMessageForBill(previewBill, previewCustomer);
  }, [previewBill, previewCustomer, templateType, selectedCustomTemplateId]);

  // Execute 1-Click Bulk WhatsApp Notification
  const handleExecuteBulkNotify = async () => {
    if (selectedCount === 0) return;

    const billsToSend = unpaidBills.filter(b => selectedBillIds.has(b.id));
    if (billsToSend.length === 0) return;

    setIsSending(true);
    setCurrentProgress(0);
    setSendSuccessCount(null);

    let sentCounter = 0;
    const allBills = DataService.getBills();

    for (let i = 0; i < billsToSend.length; i++) {
      const targetBill = billsToSend[i];
      const targetCust = customerMap.get(targetBill.customerId);

      if (targetCust) {
        setCurrentRecipientName(targetCust.name);
        const msg = getMessageForBill(targetBill, targetCust);

        // Send automated notification via Fonnte / WhatsApp service
        WhatsAppService.sendAutomatedNotification(targetCust.phone, targetCust.name, 'tagihan', msg);

        // Mark reminder sent flag on bill
        targetBill.whatsappReminderSent = true;

        // Update in global bills list
        const idx = allBills.findIndex(b => b.id === targetBill.id);
        if (idx >= 0) {
          allBills[idx] = { ...allBills[idx], whatsappReminderSent: true };
        }

        sentCounter++;
      }

      // Update progress
      const progressPercent = Math.round(((i + 1) / billsToSend.length) * 100);
      setCurrentProgress(progressPercent);

      // Brief delay for smooth UI feedback and dispatch breathing room
      await new Promise(r => setTimeout(r, 120));
    }

    // Persist all updated bills
    DataService.saveBills(allBills);

    setIsSending(false);
    setSendSuccessCount(sentCounter);

    const successSummary = `Berhasil mengirim ${sentCounter} pesan pengingat tagihan WhatsApp ke seluruh pelanggan tertunggak!`;
    onNotificationComplete(sentCounter, successSummary);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-950/60">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Bulk WhatsApp Notify
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 border border-emerald-800 text-emerald-400">
                  1-Click Broadcast
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Kirim pesan pengingat jatuh tempo secara massal ke seluruh pelanggan berstatus Belum Bayar (*unpaid/overdue*).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSending}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen Banner if done */}
        {sendSuccessCount !== null && (
          <div className="m-4 p-4 rounded-xl bg-emerald-950/90 border border-emerald-800 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold text-white text-sm">
                  Pengiriman Massal Selesai!
                </span>
                <p className="text-emerald-300">
                  {sendSuccessCount} pesan pengingat tagihan berhasil dikirimkan ke nomor WhatsApp pelanggan.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Tutup Modal
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Total Tagihan Tertunggak
                </span>
                <div className="text-base font-bold text-white font-mono">
                  {unpaidBills.length} Tagihan
                </div>
              </div>
              <Receipt className="w-5 h-5 text-amber-500/60" />
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Total Nominal Belum Bayar
                </span>
                <div className="text-base font-bold text-amber-400 font-mono">
                  {WhatsAppService.formatRupiah(totalUnpaidNominal)}
                </div>
              </div>
              <DollarSign className="w-5 h-5 text-emerald-500/60" />
            </div>

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Penerima Terpilih
                </span>
                <div className="text-base font-bold text-emerald-400 font-mono">
                  {selectedCount} dari {unpaidBills.length}
                </div>
              </div>
              <Users className="w-5 h-5 text-emerald-500/60" />
            </div>
          </div>

          {/* Grid Layout: Left Column = Selection & Table, Right Column = Template & Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Customer Checklist (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Cari nama, no hp, invoice..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-600 font-mono"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all_unpaid')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      filterMode === 'all_unpaid'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Semua ({unpaidBills.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('not_reminded_yet')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      filterMode === 'not_reminded_yet'
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Belum Diingatkan
                  </button>
                </div>
              </div>

              {/* Table / List of Unpaid Bills */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <div className="p-2.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400 font-semibold">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer"
                  >
                    {isAllDisplayedSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-500" />
                    )}
                    <span>Pilih Semua yang Tampil ({displayedBills.length})</span>
                  </button>
                  <span className="font-mono text-[11px] text-zinc-400">
                    {selectedCount} Terpilih ({WhatsAppService.formatRupiah(selectedNominal)})
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-zinc-900">
                  {displayedBills.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500">
                      Tidak ada tagihan tertunggak yang sesuai dengan filter pencarian.
                    </div>
                  ) : (
                    displayedBills.map(bill => {
                      const cust = customerMap.get(bill.customerId);
                      const isChecked = selectedBillIds.has(bill.id);
                      const isPreviewActive = previewBillId === bill.id;

                      return (
                        <div
                          key={bill.id}
                          onClick={() => {
                            setPreviewBillId(bill.id);
                          }}
                          className={`p-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isPreviewActive
                              ? 'bg-zinc-900/90 border-l-2 border-emerald-500'
                              : 'hover:bg-zinc-900/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                handleToggleSelectOne(bill.id);
                              }}
                              className="text-zinc-400 hover:text-white shrink-0 cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-zinc-600" />
                              )}
                            </button>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white truncate">
                                  {bill.customerName}
                                </span>
                                {bill.status === 'overdue' ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                                    Jatuh Tempo
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                                    Belum Bayar
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                                <span>{bill.billNumber}</span>
                                <span>&bull;</span>
                                <span className="font-mono text-zinc-300">{bill.customerPhone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 pl-2">
                            <div className="font-bold text-white font-mono">
                              {WhatsAppService.formatRupiah(bill.amount)}
                            </div>
                            <div className="text-[10px]">
                              {bill.whatsappReminderSent ? (
                                <span className="text-emerald-400 flex items-center justify-end gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Terkirim</span>
                                </span>
                              ) : (
                                <span className="text-zinc-500">Belum Dikirim</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right: Template Selection & Live Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              {/* Template Picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">
                  Pilih Format Pesan WhatsApp:
                </label>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTemplateType('standard')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      templateType === 'standard'
                        ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold">1. Standar Resmi</div>
                    <div className="text-[10px] text-zinc-500">Detail tagihan & link DANA</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('urgent_isolir')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      templateType === 'urgent_isolir'
                        ? 'bg-rose-950/80 border-rose-600 text-rose-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>2. Peringatan Isolir</span>
                    </div>
                    <div className="text-[10px] text-zinc-500">Info jatuh tempo Ruijie</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('friendly')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      templateType === 'friendly'
                        ? 'bg-teal-950/80 border-teal-600 text-teal-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold">3. Ramah / Santun</div>
                    <div className="text-[10px] text-zinc-500">Bahasa akrab komunitas</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('custom')}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      templateType === 'custom'
                        ? 'bg-purple-950/80 border-purple-600 text-purple-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold">4. Custom Template</div>
                    <div className="text-[10px] text-zinc-500">Template tersimpan bot</div>
                  </button>
                </div>
              </div>

              {/* If Custom Template is chosen */}
              {templateType === 'custom' && customTemplates.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-zinc-400">
                    Pilih Template Bot:
                  </label>
                  <select
                    value={selectedCustomTemplateId}
                    onChange={e => setSelectedCustomTemplateId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-emerald-600 font-sans"
                  >
                    {customTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Preview Bubble */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="font-semibold flex items-center gap-1 text-emerald-400">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Pratinjau Pesan ({previewCustomer?.name || 'Pelanggan'}):
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Format WhatsApp
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-900/40 text-[11px] leading-relaxed text-zinc-200 font-mono whitespace-pre-wrap max-h-56 overflow-y-auto selection:bg-emerald-700 shadow-inner">
                  {previewMessageText}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Progress Bar during Send */}
          {isSending && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-800/80 space-y-2 animate-pulse">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Mengirim notifikasi ke: {currentRecipientName}...
                </span>
                <span className="font-mono">{currentProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-400 flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Terkirim via <strong>Fonnte API Gateway</strong> & dicatat ke Riwayat Pesan WA.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleExecuteBulkNotify}
              disabled={isSending || selectedCount === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/70 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSending ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Mengirim ({currentProgress}%)...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Notifikasi ke Semua ({selectedCount} Pelanggan)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
