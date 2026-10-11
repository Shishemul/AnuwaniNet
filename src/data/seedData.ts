import { Customer, InternetPackage, Bill, Transaction, Voucher, RuijieDevice, User, RuijieConfig, SupabaseConfig, WhatsAppMessageLog } from '../types';

export const initialUsers: User[] = [
  {
    id: 'usr-1',
    username: 'superadmin',
    name: 'Anuwani Superadmin',
    email: 'superadmin@anuwani.net',
    phone: '081234567890',
    role: 'superadmin',
    status: 'active',
    createdAt: '2026-01-01',
    lastLogin: '2026-10-10 19:30'
  },
  {
    id: 'usr-2',
    username: 'admin1',
    name: 'Nandang Operator',
    email: 'admin@anuwani.net',
    phone: '081298765432',
    role: 'admin',
    status: 'active',
    createdAt: '2026-02-15',
    lastLogin: '2026-10-10 18:45'
  },
  {
    id: 'usr-3',
    username: 'budi_santoso',
    name: 'Budi Santoso',
    email: 'budi@gmail.com',
    phone: '085711223344',
    role: 'pelanggan',
    status: 'active',
    createdAt: '2026-03-10',
    lastLogin: '2026-10-10 14:20',
    customerId: 'cust-1'
  },
  {
    id: 'usr-4',
    username: 'siti_rahma',
    name: 'Siti Rahmawati',
    email: 'siti@gmail.com',
    phone: '082199887766',
    role: 'pelanggan',
    status: 'active',
    createdAt: '2026-04-05',
    lastLogin: '2026-10-09 11:15',
    customerId: 'cust-2'
  }
];

export const initialPackages: InternetPackage[] = [
  {
    id: 'pkg-1',
    name: 'Paket Hemat 10 Mbps',
    speedMbps: 10,
    price: 100000,
    validityDays: 30,
    type: 'bulanan',
    description: 'Cocok untuk browsing, streaming 1-3 perangkat keluarga kecil'
  },
  {
    id: 'pkg-2',
    name: 'Paket Keluarga 20 Mbps',
    speedMbps: 20,
    price: 165000,
    validityDays: 30,
    type: 'bulanan',
    description: 'Ideal untuk streaming HD, Zoom sekolah & kantor di rumah'
  },
  {
    id: 'pkg-3',
    name: 'Paket Gamers Pro 50 Mbps',
    speedMbps: 50,
    price: 275000,
    validityDays: 30,
    type: 'bulanan',
    description: 'Low ping dedicated bandwidth, prioritas gaming & streaming 4K'
  },
  {
    id: 'pkg-v1',
    name: 'Voucher Kilat 3 Jam',
    speedMbps: 10,
    price: 3000,
    validityDays: 1,
    type: 'voucher',
    description: 'Akses hotspot kuota unlimited durasi 3 jam'
  },
  {
    id: 'pkg-v2',
    name: 'Voucher Harian 24 Jam',
    speedMbps: 15,
    price: 5000,
    validityDays: 1,
    type: 'voucher',
    description: 'Akses hotspot 24 jam penuh sejak login pertama'
  },
  {
    id: 'pkg-v3',
    name: 'Voucher Mingguan 7 Hari',
    speedMbps: 20,
    price: 25000,
    validityDays: 7,
    type: 'voucher',
    description: 'Akses hotspot 7 hari nonstop kecepatan 20 Mbps'
  }
];

