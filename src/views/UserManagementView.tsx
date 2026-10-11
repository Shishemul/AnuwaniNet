import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import {
  UserCog,
  Plus,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Trash2,
  Mail,
  Phone,
  Calendar,
  Lock,
  CheckCircle2
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const {
    users,
    currentUser,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    createUserByAdmin
  } = useAuth();

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'admin' as UserRole
  });
  const [notice, setNotice] = useState<string | null>(null);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const res = createUserByAdmin({
      username: formData.username,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      status: 'active'
    });

    if (res.success) {
      setNotice(res.message);
      setShowAddModal(false);
      setFormData({ username: '', name: '', email: '', phone: '', role: 'admin' });
      setTimeout(() => setNotice(null), 4000);
    } else {
      alert(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-red-500" />
            Manajemen Pengguna (Superadmin)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Kelola hak akses sistem AnuwaniNet: Superadmin, Admin Operasional, dan Pelanggan.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-sm shadow-red-950 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah User / Admin Baru</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-800/80 text-xs text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Role explanation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-red-900/40 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-wider">
            <Shield className="w-4 h-4" /> Superadmin
          </div>
          <p className="text-xs text-zinc-400">
            Akses tak terbatas: manajemen user & peran, konfigurasi Ruijie Reyee Cloud API, koneksi Supabase, dan hapus data.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
            <UserCheck className="w-4 h-4" /> Admin Operasional
          </div>
          <p className="text-xs text-zinc-400">
            Operasional harian: aktivasi pelanggan baru, catat pembayaran & pengeluaran kas, isolir/un-isolir manual, cetak kuitansi.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
            <UserCheck className="w-4 h-4" /> Pelanggan
          </div>
          <p className="text-xs text-zinc-400">
            Portal mandiri warga: cek status koneksi internet, download kuitansi tagihan, beli voucher hotspot via WA bot otomatis.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Pengguna</th>
                <th className="py-3 px-4">Email / Telepon</th>
                <th className="py-3 px-4">Peran (Role)</th>
                <th className="py-3 px-4 text-center">Status Akun</th>
                <th className="py-3 px-4">Terdaftar / Login</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map(u => {
                const isCurrent = currentUser?.id === u.id;
                const isSuspended = u.status === 'suspended';

                return (
                  <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{u.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-900 font-mono">
                            Anda
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">@{u.username}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-zinc-300 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-zinc-500" />
                        <span>{u.email}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>{u.phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        disabled={isCurrent}
                        onChange={e => updateUserRole(u.id, e.target.value as UserRole)}
                        className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-semibold text-white focus:outline-none focus:border-red-600 disabled:opacity-60"
                      >
                        <option value="superadmin">Superadmin</option>
                        <option value="admin">Admin</option>
                        <option value="pelanggan">Pelanggan</option>
                      </select>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => !isCurrent && toggleUserStatus(u.id)}
                        disabled={isCurrent}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                          isSuspended
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                            : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                        } ${isCurrent ? 'cursor-default' : 'hover:opacity-80'}`}
                      >
                        {isSuspended ? 'Ditangguhkan' : 'Aktif'}
                      </button>
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-400">
                      <div>Gabung: {u.createdAt}</div>
                      <div className="text-zinc-500 text-[10px]">Login: {u.lastLogin || '-'}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {!isCurrent ? (
                        <button
                          onClick={() => {
                            if (confirm(`Hapus akun ${u.name}?`)) {
                              deleteUser(u.id);
                              setNotice(`User ${u.name} dihapus.`);
                              setTimeout(() => setNotice(null), 3000);
                            }
                          }}
                          className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900"
                          title="Hapus Pengguna"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-zinc-600 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                Tambah Pengguna / Admin Baru
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Nandang Mulyadi"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Username Unik</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: nandang_operator"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="Contoh: nandang@anuwani.net"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Nomor WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 081298765432"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Peran Akses (Role)</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                >
                  <option value="admin">Admin Operasional</option>
                  <option value="superadmin">Superadmin</option>
                  <option value="pelanggan">Pelanggan</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
