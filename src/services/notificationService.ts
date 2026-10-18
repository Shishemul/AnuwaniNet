import { SystemNotification, NotificationEventType, NotificationLevel } from '../types';

const STORAGE_KEY = 'anw_system_notifications_v1';

type NotificationListener = (notifications: SystemNotification[]) => void;
const listeners: Set<NotificationListener> = new Set();

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-demo-1',
    title: 'Auto-Billing Tagihan Bulanan',
    message: 'Sistem auto-billing otomatis menerbitkan 14 lembar tagihan baru untuk periode berjalan dengan batas jatuh tempo tanggal 20.',
    type: 'auto_billing',
    level: 'info',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    timestampMs: Date.now() - 15 * 60 * 1000,
    read: false,
    metadata: {
      recordsCount: 14,
      period: 'Oktober 2026',
      triggerType: 'scheduled'
    }
  },
  {
    id: 'notif-demo-2',
    title: 'Pembayaran Diterima (DANA QRIS)',
    message: 'Pembayaran tagihan INV-202610-003 an. Budi Santoso sebesar Rp 150.000 telah lunas terverifikasi via DANA Gateway.',
    type: 'payment_received',
    level: 'success',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    timestampMs: Date.now() - 45 * 60 * 1000,
    read: false,
    metadata: {
      billNumber: 'INV-202610-003',
      customerName: 'Budi Santoso',
      amount: 150000,
      paymentMethod: 'DANA E-Wallet & QRIS'
    }
  },
  {
    id: 'notif-demo-3',
    title: 'Pencadangan Database Terjadwal Berhasil',
    message: 'Auto-backup sistem berhasil diekspor. 5 tabel (128 records) tersimpan aman di Database Mirror & Local Snapshot (48.5 KB).',
    type: 'backup_status',
    level: 'success',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    timestampMs: Date.now() - 3 * 3600 * 1000,
    read: true,
    metadata: {
      recordsCount: 128,
      backupSizeKb: 48.5,
      triggerType: 'scheduled'
    }
  },
  {
    id: 'notif-demo-4',
    title: 'Pembayaran Tagihan Diterima (Tunai)',
    message: 'Kasir mengonfirmasi penerimaan tunai INV-202610-007 an. Siti Aminah sebesar Rp 250.000. Kuitansi resmi diterbitkan.',
    type: 'payment_received',
    level: 'success',
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    timestampMs: Date.now() - 6 * 3600 * 1000,
    read: true,
    metadata: {
      billNumber: 'INV-202610-007',
      customerName: 'Siti Aminah',
      amount: 250000,
      paymentMethod: 'Tunai (Cash)'
    }
  },
  {
    id: 'notif-demo-5',
    title: 'Pemeriksaan Isolir Ruijie Cloud',
    message: 'Pemeriksaan status jatuh tempo selesai. 1 pelanggan menunggak diterapkan profil isolir secara otomatis.',
    type: 'ruijie_isolation',
    level: 'warning',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    timestampMs: Date.now() - 24 * 3600 * 1000,
    read: true,
    metadata: {
      recordsCount: 1
    }
  }
];

export class NotificationService {
  private static notifyListeners(notifications: SystemNotification[]) {
    listeners.forEach(fn => {
      try {
        fn(notifications);
      } catch (e) {
        console.error('Notification listener error:', e);
      }
    });
  }