export const initialCustomers: Customer[] = [
  {
    id: 'cust-1',
    customerCode: 'ANW-001',
    name: 'Budi Santoso',
    phone: '085711223344',
    address: 'Jl. Merpati No. 12, RT 02 / RW 04',
    email: 'budi@gmail.com',
    pppoeUsername: 'budi_anw001',
    pppoePassword: 'passBudi2026',
    ipAddress: '192.168.10.15',
    macAddress: 'DC:A6:32:89:11:AB',
    packageId: 'pkg-2',
    packageName: 'Paket Keluarga 20 Mbps',
    packagePrice: 165000,
    status: 'active',
    autoIsolirEnabled: true,
    billingDay: 20,
    joinDate: '2026-01-15',
    lastPaymentDate: '2026-10-05',
    ruijieDeviceId: 'dev-1',
    notes: 'Kabel dropcore 80 meter, ODP-03 Port 2'
  },
  {
    id: 'cust-2',
    customerCode: 'ANW-002',
    name: 'Siti Rahmawati',
    phone: '082199887766',
    address: 'Jl. Mawar RT 01 / RW 03 Blok C',
    email: 'siti@gmail.com',
    pppoeUsername: 'siti_anw002',
    pppoePassword: 'passSiti2026',
    ipAddress: '192.168.10.16',
    macAddress: 'E4:5F:01:3C:99:12',
    packageId: 'pkg-1',
    packageName: 'Paket Hemat 10 Mbps',
    packagePrice: 100000,
    status: 'isolated', // Terisolir karena telat bayar
    autoIsolirEnabled: true,
    billingDay: 20,
    joinDate: '2026-02-10',
    lastPaymentDate: '2026-08-19',
    ruijieDeviceId: 'dev-1',
    notes: 'Terisolir otomatis oleh Ruijie Gateway karena belum bayar Sept/Okt'
  },
  {
    id: 'cust-3',
    customerCode: 'ANW-003',
    name: 'Ahmad Fauzi',
    phone: '087812345678',
    address: 'Jl. Cempaka RT 03 / RW 04 No. 45',
    email: 'ahmad@yahoo.com',
    pppoeUsername: 'ahmad_anw003',
    pppoePassword: 'passAhmad2026',
    ipAddress: '192.168.10.17',
    macAddress: 'B8:27:EB:4F:78:90',
    packageId: 'pkg-3',
    packageName: 'Paket Gamers Pro 50 Mbps',
    packagePrice: 275000,
    status: 'active',
    autoIsolirEnabled: true,
    billingDay: 20,
    joinDate: '2026-03-01',
    lastPaymentDate: '2026-10-02',
    ruijieDeviceId: 'dev-1',
    notes: 'ODP-01 Port 4, IP Static request'
  },
  {
    id: 'cust-4',
    customerCode: 'ANW-004',
    name: 'Hendra Gunawan',
    phone: '081377889900',
    address: 'Komplek Griya Indah Kav. 18',
    email: 'hendra@office.co.id',
    pppoeUsername: 'hendra_anw004',
    pppoePassword: 'passHendra2026',
    ipAddress: '192.168.10.18',
    macAddress: 'F0:18:98:AA:BC:11',
    packageId: 'pkg-2',
    packageName: 'Paket Keluarga 20 Mbps',
    packagePrice: 165000,
    status: 'pending', // Menunggu aktivasi teknisi
    autoIsolirEnabled: true,
    billingDay: 20,
    joinDate: '2026-10-08',
    ruijieDeviceId: 'dev-1',
    notes: 'Pemasangan baru hari kemarin, perlu aktivasi fisik modem'
  },
  {
    id: 'cust-5',
    customerCode: 'ANW-005',
    name: 'Dewi Lestari',
    phone: '085244556677',
    address: 'Jl. Melati No. 8 RT 02 / RW 01',
    email: 'dewi.lestari@gmail.com',
    pppoeUsername: 'dewi_anw005',
    pppoePassword: 'passDewi2026',
    ipAddress: '192.168.10.19',
    macAddress: '00:1A:2B:3C:4D:5E',
    packageId: 'pkg-1',
    packageName: 'Paket Hemat 10 Mbps',
    packagePrice: 100000,
    status: 'active',
    autoIsolirEnabled: false, // VIP / Manual isolir only
    billingDay: 20,
    joinDate: '2026-01-20',
    lastPaymentDate: '2026-10-04',
    ruijieDeviceId: 'dev-1',
    notes: 'Ketua RT 02, pengecualian auto-isolir'
  }
];

