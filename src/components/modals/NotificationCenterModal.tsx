import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  CalendarCheck,
  CheckCircle2,
  Database,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Filter,
  DollarSign,
  HardDriveDownload,
  AlertTriangle,
  Info
} from 'lucide-react';
import { SystemNotification, NotificationEventType } from '../../types';
import { NotificationService } from '../../services/notificationService';
import { DataService } from '../../services/dataService';
import { executeDatabaseBackup } from '../../services/supabaseService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTab
}) => {
  const [notifications, setNotifications] = useState<SystemNotification[]>(() =>
    NotificationService.getNotifications()
  );
  const [filterType, setFilterType] = useState<string>('all');
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulateBar, setShowSimulateBar] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribe = NotificationService.subscribe(updated => {
      setNotifications(updated);
    });
    // Sync on open
    if (isOpen) {
      setNotifications(NotificationService.getNotifications());
    }
    return () => unsubscribe();
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !item.read;
    return item.type === filterType;
  });

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    if (window.confirm('Bersihkan semua riwayat notifikasi sistem?')) {
      NotificationService.clearAll();
    }
  };

  const handleItemClick = (id: string, type: NotificationEventType) => {
    NotificationService.markAsRead(id);
    if (type === 'auto_billing' && onNavigateToTab) {
      onNavigateToTab('tagihan');
      onClose();
    } else if (type === 'payment_received' && onNavigateToTab) {
      onNavigateToTab('transaksi');
      onClose();
    } else if (type === 'backup_status' && onNavigateToTab) {
      onNavigateToTab('pengaturan_sistem');
      onClose();
    }
  };

  // Quick testing simulator triggers
  const handleTriggerSimulatedAutoBilling = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const res = DataService.checkAndRunAutoBilling(true);
      if (!res.triggered) {
        NotificationService.logAutoBilling({
          generatedCount: 6,
          period: new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date()),
          details: 'Simulasi trigger: 6 lembar tagihan bulanan baru diterbitkan & siap dikirimkan via WhatsApp Bot.'
        });
      }
      setIsSimulating(false);
    }, 400);
  };

  const handleTriggerSimulatedPayment = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const customers = DataService.getCustomers();
      const sampleCust = customers[Math.floor(Math.random() * customers.length)] || {
        name: 'Ahmad Fauzi',
        customerCode: 'ANW-104'
      };
      const amounts = [150000, 200000, 250000, 350000];
      const selectedAmount = amounts[Math.floor(Math.random() * amounts.length)];
      NotificationService.logPaymentReceived({
        billNumber: `INV-${new Date().getFullYear()}10-${Math.floor(100 + Math.random() * 900)}`,
        customerName: sampleCust.name,
        amount: selectedAmount,
        paymentMethod: Math.random() > 0.5 ? 'DANA E-Wallet & QRIS' : 'Transfer Bank BCA'
      });
      setIsSimulating(false);
    }, 400);
  };

  const handleTriggerSimulatedBackup = async () => {
    setIsSimulating(true);
    try {
      await executeDatabaseBackup('manual', false);
    } catch {
      // already logged in service
    }
    setIsSimulating(false);
  };

  const getEventIcon = (type: NotificationEventType, level: string) => {
    switch (type) {
      case 'auto_billing':
        return <CalendarCheck className="w-4 h-4 text-sky-400" />;
      case 'payment_received':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'backup_status':
        return <Database className="w-4 h-4 text-amber-400" />;
      case 'ruijie_isolation':
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      default:
        return level === 'error' ? (
          <AlertTriangle className="w-4 h-4 text-red-400" />
        ) : (
          <Info className="w-4 h-4 text-zinc-300" />
        );
    }
  };

  const getEventCategoryLabel = (type: NotificationEventType) => {
    switch (type) {
      case 'auto_billing':
        return 'Auto-Billing';
      case 'payment_received':
        return 'Pembayaran Masuk';
      case 'backup_status':
        return 'Cadangan Database';
      case 'ruijie_isolation':
        return 'Isolir Ruijie';
      default:
        return 'Sistem';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-2 sm:p-4 sm:pt-16 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        ref={overlayRef}
        className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden animate-in slide-in-from-top-3 duration-200"
      >
        {/* Header Zone */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800/80 text-red-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Notification Center
                </h2>
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-bold text-red-400 font-mono">
                    {unreadCount} Baru
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400">
                    Semua Terbaca
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                Log real-time auto-billing, pembayaran, dan pencadangan sistem
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSimulateBar(!showSimulateBar)}
              title="Panel Uji Coba Cepat Sistem"
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                showSimulateBar
                  ? 'bg-red-950 border-red-800 text-red-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Testing & Simulation Toolbar (Optional Collapsible) */}
        {showSimulateBar && (
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 text-xs space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                Simulasi Event Sistem:
              </span>
              <span className="text-[10px] text-zinc-400">
                Klik untuk menguji log realtime
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleTriggerSimulatedAutoBilling}
                disabled={isSimulating}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-sky-950/60 border border-zinc-800 hover:border-sky-800 text-zinc-200 hover:text-sky-300 transition-colors flex items-center justify-center gap-1 text-[11px] font-medium"
              >
                <CalendarCheck className="w-3.5 h-3.5 text-sky-400" />
                <span>Auto-Billing</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerSimulatedPayment}
                disabled={isSimulating}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-950/60 border border-zinc-800 hover:border-emerald-800 text-zinc-200 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1 text-[11px] font-medium"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pembayaran</span>
              </button>
              <button
                type="button"
                onClick={handleTriggerSimulatedBackup}
                disabled={isSimulating}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-amber-950/60 border border-zinc-800 hover:border-amber-800 text-zinc-200 hover:text-amber-300 transition-colors flex items-center justify-center gap-1 text-[11px] font-medium"
              >
                <HardDriveDownload className="w-3.5 h-3.5 text-amber-400" />
                <span>Backup DB</span>
              </button>
            </div>
          </div>
        )}

        {/* Filter Bar (Segmented Controls) & Action Tools */}
        <div className="px-3.5 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-2 text-xs">
          {/* Segmented Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Semua ({notifications.length})
            </button>
            <button
              onClick={() => setFilterType('unread')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors whitespace-nowrap ${
                filterType === 'unread'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Belum Dibaca {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setFilterType('auto_billing')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors whitespace-nowrap ${
                filterType === 'auto_billing'
                  ? 'bg-zinc-800 text-sky-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Billing
            </button>
            <button
              onClick={() => setFilterType('payment_received')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors whitespace-nowrap ${
                filterType === 'payment_received'
                  ? 'bg-zinc-800 text-emerald-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Pembayaran
            </button>
            <button
              onClick={() => setFilterType('backup_status')}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-colors whitespace-nowrap ${
                filterType === 'backup_status'
                  ? 'bg-zinc-800 text-amber-400 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Backup
            </button>
          </div>

          {/* Quick Operations: Mark all read / Clear */}
          <div className="flex items-center gap-1 shrink-0">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="p-1 rounded text-zinc-400 hover:text-emerald-400 transition-colors"
                title="Tandai semua telah dibaca"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1 rounded text-zinc-400 hover:text-red-400 transition-colors"
                title="Bersihkan riwayat notifikasi"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Notification List Scroll Zone */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/70 p-2 space-y-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400">
                <Bell className="w-6 h-6 stroke-1" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-zinc-300">
                  {filterType === 'unread' ? 'Tidak ada notifikasi belum dibaca' : 'Belum ada notifikasi sistem'}
                </p>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  Semua kejadian otomatis seperti penerbitan tagihan, pembayaran terverifikasi, dan status backup database akan tercatat di sini.
                </p>
              </div>
            </div>
          ) : (
            filteredNotifications.map(item => {
              const relativeTime = NotificationService.formatRelativeTime(item.timestampMs);
              const isUnread = !item.read;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id, item.type)}
                  className={`p-3 rounded-xl transition-all cursor-pointer group ${
                    isUnread
                      ? 'bg-zinc-950/70 border-l-2 border-red-500 hover:bg-zinc-950'
                      : 'hover:bg-zinc-800/40 opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Event Icon container */}
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                        item.type === 'auto_billing'
                          ? 'bg-sky-950/60 border-sky-900/60'
                          : item.type === 'payment_received'
                          ? 'bg-emerald-950/60 border-emerald-900/60'
                          : item.type === 'backup_status'
                          ? 'bg-amber-950/60 border-amber-900/60'
                          : item.type === 'ruijie_isolation'
                          ? 'bg-rose-950/60 border-rose-900/60'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      {getEventIcon(item.type, item.level)}
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Quiet Unboxed Metadata Line (No Pill Enclosures) */}
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                        <span className="font-semibold text-zinc-300">
                          {getEventCategoryLabel(item.type)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{relativeTime}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono text-[10px] text-zinc-400">
                          {item.timestamp}
                        </span>
                        {isUnread && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-950 shrink-0" />
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        className={`text-xs leading-snug tracking-tight ${
                          isUnread ? 'font-bold text-white' : 'font-medium text-zinc-200'
                        }`}
                      >
                        {item.title}
                      </h3>

                      {/* Message text */}
                      <p className="text-[11px] text-zinc-400 leading-relaxed break-words">
                        {item.message}
                      </p>

                      {/* Optional Rich Metadata Row */}
                      {item.metadata && (
                        <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-zinc-400 font-mono">
                          {item.metadata.billNumber && (
                            <span>Tagihan: <strong className="text-zinc-300">{item.metadata.billNumber}</strong></span>
                          )}
                          {item.metadata.customerName && (
                            <span>Pelanggan: <strong className="text-zinc-300">{item.metadata.customerName}</strong></span>
                          )}
                          {item.metadata.amount !== undefined && (
                            <span>Nominal: <strong className="text-emerald-400">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.metadata.amount)}</strong></span>
                          )}
                          {item.metadata.recordsCount !== undefined && (
                            <span>Catatan: <strong className="text-zinc-300">{item.metadata.recordsCount} data</strong></span>
                          )}
                          {item.metadata.backupSizeKb !== undefined && (
                            <span>Ukuran: <strong className="text-amber-400">{item.metadata.backupSizeKb} KB</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Zone */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sistem Pemantauan Otomatis Aktif</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white font-medium text-[11px] transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
