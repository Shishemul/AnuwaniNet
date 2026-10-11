import React, { useState, useMemo } from 'react';
import { Customer, Bill, WhatsAppCustomTemplate } from '../../types';
import { DataService } from '../../services/dataService';
import { WhatsAppService } from '../../services/whatsappService';
import {
  X,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  Send,
  Zap,
  Users,
  DollarSign,
  PackageCheck,
  ChevronRight,
  Info
} from 'lucide-react';

interface BulkGenerateBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  existingBills: Bill[];
  onBillsGenerated: (newBills: Bill[], message: string) => void;
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const BulkGenerateBillsModal: React.FC<BulkGenerateBillsModalProps> = ({
  isOpen,
  onClose,
  customers,
  existingBills,
  onBillsGenerated
}) => {
  const currentDate = new Date();
  const currentMonthIdx = currentDate.getMonth();
  const currentYearVal = currentDate.getFullYear();

  // Period settings
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthIdx);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearVal);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'active_only' | 'active_isolated' | 'all'>('active_isolated');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [skipAlreadyBilled, setSkipAlreadyBilled] = useState<boolean>(true);

  // Notification & template settings
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(true);
  const customTemplates = useMemo(() => DataService.getCustomTemplates(), []);
  const defaultTemplate = customTemplates.find(t => t.isDefault) || customTemplates[0];
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate?.id || '');

  // Selection states
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [hasInitializedSelection, setHasInitializedSelection] = useState<boolean>(false);

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<number>(0);

  // Construct target period string (e.g. "Oktober 2026")
  const periodString = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  const periodMonthPadded = String(selectedMonth + 1).padStart(2, '0');

  // Unique package names for filter dropdown
  const uniquePackages = useMemo(() => {
    const pkgs = new Set<string>();
    customers.forEach(c => {
      if (c.packageName) pkgs.add(c.packageName);
    });
    return Array.from(pkgs);
  }, [customers]);

  // Candidates list calculation
  const candidateRows = useMemo(() => {
    return customers.map(cust => {
      const alreadyHasBill = existingBills.some(
        b => b.customerId === cust.id && b.period.toLowerCase() === periodString.toLowerCase()
      );

      // Matches status filter
      let matchesStatus = true;
      if (statusFilter === 'active_only') {
        matchesStatus = cust.status === 'active';
      } else if (statusFilter === 'active_isolated') {
        matchesStatus = cust.status === 'active' || cust.status === 'isolated';
      }

      // Matches package filter
      let matchesPackage = true;
      if (packageFilter !== 'all') {
        matchesPackage = cust.packageName === packageFilter;
      }

      const isEligible = matchesStatus && matchesPackage && (!skipAlreadyBilled || !alreadyHasBill);

      // Due date calculation
      const dayVal = Math.min(Math.max(cust.billingDay || 20, 1), 28);
      const dueDate = `${selectedYear}-${periodMonthPadded}-${String(dayVal).padStart(2, '0')}`;

      return {
        customer: cust,
        alreadyHasBill,
        matchesStatus,
        matchesPackage,
        isEligible,
        dueDate,
        amount: cust.packagePrice
      };
    });
  }, [customers, existingBills, periodString, statusFilter, packageFilter, skipAlreadyBilled, selectedYear, periodMonthPadded]);

  // Initialize selection on open or period change
  React.useEffect(() => {
    if (isOpen) {
      const eligibleIds = new Set(
        candidateRows.filter(r => r.isEligible && (!skipAlreadyBilled || !r.alreadyHasBill)).map(r => r.customer.id)
      );
      setSelectedCustomerIds(eligibleIds);
      setHasInitializedSelection(true);
    }
  }, [isOpen, periodString, statusFilter, packageFilter, skipAlreadyBilled]);

  if (!isOpen) return null;

  // Selected rows
  const selectedRows = candidateRows.filter(r => selectedCustomerIds.has(r.customer.id));
  const totalAmount = selectedRows.reduce((sum, r) => sum + r.amount, 0);
  const alreadyBilledCount = candidateRows.filter(r => r.alreadyHasBill).length;

  const handleToggleSelectAll = () => {
    const eligibleRows = candidateRows.filter(r => r.matchesStatus && r.matchesPackage && (!skipAlreadyBilled || !r.alreadyHasBill));
    if (selectedCustomerIds.size === eligibleRows.length) {
      setSelectedCustomerIds(new Set());
    } else {
      setSelectedCustomerIds(new Set(eligibleRows.map(r => r.customer.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedCustomerIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCustomerIds(next);
  };

  // Perform Generation
  const handleConfirmGenerate = async () => {
    if (selectedRows.length === 0) {
      alert('Pilih minimal satu pelanggan untuk membuat tagihan!');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    const newBills: Bill[] = [];
    const templateToUse = customTemplates.find(t => t.id === selectedTemplateId)?.content;
    const currentBillsCount = existingBills.length;

    for (let i = 0; i < selectedRows.length; i++) {
      const row = selectedRows[i];
      const cust = row.customer;

      const billNum = `INV-${selectedYear}${periodMonthPadded}-${String(currentBillsCount + i + 1).padStart(3, '0')}`;
      const newBill: Bill = {
        id: 'bill-' + Date.now() + '-' + (i + 1) + '-' + Math.floor(Math.random() * 1000),
        billNumber: billNum,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        packageId: cust.packageId,
        packageName: cust.packageName,
        amount: cust.packagePrice,
        period: periodString,
        dueDate: row.dueDate,
        status: 'unpaid',
        whatsappReminderSent: sendWhatsApp
      };

      newBills.push(newBill);

      // Automated WhatsApp notification
      if (sendWhatsApp) {
        const autoMsg = WhatsAppService.generateBillingMessage(newBill, cust, templateToUse);
        WhatsAppService.sendAutomatedNotification(cust.phone, cust.name, 'tagihan', autoMsg);
      }

      setGenerationProgress(Math.round(((i + 1) / selectedRows.length) * 100));
    }

    // Combine and save
    const updatedBills = [...existingBills, ...newBills];
    DataService.saveBills(updatedBills);

    setIsGenerating(false);

    const successMessage = `Berhasil membuat ${newBills.length} tagihan baru untuk periode ${periodString} senilai ${WhatsAppService.formatRupiah(totalAmount)}${
      sendWhatsApp ? ' dan pesan WhatsApp telah dikirimkan ke nomor pelanggan.' : '.'
    }`;

    onBillsGenerated(newBills, successMessage);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/80 text-red-400 border border-red-900/60">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Generate Tagihan Bulanan Massal
                </h2>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-900/60 uppercase">
                  Bulk Preview & Confirm
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Terbitkan lembar tagihan pelanggan secara serentak berdasarkan paket internet aktif dengan pratinjau sebelum disimpan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Controls & Filter Bar */}
          <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-red-500" />
              <span>1. Pengaturan Periode & Target Pelanggan</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Month */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Bulan Tagihan</label>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Tahun Tagihan</label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  {[currentYearVal - 1, currentYearVal, currentYearVal + 1].map(y => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Status Pelanggan</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as any)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  <option value="active_isolated">Aktif & Terisolir ({customers.filter(c => c.status === 'active' || c.status === 'isolated').length})</option>
                  <option value="active_only">Hanya Aktif Normal ({customers.filter(c => c.status === 'active').length})</option>
                  <option value="all">Semua Termasuk Pending ({customers.length})</option>
                </select>
              </div>

              {/* Package Filter */}
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Filter Paket Internet</label>
                <select
                  value={packageFilter}
                  onChange={e => setPackageFilter(e.target.value)}
                  disabled={isGenerating}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  <option value="all">Semua Paket ({uniquePackages.length})</option>
                  {uniquePackages.map(pkg => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Checkbox options: skip already billed & WhatsApp */}
            <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipAlreadyBilled}
                    onChange={e => setSkipAlreadyBilled(e.target.checked)}
                    disabled={isGenerating}
                    className="w-4 h-4 rounded text-red-600 bg-zinc-900 border-zinc-700"
                  />
                  <span>Lewati pelanggan yang sudah memiliki tagihan di periode {periodString}</span>
                </label>

                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendWhatsApp}
                    onChange={e => setSendWhatsApp(e.target.checked)}
                    disabled={isGenerating}
                    className="w-4 h-4 rounded text-emerald-600 bg-zinc-900 border-zinc-700"
                  />
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Send className="w-3 h-3" />
                    Kirim notifikasi WhatsApp otomatis via Fonnte
                  </span>
                </label>
              </div>

              {/* Template selector if WhatsApp is enabled */}
              {sendWhatsApp && customTemplates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-[11px] whitespace-nowrap">Template WA:</span>
                  <select
                    value={selectedTemplateId}
                    onChange={e => setSelectedTemplateId(e.target.value)}
                    disabled={isGenerating}
                    className="px-2.5 py-1 text-[11px] rounded bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-600"
                  >
                    {customTemplates.map(tmpl => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} {tmpl.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Metric Summary Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Pelanggan Terpilih</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-white font-mono mt-1">
                {selectedRows.length} <span className="text-xs text-zinc-400 font-sans font-normal">pelanggan</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Estimasi Tagihan</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono mt-1">
                {WhatsAppService.formatRupiah(totalAmount)}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Periode</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white mt-1.5 truncate">
                {periodString}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-400" />
                <span>Sudah Punya Tagihan</span>
              </div>
              <div className="text-base sm:text-lg font-bold text-zinc-300 font-mono mt-1">
                {alreadyBilledCount} <span className="text-xs text-zinc-500 font-sans font-normal">pelanggan</span>
              </div>
            </div>
          </div>

          {/* Table Preview Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                <PackageCheck className="w-3.5 h-3.5 text-red-500" />
                <span>2. Pratinjau Daftar Tagihan yang Akan Dibuat ({selectedRows.length} dari {candidateRows.length})</span>
              </div>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={isGenerating}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors"
              >
                {selectedCustomerIds.size === candidateRows.filter(r => r.isEligible).length
                  ? 'Batalkan Pilih Semua'
                  : 'Pilih Semua yang Memenuhi Syarat'}
              </button>
            </div>

            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/40">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 z-10 border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <span className="sr-only">Pilih</span>
                      </th>
                      <th className="py-2.5 px-3">Pelanggan</th>
                      <th className="py-2.5 px-3">Paket Langganan</th>
                      <th className="py-2.5 px-3">Tarif Tagihan</th>
                      <th className="py-2.5 px-3">Estimasi Jatuh Tempo</th>
                      <th className="py-2.5 px-3 text-center">Status Periode Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {candidateRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-zinc-500">
                          Tidak ada data pelanggan yang cocok dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      candidateRows.map((row, idx) => {
                        const isSelected = selectedCustomerIds.has(row.customer.id);
                        return (
                          <tr
                            key={row.customer.id}
                            className={`transition-colors ${
                              isSelected
                                ? 'bg-zinc-900/50 hover:bg-zinc-900/80'
                                : 'hover:bg-zinc-900/20 opacity-60'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectOne(row.customer.id)}
                                disabled={isGenerating || (skipAlreadyBilled && row.alreadyHasBill)}
                                className="w-4 h-4 rounded text-red-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-white">{row.customer.name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                {row.customer.customerCode} • {row.customer.phone}
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="text-zinc-200">{row.customer.packageName}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                              {WhatsAppService.formatRupiah(row.amount)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-zinc-300">
                              {row.dueDate}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {row.alreadyHasBill ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/80 text-amber-400 border border-amber-900/60">
                                  Sudah Ada Tagihan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-900/60">
                                  Siap Dibuat
                                </span>
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
          </div>

          {/* Progress Banner during execution */}
          {isGenerating && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-red-900/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Membuat tagihan & mengirim notifikasi WhatsApp...
                </span>
                <span className="font-mono text-red-400 font-bold">{generationProgress}%</span>
              </div>
              <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${generationProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-t border-zinc-800 bg-zinc-950/80">
          <div className="text-xs text-zinc-400">
            Total yang akan diterbitkan:{' '}
            <strong className="text-white font-mono font-bold">{selectedRows.length} tagihan</strong>{' '}
            (Senilai <span className="text-emerald-400 font-mono font-bold">{WhatsAppService.formatRupiah(totalAmount)}</span>)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={handleConfirmGenerate}
              disabled={isGenerating || selectedRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-all shadow-md shadow-red-950 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'Sedang Memproses...'
                  : `Konfirmasi & Terbitkan ${selectedRows.length} Tagihan`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