export const initialBills: Bill[] = [
  {
    id: 'bill-101',
    billNumber: 'INV-202610-001',
    customerId: 'cust-1',
    customerName: 'Budi Santoso',
    customerPhone: '085711223344',
    packageId: 'pkg-2',
    packageName: 'Paket Keluarga 20 Mbps',
    amount: 165000,
    period: 'Oktober 2026',
    dueDate: '2026-10-20',
    status: 'paid',
    paidAt: '2026-10-05 14:10',
    paymentMethod: 'qris',
    transactionRef: 'QRIS-ANW-992381',
    whatsappReminderSent: true
  },
  {
    id: 'bill-102',
    billNumber: 'INV-202610-002',
    customerId: 'cust-2',
    customerName: 'Siti Rahmawati',
    customerPhone: '082199887766',
    packageId: 'pkg-1',
    packageName: 'Paket Hemat 10 Mbps',
    amount: 100000,
    period: 'Oktober 2026',
    dueDate: '2026-10-20',
    status: 'overdue',
    whatsappReminderSent: true
  },
  {
    id: 'bill-103',
    billNumber: 'INV-202610-003',
    customerId: 'cust-3',
    customerName: 'Ahmad Fauzi',
    customerPhone: '087812345678',
    packageId: 'pkg-3',
    packageName: 'Paket Gamers Pro 50 Mbps',
    amount: 275000,
    period: 'Oktober 2026',
    dueDate: '2026-10-20',
    status: 'paid',
    paidAt: '2026-10-02 09:30',
    paymentMethod: 'transfer',
    transactionRef: 'BCA-TRF-482910',
    whatsappReminderSent: true
  },
  {
    id: 'bill-104',
    billNumber: 'INV-202610-004',
    customerId: 'cust-5',
    customerName: 'Dewi Lestari',
    customerPhone: '085244556677',
    packageId: 'pkg-1',
    packageName: 'Paket Hemat 10 Mbps',
    amount: 100000,
    period: 'Oktober 2026',
    dueDate: '2026-10-20',
    status: 'paid',
    paidAt: '2026-10-04 16:45',
    paymentMethod: 'cash',
    transactionRef: 'CASH-ANW-004',
    whatsappReminderSent: true
  },
  {
    id: 'bill-105',
    billNumber: 'INV-202609-002',
    customerId: 'cust-2',
    customerName: 'Siti Rahmawati',
    customerPhone: '082199887766',
    packageId: 'pkg-1',
    packageName: 'Paket Hemat 10 Mbps',
    amount: 100000,
    period: 'September 2026',
    dueDate: '2026-09-20',
    status: 'overdue',
    whatsappReminderSent: true
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: 'trx-1',
    invoiceNumber: 'TRX-202610-001',
    customerId: 'cust-1',
    customerName: 'Budi Santoso',
    type: 'tagihan',
    category: 'income',
    amount: 165000,
    date: '2026-10-05 14:10',
    paymentMethod: 'qris',
    status: 'completed',
    notes: 'Pembayaran Tagihan Oktober 2026',
    whatsappNotificationSent: true
  },
  {
    id: 'trx-2',
    invoiceNumber: 'TRX-202610-002',
    customerId: 'cust-3',
    customerName: 'Ahmad Fauzi',
    type: 'tagihan',
    category: 'income',
    amount: 275000,
    date: '2026-10-02 09:30',
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Pembayaran Tagihan Oktober 2026 via BCA',
    whatsappNotificationSent: true
  },
  {
    id: 'trx-3',
    invoiceNumber: 'TRX-202610-003',
    customerId: 'cust-5',
    customerName: 'Dewi Lestari',
    type: 'tagihan',
    category: 'income',
    amount: 100000,
    date: '2026-10-04 16:45',
    paymentMethod: 'cash',
    status: 'completed',
    notes: 'Bayar tunai di pos AnuwaniNet',
    whatsappNotificationSent: true
  },
  {
    id: 'trx-4',
    invoiceNumber: 'VCH-WA-202610-01',
    customerName: 'Pembeli WA (081288990011)',
    type: 'voucher',
    category: 'income',
    amount: 5000,
    date: '2026-10-10 10:15',
    paymentMethod: 'whatsapp_bot',
    status: 'completed',
    notes: 'Beli Voucher 24 Jam via WhatsApp Bot QRIS',
    whatsappNotificationSent: true
  },
  {
    id: 'trx-5',
    invoiceNumber: 'VCH-WA-202610-02',
    customerName: 'Pembeli WA (085677889922)',
    type: 'voucher',
    category: 'income',
    amount: 25000,
    date: '2026-10-10 15:40',
    paymentMethod: 'whatsapp_bot',
    status: 'completed',
    notes: 'Beli Voucher Mingguan 7 Hari via Bot WA',
    whatsappNotificationSent: true
  },
  {
    id: 'trx-6',
    invoiceNumber: 'EXP-202610-01',
    customerName: 'ISP Upstream FiberStar',
    type: 'pengeluaran_operasional',
    category: 'expense',
    amount: 2500000,
    date: '2026-10-01 10:00',
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Tagihan Bandwidth Dedicated 100 Mbps Bulan Oktober',
    whatsappNotificationSent: false
  },
  {
    id: 'trx-7',
    invoiceNumber: 'EXP-202610-02',
    customerName: 'PLN Pascabayar NOC',
    type: 'pengeluaran_operasional',
    category: 'expense',
    amount: 320000,
    date: '2026-10-03 11:20',
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Listrik server NOC & UPS',
    whatsappNotificationSent: false
  }
];

