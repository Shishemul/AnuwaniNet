import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Database, LogIn, LogOut, Moon, Sun, Bell, Menu, X } from 'lucide-react';
import { UserRole, ThemePreference } from '../types';
import { NotificationService } from '../services/notificationService';

interface HeaderProps {
  onOpenAuth: () => void;
  onOpenSupabase: () => void;
  onOpenProfileSettings?: () => void;
  onOpenNotificationCenter?: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isSupabaseConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuth,
  onOpenSupabase,
  onOpenProfileSettings,
  onOpenNotificationCenter,
  onToggleMobileMenu,
  isMobileMenuOpen,
  setActiveTab,
  isSupabaseConnected
}) => {
  const { currentUser, logout, updateThemePreference } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(() => NotificationService.getUnreadCount());

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe(() => {
      setUnreadNotifCount(NotificationService.getUnreadCount());
    });
    return () => unsubscribe();
  }, []);

  const currentTheme: ThemePreference = currentUser?.themePreference || 'midnight';

  const handleToggleTheme = () => {
    const nextTheme: ThemePreference = currentTheme === 'midnight' ? 'clean' : 'midnight';
    updateThemePreference(nextTheme);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'superadmin':
        return <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Superadmin</span>;
      case 'admin':
        return <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Admin</span>;
      case 'pelanggan':
        return <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Pelanggan</span>;
    }
  };

  return (
    <header className="no-print sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md px-3 sm:px-6 py-2.5 sm:py-3">
      <div className="flex items-center justify-between gap-3 sm:gap-6 max-w-7xl mx-auto">
        {/* Zone 1: Brand title wordmark & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile hamburger menu toggle */}
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-red-500" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => setActiveTab?.('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-base shadow-sm shadow-red-900/50 shrink-0">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-white whitespace-nowrap">
                Anuwani<span className="text-red-500">Net</span>
              </span>
              <span className="text-[9px] sm:text-[10px] text-zinc-400 font-medium tracking-wider -mt-1 uppercase hidden xs:inline">
                ISP & Billing
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Primary Action / User Profile & Supabase */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Theme Preference Toggle Button */}
          <button
            onClick={handleToggleTheme}
            title={`Ganti Tema: ${currentTheme === 'midnight' ? 'Aktifkan Clean (High-Contrast)' : 'Aktifkan Midnight (Dark Mode)'}`}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors cursor-pointer"
          >
            {currentTheme === 'midnight' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden xl:inline text-[11px]">Midnight</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline text-[11px]">Clean</span>
              </>
            )}
          </button>

          {/* Notification Center Trigger */}
          <button
            onClick={onOpenNotificationCenter}
            title="Pusat Notifikasi Sistem (Auto-Billing, Pembayaran, Backup)"
            className="relative flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden lg:inline text-[11px]">Notifikasi</span>
            {unreadNotifCount > 0 && (
              <span className="min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse shadow-sm shadow-red-950">
                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
              </span>
            )}
          </button>

          {/* Supabase status button */}
          <button
            onClick={onOpenSupabase}
            title="Konfigurasi Supabase Database"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-red-500" />
            <span className="hidden sm:inline">DB</span>
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
          </button>

          {/* User Status / Current Role Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-800 bg-zinc-900 text-zinc-200">
            <Shield className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="hidden md:inline text-zinc-400">Peran:</span>
            {currentUser ? (
              getRoleBadge(currentUser.role)
            ) : (
              <span className="text-zinc-500 italic">Belum Login</span>
            )}
          </div>

          {/* User profile / Login */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={onOpenProfileSettings}
                title="Buka Pengaturan Profil & Tema"
                className="flex items-center gap-1.5 p-1 sm:px-2 sm:py-1 rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors text-left group cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-red-950 border border-red-800 text-red-400 flex items-center justify-center text-[11px] font-bold shrink-0">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white group-hover:text-red-400 transition-colors leading-tight truncate max-w-[120px]">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Profil
                  </span>
                </div>
              </button>

              <button
                onClick={logout}
                title="Keluar dari Akun"
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-red-400 hover:border-red-900/50 transition-colors text-xs cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors whitespace-nowrap shadow-sm shadow-red-950 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
