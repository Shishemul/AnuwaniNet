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

import { DataService } from './services/dataService';
import { getStoredSupabaseConfig, checkAndTriggerScheduledBackup } from './services/supabaseService';
import { Customer, Bill, Transaction, Voucher, RuijieDevice, InternetPackage, WhatsAppMessageLog, DanaPaymentSession } from './types';

function MainApp() {
  const { currentUser } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

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

  // Real-time listener for any transaction, bill, or voucher update & recurring backup check
  useEffect(() => {
    checkAndTriggerScheduledBackup();
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
    return () => unsubscribe();
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* 3-Zone Header */}
      <Header
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenSupabase={() => setShowSupabaseModal(true)}
        onOpenProfileSettings={() => setShowProfileSettingsModal(true)}
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
        />

        {/* Viewport Content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
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