export const initialVouchers: Voucher[] = [
  {
    id: 'vch-001',
    code: 'ANW-5K-9921',
    password: '773',
    packageId: 'pkg-v2',
    packageName: 'Voucher Harian 24 Jam',
    durationHours: 24,
    price: 5000,
    status: 'used',
    generatedAt: '2026-10-09 08:00',
    usedAt: '2026-10-10 10:15',
    buyerPhone: '081288990011',
    buyerName: 'Rian Pratama',
    ruijieSynced: true
  },
  {
    id: 'vch-002',
    code: 'ANW-25K-8812',
    password: '449',
    packageId: 'pkg-v3',
    packageName: 'Voucher Mingguan 7 Hari',
    durationHours: 168,
    price: 25000,
    status: 'used',
    generatedAt: '2026-10-09 08:00',
    usedAt: '2026-10-10 15:40',
    buyerPhone: '085677889922',
    buyerName: 'Dian Permana',
    ruijieSynced: true
  },
  {
    id: 'vch-003',
    code: 'ANW-3K-4109',
    password: '218',
    packageId: 'pkg-v1',
    packageName: 'Voucher Kilat 3 Jam',
    durationHours: 3,
    price: 3000,
    status: 'available',
    generatedAt: '2026-10-10 09:00',
    ruijieSynced: true
  },
  {
    id: 'vch-004',
    code: 'ANW-5K-6731',
    password: '902',
    packageId: 'pkg-v2',
    packageName: 'Voucher Harian 24 Jam',
    durationHours: 24,
    price: 5000,
    status: 'available',
    generatedAt: '2026-10-10 09:00',
    ruijieSynced: true
  },
  {
    id: 'vch-005',
    code: 'ANW-5K-1984',
    password: '561',
    packageId: 'pkg-v2',
    packageName: 'Voucher Harian 24 Jam',
    durationHours: 24,
    price: 5000,
    status: 'available',
    generatedAt: '2026-10-10 09:00',
    ruijieSynced: true
  },
  {
    id: 'vch-006',
    code: 'ANW-25K-3341',
    password: '876',
    packageId: 'pkg-v3',
    packageName: 'Voucher Mingguan 7 Hari',
    durationHours: 168,
    price: 25000,
    status: 'available',
    generatedAt: '2026-10-10 09:00',
    ruijieSynced: true
  }
];

