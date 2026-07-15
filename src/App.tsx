import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Store, ChevronDown, LogOut, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cashier from './components/Cashier';
import Inventory from './components/Inventory';
import Pricing from './components/Pricing';
import { InventoryAdd } from './components/InventoryAdd';
import Reports from './components/Reports';
import ItemCard from './components/ItemCard';
import { AppProvider, useAppStore } from './store';
import { TransactionType } from './types';
import { InstallmentsAdd } from './components/InstallmentsAdd';
import { InstallmentsPay } from './components/InstallmentsPay';
import { InstallmentsLate } from './components/InstallmentsLate';
import InstallmentsArchive from './components/InstallmentsArchive';
import { InstallmentsPayCustomer } from './components/InstallmentsPayCustomer';
import { DepositPay } from './components/DepositPay';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import CashExchange from './components/CashExchange';
import CashShiftManagement from './components/CashShiftManagement';


type ViewMode = 
  | 'home' 
  | 'cashier' 
  | 'inventory' 
  | 'inventory-add'
  | 'reports-visa' 
  | 'reports-cash' 
  | 'reports-item-card'
  | 'reports-profit-margin'
  | 'installments-add'
  | 'installments-pay'
  | 'installments-late'
  | 'installments-archive'
  | 'installments-pay-customer'
  | 'deposit-pay'
  | 'pricing'
  | 'cash-exchange'
  | 'settings'
  | 'shift-management';


// ─── Auto-Backup Settings ──────────────────────────────────────────────
const AUTO_BACKUP_SETTINGS_KEY = 'xphone_auto_backup_settings';
const AUTO_BACKUP_LAST_KEY = 'xphone_auto_backup_last';

interface AutoBackupSettings {
  enabled: boolean;
  intervalMinutes: number; // 10, 15, 30, 60
}

