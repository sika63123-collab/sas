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

interface CashShiftManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CashShiftManagement({ isOpen, onClose }: CashShiftManagementProps) {
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
  }, [inheritedOpeningCash, isOpen]);

  // Manual transaction inputs inside the panel
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [manualType, setManualType] = useState<'inflow' | 'outflow'>('inflow');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');

  // Past shifts accordion lists
  const [showPastShifts, setShowPastShifts] = useState<boolean>(false);
  const [expandedPastShiftId, setExpandedPastShiftId] = useState<string | null>(null);

  // Show detailed ledger breakdown inside drawer
  const [showLedgerBreakdown, setShowLedgerBreakdown] = useState<boolean>(false);

  // Lock status to force shift start
  const isLockedForceShift = !activeShift;

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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Blur Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isLockedForceShift) onClose();
            }}
            className={`fixed inset-0 bg-slate-900/60 z-[99] backdrop-blur-xs transition-opacity ${
              isLockedForceShift ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          />

          {/* Sliding Side Panel Drawer */}
          <motion.div 
            initial={{ x: '100%', opacity: 0.95 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[420px] max-w-full bg-[#f8fafc]/98 backdrop-blur-md shadow-2xl z-[100] border-l border-slate-200 flex flex-col text-slate-800"
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400 animate-pulse" />
                <div>
                  <h3 className="font-black text-base text-blue-50">إدارة الوردية والعهدة</h3>
                  <p className="text-[10px] text-blue-200 font-bold">الحسابات والدرج النقدي اليومي</p>
                </div>
              </div>
              
              {!isLockedForceShift && (
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-white/10 text-blue-200 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Scrollable Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Force Open Shift Form */}
              {!activeShift ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-5 border border-slate-200 shadow-sm rounded-xl space-y-4"
                >
                  <div className="flex items-center gap-3 text-blue-900 border-b border-slate-100 pb-3">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Unlock className="h-5 w-5" /></span>
                    <div>
                      <h4 className="font-extrabold text-sm">بدء وردية جديدة</h4>
                      <p className="text-[10px] text-slate-400 font-bold">يرجى تسجيل رصيد افتتاح الكاش لبدء استخدام النظام</p>
                    </div>
                  </div>

                  {inheritedOpeningCash !== null && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-[11px] font-bold flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                      تم ترحيل رصيد إغلاق اليوم السابق تلقائياً وبأمان لمنع التلاعب.
                    </div>
                  )}

                  <form onSubmit={handleOpenShift} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-700">رصيد درج الكاش الافتتاحي (جنيه):</label>
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          inputMode="decimal"
                          required
                          disabled={inheritedOpeningCash !== null}
                          placeholder="اكتب الرصيد الافتتاحي..."
                          value={openingInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^[0-9]*\.?[0-9]*$/.test(val)) {
                              setOpeningInput(val);
                            }
                          }}
                          className={`w-full text-center h-12 text-lg font-black border-2 outline-none rounded-lg transition-all ${
                            inheritedOpeningCash !== null
                              ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed pr-10'
                              : 'bg-blue-50/30 border-blue-200 focus:border-blue-500 focus:bg-white text-blue-900'
                          }`}
                        />
                        {inheritedOpeningCash !== null && (
                          <Lock className="absolute right-3 h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      <CheckCircle2 className="h-4.5 w-4.5" />
                      تفعيل وبدء الوردية والعهد
                    </button>
                  </form>
                </motion.div>
              ) : (
                /* Active Shift Dashboard */
                activeMetrics && (
                  <div className="space-y-4">
                    
                    {/* Live Balance Card */}
                    <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-5 rounded-xl relative overflow-hidden shadow-md">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-5">
                        <DollarSign className="w-32 h-32" />
                      </div>
                      <div className="relative z-10 space-y-1">
                        <span className="text-[10px] text-blue-300 font-extrabold uppercase tracking-wide">الكاش المتوقع بالدرج حالياً</span>
                        <h2 className="text-3xl font-black text-blue-50">{formatMoney(activeMetrics.expectedCash)}</h2>
                        
                        <div className="flex gap-2 pt-3 shrink-0">
                          <button 
                            onClick={() => { setManualType('inflow'); setShowManualForm(true); }}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-extrabold py-2 px-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm"
                          >
                            <PlusCircle className="h-3.5 w-3.5" /> إيداع فكة
                          </button>
                          <button 
                            onClick={() => { setManualType('outflow'); setShowManualForm(true); }}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2 px-2 rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 shadow-sm"
                          >
                            <MinusCircle className="h-3.5 w-3.5" /> سحب نثريات
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline Manual Inflow/Outflow Form */}
                    <AnimatePresence>
                      {showManualForm && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl space-y-3"
                        >
                          <h5 className="font-extrabold text-xs text-slate-800 border-b pb-2 flex justify-between items-center">
                            <span>{manualType === 'inflow' ? 'تسجيل إيداع نقدي يدوي' : 'تسجيل سحب نقدي يدوي'}</span>
                            <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
                          </h5>

                          <form onSubmit={handleAddManualTransaction} className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">المبلغ (ج.م):</label>
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
                                  className="w-full h-9 border border-slate-200 px-3 outline-none text-center font-bold text-sm rounded bg-slate-50 text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">البيان / السبب:</label>
                                <input 
                                  type="text"
                                  required
                                  placeholder="مثال: فكة للدرج"
                                  value={manualNotes}
                                  onChange={(e) => setManualNotes(e.target.value)}
                                  className="w-full h-9 border border-slate-200 px-3 outline-none font-bold text-xs rounded bg-slate-50 text-slate-800"
                                />
                              </div>
                            </div>
                            <button 
                              type="submit" 
                              className="w-full h-8.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded text-[11px] transition-all"
                            >
                              تسجيل وحفظ الحركة
                            </button>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Compact Ledger Section */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <button 
                        onClick={() => setShowLedgerBreakdown(!showLedgerBreakdown)}
                        className="w-full px-4 py-3 flex items-center justify-between font-extrabold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5"><Receipt className="h-4 w-4 text-blue-600" /> كشف تفاصيل الدرج النقدي</span>
                        {showLedgerBreakdown ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>

                      {showLedgerBreakdown && (
                        <div className="px-4 pb-3 border-t divide-y divide-slate-100 text-[11px] font-bold text-slate-600 space-y-2 pt-2">
                          <div className="flex justify-between py-1">
                            <span>الرصيد الافتتاحي لبداية الوردية</span>
                            <span className="text-slate-800">{formatMoney(activeShift.openingCash)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-green-700">
                            <span>وارد العمليات والمبيعات النقدية (+)</span>
                            <span>{formatMoney(activeMetrics.cashSales)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-blue-700">
                            <span>إيداعات فكة يدوية (+)</span>
                            <span>{formatMoney(activeMetrics.manualInflow)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-red-700">
                            <span>مرتجعات العملاء كاش (-)</span>
                            <span>{formatMoney(activeMetrics.cashReturns)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-red-700">
                            <span>المصروفات النقدية والرواتب (-)</span>
                            <span>{formatMoney(activeMetrics.totalExpenses)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-red-700">
                            <span>مشتريات مخزن كاش (-)</span>
                            <span>{formatMoney(activeMetrics.cashPurchases)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-amber-700">
                            <span>تسييل عهدة محفظة (-)</span>
                            <span>{formatMoney(activeMetrics.cashExchangeOut)}</span>
                          </div>
                          <div className="flex justify-between py-1 text-red-700">
                            <span>مسحوبات نثرية يدوية (-)</span>
                            <span>{formatMoney(activeMetrics.manualOutflow)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t font-black text-slate-900 text-xs bg-slate-50/50 px-2 rounded mt-1">
                            <span>الرصيد المتوقع بالدرج</span>
                            <span className="text-blue-900">{formatMoney(activeMetrics.expectedCash)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Manual Movement History for active shift */}
                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl space-y-2">
                      <h4 className="font-extrabold text-xs text-slate-800 border-b pb-2">الحركات اليدوية بالوردية ({activeShift.manualTransactions.length})</h4>
                      {activeShift.manualTransactions.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-bold text-center py-4">لا توجد حركات يدوية طوال هذه الوردية.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto pr-1">
                          {activeShift.manualTransactions.map((tx) => (
                            <div key={tx.id} className="py-2 flex justify-between items-center text-[11px]">
                              <div className="flex items-center gap-1.5">
                                {tx.type === 'inflow' ? (
                                  <span className="bg-green-50 text-green-700 p-1 rounded-full"><ArrowUpRight className="h-3.5 w-3.5" /></span>
                                ) : (
                                  <span className="bg-amber-50 text-amber-700 p-1 rounded-full"><ArrowDownRight className="h-3.5 w-3.5" /></span>
                                )}
                                <div>
                                  <span className="font-bold text-slate-800">{tx.notes}</span>
                                  <span className="text-[9px] text-slate-400 block font-semibold">{new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <span className={`font-black ${tx.type === 'inflow' ? 'text-green-600' : 'text-amber-600'}`}>
                                {tx.type === 'inflow' ? '+' : '-'} {formatMoney(tx.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Active shift details & Close button */}
                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-b pb-2">
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> مسؤول الوردية: <strong className="text-slate-700">{currentUser?.name || 'المدير الافتراضي'}</strong></span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> فتح: <strong className="text-slate-700">{formatDate(activeShift.openedAt)}</strong></span>
                      </div>

                      <button 
                        onClick={handleCloseShiftWithConfirm}
                        className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-extrabold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
                      >
                        <Lock className="h-4.5 w-4.5" />
                        تقفيل الوردية الحالية وترحيل الرصيد
                      </button>
                    </div>

                  </div>
                )
              )}

              {/* Collapsible History of closed shifts */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <button 
                  onClick={() => setShowPastShifts(!showPastShifts)}
                  className="w-full px-4 py-3 flex items-center justify-between font-extrabold text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><History className="h-4 w-4 text-slate-500" /> سجل الورديات والعهد السابقة ({closedShifts.length})</span>
                  {showPastShifts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showPastShifts && (
                  <div className="p-3 border-t bg-slate-50/50 space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {closedShifts.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-bold text-center py-4">لا توجد ورديات سابقة مغلقة في النظام.</p>
                    ) : (
                      closedShifts.slice().reverse().map((shift) => {
                        const metrics = getShiftCalculations(shift, transactions, expenses);
                        const actual = shift.closingCashActual || 0;
                        const diff = actual - metrics.expectedCash;
                        const isExpanded = expandedPastShiftId === shift.id;

                        return (
                          <div key={shift.id} className="bg-white border border-slate-150 rounded-lg overflow-hidden shadow-xs">
                            <div 
                              onClick={() => setExpandedPastShiftId(isExpanded ? null : shift.id)}
                              className="p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 text-[10px] font-bold text-slate-600 transition-all select-none"
                            >
                              <div className="space-y-0.5">
                                <span className="bg-blue-50 text-blue-800 text-[9px] px-1.5 py-0.5 rounded font-black">وردية #{shift.id.slice(-5)}</span>
                                <span className="text-slate-400 block text-[9px] mt-0.5">{formatDate(shift.openedAt)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <span className="text-slate-400 block text-[8px]">الرصيد الفعلي</span>
                                  <span className="text-slate-800 font-black">{formatMoney(actual)}</span>
                                </div>
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-2.5 border-t border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-500 space-y-1.5">
                                <div className="flex justify-between">
                                  <span>الرصيد الافتتاحي</span>
                                  <span>{formatMoney(shift.openingCash)}</span>
                                </div>
                                <div className="flex justify-between text-green-700">
                                  <span>صافي الوارد المالي نقداً</span>
                                  <span>{formatMoney(metrics.cashSales + metrics.manualInflow)}</span>
                                </div>
                                <div className="flex justify-between text-red-700">
                                  <span>صافي المنصرف والمصروفات</span>
                                  <span>{formatMoney(metrics.cashReturns + metrics.totalExpenses + metrics.cashPurchases + metrics.cashExchangeOut + metrics.manualOutflow)}</span>
                                </div>
                                <div className="flex justify-between border-t pt-1 font-black text-slate-900 text-[10px]">
                                  <span>الرصيد النهائي المسجل</span>
                                  <span className="text-blue-900">{formatMoney(actual)}</span>
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
