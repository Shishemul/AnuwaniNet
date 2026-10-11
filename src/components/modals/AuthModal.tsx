import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { LogIn, UserPlus, Shield, X, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Register fields
  const [regData, setRegData] = useState({
    username: '',
    name: '',
    email: '',
    phone: '',
    role: 'pelanggan' as UserRole
  });

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(identifier, password);
    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = register({
      username: regData.username,
      name: regData.name,
      email: regData.email,
      phone: regData.phone,
      role: regData.role
    });

    if (res.success) {
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-base">
              A
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isRegisterMode ? 'Pendaftaran Akun Baru' : 'Masuk ke AnuwaniNet'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Sistem Manajemen Keuangan & ISP Pelanggan
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-xs text-red-300">
            {error}
          </div>
        )}

        {!isRegisterMode ? (
          /* LOGIN FORM */
          <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Username atau Email</label>
              <input
                type="text"
                required
                placeholder="superadmin / admin / budi_santoso"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Kata Sandi</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors shadow-sm shadow-red-950"
              >
                Masuk ke Sistem
              </button>
            </div>

            {/* Quick Demo Credentials */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <div className="font-semibold text-zinc-300">Akun Demo Cepat:</div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIdentifier('superadmin')}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-red-400 hover:bg-zinc-700 font-mono"
                >
                  superadmin
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifier('admin1')}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono"
                >
                  admin1
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifier('budi_santoso')}
                  className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 font-mono"
                >
                  budi_santoso (Pelanggan)
                </button>
              </div>
            </div>

            <div className="text-center pt-2 text-zinc-400">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => setIsRegisterMode(true)}
                className="text-red-400 hover:underline font-semibold"
              >
                Daftar Pelanggan Baru
              </button>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="Contoh: Rian Gunawan"
                value={regData.name}
                onChange={e => setRegData({ ...regData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-400 mb-1">Username</label>
                <input
                  type="text"
                  required
                  placeholder="rian_gunawan"
                  value={regData.username}
                  onChange={e => setRegData({ ...regData, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">No. WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="081234567890"
                  value={regData.phone}
                  onChange={e => setRegData({ ...regData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="rian@gmail.com"
                value={regData.email}
                onChange={e => setRegData({ ...regData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Pilih Peran Akun</label>
              <select
                value={regData.role}
                onChange={e => setRegData({ ...regData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              >
                <option value="pelanggan">Pelanggan (Warga Pengguna Internet)</option>
                <option value="admin">Admin Operasional</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors"
              >
                Selesaikan Pendaftaran
              </button>
            </div>

            <div className="text-center pt-1 text-zinc-400">
              Sudah punya akun?{' '}
              <button
                type="button"
                onClick={() => setIsRegisterMode(false)}
                className="text-red-400 hover:underline font-semibold"
              >
                Kembali ke Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
