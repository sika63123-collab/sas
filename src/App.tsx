import React, { useState, useEffect } from 'react';
import { Store, ChevronDown, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import Cashier from './components/Cashier';
import Inventory from './components/Inventory';
import { InventoryAdd } from './components/InventoryAdd';
import Reports from './components/Reports';
import { AppProvider, useAppStore } from './store';
import { TransactionType } from './types';
import { InstallmentsAdd } from './components/InstallmentsAdd';
import { InstallmentsPay } from './components/InstallmentsPay';
import { InstallmentsLate } from './components/InstallmentsLate';
import { InstallmentsArchive } from './components/InstallmentsArchive';
import { DepositPay } from './components/DepositPay';
import { Login } from './components/Login';
import { Settings } from './components/Settings';

type ViewMode = 
  | 'home' 
  | 'cashier' 
  | 'inventory' 
  | 'inventory-add'
  | 'reports-visa' 
  | 'reports-cash' 
  | 'reports-shift' 
  | 'reports-item-card'
  | 'reports-profit-margin'
  | 'installments-add'
  | 'installments-pay'
  | 'installments-late'
  | 'installments-archive'
  | 'deposit-pay'
  | 'settings';

function MainApp() {
  const { currentUser, logout } = useAppStore();
  const [activeView, setActiveView] = useState<ViewMode>('home');
  const [cashierMode, setCashierMode] = useState<TransactionType>('sale');
  
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const handleMenuClick = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const selectView = (view: ViewMode, cMode?: TransactionType) => {
    setActiveView(view);
    if (cMode) setCashierMode(cMode);
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

            {(isAdmin || p.cashier || p.cashierReturn || p.depositSale || p.depositPay || p.depositReturn) && (
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
                     {(isAdmin || p.depositSale) && <button onClick={() => selectView('cashier', 'deposit_sale')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">مبيعات عربون</button>}
                     {(isAdmin || p.depositReturn) && <button onClick={() => selectView('cashier', 'deposit_return')} className="w-full text-right px-4 py-2 hover:bg-blue-50 border-t border-gray-100 transition-colors">مرتجع مبيعات عربون</button>}
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
                      <button onClick={() => selectView('reports-shift')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">تقفيل وردية</button>
                      <button onClick={() => selectView('reports-profit-margin')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">تقرير هامش الربح</button>
                  </div>
                )}
              </div>
           )}

           {(isAdmin || p.storeQuantities || p.itemCard || p.addItem) && (
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
                     {(isAdmin || p.itemCard) && <button onClick={() => selectView('reports-item-card')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">كارت الصنف</button>}
                  </div>
                )}
              </div>
           )}

           {(isAdmin || p.installmentsAdd || p.installmentsPay || p.installmentsLate) && (
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
                     {(isAdmin || p.installmentsPay) && <button onClick={() => selectView('installments-pay')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">تسديد قسط عميل</button>}
                     {(isAdmin || p.installmentsLate) && <button onClick={() => selectView('installments-late')} className="w-full text-right px-4 py-2 hover:bg-blue-50 transition-colors">عملاء متأخرون عن السداد</button>}
                     {isAdmin && <button onClick={() => selectView('installments-archive')} className="w-full text-right px-4 py-2 hover:bg-blue-50 border-t border-gray-100 transition-colors">أرشيف العملاء</button>}
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
         
         {/* User Info & Logout */}
         <div className="flex items-center gap-4 text-[#1e3f66] ml-2 shrink-0 h-9">
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
         {/* @ts-ignore */}
         {activeView === 'cashier' && <Cashier key={cashierMode} initialType={cashierMode} />}
         {activeView === 'inventory' && <Inventory />}
         {activeView === 'inventory-add' && <InventoryAdd />}
         {activeView.startsWith('reports-') && <Reports view={activeView.replace('reports-', '') as any} />}
         {activeView === 'installments-add' && <InstallmentsAdd />}
         {activeView === 'installments-pay' && <InstallmentsPay />}
         {activeView === 'installments-late' && <InstallmentsLate />}
         {activeView === 'installments-archive' && <InstallmentsArchive />}
         {activeView === 'deposit-pay' && <DepositPay />}
         {activeView === 'settings' && <Settings />}
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
