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
  Sliders
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unpaidCount: number;
  isolatedCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  unpaidCount,
  isolatedCount
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

  return (
    <aside className="no-print w-full md:w-64 shrink-0 border-r border-zinc-800/80 bg-zinc-950/95 p-3 sm:p-4 flex flex-col justify-between md:sticky md:top-[57px] md:self-start md:h-[calc(100vh-57px)] md:overflow-y-auto z-30">
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
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
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
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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

      {/* Footer support card */}
      <div className="pt-4 border-t border-zinc-800 text-xs text-zinc-500 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-zinc-400">AnuwaniNet Core</span>
          <span className="font-mono text-[10px] text-red-500">v2.4 LTS</span>
        </div>
        <p className="text-[11px] text-zinc-500 leading-tight">
          RT-RW Net & Ruijie Management with WhatsApp Bot
        </p>
      </div>
    </aside>
  );
};
