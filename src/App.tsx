import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { PelangganView } from './views/PelangganView';
import { TagihanView } from './views/TagihanView';
import { RuijieView } from './views/RuijieView';
import { VoucherWhatsAppView } from './views/VoucherWhatsAppView';
import { LaporanView } from './views/LaporanView';
import { UserManagementView } from './views/UserManagementView';
import { CustomerPortalView } from './views/CustomerPortalView';
import { DanaGatewayView } from './views/DanaGatewayView';
import { PengaturanSuperadminView } from './views/PengaturanSuperadminView';
import { LoginView } from './views/LoginView';

// Modals
import { AuthModal } from './components/modals/AuthModal';
import { CustomerModal } from './components/modals/CustomerModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { PrintModal } from './components/modals/PrintModal';
import { SupabaseModal } from './components/modals/SupabaseModal';
import { TransactionModal } from './components/modals/TransactionModal';
import { DanaCheckoutModal } from './components/modals/DanaCheckoutModal';
import { ProfileSettingsModal } from './components/modals/ProfileSettingsModal';
import { NotificationCenterModal } from './components/modals/NotificationCenterModal';
import { LayoutDashboard, Users, Receipt, Server, Menu, Wifi, Sliders } from 'lucide-react';

import { DataService } from './services/dataService';
import { RuijieService } from './services/ruijieService';
import { getStoredSupabaseConfig, checkAndTriggerScheduledBackup } from './services/supabaseService';
import { Customer, Bill, Transaction, Voucher, RuijieDevice, InternetPackage, WhatsAppMessageLog, DanaPaymentSession } from './types';