  static subscribe(listener: NotificationListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  static getNotifications(): SystemNotification[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
        return INITIAL_NOTIFICATIONS;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }

  static saveNotifications(notifications: SystemNotification[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      this.notifyListeners(notifications);
    } catch (e) {
      console.error('Failed to save notifications:', e);
    }
  }

  static addNotification(item: {
    title: string;
    message: string;
    type: NotificationEventType;
    level?: NotificationLevel;
    metadata?: SystemNotification['metadata'];
  }): SystemNotification {
    const notifications = this.getNotifications();
    const now = new Date();
    const newNotif: SystemNotification = {
      id: 'notif-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      title: item.title,
      message: item.message,
      type: item.type,
      level: item.level || 'info',
      timestamp: now.toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      timestampMs: now.getTime(),
      read: false,
      metadata: item.metadata
    };

    // Keep most recent 50 notifications
    const updated = [newNotif, ...notifications].slice(0, 50);
    this.saveNotifications(updated);
    return newNotif;
  }

  // Convenience logger for Auto-Billing
  static logAutoBilling(data: {
    generatedCount: number;
    period: string;
    totalAmount?: number;
    details?: string;
  }) {
    if (data.generatedCount > 0) {
      return this.addNotification({
        title: 'Auto-Billing Tagihan Berhasil',
        message: data.details || `Sistem otomatis menerbitkan ${data.generatedCount} lembar tagihan baru untuk periode ${data.period}.`,
        type: 'auto_billing',
        level: 'info',
        metadata: {
          recordsCount: data.generatedCount,
          period: data.period,
          triggerType: 'scheduled'
        }
      });
    } else {
      return this.addNotification({
        title: 'Auto-Billing Diperiksa',
        message: data.details || `Pemeriksaan auto-billing periode ${data.period}: Semua pelanggan telah memiliki tagihan aktif.`,
        type: 'auto_billing',
        level: 'info',
        metadata: {
          recordsCount: 0,
          period: data.period
        }
      });
    }
  }

  // Convenience logger for Payment Received Confirmation
  static logPaymentReceived(data: {
    billNumber: string;
    customerName: string;
    amount: number;
    paymentMethod: string;
    transactionId?: string;
  }) {
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(data.amount);

    return this.addNotification({
      title: 'Pembayaran Diterima & Terverifikasi',
      message: `Tagihan ${data.billNumber} an. ${data.customerName} sebesar ${formattedAmount} telah lunas melalui ${data.paymentMethod}.`,
      type: 'payment_received',
      level: 'success',
      metadata: {
        billNumber: data.billNumber,
        customerName: data.customerName,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        transactionId: data.transactionId
      }
    });
  }

  // Convenience logger for Database Backup status
  static logBackupStatus(data: {
    success: boolean;
    recordsCount?: number;
    sizeKb?: number;
    triggerType?: 'manual' | 'scheduled';
    message?: string;
    error?: string;
  }) {
    if (data.success) {
      return this.addNotification({
        title: data.triggerType === 'scheduled' ? 'Pencadangan Terjadwal Berhasil' : 'Pencadangan Manual Selesai',
        message: data.message || `Cadangan sistem berhasil dibuat (${data.recordsCount || 0} catatan, ${(data.sizeKb || 0).toFixed(1)} KB).`,
        type: 'backup_status',
        level: 'success',
        metadata: {
          recordsCount: data.recordsCount,
          backupSizeKb: data.sizeKb,
          triggerType: data.triggerType || 'manual'
        }
      });
    } else {
      return this.addNotification({
        title: 'Pencadangan Database Gagal',
        message: data.error || data.message || 'Terjadi kesalahan saat memproses ekspor cadangan database.',
        type: 'backup_status',
        level: 'error',
        metadata: {
          triggerType: data.triggerType || 'manual'
        }
      });
    }
  }

  static markAsRead(id: string) {
    const notifications = this.getNotifications();
    const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(updated);
  }

  static markAllAsRead() {
    const notifications = this.getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    this.saveNotifications(updated);
  }

  static deleteNotification(id: string) {
    const notifications = this.getNotifications();
    const updated = notifications.filter(n => n.id !== id);
    this.saveNotifications(updated);
  }

  static clearAll() {
    this.saveNotifications([]);
  }

  static getUnreadCount(): number {
    return this.getNotifications().filter(n => !n.read).length;
  }

  // Relative time helper
  static formatRelativeTime(timestampMs: number): string {
    const diff = Math.max(0, Date.now() - timestampMs);
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} mnt lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    return new Date(timestampMs).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }
}
