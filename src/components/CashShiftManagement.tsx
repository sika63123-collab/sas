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
  Calendar,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  FileText,
  BadgeDollarSign,
  ArrowRightLeft,
  Package,
  ReceiptText
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

  // 1. Sales & Collections in cash (excludes returns and cash_exchange)
  const cashSales = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
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
    .filter(t => t.paymentMethod === 'cash' && t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'return' || t.type === 'deposit_return'))
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

  // 7. Cash Exchanges In (استلام من محفظة - وارد للدرج)
  const cashExchangeIn = shiftTransactions
    .filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange_reverse')
    .reduce((sum, t) => sum + t.totalAmount, 0);

  // 8. Manual Outflows
  const manualOutflow = shift.manualTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

  // Total inflows and outflows
  const totalInflows = cashSales + manualInflow + cashExchangeIn;
  const totalOutflows = cashReturns + totalExpenses + cashPurchases + cashExchangeOut + manualOutflow;

  // Expected cash calculation
  const expectedCash = shift.openingCash + totalInflows - totalOutflows;

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
    cashExchangeIn,
    manualOutflow,
    totalInflows,
    totalOutflows,
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

  // Close shift modal
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [actualCashInput, setActualCashInput] = useState<string>('');

  // Sales breakdown expand
  const [showSalesBreakdown, setShowSalesBreakdown] = useState<boolean>(false);

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

  const handleOpenCloseModal = () => {
    if (!activeMetrics) return;
    setActualCashInput(String(activeMetrics.expectedCash));
    setShowCloseModal(true);
  };

  const handleConfirmCloseShift = () => {
    const actualVal = parseFloat(actualCashInput);
    if (isNaN(actualVal) || actualVal < 0) {
      alert('يرجى إدخال الرصيد الفعلي بالدرج');
      return;
    }
    closeShift(actualVal);
    setShowCloseModal(false);
    setActualCashInput('');
    alert('تم تقفيل الوردية بنجاح! يمكنك الآن فتح وردية جديدة.');
  };

  // Helper formatting values to Arabic readable strings
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-EG', { weekday: 'short', month: 'numeric', day: 'numeric' }) + ' - ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  // Active shift calculations
  const activeMetrics = activeShift ? getShiftCalculations(activeShift, transactions, expenses) : null;

  // ─── RENDER: Opening Shift Screen ─────────────────────────────────────
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
          <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-6 py-6 text-center space-y-2 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute top-2 right-4 w-20 h-20 rounded-full border-2 border-white/20"></div>
              <div className="absolute bottom-1 left-8 w-14 h-14 rounded-full border-2 border-white/15"></div>
            </div>
            <div className="relative z-10">
              <div className="mx-auto w-14 h-14 bg-white/10 text-blue-300 rounded-2xl flex items-center justify-center shadow-inner mb-3 backdrop-blur-sm">
                <Unlock className="h-7 w-7 animate-pulse" />
              </div>
              <h2 className="text-xl font-black tracking-wide">بدء وردية جديدة</h2>
              <p className="text-xs text-blue-200 font-bold max-w-sm mx-auto mt-1 leading-relaxed">
                سجّل الرصيد الافتتاحي الفعلي بالدرج لبدء العمل بأمان وتتبع كل الحركات النقدية.
              </p>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-5">
            {inheritedOpeningCash !== null && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 text-xs font-bold flex items-start gap-3 shadow-xs"
              >
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-emerald-900 text-[13px]">تم ترحيل رصيد الوردية السابقة تلقائياً</h4>
                  <p className="text-[11px] text-emerald-700/90 font-medium mt-1 leading-relaxed">
                    رصيد التقفيل السابق ({formatMoney(inheritedOpeningCash)}) تم ترحيله كافتتاح للوردية الحالية.
                  </p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleOpenShift} className="space-y-5">
              <div className="space-y-2.5">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="h-3.5 w-3.5 text-slate-500" />
                    الرصيد الافتتاحي (ج.م):
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    disabled={inheritedOpeningCash !== null}
                    placeholder="أدخل المبلغ الفعلي بالدرج..."
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
                تفعيل الوردية وفتح الدرج
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── RENDER: Active Shift Dashboard ────────────────────────────────────
  return (
    <div className="flex-1 p-4 md:p-6 bg-[#c5d8e1]/40 flex flex-col space-y-5 overflow-y-auto min-h-[calc(100vh-45px)]" dir="rtl">
      
      {/* ═══ Header Bar ═══ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/90 backdrop-blur-md p-4 md:p-5 rounded-2xl border border-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shadow-inner relative shrink-0">
            <Clock className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-black text-slate-800">الوردية الحالية نشطة ومفعلة</h2>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">#{activeShift.id.slice(-5)}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-bold mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 text-slate-500"><User className="h-3 w-3 text-slate-400 shrink-0" /> <strong className="text-slate-700 font-extrabold">{currentUser?.name || 'المدير الافتراضي'}</strong></span>
              <span className="flex items-center gap-1 text-slate-500"><Calendar className="h-3 w-3 text-slate-400 shrink-0" /> {formatDate(activeShift.openedAt)}</span>
            </p>
          </div>
        </div>

        <button 
          onClick={handleOpenCloseModal}
          className="bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] self-stretch lg:self-center shrink-0 cursor-pointer text-xs md:text-sm"
        >
          <Lock className="h-4 w-4 text-rose-200" />
          تقفيل الوردية
        </button>
      </div>

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ─── RIGHT: Cash Balance + Quick Actions ─── */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Live Cash Balance Card */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl relative overflow-hidden shadow-xl border border-indigo-850/30">
            <div className="absolute -left-8 -bottom-8 opacity-[0.07] pointer-events-none">
              <DollarSign className="w-40 h-40" />
            </div>
            
            <div className="relative z-10 space-y-4">
              {/* Opening Balance Badge */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">الرصيد الكاش المتوقع بالدرج</span>
                <span className="bg-white/10 text-blue-200 text-[9px] px-2 py-0.5 rounded-md font-bold backdrop-blur-sm">
                  الافتتاحي: {formatMoney(activeShift.openingCash)}
                </span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
                {formatMoney(activeMetrics!.expectedCash)}
              </h1>

              {/* Quick summary row */}
              <div className="flex gap-3 text-[10px]">
                <div className="flex-1 bg-emerald-500/15 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center border border-emerald-400/10">
                  <span className="text-emerald-300 block font-bold">إجمالي الوارد</span>
                  <span className="text-white font-black text-sm mt-0.5 block">+{formatMoney(activeMetrics!.totalInflows)}</span>
                </div>
                <div className="flex-1 bg-rose-500/15 backdrop-blur-sm rounded-lg px-2.5 py-2 text-center border border-rose-400/10">
                  <span className="text-rose-300 block font-bold">إجمالي المنصرف</span>
                  <span className="text-white font-black text-sm mt-0.5 block">-{formatMoney(activeMetrics!.totalOutflows)}</span>
                </div>
              </div>

              <div className="w-full h-[1px] bg-indigo-500/20"></div>

              {/* Quick Actions */}
              <div className="space-y-2">
                <span className="text-[10px] text-indigo-300 font-bold block">حركات يدوية سريعة:</span>
                <div className="flex gap-2.5">
                  <button 
                    onClick={() => { setManualType('inflow'); setShowManualForm(true); }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 px-3 rounded-xl text-[11px] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/10 hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer"
                  >
                    <PlusCircle className="h-4 w-4 shrink-0" /> إيداع فكة
                  </button>
                  <button 
                    onClick={() => { setManualType('outflow'); setShowManualForm(true); }}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black py-2.5 px-3 rounded-xl text-[11px] transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md shadow-amber-900/10 hover:translate-y-[-1px] active:translate-y-[1px] cursor-pointer"
                  >
                    <MinusCircle className="h-4 w-4 shrink-0" /> سحب نثرية
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Manual Entry Form (Animated) */}
          <AnimatePresence>
            {showManualForm && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="bg-white p-4 border border-slate-200/80 shadow-md rounded-2xl space-y-3"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${manualType === 'inflow' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                    {manualType === 'inflow' ? 'إيداع نقدي للدرج' : 'سحب نقدي من الدرج'}
                  </h3>
                  <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
                </div>

                <form onSubmit={handleAddManualTransaction} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">المبلغ (ج.م):</label>
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
                        className="w-full h-10 border-2 border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white text-center font-black text-lg rounded-xl transition-all outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">البيان / السبب:</label>
                      <input 
                        type="text"
                        required
                        placeholder="مثال: فكة للدرج"
                        value={manualNotes}
                        onChange={(e) => setManualNotes(e.target.value)}
                        className="w-full h-10 border-2 border-slate-200 focus:border-blue-500 bg-slate-50 focus:bg-white px-3 font-bold text-xs rounded-xl transition-all outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all duration-200 text-xs shadow-md cursor-pointer"
                  >
                    تسجيل وحفظ الحركة
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual Transactions Ledger */}
          <div className="bg-white p-4 border border-slate-200/80 shadow-sm rounded-2xl space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
              <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-2">
                <History className="h-4 w-4 text-slate-500 shrink-0" />
                حركات يدوية ({activeShift.manualTransactions.length})
              </h3>
            </div>
            
            {activeShift.manualTransactions.length === 0 ? (
              <div className="text-center py-8 space-y-1.5">
                <p className="text-xs text-slate-400 font-bold">لا توجد حركات يدوية في هذه الوردية</p>
                <p className="text-[10px] text-slate-350 font-medium">استخدم أزرار الإيداع والسحب أعلاه</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto pr-1 space-y-0.5">
                {activeShift.manualTransactions.slice().reverse().map((tx) => (
                  <div key={tx.id} className="py-2 flex justify-between items-center text-xs transition-colors hover:bg-slate-50/50 px-2 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      {tx.type === 'inflow' ? (
                        <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg shrink-0"><ArrowUpRight className="h-3.5 w-3.5" /></span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 p-1.5 rounded-lg shrink-0"><ArrowDownRight className="h-3.5 w-3.5" /></span>
                      )}
                      <div>
                        <span className="font-bold text-slate-800 block text-[11px]">{tx.notes}</span>
                        <span className="text-[9px] text-slate-400 font-medium block mt-0.5">{formatTime(tx.timestamp)}</span>
                      </div>
                    </div>
                    <span className={`font-black text-xs shrink-0 ${tx.type === 'inflow' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {tx.type === 'inflow' ? '+' : '-'} {formatMoney(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── LEFT: Detailed Ledger ─── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Account Statement Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-md">
            <div className="bg-slate-50 border-b border-slate-150 px-4 py-3 flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 text-indigo-600 shrink-0" />
              <div>
                <h3 className="font-extrabold text-sm text-slate-800">كشف حساب الوردية الحالية</h3>
                <p className="text-[10px] text-slate-400 font-medium">جميع الحركات النقدية منذ فتح الوردية</p>
              </div>
            </div>

            <div className="p-4 text-xs font-bold text-slate-600">
              
              {/* ── Opening Balance ── */}
              <div className="flex justify-between py-2.5 items-center bg-blue-50/40 px-3 rounded-xl mb-3 border border-blue-100/50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Wallet className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-blue-900 font-extrabold">الرصيد الافتتاحي</span>
                </div>
                <span className="text-blue-900 font-black text-sm">{formatMoney(activeShift.openingCash)}</span>
              </div>

              {/* ── INFLOWS Section ── */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wide">الإيرادات والوارد النقدي</span>
                </div>
                
                <div className="space-y-0.5 bg-emerald-50/30 rounded-xl border border-emerald-100/40 overflow-hidden">
                  {/* Cash Sales - with expandable breakdown */}
                  <div>
                    <button 
                      onClick={() => setShowSalesBreakdown(!showSalesBreakdown)}
                      className="flex justify-between py-2.5 px-3 items-center w-full hover:bg-emerald-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <BadgeDollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-800">المبيعات والتحصيلات النقدية</span>
                        {showSalesBreakdown ? <ChevronUp className="h-3 w-3 text-emerald-400" /> : <ChevronDown className="h-3 w-3 text-emerald-400" />}
                      </div>
                      <span className="text-emerald-800 font-black text-sm">+{formatMoney(activeMetrics!.cashSales)}</span>
                    </button>
                    
                    <AnimatePresence>
                      {showSalesBreakdown && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-2.5 space-y-1.5 text-[10.5px] text-emerald-700/80 border-t border-emerald-100/50 pt-2">
                            <div className="flex justify-between"><span>• مبيعات كاشير نقدي</span><span>{formatMoney(activeMetrics!.standardSales)}</span></div>
                            <div className="flex justify-between"><span>• مبيعات عربون نقدي</span><span>{formatMoney(activeMetrics!.depositSales)}</span></div>
                            <div className="flex justify-between"><span>• تحصيلات عربون نقدي</span><span>{formatMoney(activeMetrics!.depositPayments)}</span></div>
                            <div className="flex justify-between"><span>• مبيعات تقسيط نقدي</span><span>{formatMoney(activeMetrics!.installmentSales)}</span></div>
                            <div className="flex justify-between"><span>• تحصيلات أقساط نقدي</span><span>{formatMoney(activeMetrics!.installmentPayments)}</span></div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Manual Inflow */}
                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-emerald-100/50">
                    <div className="flex items-center gap-2">
                      <PlusCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="text-emerald-800">إيداعات يدوية (فكة)</span>
                    </div>
                    <span className="text-emerald-800 font-black text-sm">+{formatMoney(activeMetrics!.manualInflow)}</span>
                  </div>

                  {/* Cash Exchange In (wallet → cash) */}
                  {activeMetrics!.cashExchangeIn > 0 && (
                    <div className="flex justify-between py-2.5 px-3 items-center border-t border-emerald-100/50">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="text-blue-800">وارد من المحافظ (استلام)</span>
                      </div>
                      <span className="text-blue-800 font-black text-sm">+{formatMoney(activeMetrics!.cashExchangeIn)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── OUTFLOWS Section ── */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
                  <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wide">المصروفات والمنصرف النقدي</span>
                </div>
                
                <div className="space-y-0.5 bg-rose-50/30 rounded-xl border border-rose-100/40 overflow-hidden">
                  <div className="flex justify-between py-2.5 px-3 items-center">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-800">مرتجعات العملاء</span>
                    </div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.cashReturns)}</span>
                  </div>

                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2">
                      <ReceiptText className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-800">المصروفات والرواتب</span>
                    </div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.totalExpenses)}</span>
                  </div>

                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-800">مشتريات مخزن كاش</span>
                    </div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.cashPurchases)}</span>
                  </div>

                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="text-amber-800">تسييل عهدة محفظة</span>
                    </div>
                    <span className="text-amber-800 font-black text-sm">-{formatMoney(activeMetrics!.cashExchangeOut)}</span>
                  </div>

                  <div className="flex justify-between py-2.5 px-3 items-center border-t border-rose-100/50">
                    <div className="flex items-center gap-2">
                      <MinusCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-800">مسحوبات نثرية يدوية</span>
                    </div>
                    <span className="text-rose-800 font-black text-sm">-{formatMoney(activeMetrics!.manualOutflow)}</span>
                  </div>
                </div>
              </div>

              {/* ── Total Expected Balance ── */}
              <div className="flex justify-between py-3 border-t-2 border-indigo-200 font-black text-slate-900 bg-indigo-50/60 px-4 rounded-xl items-center">
                <div className="flex items-center gap-2 text-indigo-950">
                  <DollarSign className="h-5 w-5 text-indigo-600 animate-pulse shrink-0" />
                  <span className="text-sm font-extrabold">الرصيد المتوقع بالدرج</span>
                </div>
                <span className="text-indigo-900 text-lg md:text-xl font-extrabold">{formatMoney(activeMetrics!.expectedCash)}</span>
              </div>
            </div>
          </div>

          {/* Past Shifts History */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setShowPastShifts(!showPastShifts)}
              className="w-full px-4 py-3.5 flex items-center justify-between font-extrabold text-sm text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer select-none"
            >
              <span className="flex items-center gap-2"><History className="h-4 w-4 text-slate-500 shrink-0" /> سجل الورديات السابقة ({closedShifts.length})</span>
              {showPastShifts ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
            </button>

            <AnimatePresence>
              {showPastShifts && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-slate-100 bg-slate-50/30 space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                    {closedShifts.length === 0 ? (
                      <p className="text-xs text-slate-400 font-bold text-center py-8">لا توجد ورديات سابقة مسجلة</p>
                    ) : (
                      closedShifts.slice().reverse().map((shift) => {
                        const metrics = getShiftCalculations(shift, transactions, expenses);
                        const actual = shift.closingCashActual || 0;
                        const diff = actual - metrics.expectedCash;
                        const isExpanded = expandedPastShiftId === shift.id;

                        return (
                          <div key={shift.id} className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden">
                            <div 
                              onClick={() => setExpandedPastShiftId(isExpanded ? null : shift.id)}
                              className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50/40 text-xs font-bold text-slate-600 transition-all select-none"
                            >
                              <div className="space-y-1">
                                <span className="bg-indigo-50 text-indigo-800 text-[10px] px-2 py-0.5 rounded-md font-extrabold">وردية #{shift.id.slice(-5)}</span>
                                <span className="text-slate-400 block text-[9.5px] mt-0.5">{formatDate(shift.openedAt)}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-slate-400 block text-[9px] font-medium">الرصيد الفعلي</span>
                                  <span className="text-slate-800 font-black text-sm">{formatMoney(actual)}</span>
                                </div>
                                {diff !== 0 && (
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-extrabold ${diff > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                    {diff > 0 ? '+' : ''}{formatMoney(diff)}
                                  </span>
                                )}
                                {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                              </div>
                            </div>

                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 space-y-1.5">
                                    <div className="flex justify-between">
                                      <span>الرصيد الافتتاحي</span>
                                      <span>{formatMoney(shift.openingCash)}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-700">
                                      <span>صافي الوارد النقدي</span>
                                      <span>+{formatMoney(metrics.cashSales + metrics.manualInflow)}</span>
                                    </div>
                                    <div className="flex justify-between text-rose-700">
                                      <span>صافي المنصرف</span>
                                      <span>-{formatMoney(metrics.cashReturns + metrics.totalExpenses + metrics.cashPurchases + metrics.cashExchangeOut + metrics.manualOutflow)}</span>
                                    </div>
                                    <div className="flex justify-between text-indigo-700 border-t border-slate-200 pt-1.5">
                                      <span>المتوقع بالنظام</span>
                                      <span className="font-extrabold">{formatMoney(metrics.expectedCash)}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-1.5 font-black text-slate-900 bg-slate-100/50 p-2 rounded-lg">
                                      <span>الفعلي عند التقفيل</span>
                                      <span className="text-indigo-900 text-sm font-extrabold">{formatMoney(actual)}</span>
                                    </div>
                                    {diff !== 0 && (
                                      <div className={`flex justify-between p-2 rounded-lg text-xs font-extrabold ${diff > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                                        <span>{diff > 0 ? 'فائض في الدرج' : 'عجز في الدرج'}</span>
                                        <span>{diff > 0 ? '+' : ''}{formatMoney(diff)}</span>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ═══ Close Shift Modal ═══ */}
      <AnimatePresence>
        {showCloseModal && activeMetrics && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCloseModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-rose-700 to-red-800 text-white px-5 py-5 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute top-2 right-6 w-16 h-16 rounded-full border-2 border-white/20"></div>
                  <div className="absolute bottom-1 left-10 w-10 h-10 rounded-full border-2 border-white/15"></div>
                </div>
                <div className="relative z-10">
                  <div className="mx-auto w-12 h-12 bg-white/15 text-rose-200 rounded-2xl flex items-center justify-center mb-3 backdrop-blur-sm">
                    <Lock className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-black">تقفيل الوردية الحالية</h2>
                  <p className="text-xs text-rose-200 font-medium mt-1">تأكد من عدّ الكاش الفعلي بالدرج قبل التقفيل</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Expected Cash Summary */}
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      الرصيد المتوقع بالنظام:
                    </span>
                    <span className="font-black text-lg text-indigo-900">{formatMoney(activeMetrics.expectedCash)}</span>
                  </div>
                </div>

                {/* Shift Summary Mini */}
                <div className="bg-slate-50 rounded-xl p-3 text-[11px] font-bold text-slate-600 space-y-1.5 border border-slate-100">
                  <div className="flex justify-between"><span>الافتتاحي</span><span>{formatMoney(activeShift.openingCash)}</span></div>
                  <div className="flex justify-between text-emerald-700"><span>+ وارد</span><span>{formatMoney(activeMetrics.totalInflows)}</span></div>
                  <div className="flex justify-between text-rose-700"><span>- منصرف</span><span>{formatMoney(activeMetrics.totalOutflows)}</span></div>
                </div>

                {/* Actual Cash Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Wallet className="h-3.5 w-3.5 text-slate-500" />
                      الرصيد الفعلي بالدرج بعد العدّ (ج.م):
                    </span>
                  </label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    required
                    placeholder="أدخل المبلغ الفعلي..."
                    value={actualCashInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                        setActualCashInput(val);
                      }
                    }}
                    className="w-full text-center h-14 text-2xl font-black border-2 border-slate-200 focus:border-rose-400 bg-white text-slate-900 rounded-xl transition-all outline-none shadow-inner"
                  />
                </div>

                {/* Difference Display */}
                {actualCashInput && !isNaN(parseFloat(actualCashInput)) && (() => {
                  const diff = parseFloat(actualCashInput) - activeMetrics.expectedCash;
                  if (diff === 0) return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-emerald-800 text-xs font-extrabold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>الدرج مطابق — لا يوجد فرق</span>
                    </div>
                  );
                  return (
                    <div className={`border rounded-xl p-3 flex items-center gap-2 text-xs font-extrabold ${
                      diff > 0 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 shrink-0 ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <span>{diff > 0 ? 'فائض' : 'عجز'}: {formatMoney(Math.abs(diff))}</span>
                    </div>
                  );
                })()}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowCloseModal(false)}
                    className="flex-1 h-11 border-2 border-slate-200 text-slate-600 font-extrabold rounded-xl hover:bg-slate-50 transition-all text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirmCloseShift}
                    className="flex-1 h-11 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    تأكيد التقفيل
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
                  سيتم ترحيل الرصيد الفعلي كافتتاحي للوردية الجديدة تلقائياً
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
