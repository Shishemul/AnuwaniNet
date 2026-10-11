import React, { useState } from 'react';
import { Customer, InternetPackage } from '../types';
import {
  Users,
  Search,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Send,
  Edit2,
  Trash2,
  Wifi,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { RuijieService } from '../services/ruijieService';
import { WhatsAppService } from '../services/whatsappService';
import { DataService } from '../services/dataService';

interface PelangganViewProps {
  customers: Customer[];
  packages: InternetPackage[];
  onRefreshData: () => void;
  onOpenAddCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
}

export const PelangganView: React.FC<PelangganViewProps> = ({
  customers,
  packages,
  onRefreshData,
  onOpenAddCustomer,
  onEditCustomer
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'isolated' | 'pending'>('all');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const filteredCustomers = customers.filter(c => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.customerCode.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.pppoeUsername.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'all' || c.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleManualIsolir = (c: Customer) => {
    if (confirm(`Apakah Anda yakin ingin MENGISOLIR layanan ${c.name} (${c.customerCode}) pada Ruijie Gateway?`)) {
      const res = RuijieService.isolateCustomer(c, 'Isolir manual oleh Admin');
      setActionMessage(res.message);
      onRefreshData();
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleRestoreIsolir = (c: Customer) => {
    const res = RuijieService.restoreCustomer(c, 'Layanan dipulihkan secara manual');
    setActionMessage(res.message);
    onRefreshData();
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleActivateAccount = (c: Customer) => {
    const updated: Customer = {
      ...c,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0]
    };
    DataService.updateCustomer(updated);

    // Send WhatsApp notification
    const msg = `Halo Bpk/Ibu *${c.name}*,\n\nSelamat! Akun internet AnuwaniNet Anda (*${c.customerCode}*) telah *DIAKTIFKAN*.\n\nDetail Langganan:\n• Paket: *${c.packageName}*\n• Username PPPoE: *${c.pppoeUsername}*\n• Tanggal Jatuh Tempo: Setiap tanggal ${c.billingDay}\n\nSelamat menikmati koneksi internet AnuwaniNet!`;
    WhatsAppService.sendAutomatedNotification(c.phone, c.name, 'bukti_bayar', msg);

    setActionMessage(`Akun ${c.name} berhasil diaktifkan dan notifikasi WA dikirimkan!`);
    onRefreshData();
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (confirm(`Hapus pelanggan ${name}? Data histori tagihan mungkin terhapus.`)) {
      DataService.deleteCustomer(id);
      setActionMessage(`Pelanggan ${name} berhasil dihapus.`);
      onRefreshData();
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleSendWaDirect = (c: Customer) => {
    const defaultMsg = `Halo Bpk/Ibu ${c.name} (${c.customerCode}), perkenalkan kami dari Customer Support AnuwaniNet. Ada yang bisa kami bantu perihal koneksi internet Anda?`;
    WhatsAppService.openWhatsAppUrl(c.phone, defaultMsg);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-red-500" />
            Manajemen Pelanggan & Aktivasi
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Daftar pelanggan, kredensial PPPoE Ruijie, isolir/un-isolir manual, dan integrasi WhatsApp.
          </p>
        </div>

        <button
          onClick={onOpenAddCustomer}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Pelanggan Baru</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-red-900/60 text-xs text-white flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama, ID Pelanggan (ANW-001), HP, PPPoE..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-red-600"
          />
        </div>

        {/* Status segmented tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs self-start md:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              statusFilter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Semua ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              statusFilter === 'active' ? 'bg-zinc-800 text-emerald-400 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Aktif ({customers.filter(c => c.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('isolated')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              statusFilter === 'isolated' ? 'bg-zinc-800 text-red-400 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Terisolir ({customers.filter(c => c.status === 'isolated').length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors ${
              statusFilter === 'pending' ? 'bg-zinc-800 text-amber-400 shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Pending ({customers.filter(c => c.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">ID & Nama</th>
                <th className="py-3 px-4">Kontak / Alamat</th>
                <th className="py-3 px-4">Paket & Biaya</th>
                <th className="py-3 px-4">Akun PPPoE / IP</th>
                <th className="py-3 px-4 text-center">Status Sambungan</th>
                <th className="py-3 px-4 text-center">Auto-Isolir</th>
                <th className="py-3 px-4 text-right">Aksi & WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-zinc-500">
                    Tidak ditemukan data pelanggan yang cocok.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => {
                  return (
                    <tr key={c.id} className="hover:bg-zinc-800/40 transition-colors">
                      {/* ID & Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="font-mono text-[11px] text-red-400 font-bold">{c.customerCode}</div>
                        <div className="text-[10px] text-zinc-500">Tgl Gabung: {c.joinDate}</div>
                      </td>

                      {/* Contact & Address */}
                      <td className="py-3 px-4 max-w-[220px]">
                        <div className="text-zinc-300 font-mono flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{c.phone}</span>
                        </div>
                        <div className="text-[11px] text-zinc-400 truncate flex items-center gap-1 mt-0.5" title={c.address}>
                          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                          <span>{c.address}</span>
                        </div>
                      </td>

                      {/* Package & Price */}
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{c.packageName}</div>
                        <div className="font-mono text-zinc-300 tabular-nums">
                          {WhatsAppService.formatRupiah(c.packagePrice)} / bln
                        </div>
                        <div className="text-[10px] text-zinc-500">Jatuh tempo tgl {c.billingDay}</div>
                      </td>

                      {/* PPPoE & IP */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="text-zinc-300">User: <span className="text-white">{c.pppoeUsername}</span></div>
                        <div className="text-zinc-400">IP: {c.ipAddress}</div>
                      </td>

                      {/* Status Sambungan */}
                      <td className="py-3 px-4 text-center">
                        {c.status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Aktif Normal
                          </span>
                        )}
                        {c.status === 'isolated' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-red-400 bg-red-950/80 border border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Terisolir Ruijie
                          </span>
                        )}
                        {c.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-900/60">
                            Menunggu Aktivasi
                          </span>
                        )}
                      </td>

                      {/* Auto-Isolir Rule */}
                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        {c.autoIsolirEnabled ? (
                          <span className="text-emerald-400 font-medium">Aktif (Tgl {c.billingDay + 2})</span>
                        ) : (
                          <span className="text-zinc-500">Nonaktif (VIP)</span>
                        )}
                      </td>

                      {/* Actions & WhatsApp Direct */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Chat WA */}
                          <button
                            onClick={() => handleSendWaDirect(c)}
                            title="Chat WhatsApp Pelanggan"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 hover:bg-emerald-950/50 hover:border-emerald-800 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Isolir / Restore Buttons */}
                          {c.status === 'isolated' ? (
                            <button
                              onClick={() => handleRestoreIsolir(c)}
                              title="Buka Isolir Ruijie Sekarang"
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                            >
                              Buka Isolir
                            </button>
                          ) : c.status === 'pending' ? (
                            <button
                              onClick={() => handleActivateAccount(c)}
                              title="Aktivasi Akun Pelanggan"
                              className="px-2 py-1 text-[11px] font-semibold rounded-md bg-amber-600 text-white hover:bg-amber-500 transition-colors shadow-sm"
                            >
                              Aktifkan
                            </button>
                          ) : (
                            <button
                              onClick={() => handleManualIsolir(c)}
                              title="Isolir Manual pada Gateway Ruijie"
                              className="p-1.5 rounded-md bg-zinc-900 border border-red-900/60 text-red-400 hover:bg-red-950/70 hover:border-red-700 transition-colors"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            onClick={() => onEditCustomer(c)}
                            title="Edit Data Pelanggan"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            title="Hapus Pelanggan"
                            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900/60 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