const getAutoBackupSettings = (): AutoBackupSettings => {
  try {
    const saved = localStorage.getItem(AUTO_BACKUP_SETTINGS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { enabled: true, intervalMinutes: 30 };
};

const saveAutoBackupSettings = (s: AutoBackupSettings) => {
  localStorage.setItem(AUTO_BACKUP_SETTINGS_KEY, JSON.stringify(s));
};

const getLastAutoBackupTime = (): string | null => {
  return localStorage.getItem(AUTO_BACKUP_LAST_KEY);
};

const setLastAutoBackupTime = (iso: string) => {
  localStorage.setItem(AUTO_BACKUP_LAST_KEY, iso);
};

// ─── Auto-Backup Hook ──────────────────────────────────────────────────
function useAutoBackup(getData: () => Record<string, any>) {
  const settingsRef = useRef(getAutoBackupSettings());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(getLastAutoBackupTime());

  const performBackup = useCallback(() => {
    try {
      const data = getData();
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `xphone_auto_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);

      const isoNow = now.toISOString();
      setLastAutoBackupTime(isoNow);
      setLastBackup(isoNow);
      console.log('[AutoBackup] Backup saved at', isoNow);
    } catch (err) {
      console.error('[AutoBackup] Failed:', err);
    }
  }, [getData]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const settings = getAutoBackupSettings();
    settingsRef.current = settings;
    if (!settings.enabled) return;

    const ms = settings.intervalMinutes * 60 * 1000;
    timerRef.current = setInterval(() => {
      performBackup();
    }, ms);
  }, [performBackup]);

  // Start/restart timer on mount and when settings change
  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  // Listen for settings changes from Settings page
  useEffect(() => {
    const handler = () => {
      startTimer();
    };
    window.addEventListener('auto-backup-settings-changed', handler);
    return () => window.removeEventListener('auto-backup-settings-changed', handler);
  }, [startTimer]);

  return { lastBackup, performBackup };
}

function MainApp() {
  const { currentUser, logout, activeShift, shiftAccounts, products, transactions, installmentContracts, expenses, expenseTypes, users, shifts, paymentTransactions, shiftInventoryItems } = useAppStore();

  // ─── Auto Backup ─────────────────────────────────────────────────
  const getBackupData = useCallback(() => ({
    products, transactions, installmentContracts, users, expenses, expenseTypes,
    shifts, paymentTransactions, shiftAccounts, shiftInventoryItems,
    _autoBackup: true,
    _backupDate: new Date().toISOString(),
  }), [products, transactions, installmentContracts, users, expenses, expenseTypes, shifts, paymentTransactions, shiftAccounts, shiftInventoryItems]);

  useAutoBackup(getBackupData);
  const [activeView, setActiveView] = useState<ViewMode>('home');

  const [cashierMode, setCashierMode] = useState<TransactionType>('sale');
  const [loadInvoiceId, setLoadInvoiceId] = useState<string | null>(null);
  const [cashierKey, setCashierKey] = useState<number>(0);
  
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const selectView = (view: ViewMode, cMode?: TransactionType) => {
    if (!activeShift && view !== 'settings' && view !== 'shift-management') {
      alert('يجب بدء وتفعيل الوردية والعهد اليومية أولاً قبل استخدام باقي شاشات النظام!');
      setActiveView('shift-management');
      setOpenMenu(null);
      return;
    }
    setActiveView(view);
    if (cMode) {
      setCashierMode(cMode);
      setCashierKey(prev => prev + 1);
    }
    setOpenMenu(null);
  };


  const openInvoiceInCashier = (invoiceId: string) => {
    setLoadInvoiceId(invoiceId);
    setCashierMode('deposit_sale');
    setActiveView('cashier');
    setOpenMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menubar-item')) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!activeShift) {
      if (activeView === 'settings') {
        // Allow admin settings access
      } else {
        setActiveView('shift-management');
      }
    }
  }, [activeShift, activeView]);


  if (!currentUser) return <Login />;

  const p = currentUser.permissions;
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex flex-col h-screen bg-[#c5d8e1] font-sans text-gray-900" dir="rtl">
      {/* Top Windows-style Menu Bar */}
      <div className="bg-[#eef2f5] border-b border-[#d1d9e0] flex items-center justify-between px-2 py-1 text-[15px] font-bold z-50 shadow-sm">
         <div className="flex items-center space-x-reverse space-x-1 shrink-0 h-9">
            <button 
              onClick={() => selectView('home')}
              className={`px-4 h-full flex items-center transition-colors ${activeView === 'home' || !activeView ? 'bg-[#c3d8fc] text-[#003399]' : 'text-black hover:bg-[#e0e7f0]'}`}
            >
              الرئيسية
            </button>

            {(isAdmin || p.cashier || p.cashierReturn || p.depositSale || p.depositPay || p.depositReturn || p.cashExchange || p.shiftManagement) && (
              <div className="relative menubar-item h-full">
                <button 
                  onClick={() => handleMenuClick('transaction')}
                  className={`px-4 h-full flex items-center gap-1 transition-colors ${openMenu === 'transaction' ? 'bg-[#c3d8fc] text-[#003399]' : 'text-black hover:bg-[#e0e7f0]'}`}
                >
                  الحركة
                </button>
                
                 {openMenu === 'transaction' && (
                   <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50 rounded-b-sm font-normal">
                      {(isAdmin || p.cashier) && <button onClick={() => selectView('cashier', 'sale')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">الكاشير</button>}
                      {(isAdmin || p.cashierReturn) && <button onClick={() => selectView('cashier', 'return')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">مرتجع كاشير</button>}
                      {(isAdmin || p.depositPay) && <button onClick={() => selectView('installments-pay')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">فواتير العربون</button>}
                      {(isAdmin || p.cashExchange) && (
                        <button onClick={() => selectView('cash-exchange')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors border-t border-gray-100">
                          فودافون كاش
                        </button>
                      )}
                      {(isAdmin || p.shiftManagement) && <button onClick={() => selectView('shift-management')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors border-t border-gray-100 text-blue-700 font-bold">إدارة الوردية والعهدة</button>}
                   </div>
                 )}
              </div>
           )}

           {(isAdmin || p.reports) && (
              <div className="relative menubar-item h-full">
                <button 
                  onClick={() => handleMenuClick('reports')}
                  className={`px-4 h-full flex items-center gap-1 transition-colors ${openMenu === 'reports' ? 'bg-[#c3d8fc] text-[#003399]' : 'text-black hover:bg-[#e0e7f0]'}`}
                >
                  التقارير
                </button>
                
                {openMenu === 'reports' && (
                  <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50 rounded-b-sm font-normal">
                      <button onClick={() => selectView('reports-visa')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">كشف حساب الفيزا</button>
                      <button onClick={() => selectView('reports-cash')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">كشف حساب نقدي</button>
                      <button onClick={() => selectView('reports-profit-margin')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">هامش الربح</button>
                  </div>
                )}
              </div>
           )}

           {(isAdmin || p.storeQuantities || p.itemCard || p.addItem || p.pricing) && (
              <div className="relative menubar-item h-full">
                <button 
                  onClick={() => handleMenuClick('store')}
                  className={`px-4 h-full flex items-center gap-1 transition-colors ${openMenu === 'store' ? 'bg-[#c3d8fc] text-[#003399]' : 'text-black hover:bg-[#e0e7f0]'}`}
                >
                  المخزن
                </button>
                
                {openMenu === 'store' && (
                  <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50 rounded-b-sm font-normal">
                     {(isAdmin || p.addItem) && <button onClick={() => selectView('inventory-add')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">اضافة اصناف</button>}
                     {(isAdmin || p.storeQuantities) && <button onClick={() => selectView('inventory')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">كميات الاصناف</button>}
                     {(isAdmin || p.pricing) && <button onClick={() => selectView('pricing')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">التسعير</button>}
                     {(isAdmin || p.itemCard) && <button onClick={() => selectView('reports-item-card')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">كارت الصنف</button>}
                  </div>
                )}
              </div>
           )}

           {(isAdmin || p.installmentsAdd || p.installmentsPay || p.installmentsLate || p.installmentsArchive) && (
              <div className="relative menubar-item h-full">
                <button 
                  onClick={() => handleMenuClick('installments')}
                  className={`px-4 h-full flex items-center gap-1 transition-colors ${openMenu === 'installments' ? 'bg-[#c3d8fc] text-[#003399]' : 'text-black hover:bg-[#e0e7f0]'}`}
                >
                  التقسيط
                </button>
                
                {openMenu === 'installments' && (
                  <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50 rounded-b-sm font-normal">
                      {(isAdmin || p.installmentsAdd) && <button onClick={() => selectView('installments-add')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">اضافة عميل جديد</button>}
                      {(isAdmin || p.installmentsPay) && <button onClick={() => selectView('installments-pay-customer')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">تسديد قسط عميل</button>}
                      {(isAdmin || p.installmentsLate) && <button onClick={() => selectView('installments-late')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">عملاء متأخرون عن السداد</button>}
                      {(isAdmin || p.installmentsArchive) && <button onClick={() => selectView('installments-archive')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors border-t border-gray-100">أرشيف العملاء</button>}
                  </div>
                )}
              </div>
            )}

           {isAdmin && (
              <div className="relative menubar-item h-full">
                <button 
                  onClick={() => selectView('settings')}
                  className={`px-4 h-full flex items-center gap-1 transition-colors ${activeView === 'settings' ? 'bg-[#c3d8fc] text-[#003399]' : 'text-black hover:bg-[#e0e7f0]'}`}
                >
                  إعدادات البرنامج
                </button>
              </div>
           )}
         </div>
         
         <div className="flex items-center gap-3 text-[#1e3f66] ml-2 shrink-0 h-9">
             <button 
               onClick={() => selectView('shift-management')}
               className={`flex items-center gap-1.5 px-3 py-1 rounded border font-extrabold text-xs shadow-sm transition-all duration-200 cursor-pointer select-none ${
                 activeShift 
                   ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700' 
                   : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse'
               }`}
             >
               <span className={`w-2 h-2 rounded-full bg-white ${activeShift ? 'animate-ping shrink-0' : ''}`}></span>
               {activeShift ? 'الوردية نشطة' : 'فتح الوردية'}
             </button>
             <div className="w-[1px] h-6 bg-gray-300"></div>
             <span className="font-bold text-[15px]" dir="rtl">مرحباً: <span className="text-blue-800">{currentUser.name}</span></span>
             <div className="w-[1px] h-6 bg-gray-300"></div>
             <button onClick={logout} className="flex items-center gap-1 text-red-600 hover:text-red-800 hover:bg-red-50 bg-white font-bold px-3 py-1 rounded-sm border border-red-200 transition-colors shadow-sm text-sm">
                <LogOut className="h-4 w-4" /> خروج
             </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto flex flex-col relative bg-[#b8cdd6]">
         {activeView === 'home' && (
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8, ease: "easeOut" }}
             className="flex-1 flex flex-col items-center justify-center text-[#1e3f66] px-4"
           >
             <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="opacity-30"
             >
                <Store className="w-32 h-32 md:w-48 md:h-48 mb-6 drop-shadow-xl" />
             </motion.div>
             <motion.h1 
               initial={{ y: 20, opacity: 0 }}
               animate={{ y: 0, opacity: 0.4 }}
               transition={{ delay: 0.3, duration: 0.8 }}
               className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-widest drop-shadow-md text-center"
             >
               X_PHONE SYSTEM
             </motion.h1>
           </motion.div>
         )}
          {activeView === 'cashier' && <Cashier key={cashierKey} initialType={cashierMode} initialInvoiceId={loadInvoiceId} onInvoiceLoaded={() => setLoadInvoiceId(null)} />}
          {activeView === 'inventory' && <Inventory />}
          {activeView === 'pricing' && <Pricing />}
          {activeView === 'inventory-add' && <InventoryAdd />}
          {activeView.startsWith('reports-') && activeView !== 'reports-item-card' && <Reports view={activeView.replace('reports-', '') as any} />}
          {activeView === 'reports-item-card' && <ItemCard />}
          {activeView === 'installments-add' && <InstallmentsAdd />}
          {activeView === 'installments-pay' && <InstallmentsPay onOpenInvoice={openInvoiceInCashier} />}
          {activeView === 'installments-late' && <InstallmentsLate />}
          {activeView === 'installments-archive' && <InstallmentsArchive onNavigateToPay={() => setActiveView('installments-pay-customer')} />}
          {activeView === 'installments-pay-customer' && <InstallmentsPayCustomer />}
          {activeView === 'deposit-pay' && <DepositPay />}
          {activeView === 'cash-exchange' && <CashExchange />}
          {activeView === 'settings' && <Settings />}
          {activeView === 'shift-management' && <CashShiftManagement />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
       <MainApp />
    </AppProvider>
  )
}
