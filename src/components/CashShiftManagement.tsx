import React, { useState } from 'react';
import { useAppStore } from '../store';
import { CashShift, ManualCashTransaction, Transaction, Expense } from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MinusCircle, 
  History, 
  Lock, 
  Unlock, 
  Calendar, 
  User, 
  ArrowLeftRight, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle, 
  Receipt,
  ChevronDown,
  ChevronUp
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

  // State variables for form inputs
  const [openingInput, setOpeningInput] = useState<string>('');
  
  // Manual transaction inputs
  const [manualType, setManualType] = useState<'inflow' | 'outflow'>('inflow');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  // Closing shift inputs
  const [showCloseModal, setShowCloseModal] = useState<boolean>(false);
  const [actualCashInput, setActualCashInput] = useState<string>('');

  // Expand state for past shift cards
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  // Form handlers
  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const cashVal = parseFloat(openingInput);
    if (isNaN(cashVal) || cashVal < 0) {
      alert('يرجى إدخال مبلغ افتتاحي صحيح أكبر من أو يساوي الصفر');
      return;
    }
    openShift(cashVal);
    setOpeningInput('');
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
    setShowManualModal(false);
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const act = parseFloat(actualCashInput);
    if (isNaN(act) || act < 0) {
      alert('يرجى إدخال مبلغ الكاش الفعلي بالدرج');
      return;
    }
    closeShift(act);
    setActualCashInput('');
    setShowCloseModal(false);
    alert('تم إغلاق وتصفية الوردية بنجاح وتسجيل الحسابات!');
  };

  // Helper formatting values to Arabic readable strings
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 2 }).format(val);
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' - ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  // Active shift calculations
  const activeMetrics = activeShift ? getShiftCalculations(activeShift, transactions, expenses) : null;

  return (
    <div className="p-4 md:p-6 bg-[#b8cdd6] min-h-[calc(100vh-45px)] text-gray-900" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Indicator */}
        <div className="bg-white border-b-4 border-blue-600 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-blue-900 flex items-center gap-2">
              <History className="h-6 w-6 text-blue-600 animate-pulse" />
              إدارة العهدة اليومية والوردية
            </h2>
            <p className="text-sm font-bold text-gray-500 mt-1">
              متابعة حركة النقدية المباشرة في الدرج ومنع تداخل الحسابات بين الأيام والورديات.
            </p>
          </div>
          <div>
            {activeShift ? (
              <span className="bg-green-100 border border-green-300 text-green-800 text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-ping"></span>
                الوردية مفتوحة ونشطة الآن
              </span>
            ) : (
              <span className="bg-red-100 border border-red-300 text-red-800 text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                الوردية مغلقة
              </span>
            )}
          </div>
        </div>

        {/* 1. If no active shift, force opening balance screen */}
        {!activeShift ? (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-white p-8 border border-gray-300 shadow-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 -z-0"></div>
            <div className="relative z-10 text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <Unlock className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-950">بداية وردية جديدة</h3>
                <p className="text-xs font-bold text-gray-500 mt-2">
                  يجب إدخال الرصيد النقدي الفعلي الموجود بالدرج حالياً كـ (رصيد افتتاحي) لتفعيل النظام لباقي اليوم.
                </p>
              </div>
              
              <form onSubmit={handleOpenShift} className="space-y-4">
                <div className="text-right">
                  <label className="block text-sm font-bold text-gray-700 mb-2">رصيد درج الكاش الافتتاحي (جنيه):</label>
                  <input 
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 1500"
                    value={openingInput}
                    onChange={(e) => setOpeningInput(e.target.value)}
                    className="w-full text-center h-12 text-xl font-bold bg-blue-50/50 border-2 border-blue-200 focus:border-blue-500 focus:bg-white outline-none rounded transition-all text-blue-900"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-md"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  بدء وتفعيل الوردية
                </button>
              </form>
            </div>
          </motion.div>
        ) : (
          /* 2. Active Shift Dashboard */
          activeMetrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Live calculations sidebar */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Live balance badge */}
                <motion.div 
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 shadow-md border-b-4 border-blue-400 relative overflow-hidden"
                >
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-10">
                    <DollarSign className="w-40 h-40" />
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-blue-200 text-xs font-bold uppercase tracking-wider">الكاش المتوقع بالدرج حالياً</p>
                      <h1 className="text-4xl md:text-5xl font-black mt-1 text-blue-50 tracking-tight">
                        {formatMoney(activeMetrics.expectedCash)}
                      </h1>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setManualType('inflow'); setShowManualModal(true); }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded shadow-sm text-sm transition-all flex items-center gap-1.5"
                      >
                        <PlusCircle className="h-4.5 w-4.5" /> إيداع يدوي
                      </button>
                      <button 
                        onClick={() => { setManualType('outflow'); setShowManualModal(true); }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 rounded shadow-sm text-sm transition-all flex items-center gap-1.5"
                      >
                        <MinusCircle className="h-4.5 w-4.5" /> سحب يدوي
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Ledger Breakdown Form */}
                <div className="bg-white p-6 shadow-sm border border-gray-300">
                  <h3 className="font-bold text-lg text-blue-900 mb-4 pb-2 border-b border-gray-200 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    تفاصيل كشف الحركة النقدية للوردية الحالية
                  </h3>
                  
                  <div className="space-y-3.5">
                    {/* Formula Row 1 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-gray-50 border-r-4 border-gray-400">
                      <span className="font-bold text-gray-700 text-sm">الرصيد الافتتاحي لبداية الوردية (+)</span>
                      <span className="font-extrabold text-gray-900">{formatMoney(activeShift.openingCash)}</span>
                    </div>

                    {/* Formula Row 2 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-green-50/50 border-r-4 border-green-500">
                      <div>
                        <span className="font-bold text-green-800 text-sm">إجمالي وارد العمليات النقدية (+)</span>
                        <div className="text-[10px] text-green-600 font-bold mt-0.5 space-x-reverse space-x-2">
                          <span>مبيعات: {formatMoney(activeMetrics.standardSales)}</span> | 
                          <span>عربين: {formatMoney(activeMetrics.depositSales)}</span> | 
                          <span>سداد عربون: {formatMoney(activeMetrics.depositPayments)}</span> | 
                          <span>مقدم قسط: {formatMoney(activeMetrics.installmentSales)}</span> | 
                          <span>أقساط: {formatMoney(activeMetrics.installmentPayments)}</span>
                        </div>
                      </div>
                      <span className="font-extrabold text-green-700">{formatMoney(activeMetrics.cashSales)}</span>
                    </div>

                    {/* Formula Row 3 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-blue-50/40 border-r-4 border-blue-500">
                      <span className="font-bold text-blue-800 text-sm">الإيداعات اليدوية (عهد مضافة فكة / صاحب المحل) (+)</span>
                      <span className="font-extrabold text-blue-700">{formatMoney(activeMetrics.manualInflow)}</span>
                    </div>

                    {/* Formula Row 4 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-red-50/40 border-r-4 border-red-500">
                      <span className="font-bold text-red-800 text-sm">المرتجعات النقدية للعملاء (-)</span>
                      <span className="font-extrabold text-red-700">{formatMoney(activeMetrics.cashReturns)}</span>
                    </div>

                    {/* Formula Row 5 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-red-50/40 border-r-4 border-red-500">
                      <span className="font-bold text-red-800 text-sm">المصروفات النقدية الخارجية من الدرج (-)</span>
                      <span className="font-extrabold text-red-700">{formatMoney(activeMetrics.totalExpenses)}</span>
                    </div>

                    {/* Formula Row 6 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-red-50/40 border-r-4 border-red-500">
                      <span className="font-bold text-red-800 text-sm">مشتريات مخزن كاش (-)</span>
                      <span className="font-extrabold text-red-700">{formatMoney(activeMetrics.cashPurchases)}</span>
                    </div>

                    {/* Formula Row 7 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-amber-50/50 border-r-4 border-amber-500">
                      <span className="font-bold text-amber-800 text-sm">منصرف كاش لتسييل عهدة محفظة (-)</span>
                      <span className="font-extrabold text-amber-700">{formatMoney(activeMetrics.cashExchangeOut)}</span>
                    </div>

                    {/* Formula Row 8 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-red-50/40 border-r-4 border-red-500">
                      <span className="font-bold text-red-800 text-sm">المسحوبات اليدوية (مصروفات طارئة) (-)</span>
                      <span className="font-extrabold text-red-700">{formatMoney(activeMetrics.manualOutflow)}</span>
                    </div>

                    {/* Final Expected Equation */}
                    <div className="flex justify-between items-center py-3.5 px-4 bg-blue-900 text-white border-r-4 border-blue-400 mt-6 shadow-sm">
                      <span className="font-black text-sm">الرصيد الختامي المتوقع للدرج (=)</span>
                      <span className="font-black text-lg">{formatMoney(activeMetrics.expectedCash)}</span>
                    </div>
                  </div>
                </div>

                {/* Manual Movements Ledger for current shift */}
                <div className="bg-white p-6 shadow-sm border border-gray-300">
                  <h3 className="font-bold text-lg text-gray-800 mb-4 pb-2 border-b border-gray-200">
                    الحركات اليدوية المسجلة بالوردية الحالية ({activeShift.manualTransactions.length})
                  </h3>
                  {activeShift.manualTransactions.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 font-bold text-sm">
                      لا توجد إيداعات أو مسحوبات يدوية طوال هذه الوردية حتى الآن.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-150 max-h-[250px] overflow-y-auto">
                      {activeShift.manualTransactions.map((tx) => (
                        <div key={tx.id} className="py-3 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {tx.type === 'inflow' ? (
                              <span className="bg-green-100 text-green-700 p-1.5 rounded-full"><ArrowUpRight className="h-4.5 w-4.5" /></span>
                            ) : (
                              <span className="bg-amber-100 text-amber-700 p-1.5 rounded-full"><ArrowDownRight className="h-4.5 w-4.5" /></span>
                            )}
                            <div>
                              <p className="font-bold text-sm text-gray-800">{tx.notes}</p>
                              <span className="text-[10px] text-gray-400 font-bold">{new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <span className={`font-black text-sm ${tx.type === 'inflow' ? 'text-green-600' : 'text-amber-600'}`}>
                            {tx.type === 'inflow' ? '+' : '-'} {formatMoney(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar Active Shift Info & Action */}
              <div className="space-y-6">
                <div className="bg-white p-6 shadow-sm border border-gray-300 space-y-4">
                  <h3 className="font-bold text-lg text-blue-950 pb-2 border-b border-gray-100">بيانات الوردية الحالية</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs font-bold">مسؤول الوردية الكاشير</p>
                        <p className="font-bold text-gray-800 text-sm mt-0.5">{currentUser?.name || 'المدير الافتراضي'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-gray-400 text-xs font-bold">تاريخ ووقت الفتح</p>
                        <p className="font-bold text-gray-800 text-sm mt-0.5">{formatDate(activeShift.openedAt)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={() => { setActualCashInput(''); setShowCloseModal(true); }}
                      className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-md transition-all flex items-center justify-center gap-2 text-md"
                    >
                      <Lock className="h-5 w-5" />
                      تقفيل وإغلاق الوردية الحالية
                    </button>
                  </div>
                </div>

                {/* Important tips card */}
                <div className="bg-amber-50 border border-amber-200 p-5 space-y-3 text-amber-900">
                  <h4 className="font-black text-sm flex items-center gap-1.5 text-amber-950">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    تعليمات مهمة للكاشير
                  </h4>
                  <ul className="list-disc list-inside text-xs font-bold space-y-1.5 text-amber-800">
                    <li>تأكد من توثيق أي سحب نقدي للمصروفات النثرية عبر زر السحب اليدوي لضمان مطابقة الكاش المتوقع.</li>
                    <li>عند تسييل كاش بالدرج مقابل فودافون كاش، استخدم شاشة "تسييل عهدة" المخصصة لتحديث الأرصدة تلقائياً.</li>
                    <li>عند إغلاق الوردية، يرجى عد النقود بالدرج بعناية وتوثيق الكاش الفعلي تماماً كما تم عده.</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        )}

        {/* 3. History of Closed Shifts */}
        <div className="bg-white p-6 shadow-sm border border-gray-300 space-y-4">
          <h3 className="font-bold text-xl text-blue-950 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-700" />
            سجل الورديات والعهد السابقة
          </h3>

          {shifts.filter(s => s.isClosed).length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-bold">
              لا توجد ورديات سابقة مغلقة في النظام حتى الآن.
            </div>
          ) : (
            <div className="space-y-4">
              {shifts
                .filter(s => s.isClosed)
                .slice()
                .reverse()
                .map((shift) => {
                  const metrics = getShiftCalculations(shift, transactions, expenses);
                  const actual = shift.closingCashActual || 0;
                  const diff = actual - metrics.expectedCash;
                  const isExpanded = expandedShiftId === shift.id;

                  return (
                    <div key={shift.id} className="border border-gray-200 rounded overflow-hidden shadow-sm">
                      
                      {/* Accordion header */}
                      <div 
                        onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                        className="bg-gray-50 hover:bg-blue-50/30 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-800 text-xs font-black px-2 py-0.5 rounded">
                              وردية رقم #{shift.id.slice(-5)}
                            </span>
                            <span className="text-sm font-bold text-gray-700">
                              {formatDate(shift.openedAt)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-gray-400">
                            تم الإغلاق في: {shift.closedAt ? formatDate(shift.closedAt) : '—'}
                          </p>
                        </div>

                        {/* Financial summary tags */}
                        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
                          <div className="bg-white border border-gray-200 px-3 py-1.5 font-bold rounded">
                            <span className="text-gray-400 block text-[10px] mb-0.5">الافتتاحي</span>
                            <span className="text-gray-800">{formatMoney(shift.openingCash)}</span>
                          </div>
                          <div className="bg-white border border-gray-200 px-3 py-1.5 font-bold rounded">
                            <span className="text-gray-400 block text-[10px] mb-0.5">المتوقع بالدرج</span>
                            <span className="text-blue-900 font-extrabold">{formatMoney(metrics.expectedCash)}</span>
                          </div>
                          <div className="bg-white border border-gray-200 px-3 py-1.5 font-bold rounded">
                            <span className="text-gray-400 block text-[10px] mb-0.5">الفعلي المسجل</span>
                            <span className="text-gray-900 font-extrabold">{formatMoney(actual)}</span>
                          </div>
                          
                          {/* Surplus / Deficit badge */}
                          {diff === 0 ? (
                            <span className="bg-green-100 text-green-800 font-bold px-3 py-2 rounded">
                              مطابق تماماً
                            </span>
                          ) : diff > 0 ? (
                            <span className="bg-green-600 text-white font-bold px-3 py-2 rounded flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase text-green-100">زيادة بالدرج</span>
                              <span>+ {formatMoney(diff)}</span>
                            </span>
                          ) : (
                            <span className="bg-red-600 text-white font-bold px-3 py-2 rounded flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase text-red-100">عجز بالدرج</span>
                              <span>{formatMoney(diff)}</span>
                            </span>
                          )}

                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Expandable detailed calculations */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100 bg-white p-4 space-y-4 text-sm"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left detail list */}
                              <div>
                                <h4 className="font-bold text-gray-800 mb-2.5 pb-1 border-b text-xs text-blue-900">المعادلة التفصيلية للوردية</h4>
                                <div className="space-y-2 text-xs font-bold text-gray-600">
                                  <div className="flex justify-between">
                                    <span>الرصيد الافتتاحي</span>
                                    <span>{formatMoney(shift.openingCash)}</span>
                                  </div>
                                  <div className="flex justify-between text-green-700">
                                    <span>وارد عمليات نقدية (+)</span>
                                    <span>{formatMoney(metrics.cashSales)}</span>
                                  </div>
                                  <div className="flex justify-between text-blue-700">
                                    <span>إيداعات يدوية (+)</span>
                                    <span>{formatMoney(metrics.manualInflow)}</span>
                                  </div>
                                  <div className="flex justify-between text-red-700">
                                    <span>مرتجعات نقدية (-)</span>
                                    <span>{formatMoney(metrics.cashReturns)}</span>
                                  </div>
                                  <div className="flex justify-between text-red-700">
                                    <span>مصروفات نقدي (-)</span>
                                    <span>{formatMoney(metrics.totalExpenses)}</span>
                                  </div>
                                  <div className="flex justify-between text-red-700">
                                    <span>مشتريات كاش (-)</span>
                                    <span>{formatMoney(metrics.cashPurchases)}</span>
                                  </div>
                                  <div className="flex justify-between text-amber-700">
                                    <span>منصرف تسييل عهدة (-)</span>
                                    <span>{formatMoney(metrics.cashExchangeOut)}</span>
                                  </div>
                                  <div className="flex justify-between text-red-700">
                                    <span>مسحوبات يدوية (-)</span>
                                    <span>{formatMoney(metrics.manualOutflow)}</span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2 font-black text-gray-900 text-sm">
                                    <span>الرصيد المتوقع بالدرج</span>
                                    <span>{formatMoney(metrics.expectedCash)}</span>
                                  </div>
                                  <div className="flex justify-between font-black text-gray-900 text-sm bg-gray-50 p-2 border-r-2 border-gray-400">
                                    <span>الرصيد الفعلي المسجل عند الإغلاق</span>
                                    <span>{formatMoney(actual)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right manual transaction log */}
                              <div>
                                <h4 className="font-bold text-gray-800 mb-2.5 pb-1 border-b text-xs text-blue-900">الحركات اليدوية في الوردية</h4>
                                {shift.manualTransactions.length === 0 ? (
                                  <div className="text-gray-400 text-center py-6 text-xs">
                                    لا توجد حركات يدوية مسجلة لهذه الوردية.
                                  </div>
                                ) : (
                                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                    {shift.manualTransactions.map((tx) => (
                                      <div key={tx.id} className="text-xs border-b border-gray-100 pb-2 flex justify-between items-center">
                                        <div>
                                          <p className="font-bold text-gray-700">{tx.notes}</p>
                                          <span className="text-[9px] text-gray-400 block font-bold mt-0.5">{new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <span className={`font-black ${tx.type === 'inflow' ? 'text-green-600' : 'text-amber-600'}`}>
                                          {tx.type === 'inflow' ? '+' : '-'} {formatMoney(tx.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

      </div>

      {/* 4. Modal for adding manual cash inflows/outflows */}
      <AnimatePresence>
        {showManualModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white max-w-md w-full p-6 shadow-2xl relative"
            >
              <h3 className="text-xl font-bold text-blue-950 mb-4 pb-2 border-b">
                {manualType === 'inflow' ? 'تسجيل إيداع نقدي يدوي بالدرج' : 'تسجيل سحب نقدي يدوي من الدرج'}
              </h3>
              
              <form onSubmit={handleAddManualTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">قيمة المبلغ (جنيه):</label>
                  <input 
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 500"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full h-10 border border-gray-300 px-3 outline-none text-center font-bold text-lg rounded text-blue-900 bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">السبب / بيان توضيحي للعملية:</label>
                  <textarea 
                    rows={3}
                    required
                    placeholder={manualType === 'inflow' ? 'مثال: فكة إضافية للدرج من الخزنة' : 'مثال: سحب نقدي لشراء أغراض تنظيف / سلفية'}
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    className="w-full border border-gray-300 p-2.5 outline-none font-bold text-sm rounded bg-gray-50"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow-sm transition-all"
                  >
                    تأكيد وتسجيل الحركة
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowManualModal(false); setManualAmount(''); setManualNotes(''); }}
                    className="h-11 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded border border-gray-300 transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Modal for closing the active shift */}
      <AnimatePresence>
        {showCloseModal && activeMetrics && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white max-w-lg w-full p-6 shadow-2xl relative"
            >
              <div className="text-center space-y-4">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                  <Lock className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-950">إغلاق وتصفية حسابات الوردية</h3>
                  <p className="text-xs font-bold text-gray-400 mt-1">
                    قم بعد المبلغ النقدي (الكاش) الموجود حالياً بالدرج الفعلي وتسجيله لمطابقة الحسابات.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-4 my-5 space-y-2.5 text-xs font-bold text-gray-700">
                <div className="flex justify-between">
                  <span>الرصيد الافتتاحي للوردية</span>
                  <span className="text-gray-900">{formatMoney(activeShift.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>صافي حركات النقدية (الداخلة والخارجة)</span>
                  <span className={activeMetrics.expectedCash - activeShift.openingCash >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {activeMetrics.expectedCash - activeShift.openingCash >= 0 ? '+' : ''} {formatMoney(activeMetrics.expectedCash - activeShift.openingCash)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2.5 text-sm font-black text-gray-900">
                  <span>الرصيد الختامي المتوقع بالدرج</span>
                  <span className="text-blue-900">{formatMoney(activeMetrics.expectedCash)}</span>
                </div>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-5">
                <div>
                  <label className="block text-sm font-black text-gray-800 mb-1.5 text-center">المبلغ الفعلي الموجود بالدرج حالياً (بعد العد):</label>
                  <input 
                    type="number"
                    step="any"
                    required
                    autofocus
                    placeholder="قم بعد الكاش الفعلي بالدرج واكتبه هنا..."
                    value={actualCashInput}
                    onChange={(e) => setActualCashInput(e.target.value)}
                    className="w-full text-center h-12 text-2xl font-black bg-red-50/50 border-2 border-red-200 focus:border-red-500 focus:bg-white outline-none rounded text-red-900 transition-all"
                  />
                </div>

                {/* Real-time surplus/deficit tracker */}
                {actualCashInput && !isNaN(parseFloat(actualCashInput)) && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 text-center rounded text-sm font-bold shadow-inner"
                  >
                    {(() => {
                      const diff = parseFloat(actualCashInput) - activeMetrics.expectedCash;
                      if (diff === 0) {
                        return (
                          <div className="bg-green-100 border border-green-300 text-green-800 flex items-center justify-center gap-1">
                            <CheckCircle2 className="h-4.5 w-4.5" /> مطابق تماماً للرصيد المتوقع
                          </div>
                        );
                      } else if (diff > 0) {
                        return (
                          <div className="bg-green-600 border border-green-700 text-white flex flex-col items-center py-2 px-4 rounded shadow-sm">
                            <span className="text-[10px] font-black uppercase text-green-150">يوجد زيادة بالدرج بقيمة:</span>
                            <span className="text-lg font-black mt-0.5">+ {formatMoney(diff)}</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="bg-red-600 border border-red-700 text-white flex flex-col items-center py-2 px-4 rounded shadow-sm">
                            <span className="text-[10px] font-black uppercase text-red-150">يوجد عجز بالدرج بقيمة:</span>
                            <span className="text-lg font-black mt-0.5">{formatMoney(diff)}</span>
                          </div>
                        );
                      }
                    })()}
                  </motion.div>
                )}

                <div className="flex gap-3 pt-3">
                  <button 
                    type="submit"
                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-5 w-5" /> تأكيد تقفيل الوردية اليومية
                  </button>
                  <button 
                    type="button"
                    onClick={() => { setShowCloseModal(false); setActualCashInput(''); }}
                    className="h-12 px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded border border-gray-300 transition-all"
                  >
                    رجوع
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
