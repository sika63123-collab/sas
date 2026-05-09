import React, { useState, useEffect } from 'react';
import { Store, ChevronDown, LogOut } from 'lucide-react';
import Cashier from './components/Cashier';
import Inventory from './components/Inventory';
import Reports from './components/Reports';
import { AppProvider, useAppStore } from './store';
import { TransactionType } from './types';
import { InstallmentsAdd } from './components/InstallmentsAdd';
import { InstallmentsPay } from './components/InstallmentsPay';
import { InstallmentsLate } from './components/InstallmentsLate';
import { DepositPay } from './components/DepositPay';
import { Login } from './components/Login';
import { Settings } from './components/Settings';

type ViewMode = 
  | 'home' 
  | 'cashier' 
  | 'inventory' 
  | 'reports-visa' 
  | 'reports-cash' 
  | 'reports-shift' 
  | 'reports-item-card'
  | 'installments-add'
  | 'installments-pay'
  | 'installments-late'
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
      <div className="bg-[#e4ebf1] border-b border-[#a0b8c4] flex items-center px-4 py-1 text-sm z-50">
         <div className="flex items-center gap-2 font-bold text-[#1e3f66] mr-4 ml-6 cursor-pointer" onClick={() => selectView('home')}>
           <Store className="h-5 w-5" />
           <span>پرو فون</span>
         </div>
         
         {(isAdmin || p.cashier || p.cashierReturn || p.depositSale || p.depositPay || p.depositReturn) && (
            <div className="relative menubar-item">
              <button 
                onClick={() => handleMenuClick('transaction')}
                className={`px-4 py-1.5 hover:bg-[#c5d8e1] flex items-center gap-1 ${openMenu === 'transaction' ? 'bg-[#c5d8e1]' : ''}`}
              >
                الحركة <ChevronDown className="h-3 w-3" />
              </button>
              
              {openMenu === 'transaction' && (
                <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50">
                   {(isAdmin || p.cashier) && <button onClick={() => selectView('cashier', 'sale')} className="w-full text-right px-4 py-2 hover:bg-blue-50">الكاشير</button>}
                   {(isAdmin || p.cashierReturn) && <button onClick={() => selectView('cashier', 'return')} className="w-full text-right px-4 py-2 hover:bg-blue-50">مرتجع كاشير</button>}
                   {(isAdmin || p.depositSale) && <button onClick={() => selectView('cashier', 'deposit_sale')} className="w-full text-right px-4 py-2 hover:bg-blue-50">مبيعات عربون</button>}
                   {(isAdmin || p.depositPay) && <button onClick={() => selectView('deposit-pay')} className="w-full text-right px-4 py-2 hover:bg-blue-50">سداد وتسليم عربون</button>}
                   {(isAdmin || p.depositReturn) && <button onClick={() => selectView('cashier', 'deposit_return')} className="w-full text-right px-4 py-2 hover:bg-blue-50 border-t border-gray-100">مرتجع مبيعات عربون</button>}
                </div>
              )}
            </div>
         )}

         {(isAdmin || p.reports || p.storeQuantities || p.itemCard) && (
            <div className="relative menubar-item">
              <button 
                onClick={() => handleMenuClick('reports')}
                className={`px-4 py-1.5 hover:bg-[#c5d8e1] flex items-center gap-1 ${openMenu === 'reports' ? 'bg-[#c5d8e1]' : ''}`}
              >
                التقارير <ChevronDown className="h-3 w-3" />
              </button>
              
              {openMenu === 'reports' && (
                <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50">
                   {(isAdmin || p.reports) && (
                       <div className="relative group/sub">
                         <button className="w-full text-right px-4 py-2 hover:bg-blue-50 flex justify-between items-center">
                           كشف حساب
                           <ChevronDown className="h-3 w-3 rotate-90" />
                         </button>
                         <div className="hidden group-hover/sub:block absolute top-0 right-full w-48 bg-white border border-[#a0b8c4] shadow-lg py-1">
                            <button onClick={() => selectView('reports-visa')} className="w-full text-right px-4 py-2 hover:bg-blue-50">كشف حساب الفيزا</button>
                            <button onClick={() => selectView('reports-cash')} className="w-full text-right px-4 py-2 hover:bg-blue-50">كشف حساب نقدي</button>
                            <button onClick={() => selectView('reports-shift')} className="w-full text-right px-4 py-2 hover:bg-blue-50">تقفيل وردية</button>
                         </div>
                       </div>
                   )}
                   {(isAdmin || p.storeQuantities || p.itemCard) && (
                       <div className="relative group/sub border-t border-gray-100">
                         <button className="w-full text-right px-4 py-2 hover:bg-blue-50 flex justify-between items-center">
                           المخزن
                           <ChevronDown className="h-3 w-3 rotate-90" />
                         </button>
                         <div className="hidden group-hover/sub:block absolute top-0 right-full w-48 bg-white border border-[#a0b8c4] shadow-lg py-1">
                            {(isAdmin || p.storeQuantities) && <button onClick={() => selectView('inventory')} className="w-full text-right px-4 py-2 hover:bg-blue-50">كميات الاصناف</button>}
                            {(isAdmin || p.itemCard) && <button onClick={() => selectView('reports-item-card')} className="w-full text-right px-4 py-2 hover:bg-blue-50">كرت الصنف</button>}
                         </div>
                       </div>
                   )}
                </div>
              )}
            </div>
         )}

         {(isAdmin || p.installmentsAdd || p.installmentsPay || p.installmentsLate) && (
            <div className="relative menubar-item">
              <button 
                onClick={() => handleMenuClick('installments')}
                className={`px-4 py-1.5 hover:bg-[#c5d8e1] flex items-center gap-1 ${openMenu === 'installments' ? 'bg-[#c5d8e1]' : ''}`}
              >
                التقسيط <ChevronDown className="h-3 w-3" />
              </button>
              
              {openMenu === 'installments' && (
                <div className="absolute top-full right-0 w-48 bg-white border border-[#a0b8c4] shadow-lg py-1 z-50">
                   {(isAdmin || p.installmentsAdd) && <button onClick={() => selectView('installments-add')} className="w-full text-right px-4 py-2 hover:bg-blue-50">اضافة عميل جديد</button>}
                   {(isAdmin || p.installmentsPay) && <button onClick={() => selectView('installments-pay')} className="w-full text-right px-4 py-2 hover:bg-blue-50">تسديد قسط عميل</button>}
                   {(isAdmin || p.installmentsLate) && <button onClick={() => selectView('installments-late')} className="w-full text-right px-4 py-2 hover:bg-blue-50">عملاء متأخرون عن السداد</button>}
                </div>
              )}
            </div>
         )}

         {isAdmin && (
            <div className="relative menubar-item">
              <button 
                onClick={() => selectView('settings')}
                className={`px-4 py-1.5 hover:bg-[#c5d8e1] flex items-center gap-1 ${activeView === 'settings' ? 'bg-[#c5d8e1]' : ''}`}
              >
                إعدادات البرنامج
              </button>
            </div>
         )}
         
         {/* User Info & Logout */}
         <div className="mr-auto flex items-center gap-4 text-[#1e3f66] ml-2">
            <span className="font-bold text-xs" dir="rtl">مرحباً: <span className="text-blue-800">{currentUser.name}</span></span>
            <button onClick={logout} className="flex items-center gap-1 text-red-600 hover:text-red-800 font-bold px-2 border border-transparent hover:border-red-200">
               <LogOut className="h-4 w-4" /> خروج
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col relative bg-[#b8cdd6]">
         {activeView === 'home' && (
           <div className="flex-1 flex flex-col items-center justify-center text-[#1e3f66] opacity-30">
             <Store className="w-48 h-48 mb-4 drop-shadow-lg" />
             <h1 className="text-6xl font-black tracking-widest drop-shadow-md">پرو فون</h1>
           </div>
         )}
         {activeView === 'cashier' && <Cashier key={cashierMode} initialType={cashierMode} />}
         {activeView === 'inventory' && <Inventory />}
         {activeView.startsWith('reports-') && <Reports view={activeView.replace('reports-', '') as any} />}
         {activeView === 'installments-add' && <InstallmentsAdd />}
         {activeView === 'installments-pay' && <InstallmentsPay />}
         {activeView === 'installments-late' && <InstallmentsLate />}
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
