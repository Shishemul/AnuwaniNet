import React, { useState } from 'react';
import { Customer, Bill, WhatsAppCustomTemplate } from '../../types';
import { DataService } from '../../services/dataService';
import { WhatsAppService } from '../../services/whatsappService';
import {
  X,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  Copy,
  Sparkles,
  Smartphone,
  Eye,
  FileText,
  Save,
  RotateCcw
} from 'lucide-react';

interface WhatsAppTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  bill?: Bill | null;
  onSelectAndSend?: (message: string) => void;
  onTemplatesUpdated?: () => void;
}

export const WhatsAppTemplateModal: React.FC<WhatsAppTemplateModalProps> = ({
  isOpen,
  onClose,
  customer,
  bill,
  onSelectAndSend,
  onTemplatesUpdated
}) => {
  const [templates, setTemplates] = useState<WhatsAppCustomTemplate[]>(() => DataService.getCustomTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const list = DataService.getCustomTemplates();
    return list.find(t => t.isDefault)?.id || list[0]?.id || '';
  });

  // Edit / Create template state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<'tagihan' | 'kuitansi' | 'pengingat' | 'promosi' | 'isolir'>('tagihan');
  const [templateContent, setTemplateContent] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [copiedPlaceholder, setCopiedPlaceholder] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Active template being viewed or customized
  const activeTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

  // Dummy fallback data if modal opened without specific customer/bill
  const sampleCustomer: Customer = customer || {
    id: 'sample-1',
    customerCode: 'ANW-001',
    name: 'Budi Santoso',
    phone: '085711223344',
    address: 'Jl. Merpati No. 12 RT 02/04',
    email: 'budi@example.com',
    pppoeUsername: 'budi_santoso',
    pppoePassword: 'pass_budi_01',
    ipAddress: '192.168.10.15',
    macAddress: 'BC:24:11:8A:92:01',
    packageId: 'pkg-2',
    packageName: 'Paket Keluarga 20 Mbps',
    packagePrice: 165000,
    status: 'active',
    autoIsolirEnabled: true,
    billingDay: 20,
    joinDate: '2026-01-15',
    ruijieDeviceId: 'dev-gw-01'
  };

  const sampleBill: Bill = bill || {
    id: 'sample-bill',
    billNumber: 'INV-202610-001',
    customerId: sampleCustomer.id,
    customerName: sampleCustomer.name,
    customerPhone: sampleCustomer.phone,
    packageId: sampleCustomer.packageId,
    packageName: sampleCustomer.packageName,
    amount: sampleCustomer.packagePrice,
    period: 'Oktober 2026',
    dueDate: '2026-10-20',
    status: 'unpaid'
  };

  // Preview generated text
  const previewText = activeTemplate
    ? WhatsAppService.renderTemplate(activeTemplate.content, { customer: sampleCustomer, bill: sampleBill })
    : '';

  // Placeholder insertion helper
  const availablePlaceholders = [
    { tag: '{{customer_name}}', label: 'Nama Pelanggan', example: sampleCustomer.name },
    { tag: '{{bill_amount}}', label: 'Total Nominal Tagihan', example: WhatsAppService.formatRupiah(sampleBill.amount) },
    { tag: '{{due_date}}', label: 'Tanggal Jatuh Tempo', example: sampleBill.dueDate },
    { tag: '{{customer_code}}', label: 'ID Pelanggan', example: sampleCustomer.customerCode },
    { tag: '{{bill_number}}', label: 'No. Tagihan / Invoice', example: sampleBill.billNumber },
    { tag: '{{period}}', label: 'Periode Tagihan', example: sampleBill.period },
    { tag: '{{package_name}}', label: 'Nama Paket Internet', example: sampleCustomer.packageName },
    { tag: '{{payment_link}}', label: 'Link Bayar DANA & QRIS', example: 'https://link.dana.id/pay?...' },
    { tag: '{{days_overdue}}', label: 'Hari Keterlambatan', example: '3' },
    { tag: '{{customer_phone}}', label: 'Nomor WhatsApp', example: sampleCustomer.phone },
    { tag: '{{customer_address}}', label: 'Alamat Pelanggan', example: sampleCustomer.address || '-' },
    { tag: '{NAMA}', label: 'Nama (Alias)', example: sampleCustomer.name },
    { tag: '{JUMLAH}', label: 'Nominal (Alias)', example: WhatsAppService.formatRupiah(sampleBill.amount) },
    { tag: '{JATUH_TEMPO}', label: 'Jatuh Tempo (Alias)', example: sampleBill.dueDate }
  ];

  const handleInsertPlaceholder = (tag: string) => {
    setTemplateContent(prev => prev + ' ' + tag);
    setCopiedPlaceholder(tag);
    setTimeout(() => setCopiedPlaceholder(null), 2000);
  };

  const handleStartCreateNew = () => {
    setIsEditing(true);
    setEditingId(null);
    setTemplateName('Template Tagihan Kustom Baru');
    setTemplateCategory('tagihan');
    setTemplateDescription('Format kustom pengingat tagihan dengan placeholder dinamis.');
    setTemplateContent(
      `Halo Bpk/Ibu *{NAMA}*,\n\nTagihan internet AnuwaniNet Anda untuk periode *{PERIODE}* sebesar *{JUMLAH}* telah terbit.\nJatuh tempo: *{JATUH_TEMPO}*.\n\nBayar instan via DANA: {LINK_DANA}\n\nTerima kasih atas kerja samanya!`
    );
  };

  const handleStartEditCurrent = (tmpl: WhatsAppCustomTemplate) => {
    setIsEditing(true);
    setEditingId(tmpl.id);
    setTemplateName(tmpl.name);
    setTemplateCategory(tmpl.category);
    setTemplateDescription(tmpl.description || '');
    setTemplateContent(tmpl.content);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateContent.trim()) {
      alert('Nama template dan isi pesan tidak boleh kosong!');
      return;
    }

    const newTemplate: WhatsAppCustomTemplate = {
      id: editingId || `tmpl-${Date.now()}`,
      name: templateName.trim(),
      category: templateCategory,
      description: templateDescription.trim(),
      content: templateContent,
      createdAt: new Date().toISOString()
    };

    DataService.saveCustomTemplate(newTemplate);
    const updated = DataService.getCustomTemplates();
    setTemplates(updated);
    setSelectedTemplateId(newTemplate.id);
    setIsEditing(false);
    setNotice(`Template "${newTemplate.name}" berhasil disimpan!`);
    setTimeout(() => setNotice(null), 3500);
    if (onTemplatesUpdated) onTemplatesUpdated();
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    if (templates.length <= 1) {
      alert('Minimal harus menyisakan satu template pesan!');
      return;
    }
    if (confirm(`Yakin ingin menghapus template "${name}"?`)) {
      DataService.deleteCustomTemplate(id);
      const updated = DataService.getCustomTemplates();
      setTemplates(updated);
      setSelectedTemplateId(updated[0]?.id || '');
      if (onTemplatesUpdated) onTemplatesUpdated();
    }
  };

  const handleSetAsDefault = (tmpl: WhatsAppCustomTemplate) => {
    const waConfig = DataService.getWhatsAppBotConfig();
    waConfig.billingTemplate = tmpl.content;
    const updatedList = (waConfig.customTemplates || []).map(t => ({
      ...t,
      isDefault: t.id === tmpl.id
    }));
    waConfig.customTemplates = updatedList;
    DataService.saveWhatsAppBotConfig(waConfig);
    setTemplates(updatedList);
    setNotice(`"${tmpl.name}" dijadikan template default utama aplikasi.`);
    setTimeout(() => setNotice(null), 3000);
    if (onTemplatesUpdated) onTemplatesUpdated();
  };

  const handleSendNow = () => {
    if (onSelectAndSend && previewText) {
      onSelectAndSend(previewText);
      onClose();
    } else if (previewText && sampleCustomer) {
      WhatsAppService.openWhatsAppUrl(sampleCustomer.phone, previewText);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-900/60">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Template Pesan Tagihan WhatsApp
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Dynamic Placeholders
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Simpan, gunakan kembali, dan kustomisasi format pesan tagihan dengan variabel otomatis.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notice && (
          <div className="px-5 py-2.5 bg-emerald-950/80 border-b border-emerald-900 text-xs text-emerald-200 flex items-center justify-between">
            <span>{notice}</span>
            <Check className="w-4 h-4 text-emerald-400" />
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left Column: Template Selector & Management (4 Cols) */}
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Daftar Template ({templates.length})
              </span>
              <button
                type="button"
                onClick={handleStartCreateNew}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Buat Baru</span>
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {templates.map(tmpl => {
                const isSelected = tmpl.id === selectedTemplateId && !isEditing;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setIsEditing(false);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-zinc-800/90 border-emerald-500 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-xs text-white leading-tight">
                        {tmpl.name}
                      </div>
                      {tmpl.isDefault && (
                        <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono border border-emerald-900">
                          Default
                        </span>
                      )}
                    </div>

                    {tmpl.description && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2">
                        {tmpl.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px]">
                      <span className="text-zinc-500 capitalize">{tmpl.category}</span>
                      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleStartEditCurrent(tmpl)}
                          title="Edit template ini"
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {!tmpl.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                            title="Hapus template"
                            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Editor or Live Preview (8 Cols) */}
          <div className="md:col-span-8 flex flex-col space-y-4">
            {isEditing ? (
              /* FORM EDITOR */
              <form onSubmit={handleSaveTemplate} className="space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                    <span>{editingId ? 'Edit Template Pesan' : 'Buat Template Baru'}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-zinc-400 hover:text-white text-xs underline"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Nama Template</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Tagihan Ramah Wilayah RT 02"
                      value={templateName}
                      onChange={e => setTemplateName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Kategori Pesan</label>
                    <select
                      value={templateCategory}
                      onChange={e => setTemplateCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="tagihan">Tagihan Bulanan</option>
                      <option value="pengingat">Pengingat Jatuh Tempo</option>
                      <option value="kuitansi">Kuitansi Pembayaran Lunas</option>
                      <option value="isolir">Peringatan Isolir</option>
                      <option value="promosi">Informasi & Promosi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Keterangan / Catatan Template</label>
                  <input
                    type="text"
                    placeholder="Contoh: Digunakan untuk pelanggan yang hampir jatuh tempo"
                    value={templateDescription}
                    onChange={e => setTemplateDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Dynamic Placeholder Click-to-Insert Toolbar */}
                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Klik Placeholder Dinamis untuk Menyisipkan:
                    </span>
                    {copiedPlaceholder && (
                      <span className="text-emerald-400 font-mono font-bold">
                        +{copiedPlaceholder} disisipkan!
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {availablePlaceholders.map(p => (
                      <button
                        key={p.tag}
                        type="button"
                        onClick={() => handleInsertPlaceholder(p.tag)}
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 hover:border-emerald-600/60 font-mono text-[11px] transition-colors"
                        title={`${p.label} (Contoh: ${p.example})`}
                      >
                        {p.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1">Isi Pesan WhatsApp (Mendukung Format *Tebal*, _Miring_)</label>
                  <textarea
                    rows={8}
                    required
                    value={templateContent}
                    onChange={e => setTemplateContent(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono text-xs leading-relaxed focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              /* LIVE PREVIEW & DISPATCH */
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Eye className="w-4 h-4 text-emerald-400" />
                        <span>Pratinjau Pesan Real-Time ({activeTemplate?.name})</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Pesan akan otomatis memuat data pelanggan <strong>{sampleCustomer.name}</strong> dan tagihan <strong>{sampleBill.billNumber}</strong>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditCurrent(activeTemplate)}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit Template</span>
                      </button>

                      {!activeTemplate.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetAsDefault(activeTemplate)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-950 hover:text-emerald-300 text-zinc-300 text-xs font-semibold border border-zinc-700"
                        >
                          Jadikan Default
                        </button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Message Preview Bubble */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-inner relative space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pb-1 border-b border-zinc-800">
                      <span>Penerima: <strong className="text-zinc-300">{sampleCustomer.name} ({sampleCustomer.phone})</strong></span>
                      <span className="font-mono text-emerald-400">WhatsApp Web / Fonnte</span>
                    </div>

                    <div className="font-sans text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-[36vh] overflow-y-auto pr-2 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60">
                      {previewText}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                      <span>Variabel dinamis: Nama, Tagihan, Periode, Jatuh Tempo, Link DANA telah disinkronkan.</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(previewText);
                          setNotice('Teks pratinjau berhasil disalin ke clipboard!');
                          setTimeout(() => setNotice(null), 2500);
                        }}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Pesan</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                  <div className="text-xs text-zinc-400">
                    Target: <span className="text-white font-bold">{sampleCustomer.name}</span> · Tagihan: <span className="font-mono font-bold text-emerald-400">{WhatsAppService.formatRupiah(sampleBill.amount)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold"
                    >
                      Tutup
                    </button>
                    <button
                      type="button"
                      onClick={handleSendNow}
                      className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim via WhatsApp Sekarang</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
