import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { CashShift, Transaction, Expense } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Lock, 
  Unlock, 
  User, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertCircle, 
  Receipt,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper for computing shift metrics
export const getShiftCalculations = (shift: CashShift, transactions: Transaction[], expenses: Expense[]) => {
  const start = shift.openedAt;
  const end = shift.closedAt || new Date().toISOString();

  // Filter transactions within shift timeframe
  const shiftTransactions = transactions.filter(t => t.timestamp >= start && t.timestamp <= end);
  const shiftExpenses = expenses.filter(e => e.timestamp >= start && e.timestamp <= end);

  // Helper to calculate actual paid/returned amount
  const getAmount = (t: any) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

  // 1. Sales & Collections in cash
  const cashSales = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
    .reduce((sum, t) => sum + getAmount(t), 0);

  // Breakdown of Cash Sales
  const standardSales = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'sale').reduce((sum, t) => sum + getAmount(t), 0);
  const depositSales = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'deposit_sale').reduce((sum, t) => sum + getAmount(t), 0);
  const depositPayments = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'deposit_payment').reduce((sum, t) => sum + getAmount(t), 0);
  const installmentSales = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'installment_sale').reduce((sum, t) => sum + getAmount(t), 0);
  const installmentPayments = shiftTransactions.filter(t => t.paymentMethod === 'cash' && t.type === 'installment_payment').reduce((sum, t) => sum + getAmount(t), 0);

  // 2. Manual Inflows
  const manualInflow = shift.manualTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);

  // 3. Cash Returns
  const cashReturns = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && (t.type === 'return' || t.type === 'deposit_return'))
    .reduce((sum, t) => sum + getAmount(t), 0);

  // 4. Expenses (paid in cash)
  const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 5. Purchases (paid in cash)
  const cashPurchases = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type === 'purchase')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  // 6. Cash Exchanges Out (تسييل عهدة - منصرف من الدرج)
  const cashExchangeOut = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  // 7. Manual Outflows
  const manualOutflow = shift.manualTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

  // Expected cash calculation
  const expectedCash = shift.openingCash + cashSales + manualInflow - cashReturns - totalExpenses - cashPurchases - cashExchangeOut - manualOutflow;

  return {
    cashSales,
    standardSales,
    depositSales,
    depositPayments,
    installmentSales,
    installmentPayments,
    manualInflow,
    cashReturns,
    totalExpenses,
    cashPurchases,
    cashExchangeOut,
    manualOutflow,
    expectedCash
  };
};