export const initialRuijieDevices: RuijieDevice[] = [
  {
    id: 'dev-1',
    name: 'Ruijie Gateway RG-EG3250 (NOC Utama)',
    ip: '192.168.10.1',
    model: 'RG-EG3250 Cloud Managed Router',
    siteId: 'SITE-ANUWANI-01',
    serialNumber: 'G1NR98K004921',
    status: 'online',
    connectedUsers: 84,
    cpuUsage: 22,
    memUsage: 38,
    isolirPoolName: 'ISOLIR_REDIRECT_WEB',
    lastSync: '2026-10-10 19:50'
  },
  {
    id: 'dev-2',
    name: 'Ruijie Reyee RG-RAP2260 AP Hotspot RW 04',
    ip: '192.168.10.2',
    model: 'RG-RAP2260(E) Wi-Fi 6 AP',
    siteId: 'SITE-ANUWANI-01',
    serialNumber: 'AP99X8721019',
    status: 'online',
    connectedUsers: 36,
    cpuUsage: 18,
    memUsage: 31,
    isolirPoolName: 'ISOLIR_REDIRECT_WEB',
    lastSync: '2026-10-10 19:52'
  }
];

export const initialRuijieConfig: RuijieConfig = {
  cloudUrl: 'https://cloud-as.ruijienetworks.com/api/v1',
  appId: 'rj_app_anuwani_882910398',
  secretKey: 'rj_sec_778120392819039129x88a',
  apiKey: 'rj_app_anuwani_882910398',
  apiSecret: 'rj_sec_778120392819039129x88a',
  siteId: 'SITE-ANUWANI-01',
  autoIsolirDay: 20,
  gracePeriodDays: 2, // Isolir aktif otomatis tanggal 22 jika tanggal jatuh tempo 20
  isolirProfileName: 'ISOLIR_REDIRECT_WEB',
  normalProfileName: 'PPPOE_DEFAULT_PROFILE',
  autoIsolirActive: true
};

export const initialSupabaseConfig: SupabaseConfig = {
  url: '',
  anonKey: '',
  isConnected: false
};

export const initialWhatsAppLogs: WhatsAppMessageLog[] = [
  {
    id: 'msg-1',
    phone: '085711223344',
    recipientName: 'Budi Santoso',
    type: 'bukti_bayar',
    message: 'Halo Bpk/Ibu Budi Santoso, Terima kasih! Pembayaran Tagihan AnuwaniNet Paket Keluarga 20 Mbps Rp 165.000 periode Oktober 2026 telah DITERIMA. Status: LUNAS.',
    timestamp: '2026-10-05 14:11',
    status: 'sent'
  },
  {
    id: 'msg-2',
    phone: '082199887766',
    recipientName: 'Siti Rahmawati',
    type: 'isolir_alert',
    message: 'PEMBERITAHUAN ISOLIR: Koneksi AnuwaniNet (ANW-002) telah dialihkan ke halaman Isolir karena terdapat tunggakan tagihan. Mohon segera selesaikan pembayaran untuk mengaktifkan kembali otomatis.',
    timestamp: '2026-09-22 00:01',
    status: 'sent'
  },
  {
    id: 'msg-3',
    phone: '081288990011',
    recipientName: 'Rian Pratama',
    type: 'voucher_delivery',
    message: 'KODE VOUCHER ANUWANINET: Kode: ANW-5K-9921 | Password: 773 | Paket: 24 Jam. Hubungkan wifi @AnuwaniNet-Hotspot dan masukkan kode voucher. Selamat menikmati!',
    timestamp: '2026-10-10 10:15',
    status: 'sent'
  }
];
