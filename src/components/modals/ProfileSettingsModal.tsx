import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ThemePreference } from '../../types';
import {
  X,
  User,
  Moon,
  Sun,
  Shield,
  Phone,
  Mail,
  CheckCircle,
  Save,
  Check,
  Sparkles,
  Calendar,
  Clock
} from 'lucide-react';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, updateThemePreference, updateProfile } = useAuth();

  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (!isOpen || !currentUser) return null;

  const currentTheme: ThemePreference = currentUser.themePreference || 'midnight';

  const handleSelectTheme = (theme: ThemePreference) => {
    updateThemePreference(theme);
    setSavedNotice(`Tema berhasil diubah ke "${theme === 'clean' ? 'Clean (Kontras Tinggi)' : 'Midnight (Mode Gelap)'}" dan disimpan ke profil Anda.`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateProfile({
      name,
      phone,
      email
    });
    if (res.success) {
      setSavedNotice(res.message);
      setTimeout(() => setSavedNotice(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pengaturan Profil & Tema</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                  {currentUser.role.toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Kelola data akun dan preferensi tampilan antarmuka Anda
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

        {savedNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* SECTION 1: THEME PREFERENCE TOGGLE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Preferensi Tema Tampilan Pengguna</span>
              </label>
              <p className="text-[11px] text-zinc-400">
                Pilih tema tampilan favorit Anda. Preferensi tersimpan permanen di profil akun Anda.
              </p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
              Aktif: {currentTheme.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Midnight Theme Card */}
            <button
              type="button"
              onClick={() => handleSelectTheme('midnight')}
              className={`p-4 rounded-xl border text-left transition-all relative group flex flex-col justify-between ${
                currentTheme === 'midnight'
                  ? 'bg-zinc-950 border-red-600 shadow-md shadow-red-950/50 ring-1 ring-red-600/50'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-blue-400 shadow-inner">
                    <Moon className="w-4 h-4" />
                  </div>
                  {currentTheme === 'midnight' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800/60">
                      <Check className="w-3 h-3" />
                      Terpilih
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Midnight</span>
                    <span className="text-[10px] text-zinc-400 font-normal">(Dark Mode)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Mode gelap elegan dengan nuansa zinc pekat, kontras lembut, dan kenyamanan mata di malam hari.
                  </p>
                </div>
              </div>

              {/* Visual preview bar */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-700" />
                <div className="w-3.5 h-3.5 rounded-full bg-zinc-900 border border-zinc-700" />
                <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                <span className="text-[10px] text-zinc-400 ml-auto">Nuansa Gelap Pekat</span>
              </div>
            </button>

            {/* Clean Theme Card */}
            <button
              type="button"
              onClick={() => handleSelectTheme('clean')}
              className={`p-4 rounded-xl border text-left transition-all relative group flex flex-col justify-between ${
                currentTheme === 'clean'
                  ? 'bg-slate-900 border-red-600 shadow-md shadow-red-950/50 ring-1 ring-red-600/50'
                  : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 shadow-inner">
                    <Sun className="w-4 h-4" />
                  </div>
                  {currentTheme === 'clean' && (
                    <span className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800/60">
                      <Check className="w-3 h-3" />
                      Terpilih
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>Clean</span>
                    <span className="text-[10px] text-zinc-400 font-normal">(High-Contrast)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Tema kontras tinggi bersih dengan latar terang, batas tajam, dan pembacaan teks yang sangat jelas.
                  </p>
                </div>
              </div>

              {/* Visual preview bar */}
              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-100 border border-slate-300" />
                <div className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300" />
                <div className="w-3.5 h-3.5 rounded-full bg-red-600" />
                <span className="text-[10px] text-zinc-400 ml-auto">Kontras Tinggi Bersih</span>
              </div>
            </button>
          </div>
        </div>

        {/* SECTION 2: EDIT PROFILE DATA */}
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <label className="text-xs font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-red-400" />
            <span>Informasi Pribadi & Kontak</span>
          </label>

          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1">Nama Lengkap</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 mb-1">Username (ID Akun)</label>
                <input
                  type="text"
                  disabled
                  value={currentUser.username}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950/50 border border-zinc-800/50 text-zinc-400 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">No. WhatsApp / HP</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-red-600"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500 transition-colors shadow-md shadow-red-950 text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: ACCOUNT METADATA */}
        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>Terdaftar Sejak:</span>
            </span>
            <span className="font-mono text-zinc-200">{currentUser.createdAt}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Login Terakhir:</span>
            </span>
            <span className="font-mono text-zinc-200">{currentUser.lastLogin || '-'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Status Akun:</span>
            </span>
            <span className="text-emerald-400 font-semibold uppercase">{currentUser.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