export default function CashShiftManagement() {
  const { 
    shifts, 
    activeShift, 
    openShift, 
    closeShift, 
    addManualCashTransaction, 
    transactions, 
    expenses,
    currentUser 
  } = useAppStore();

  // Find previous closed shift to check for automatic opening balance inheritance
  const closedShifts = shifts.filter(s => s.isClosed);
  const lastClosedShift = closedShifts.length > 0 ? closedShifts[closedShifts.length - 1] : null;
  const inheritedOpeningCash = lastClosedShift ? lastClosedShift.closingCashActual : null;

  // State variables for form inputs
  const [openingInput, setOpeningInput] = useState<string>('');
  
  // Set default opening balance if inherited from previous closed shift
  useEffect(() => {
    if (inheritedOpeningCash !== null && inheritedOpeningCash !== undefined) {
      setOpeningInput(String(inheritedOpeningCash));
    } else {
      setOpeningInput('');
    }
  }, [inheritedOpeningCash]);

  // Manual transaction inputs inside the dashboard
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualType, setManualType] = useState<'inflow' | 'outflow'>('inflow');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Past shifts accordion lists
  const [showPastShifts, setShowPastShifts] = useState<boolean>(false);
  const [expandedPastShiftId, setExpandedPastShiftId] = useState<string | null>(null);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const cashVal = parseFloat(openingInput);
    if (isNaN(cashVal) || cashVal < 0) {
      alert('يرجى إدخال مبلغ افتتاحي صحيح أكبر من أو يساوي الصفر');
      return;
    }
    openShift(cashVal);
  };

  const handleAddManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(manualAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!manualNotes.trim()) {
      alert('يرجى إدخال سبب أو ملاحظات للعملية');
      return;
    }
    addManualCashTransaction(manualType, amt, manualNotes.trim());
    setManualAmount('');
    setManualNotes('');
    setShowManualForm(false);
    alert('تم تسجيل الحركة النقدية بنجاح!');
  };

  const handleCloseShiftWithConfirm = () => {
    const activeMetrics = activeShift ? getShiftCalculations(activeShift, transactions, expenses) : null;
    if (!activeMetrics) return;

    const formattedExpected = formatMoney(activeMetrics.expectedCash);
    const confirmClose = window.confirm(
      `تنبيه: هل أنت متأكد من تقفيل الوردية الحالية؟\n\n` +
      `- الرصيد الختامي المتوقع بالدرج: ${formattedExpected}\n` +
      `- سيقوم السيستم بإغلاق الوردية وترحيل هذا المبلغ كافتتاحي للوردية الجديدة تلقائياً وبأمان في الخلفية.`
    );

    if (confirmClose) {
      closeShift();
      alert('تم تقفيل الوردية الحالية بنجاح، وترحيل الرصيد كافتتاحي للوردية الجديدة!');
    }
  };

  // Helper formatting values to Arabic readable strings
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' }) + ' - ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  // Active shift calculations
  const activeMetrics = activeShift ? getShiftCalculations(activeShift, transactions, expenses) : null;

  // Render New Shift Startup Card if no active shift exists
  if (!activeShift) {
    return (
      <div className="flex-1 p-6 md:p-12 flex items-center justify-center bg-[#b8cdd6]/30 min-h-[calc(100vh-45px)]" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl overflow-hidden"
        >
          {/* Card Header Gradient */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-6 py-6 text-center space-y-2 relative">
            <div className="mx-auto w-12 h-12 bg-white/10 text-blue-300 rounded-2xl flex items-center justify-center shadow-inner mb-2">
              <Unlock className="h-6 w-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-black tracking-wide">بدء وتفعيل الوردية والعهدة اليومية</h2>
            <p className="text-xs text-blue-200 font-bold max-w-sm mx-auto">
              مرحباً بك في نظام X_PHONE. يرجى تسجيل المبلغ النقدي الحالي بالدرج لبدء المعاملات اليومية بأمان.
            </p>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {inheritedOpeningCash !== null && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs font-bold flex items-start gap-3 shadow-xs"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-emerald-900">تم ترحيل عهدة اليوم السابق تلقائياً</h4>
                  <p className="text-[11px] text-emerald-700/90 font-medium mt-1 leading-relaxed">
                    تم تأمين وحفظ رصيد التقفيل للوردية السابقة وترحيله تلقائياً وبأمان كافتتاح للوردية الحالية لمنع التلاعب وتسهيل العمل المكتبي.
                  </p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleOpenShift} className="space-y-6">
              <div className="space-y-2.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  رصيد درج الكاش الافتتاحي الفعلي حالياً (جنيه):
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    disabled={inheritedOpeningCash !== null}
                    placeholder="أدخل مبلغ العهدة لبدء العمل..."
                    value={openingInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        setOpeningInput(val);
                      }
                    }}
                    className={`w-full text-center h-14 text-2xl font-black border-2 outline-none rounded-xl transition-all ${
                      inheritedOpeningCash !== null
                        ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed pr-12'
                        : 'bg-blue-50/20 border-blue-200 focus:border-blue-500 focus:bg-white text-blue-900 shadow-inner'
                    }`}
                  />
                  {inheritedOpeningCash !== null && (
                    <div className="absolute right-4 text-slate-400">
                      <Lock className="h-5 w-5" />
                    </div>
                  )}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full h-13 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-extrabold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] cursor-pointer text-sm"
              >
                <CheckCircle2 className="h-5 w-5 text-indigo-200" />
                تفعيل الوردية وفتح الخزينة والدرج
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render Full Dashboard layout when shift is active
  return (
    <div className="flex-1 p-5 md:p-8 bg-[#c5d8e1]/40 flex flex-col space-y-6 overflow-y-auto min-h-[calc(100vh-45px)]" dir="rtl">
      
      {/* Top Welcome / Status Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner relative shrink-0">
            <Clock className="h-6 w-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-black text-slate-800 font-extrabold">الوردية الحالية نشطة ومفعلة</h2>
              <span className="bg-blue-100 text-blue-850 text-[10px] px-2.5 py-0.5 rounded-full font-black font-extrabold">وردية #{activeShift.id.slice(-5)}</span>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-slate-500"><User className="h-3.5 w-3.5 text-slate-400 shrink-0" /> مسؤول الوردية الحالي: <strong className="text-slate-700 font-extrabold">{currentUser?.name || 'المدير الافتراضي'}</strong></span>
              <span className="flex items-center gap-1 text-slate-500"><Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" /> تاريخ ووقت الفتح: <strong className="text-slate-700 font-extrabold">{formatDate(activeShift.openedAt)}</strong></span>
            </p>
          </div>
        </div>

        <button 
          onClick={handleCloseShiftWithConfirm}
          className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] self-stretch lg:self-center shrink-0 cursor-pointer text-xs md:text-sm font-extrabold"
        >
          <Lock className="h-5 w-5 text-rose-200" />
          تقفيل الوردية الحالية وترحيل الرصيد تلقائياً
        </button>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Right side / Primary widgets column (Expected Cash & Quick Actions) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Live Expected Cash Card */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl relative overflow-hidden shadow-xl border border-indigo-850/30">
            {/* Background design elements */}
            <div className="absolute -left-6 -bottom-6 opacity-10 pointer-events-none">
              <DollarSign className="w-48 h-48" />
            </div>
            
            <div className="relative z-10 space-y-5">
              <div>
                <span className="text-[10px] md:text-xs text-indigo-200 font-extrabold uppercase tracking-wider block mb-1">الرصيد الكاش المتوقع بالدرج حالياً</span>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md font-extrabold">
                  {formatMoney(activeMetrics.expectedCash)}
                </h1>
              </div>

              <div className="w-full h-[1px] bg-indigo-500/20"></div>

              <div className="space-y-2">
                <span className="text-[11px] text-indigo-300 font-bold block font-extrabold">حركات الخزينة والدرج اليدوية السريعة:</span>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setManualType('inflow'); setShowManualForm(true); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-4 rounded-xl text-[11px] md:text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10 hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer font-extrabold"
                  >
                    <PlusCircle className="h-4.5 w-4.5 shrink-0" /> إيداع فكة للدرج
                  </button>
                  <button 
                    onClick={() => { setManualType('outflow'); setShowManualForm(true); }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-3 px-4 rounded-xl text-[11px] md:text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/10 hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer font-extrabold"
                  >
                    <MinusCircle className="h-4.5 w-4.5 shrink-0" /> سحب مصروفات نثرية
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Manual Entry Form (Animated In-line) */}
          <AnimatePresence>
            {showManualForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="bg-white p-5 border border-slate-200/80 shadow-md rounded-2xl space-y-4"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2 font-extrabold">
                    <span className={`w-2.5 h-2.5 rounded-full ${manualType === 'inflow' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    <span>{manualType === 'inflow' ? 'تسجيل إيداع نقدي يدوي للدرج' : 'تسجيل سحب نقدي يدوي من الدرج'}</span>
                  </h3>
                  <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-650 p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X className="h-4.5 w-4.5" /></button>
                </div>

                <form onSubmit={handleAddManualTransaction} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">المبلغ (ج.م):</label>
                      <input 
                        type="text"
                        inputMode="decimal"
                        required
                        placeholder="مثال: 200"
                        value={manualAmount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                            setManualAmount(val);
                          }
                        }}
                        className="w-full h-11 border-2 border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white text-center font-black text-lg rounded-xl transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-600">البيان / السبب بالتفصيل:</label>
                      <input 
                        type="text"
                        required
                        placeholder="مثال: فكة للدرج بقيمة 200 ج"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        className="w-full h-11 border-2 border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white px-3 font-extrabold text-xs rounded-xl transition-all outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all duration-200 text-xs shadow-md shadow-indigo-900/10 cursor-pointer animate-none font-extrabold"
                  >
                    تسجيل وحفظ الحركة النقدية بالدرج
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Shift Manual Transactions Ledger */}
          <div className="bg-white p-5 border border-slate-200/80 shadow-sm rounded-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2 font-extrabold">
                <History className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                <span>حركات الخزينة اليدوية بالوردية الحالية ({activeShift.manualTransactions.length})</span>
              </h3>
            </div>
            
            {activeShift.manualTransactions.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <p className="text-xs text-slate-400 font-bold font-extrabold">لا توجد حركات يدوية مسجلة طوال هذه الوردية.</p>
                <p className="text-[10px] text-slate-350 font-bold">استخدم أزرار "إيداع فكة" أو "سحب نثريات" لتسجيل حركات يدوية خارج المبيعات.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1 space-y-1">
                {activeShift.manualTransactions.slice().reverse().map((tx) => (
                  <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs transition-colors hover:bg-slate-50/50 px-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      {tx.type === 'inflow' ? (
                        <span className="bg-emerald-50 text-emerald-600 p-2 rounded-lg shrink-0"><ArrowUpRight className="h-4 w-4" /></span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 p-2 rounded-lg shrink-0"><ArrowDownRight className="h-4 w-4" /></span>
                      )}
                      <div>
                        <span className="font-extrabold text-slate-800 block text-xs">{tx.notes}</span>
                        <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <span className={`font-black text-sm shrink-0 ${tx.type === 'inflow' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {tx.type === 'inflow' ? '+' : '-'} {formatMoney(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Left side / Live Ledger Breakdown & Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Detailed Ledger breakdown card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
            <div className="bg-slate-50 border-b border-slate-150 px-5 py-4 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 font-extrabold">كشف الحساب وتفاصيل العمليات للوردية الحالية</h3>
                <p className="text-[10px] text-slate-400 font-bold">الحسابات والعمليات النقدية منذ فتح الوردية</p>
              </div>
            </div>

            <div className="p-5 divide-y divide-slate-150/80 text-xs font-bold text-slate-650 space-y-3">
              <div className="flex justify-between py-2 items-center">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                  <span>الرصيد الافتتاحي لبداية الوردية</span>
                </div>
                <span className="text-slate-850 font-black text-sm">{formatMoney(activeShift.openingCash)}</span>
              </div>
              
              <div className="flex justify-between py-2 items-center text-emerald-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>صافي إيراد العمليات والمبيعات النقدية (+)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.cashSales)}</span>
              </div>

              {/* Collapsed/nested details for sales */}
              <div className="bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100/50 -mt-1 space-y-2 text-[11px] text-emerald-800/80">
                <div className="flex justify-between">
                  <span>- مبيعات كاشير قياسية نقدي:</span>
                  <span>{formatMoney(activeMetrics.standardSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- مبيعات عربون نقدي:</span>
                  <span>{formatMoney(activeMetrics.depositSales)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- تحصيلات دفعات عربون نقدي:</span>
                  <span>{formatMoney(activeMetrics.depositPayments)}</span>
                </div>
                <div className="flex justify-between">
                  <span>- مبيعات تقسيط نقدي:</span>
                  <span>{formatMoney(activeMetrics.installmentSales)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-emerald-800">
                  <span>- تحصيلات أقساط عملاء نقدي:</span>
                  <span>{formatMoney(activeMetrics.installmentPayments)}</span>
                </div>
              </div>

              <div className="flex justify-between py-2 items-center text-emerald-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>إيداعات نقدية يدوية (فكة) (+)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.manualInflow)}</span>
              </div>

              <div className="flex justify-between py-2 items-center text-rose-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>مرتجعات العملاء كاش (-)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.cashReturns)}</span>
              </div>

              <div className="flex justify-between py-2 items-center text-rose-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>المصروفات النقدية والرواتب (-)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.totalExpenses)}</span>
              </div>

              <div className="flex justify-between py-2 items-center text-rose-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>مشتريات مخزن كاش (-)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.cashPurchases)}</span>
              </div>

              <div className="flex justify-between py-2 items-center text-amber-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                  <span>عمليات تسييل عهدة محفظة (-)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.cashExchangeOut)}</span>
              </div>

              <div className="flex justify-between py-2 items-center text-rose-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                  <span>مسحوبات نثرية يدوية (-)</span>
                </div>
                <span className="font-black text-sm">{formatMoney(activeMetrics.manualOutflow)}</span>
              </div>

              <div className="flex justify-between py-3.5 border-t-2 border-slate-200 font-black text-slate-900 text-sm bg-indigo-50/50 px-4 rounded-xl mt-2">
                <div className="flex items-center gap-2 text-indigo-950 font-extrabold">
                  <DollarSign className="h-5 w-5 text-indigo-650 animate-pulse shrink-0" />
                  <span>إجمالي الرصيد الكاش المتوقع بالدرج حالياً</span>
                </div>
                <span className="text-indigo-900 text-lg md:text-xl font-extrabold">{formatMoney(activeMetrics.expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Past Closed Shifts Logs History */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
            <button 
              onClick={() => setShowPastShifts(!showPastShifts)}
              className="w-full px-5 py-4 flex items-center justify-between font-extrabold text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer select-none font-extrabold"
            >
              <span className="flex items-center gap-2"><History className="h-5 w-5 text-slate-500 shrink-0" /> سجل الورديات والعهد السابقة المسجلة للنظام ({closedShifts.length})</span>
              {showPastShifts ? <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" /> : <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />}
            </button>

            {showPastShifts && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/30 space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {closedShifts.length === 0 ? (
                  <p className="text-xs text-slate-455 font-bold text-center py-10 font-extrabold">لا توجد ورديات سابقة مغلقة في النظام حالياً.</p>
                ) : (
                  closedShifts.slice().reverse().map((shift) => {
                    const metrics = getShiftCalculations(shift, transactions, expenses);
                    const actual = shift.closingCashActual || 0;
                    const isExpanded = expandedPastShiftId === shift.id;

                    return (
                      <div key={shift.id} className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
                        <div 
                          onClick={() => setExpandedPastShiftId(isExpanded ? null : shift.id)}
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/40 text-xs font-bold text-slate-600 transition-all select-none"
                        >
                          <div className="space-y-1">
                            <span className="bg-indigo-50 text-indigo-850 text-[10px] px-2.5 py-0.5 rounded-md font-black font-extrabold">وردية #{shift.id.slice(-5)}</span>
                            <span className="text-slate-400 block text-[9.5px] mt-0.5">{formatDate(shift.openedAt)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-slate-400 block text-[9px] font-bold">الرصيد الفعلي المسجل</span>
                              <span className="text-slate-800 font-black text-sm">{formatMoney(actual)}</span>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4.5 w-4.5 text-slate-400 shrink-0" /> : <ChevronDown className="h-4.5 w-4.5 text-slate-400 shrink-0" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 space-y-2">
                            <div className="flex justify-between">
                              <span>الرصيد الافتتاحي</span>
                              <span>{formatMoney(shift.openingCash)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-700">
                              <span>صافي الوارد المالي نقداً</span>
                              <span>{formatMoney(metrics.cashSales + metrics.manualInflow)}</span>
                            </div>
                            <div className="flex justify-between text-rose-700">
                              <span>صافي المنصرف والمصروفات</span>
                              <span>{formatMoney(metrics.cashReturns + metrics.totalExpenses + metrics.cashPurchases + metrics.cashExchangeOut + metrics.manualOutflow)}</span>
                            </div>
                            <div className="flex justify-between border-t border-slate-200 pt-2 font-black text-slate-900 text-xs bg-slate-100/50 p-2 rounded">
                              <span>الرصيد النهائي المسجل عند الإغلاق</span>
                              <span className="text-indigo-900 text-sm font-extrabold">{formatMoney(actual)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
