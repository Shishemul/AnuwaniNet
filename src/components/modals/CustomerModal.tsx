import React, { useState, useEffect } from 'react';
import { Customer, CustomerStatus, InternetPackage } from '../../types';
import { DataService } from '../../services/dataService';
import { WhatsAppService } from '../../services/whatsappService';
import { X, Users, Check, AlertCircle } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit: Customer | null;
  packages: InternetPackage[];
  onSaved: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
  packages,
  onSaved
}) => {
  const [formData, setFormData] = useState<Partial<Customer>>({
    customerCode: '',
    name: '',
    phone: '',
    address: '',
    email: '',
    packageId: packages[0]?.id || 'pkg-1',
    packageName: packages[0]?.name || 'Paket Hemat 10 Mbps',
    packagePrice: packages[0]?.price || 100000,
    pppoeUsername: '',
    pppoePassword: '',
    ipAddress: '192.168.10.25',
    macAddress: '',
    status: 'active',
    autoIsolirEnabled: true,
    billingDay: 20,
    ruijieDeviceId: 'dev-1',
    notes: ''
  });

  useEffect(() => {
    if (customerToEdit) {
      setFormData(customerToEdit);
    } else {
      // New customer default values
      const existing = DataService.getCustomers();
      const nextCode = `ANW-${String(existing.length + 1).padStart(3, '0')}`;
      const defaultPkg = packages.find(p => p.type === 'bulanan') || packages[0];
      setFormData({
        customerCode: nextCode,
        name: '',
        phone: '',
        address: '',
        email: '',
        packageId: defaultPkg?.id || 'pkg-1',
        packageName: defaultPkg?.name || 'Paket Hemat 10 Mbps',
        packagePrice: defaultPkg?.price || 100000,
        pppoeUsername: `user_${nextCode.toLowerCase().replace('-', '')}`,
        pppoePassword: `pass_${Math.floor(1000 + Math.random() * 9000)}`,
        ipAddress: `192.168.10.${existing.length + 20}`,
        macAddress: 'DC:A6:32:' + Math.floor(10 + Math.random() * 89) + ':' + Math.floor(10 + Math.random() * 89),
        status: 'active',
        autoIsolirEnabled: true,
        billingDay: 20,
        ruijieDeviceId: 'dev-1',
        notes: ''
      });
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handlePackageChange = (pkgId: string) => {
    const pkg = packages.find(p => p.id === pkgId);
    if (pkg) {
      setFormData(prev => ({
        ...prev,
        packageId: pkg.id,
        packageName: pkg.name,
        packagePrice: pkg.price
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.customerCode) {
      alert('Nama, Nomor WhatsApp, dan Kode Pelanggan wajib diisi.');
      return;
    }

    if (customerToEdit) {
      DataService.updateCustomer(formData as Customer);
    } else {
      const newCust: Customer = {
        ...(formData as Customer),
        id: 'cust-' + Date.now(),
        joinDate: new Date().toISOString().split('T')[0]
      };
      DataService.updateCustomer(newCust);

      // Send initial welcome WhatsApp
      const welcomeMsg = `Halo Bpk/Ibu *${newCust.name}*,\n\nTerima kasih telah bergabung bersama *AnuwaniNet*!\n\nID Pelanggan Anda: *${newCust.customerCode}*\nPaket: *${newCust.packageName}*\nUsername PPPoE: *${newCust.pppoeUsername}*\nJatuh Tempo: Setiap tgl ${newCust.billingDay}\n\nSelamat menikmati koneksi internet stabil & cepat!`;
      WhatsAppService.sendAutomatedNotification(newCust.phone, newCust.name, 'bukti_bayar', welcomeMsg);
    }

    onSaved();
    onClose();
  };

  const monthlyPackages = packages.filter(p => p.type === 'bulanan');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-red-500" />
            <h2 className="text-base font-bold text-white">
              {customerToEdit ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
            </h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Code & Name */}
            <div>
              <label className="block text-zinc-400 mb-1">Kode Pelanggan (ID)</label>
              <input
                type="text"
                required
                value={formData.customerCode}
                onChange={e => setFormData({ ...formData, customerCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Nama Lengkap Pelanggan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>

            {/* Phone & Address */}
            <div>
              <label className="block text-zinc-400 mb-1">Nomor WhatsApp (Aktif)</label>
              <input
                type="text"
                required
                placeholder="08xxxxxxxxxx"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Email (Opsional)</label>
              <input
                type="email"
                placeholder="budi@gmail.com"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Alamat Pemasangan</label>
            <textarea
              rows={2}
              required
              placeholder="Jl. Merpati RT 02 / RW 04 No. 12"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
            {/* Package Selection */}
            <div>
              <label className="block text-zinc-400 mb-1">Paket Layanan Bulanan</label>
              <select
                value={formData.packageId}
                onChange={e => handlePackageChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              >
                {monthlyPackages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.speedMbps} Mbps) - {WhatsAppService.formatRupiah(pkg.price)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Tanggal Jatuh Tempo Bulanan</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={formData.billingDay}
                  onChange={e => setFormData({ ...formData, billingDay: parseInt(e.target.value) || 20 })}
                  className="w-24 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
                <span className="text-zinc-400">setiap bulan</span>
              </div>
            </div>
          </div>

          {/* Ruijie PPPoE Credentials */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <div className="font-semibold text-zinc-200">Kredensial Sambungan Ruijie Reyee Gateway:</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">PPPoE Username</label>
                <input
                  type="text"
                  required
                  value={formData.pppoeUsername}
                  onChange={e => setFormData({ ...formData, pppoeUsername: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">PPPoE Password</label>
                <input
                  type="text"
                  required
                  value={formData.pppoePassword}
                  onChange={e => setFormData({ ...formData, pppoePassword: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">IP Address Klien</label>
                <input
                  type="text"
                  value={formData.ipAddress}
                  onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>
            </div>
          </div>

          {/* Status & Auto-Isolir Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 mb-1">Status Sambungan Awal</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              >
                <option value="active">Aktif Normal</option>
                <option value="isolated">Terisolir Ruijie</option>
                <option value="pending">Pending (Menunggu Teknisi)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="autoIsolirCheck"
                checked={formData.autoIsolirEnabled}
                onChange={e => setFormData({ ...formData, autoIsolirEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-red-600 focus:ring-red-500 bg-zinc-950 border-zinc-800"
              />
              <label htmlFor="autoIsolirCheck" className="text-zinc-300 select-none">
                Aktifkan Auto-Isolir Ruijie saat terlambat bayar
              </label>
            </div>
          </div>

          <div>
            <label className="block text-zinc-400 mb-1">Catatan Teknisi / ODP</label>
            <input
              type="text"
              placeholder="Contoh: ODP-02 Port 3, Redaman -19 dBm"
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
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
              Simpan Pelanggan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
