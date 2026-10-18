import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Receipt,
  Server,
  QrCode,
  FileText,
  UserCog,
  Smartphone,
  Wifi,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Sliders,
  X
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unpaidCount: number;
  isolatedCount: number;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unpaidCount,
  isolatedCount,
  mobileOpen = false,
  onCloseMobile
}) => {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'pelanggan';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Laporan',
      icon: LayoutDashboard,
      roles: ['superadmin', 'admin']
    },
    {
      id: 'pelanggan',
      label: 'Pelanggan & Aktivasi',
      icon: Users,
      roles: ['superadmin', 'admin']
    },
    {
      id: 'tagihan',
      label: 'Tagihan & Bayar',
      icon: Receipt,
      badge: unpaidCount > 0 ? unpaidCount : undefined,
      roles: ['superadmin', 'admin']
    },
    {
      id: 'ruijie',
      label: role === 'superadmin' ? 'Integrasi Ruijie & Isolir' : 'Isolir & Auto Isolir',
      icon: role === 'superadmin' ? Server : ShieldAlert,
      badge: isolatedCount > 0 ? `${isolatedCount} isolir` : undefined,
      badgeColor: 'text-red-400 bg-red-950/80 border-red-800',
      roles: ['superadmin', 'admin']
    },
    {
      id: 'voucher_wa',
      label: 'Voucher & Bot WA',
      icon: Smartphone,
      roles: ['superadmin', 'admin', 'pelanggan']
    },
    {
      id: 'laporan',
      label: 'Laporan & Export',
      icon: FileText,
      roles: ['superadmin', 'admin']
    },
    {
      id: 'portal_pelanggan',
      label: 'Portal Pelanggan',
      icon: Wifi,
      roles: ['pelanggan', 'superadmin', 'admin']
    },
    {
      id: 'users',
      label: 'Manajemen Pengguna',
      icon: UserCog,
      roles: ['superadmin']
    },
    {
      id: 'pengaturan_sistem',
      label: 'Pengaturan Sistem',
      icon: Sliders,
      badge: 'Superadmin',
      badgeColor: 'text-red-400 bg-red-950 border-red-800',
      roles: ['superadmin']
    }
  ];

  const visibleNav = navItems.filter(item => item.roles.includes(role));

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const navContent = (
    <div className="space-y-6">
      {/* Navigation list */}
      <div className="space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          Navigasi Utama
        </div>
        {visibleNav.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm shadow-red-950 font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/90'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded border font-mono tabular-nums ${
                    item.badgeColor || (isActive ? 'bg-white/20 text-white border-white/20' : 'bg-red-950 text-red-400 border-red-900/60')
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ruijie Gateway Status Widget */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Gateway Ruijie Reyee
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>
        <div className="text-xs text-zinc-300 font-mono tabular-nums">
          IP: 192.168.10.1 (Site: ANW-01)
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800 text-[11px] text-zinc-400">
          <div>
            <span>CPU:</span>{' '}
            <span className="font-mono text-zinc-200 tabular-nums font-semibold">22%</span>
          </div>
          <div>
            <span>Memori:</span>{' '}
            <span className="font-mono text-zinc-200 tabular-nums font-semibold">38%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const footerContent = (
    <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-zinc-400">AnuwaniNet Core</span>
        <span className="font-mono text-[10px] text-red-500 font-bold">v2.4 LTS</span>
      </div>
      <p className="text-[11px] text-zinc-500 leading-tight">
        RT-RW Net & Ruijie Management with WhatsApp Bot
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop Permanent Docked Sidebar */}
      <aside className="no-print hidden md:flex w-64 shrink-0 border-r border-zinc-800/80 bg-zinc-950/95 p-3 sm:p-4 flex-col justify-between sticky top-[57px] self-start h-[calc(100vh-57px)] overflow-y-auto z-30">
        {navContent}
        {footerContent}
      </aside>

      {/* Mobile Drawer (Visible when mobileOpen is true on < md) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />

          {/* Drawer Panel */}
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 p-4 shadow-2xl flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-left duration-250">
            <div className="space-y-5">
              {/* Drawer Top Header with Logo and Close Button */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center font-black text-white text-sm">
                    A
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white tracking-tight">
                      Anuwani<span className="text-red-500">Net</span>
                    </span>
                    <span className="block text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
                      Menu Navigasi
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
                  aria-label="Tutup menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {navContent}
            </div>

            {footerContent}
          </aside>
        </div>
      )}
    </>
  );
};