function MainApp() {
  const { currentUser } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  // Mobile Drawer State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>(() => DataService.getCustomers());
  const [packages, setPackages] = useState<InternetPackage[]>(() => DataService.getPackages());
  const [bills, setBills] = useState<Bill[]>(() => DataService.getBills());
  const [transactions, setTransactions] = useState<Transaction[]>(() => DataService.getTransactions());
  const [vouchers, setVouchers] = useState<Voucher[]>(() => DataService.getVouchers());
  const [devices, setDevices] = useState<RuijieDevice[]>(() => DataService.getRuijieDevices());
  const [waLogs, setWaLogs] = useState<WhatsAppMessageLog[]>(() => DataService.getWaLogs());
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(() => getStoredSupabaseConfig().isConnected);

  // Modals state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDanaModal, setShowDanaModal] = useState(false);
  const [selectedDanaSession, setSelectedDanaSession] = useState<DanaPaymentSession | null>(null);
  const [showProfileSettingsModal, setShowProfileSettingsModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Real-time listener for any transaction, bill, or voucher update & recurring backup & Ruijie sync check
  useEffect(() => {
    checkAndTriggerScheduledBackup();
    RuijieService.checkAndTriggerScheduledRuijieSync();
    // Load latest data from database if connected
    DataService.loadAllFromDatabase().then((loaded) => {
      if (loaded) refreshAllData();
    });

    const autoBillingRes = DataService.checkAndRunAutoBilling();
    if (autoBillingRes.triggered) {
      refreshAllData();
    }
    const unsubscribe = DataService.subscribe(() => {
      refreshAllData();
    });

    // Background interval scheduler runner (every 60 seconds)
    const intervalId = setInterval(() => {
      checkAndTriggerScheduledBackup();
      RuijieService.checkAndTriggerScheduledRuijieSync();
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Sync activeTab when user role switches to customer or non-superadmin
  useEffect(() => {
    if (currentUser?.role === 'pelanggan') {
      setActiveTab('portal_pelanggan');
    } else if (activeTab === 'portal_pelanggan') {
      setActiveTab('dashboard');
    } else if ((activeTab === 'pengaturan_sistem' || activeTab === 'users') && currentUser?.role !== 'superadmin') {
      setActiveTab('dashboard');
    }
  }, [currentUser?.role]);

  const refreshAllData = () => {
    setCustomers(DataService.getCustomers());
    setPackages(DataService.getPackages());
    setBills(DataService.getBills());
    setTransactions(DataService.getTransactions());
    setVouchers(DataService.getVouchers());
    setDevices(DataService.getRuijieDevices());
    setWaLogs(DataService.getWaLogs());
    setIsSupabaseConnected(getStoredSupabaseConfig().isConnected);
  };

  // JIKA BELUM LOGIN: TAMPILAN AWAL ADALAH TAMPILAN LOGIN
  if (!currentUser) {
    return (
      <>
        <LoginView />
        <SupabaseModal
          isOpen={showSupabaseModal}
          onClose={() => setShowSupabaseModal(false)}
          onConfigUpdated={refreshAllData}
        />
      </>
    );
  }

  const handleOpenAddCustomer = () => {
    setCustomerToEdit(null);
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setShowCustomerModal(true);
  };

  const handleOpenRecordPayment = (bill?: Bill) => {
    setSelectedBillForPayment(bill || bills.find(b => b.status === 'unpaid') || bills[0] || null);
    setShowRecordPaymentModal(true);
  };

  const handleOpenPrintBill = (bill: Bill) => {
    setSelectedBillForPrint(bill);
    setShowPrintModal(true);
  };

  const handleOpenDanaCheckout = (session: DanaPaymentSession) => {
    setSelectedDanaSession(session);
    setShowDanaModal(true);
  };

  const unpaidCount = bills.filter(b => b.status === 'unpaid' || b.status === 'overdue').length;
  const isolatedCount = customers.filter(c => c.status === 'isolated').length;

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* 3-Zone Header */}
      <Header
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSupabase={() => setShowSupabaseModal(true)}
        onOpenProfileSettings={() => setShowProfileSettingsModal(true)}
        onOpenNotificationCenter={() => setShowNotificationModal(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        isMobileMenuOpen={isMobileMenuOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseConnected={isSupabaseConnected}
      />

      {/* Main Workspace Canvas */}
      <div className="flex-1 flex flex-col md:flex-row items-stretch max-w-7xl w-full mx-auto min-h-[calc(100vh-57px)]">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unpaidCount={unpaidCount}
          isolatedCount={isolatedCount}
          mobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Viewport Content */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pb-24 md:pb-8">
          {activeTab === 'dashboard' && (
            <DashboardView
              customers={customers}
              bills={bills}
              transactions={transactions}
              vouchers={vouchers}
              devices={devices}
              onNavigate={setActiveTab}
              onRefreshData={refreshAllData}
              onOpenNewTransaction={() => setShowTransactionModal(true)}
              onOpenAddCustomer={handleOpenAddCustomer}
              onOpenRecordPayment={handleOpenRecordPayment}
            />
          )}

          {activeTab === 'pelanggan' && (
            <PelangganView
              customers={customers}
              packages={packages}
              onRefreshData={refreshAllData}
              onOpenAddCustomer={handleOpenAddCustomer}
              onEditCustomer={handleOpenEditCustomer}
            />
          )}

          {activeTab === 'tagihan' && (
            <TagihanView
              bills={bills}
              customers={customers}
              onRefreshData={refreshAllData}
              onOpenRecordPayment={handleOpenRecordPayment}
              onPrintBill={handleOpenPrintBill}
              onOpenDanaCheckout={handleOpenDanaCheckout}
            />
          )}

          {activeTab === 'ruijie' && (
            <RuijieView
              devices={devices}
              customers={customers}
              packages={packages}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'voucher_wa' && (
            <VoucherWhatsAppView
              vouchers={vouchers}
              packages={packages}
              waLogs={waLogs}
              onRefreshData={refreshAllData}
              onOpenDanaCheckout={handleOpenDanaCheckout}
            />
          )}

          {activeTab === 'dana_gateway' && (
            <DanaGatewayView
              bills={bills}
              customers={customers}
              onOpenDanaCheckout={handleOpenDanaCheckout}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'laporan' && (
            <LaporanView
              transactions={transactions}
              bills={bills}
              vouchers={vouchers}
              onRefreshData={refreshAllData}
              onOpenNewTransaction={() => setShowTransactionModal(true)}
            />
          )}

          {activeTab === 'portal_pelanggan' && (
            <CustomerPortalView
              customers={customers}
              bills={bills}
              transactions={transactions}
              onOpenRecordPayment={handleOpenRecordPayment}
              onPrintBill={handleOpenPrintBill}
              onNavigateToWaBot={() => setActiveTab('voucher_wa')}
              onOpenDanaCheckout={handleOpenDanaCheckout}
            />
          )}

          {activeTab === 'users' && currentUser?.role === 'superadmin' && (
            <UserManagementView />
          )}

          {activeTab === 'pengaturan_sistem' && currentUser?.role === 'superadmin' && (
            <PengaturanSuperadminView
              onOpenDanaCheckout={handleOpenDanaCheckout}
              onRefreshData={refreshAllData}
            />
          )}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar for Quick Touch Navigation */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className="no-print fixed bottom-0 inset-x-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/90 px-2 py-1.5 flex items-center justify-around md:hidden shadow-2xl"
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab('dashboard');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'dashboard' ? 'text-red-500 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('pelanggan');
            setIsMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'pelanggan' ? 'text-red-500 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span>Pelanggan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('tagihan');
            setIsMobileMenuOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'tagihan' ? 'text-red-500 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Receipt className="w-5 h-5 mb-0.5" />
          <span>Tagihan</span>
          {unpaidCount > 0 && (
            <span className="absolute top-0 right-1 min-w-[15px] h-[15px] rounded-full bg-red-600 text-white font-mono text-[9px] font-bold flex items-center justify-center px-0.5">
              {unpaidCount > 99 ? '99+' : unpaidCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('ruijie');
            setIsMobileMenuOpen(false);
          }}
          className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            activeTab === 'ruijie' ? 'text-red-500 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Server className="w-5 h-5 mb-0.5" />
          <span>Ruijie</span>
          {isolatedCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(prev => !prev)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
            isMobileMenuOpen ? 'text-red-500 font-bold' : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>

      {/* Global Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customerToEdit={customerToEdit}
        packages={packages}
        onSaved={refreshAllData}
      />

      <RecordPaymentModal
        isOpen={showRecordPaymentModal}
        onClose={() => setShowRecordPaymentModal(false)}
        bill={selectedBillForPayment}
        customer={customers.find(c => c.id === selectedBillForPayment?.customerId) || null}
        onPaymentSuccess={paidBill => {
          refreshAllData();
          handleOpenPrintBill(paidBill);
        }}
      />

      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        bill={selectedBillForPrint}
        customer={customers.find(c => c.id === selectedBillForPrint?.customerId)}
      />

      <DanaCheckoutModal
        isOpen={showDanaModal}
        onClose={() => setShowDanaModal(false)}
        session={selectedDanaSession}
        onPaymentCompleted={() => {
          refreshAllData();
        }}
      />

      <SupabaseModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        onConfigUpdated={refreshAllData}
      />

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        customers={customers}
        onTransactionAdded={refreshAllData}
      />

      <ProfileSettingsModal
        isOpen={showProfileSettingsModal}
        onClose={() => setShowProfileSettingsModal(false)}
      />

      <NotificationCenterModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onNavigateToTab={(tab) => setActiveTab(tab)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
