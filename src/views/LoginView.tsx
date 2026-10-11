import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemePreference } from '../types';
import {
  Shield,
  UserCheck,
  Users,
  Wifi,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Sun,
  Moon,
  Info,
  CheckCircle2,
  Server,
  Zap,
  Globe
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, register, updateThemePreference, currentUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login Form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Register Form (strictly for 'pelanggan' only)
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);

  // Temporary theme state for guest screen before login
  const [activeTheme, setActiveTheme] = useState<ThemePreference>(() => {
    return (document.documentElement.getAttribute('data-theme') as ThemePreference) || 'midnight';
  });

  const toggleTheme = (targetTheme: ThemePreference) => {
    setActiveTheme(targetTheme);
    document.documentElement.setAttribute('data-theme', targetTheme);
    if (targetTheme === 'clean') {
      document.documentElement.classList.add('theme-clean');
      document.documentElement.classList.remove('theme-midnight');
    } else {
      document.documentElement.classList.add('theme-midnight');
      document.documentElement.classList.remove('theme-clean');
    }
    if (currentUser) {
      updateThemePreference(targetTheme);
    }
  };

  const handleLogin = (e?: React.FormEvent, customUser?: string) => {
    if (e) e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    const target = customUser || identifier;
    if (!target.trim()) {
      setLoginError('Silakan masukkan Username atau Email Anda.');
      setLoginLoading(false);
      return;
    }

    setTimeout(() => {
      const result = login(target, password);
      setLoginLoading(false);
      if (!result.success) {
        setLoginError(result.message);
      }
    }, 250);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);

    if (!regName.trim() || !regUsername.trim() || !regPhone.trim() || !regEmail.trim()) {
      setRegError('Mohon isi semua data formulir pendaftaran dengan lengkap.');
      return;
    }

    // Hanya bisa mendaftar sebagai pelanggan
    const result = register({
      username: regUsername.trim(),
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim(),
      role: 'pelanggan',
      password: regPassword
    });

    if (result.success) {
      setRegSuccess(result.message);
    } else {
      setRegError(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-red-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-red-950/40">
            A
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">AnuwaniNet</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60">
                Core Billing
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Sistem Manajemen ISP, Voucher WiFi, Ruijie Reyee & DANA Gateways
            </p>
          </div>
        </div>

        {/* Theme preference toggle & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => toggleTheme('midnight')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTheme === 'midnight'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Aktifkan Tema Midnight Dark"
            >
              <Moon className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Midnight</span>
            </button>
            <button
              onClick={() => toggleTheme('clean')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTheme === 'clean'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Aktifkan Tema Clean High-Contrast"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Clean</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>NOC Server Online</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10 my-4">
        <div className="w-full max-w-xl">
          {/* Card Frame */}
          <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
            {/* Title & Badge */}
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-semibold">
                <Wifi className="w-3.5 h-3.5" />
                <span>Portal Resmi Akses Jaringan AnuwaniNet</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {mode === 'login' ? 'Selamat Datang Kembali' : 'Pendaftaran Pelanggan Baru'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
                {mode === 'login'
                  ? 'Silakan masuk menggunakan akun Anda untuk mengelola jaringan, tagihan, atau layanan internet rumah Anda.'
                  : 'Daftarkan data Anda sebagai Pelanggan resmi AnuwaniNet untuk memantau status langganan dan tagihan bulanan.'}
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-zinc-950 border border-zinc-800 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  mode === 'login'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span>Masuk Akun</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegError(null);
                  setRegSuccess(null);
                }}
                className={`py-2 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  mode === 'register'
                    ? 'bg-red-600 text-white shadow-md shadow-red-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Daftar Pelanggan</span>
              </button>
            </div>

            {/* TAB 1: FORM LOGIN */}
            {mode === 'login' && (
              <div className="space-y-5">
                {loginError && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={e => handleLogin(e)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Username atau Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: superadmin atau budi_santoso"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Kata Sandi / PIN</span>
                      <span className="text-[11px] text-zinc-400">Demo: bebas diisi</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loginLoading ? (
                      <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <span>Masuk ke Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Demo Accounts Selection */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      Uji Coba Cepat (Akun Demo):
                    </span>
                    <span className="text-[10px] text-zinc-400">Klik untuk langsung masuk</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Superadmin */}
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('superadmin');
                        handleLogin(undefined, 'superadmin');
                      }}
                      className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-red-900/40 hover:border-red-600/70 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-red-400 transition-colors">
                            Superadmin
                          </div>
                          <div className="text-[10px] text-zinc-400">Akses Penuh & Pengaturan</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Login &rarr;
                      </span>
                    </button>

                    {/* Admin Operator */}
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('admin1');
                        handleLogin(undefined, 'admin1');
                      }}
                      className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-800 flex items-center justify-center text-blue-400">
                          <Server className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            Admin Staff
                          </div>
                          <div className="text-[10px] text-zinc-400">Operasional Billing</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Login &rarr;
                      </span>
                    </button>

                    {/* Pelanggan 1 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('budi_santoso');
                        handleLogin(undefined, 'budi_santoso');
                      }}
                      className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                            Budi Santoso
                          </div>
                          <div className="text-[10px] text-zinc-400">Pelanggan Paket Hemat</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Login &rarr;
                      </span>
                    </button>

                    {/* Pelanggan 2 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier('siti_rahma');
                        handleLogin(undefined, 'siti_rahma');
                      }}
                      className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-zinc-700 text-left transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-emerald-400 transition-colors">
                            Siti Rahmawati
                          </div>
                          <div className="text-[10px] text-zinc-400">Pelanggan Paket Super</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        Login &rarr;
                      </span>
                    </button>
                  </div>
                </div>

                <div className="text-center text-xs text-zinc-400 pt-1">
                  Warga pengguna internet baru?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setRegError(null);
                    }}
                    className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                  >
                    Daftar Sebagai Pelanggan
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: FORM REGISTRASI (KHUSUS PELANGGAN) */}
            {mode === 'register' && (
              <div className="space-y-4">
                {regError && (
                  <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                {regSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-300 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{regSuccess}</span>
                  </div>
                )}

                {/* Role Restriction Banner */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-300">
                      Peran Akun Pendaftaran:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Pelanggan (Warga Pengguna Internet)
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Sistem membatasi pendaftaran mandiri publik <strong className="text-zinc-200">hanya untuk Pelanggan</strong>. Akun petugas Admin & Superadmin hanya dapat dibuat langsung oleh Administrator melalui panel manajemen pengguna.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Nama Lengkap Pelanggan
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Rian Gunawan"
                        value={regName}
                        onChange={e => setRegName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">
                        Username Unik
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="rian_gunawan"
                        value={regUsername}
                        onChange={e => setRegUsername(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">
                        No. WhatsApp / HP
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="081234567890"
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value)}
                          className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="rian@gmail.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Kata Sandi / PIN Akun
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        placeholder="Minimal 6 karakter"
                        value={regPassword}
                        onChange={e => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-950/50 transition-all cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Daftar & Masuk Sebagai Pelanggan</span>
                  </button>
                </form>

                <div className="text-center text-xs text-zinc-400 pt-1">
                  Sudah memiliki akun terdaftar?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setRegError(null);
                    }}
                    className="text-red-400 hover:text-red-300 font-bold hover:underline cursor-pointer"
                  >
                    Kembali ke Login
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Features Footer Notice */}
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[10px] text-zinc-400">
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex flex-col items-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-300">DANA Gateway</span>
              <span className="text-zinc-400">QRIS & Dompet Digital</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex flex-col items-center gap-1">
              <Globe className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-zinc-300">Ruijie Reyee</span>
              <span className="text-zinc-400">Cloud Sync & Auto Isolir</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex flex-col items-center gap-1">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-zinc-300">Fonnte WA Bot</span>
              <span className="text-zinc-400">Notifikasi Tagihan Otomatis</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 px-4 py-3 text-center text-xs text-zinc-400">
        <p>&copy; {new Date().getFullYear()} AnuwaniNet ISP System &bull; Versi 2.5 Enterprise Billing &bull; Keamanan Multi-Role Terproteksi</p>
      </footer>
    </div>
  );
};
