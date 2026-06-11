import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import {
  ArrowRightLeft, Wallet, Banknote, CheckCircle2, Hash, StickyNote, Activity,
  Download, Upload, CreditCard, DollarSign, Trash2, Plus, Eye, EyeOff,
  ChevronDown, ChevronUp, TrendingUp, TrendingDown, BarChart3, ShoppingCart,
  Receipt, MinusCircle, PlusCircle, Package, ReceiptText, BadgeDollarSign,
  FileText, ClipboardList
} from 'lucide-react';
import { Transaction } from '../types';

type TargetMethod = string;

export default function BalancesScreen() {
  const {
    addCashExchange, transactions, activeShift, expenses, shiftAccounts,
    removeShiftAccount, addShiftAccount, installmentContracts
  } = useAppStore();

  // ─── Exchange Modal State ───
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [targetMethod, setTargetMethod] = useState<TargetMethod>(shiftAccounts.length > 0 ? shiftAccounts[0].id : 'vodafone_cash');
  const [walletLast4, setWalletLast4] = useState('');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastExchange, setLastExchange] = useState<{ amount: number; method: string; wallet: string; direction: string } | null>(null);

  const [mainTab, setMainTab] = useState<'wallet' | 'cash'>('wallet');
  const [cashSubTab, setCashSubTab] = useState<'receipt' | 'delivery'>('receipt');
  const exchangeDirection = (mainTab === 'cash' && cashSubTab === 'receipt') ? 'wallet_to_cash' : 'cash_to_wallet';

  // ─── Add Wallet Modal State ───
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletNumber, setNewWalletNumber] = useState('');

  // ─── Section Toggle State ───
  const [expandedWallets, setExpandedWallets] = useState<Record<string, boolean>>({});
  const [showCashSection, setShowCashSection] = useState(true);
  const [showWithdrawalsSection, setShowWithdrawalsSection] = useState(true);
  const [showReviewSection, setShowReviewSection] = useState(true);

  const toggleWallet = (walletId: string) => {
    setExpandedWallets(prev => ({ ...prev, [walletId]: !prev[walletId] }));
  };

  const selectedAccount = shiftAccounts.find(a => a.id === targetMethod);
  const methodLabel = selectedAccount ? selectedAccount.name : (targetMethod === 'vodafone_cash' ? 'فودافون كاش' : 'انستا باي');

  const handleSubmitExchange = () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if (walletLast4.length !== 4) {
      alert('الرجاء إدخال آخر 4 أرقام من المحفظة');
      return;
    }

    addCashExchange(numAmount, targetMethod, walletLast4, note || undefined, undefined, exchangeDirection);

    let dirLabel = 'استلام محفظة';
    if (mainTab === 'cash') {
      dirLabel = cashSubTab === 'receipt' ? 'استلام نقدية' : 'تسليم نقدية';
    }

    setLastExchange({ amount: numAmount, method: methodLabel, wallet: walletLast4, direction: dirLabel });
    setShowSuccess(true);

    // Reset form
    setAmount('');
    setWalletLast4('');
    setNote('');
    setMainTab('wallet');
    setCashSubTab('receipt');
    setShowExchangeModal(false);

    setTimeout(() => setShowSuccess(false), 4000);
  };

  const shiftStart = activeShift?.openedAt || new Date().toISOString();

  const getAmount = (t: Transaction) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

  // ═══════════════════════════════════════════════════════
  // القسم 1: حسابات المحافظ
  // ═══════════════════════════════════════════════════════
  const walletsStats = useMemo(() => {
    return shiftAccounts.map(account => {
      const filteredTxs = transactions.filter(t => {
        if (account.name.includes('فودافون') && t.paymentMethod === 'vodafone_cash') return true;
        if (account.name.includes('انستا') && t.paymentMethod === 'instapay') return true;
        return t.paymentMethod === account.id || t.paymentMethod === account.name;
      });

      const prevTxs = filteredTxs.filter(t => t.timestamp < shiftStart);
      const currTxs = filteredTxs.filter(t => t.timestamp >= shiftStart);

      const calcIn = (txs: Transaction[]) => txs
        .filter(t => t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
        .reduce((sum, t) => sum + getAmount(t), 0);

      const calcOut = (txs: Transaction[]) => txs
        .filter(t => t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'return' || t.type === 'deposit_return' || t.type === 'purchase'))
        .reduce((sum, t) => sum + getAmount(t), 0);

      // كاش → محفظة: دخول للمحفظة
      const calcExchangeIn = (txs: Transaction[]) => txs
        .filter(t => t.type === 'cash_exchange')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      // محفظة → كاش: خروج من المحفظة
      const calcExchangeOut = (txs: Transaction[]) => txs
        .filter(t => t.type === 'cash_exchange_reverse')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      const prevIn = calcIn(prevTxs) + calcExchangeIn(prevTxs);
      const prevOut = calcOut(prevTxs) + calcExchangeOut(prevTxs);
      const openingBalance = prevIn - prevOut;

      const shiftIn = calcIn(currTxs);
      const shiftExchangeIn = calcExchangeIn(currTxs);
      const shiftExchangeOut = calcExchangeOut(currTxs);
      const shiftOut = calcOut(currTxs);

      return {
        ...account,
        openingBalance,
        incoming: shiftIn,
        additions: shiftExchangeIn,
        outgoing: shiftOut + shiftExchangeOut,
        currentBalance: openingBalance + shiftIn + shiftExchangeIn - shiftOut - shiftExchangeOut
      };
    });
  }, [transactions, shiftStart, shiftAccounts]);

  // ═══════════════════════════════════════════════════════
  // القسم 2: حسابات النقدية (استلام) + القسم 3: السحب
  // ═══════════════════════════════════════════════════════
  const cashStats = useMemo(() => {
    if (!activeShift) return null;
    const currTxs = transactions.filter(t => t.timestamp >= shiftStart && t.paymentMethod === 'cash');
    const shiftExpenses = expenses.filter(e => e.timestamp >= shiftStart);

    // ── تفاصيل الوارد النقدي ──
    const standardSales = currTxs
      .filter(t => t.type === 'sale')
      .reduce((sum, t) => sum + getAmount(t), 0);

    const depositSales = currTxs
      .filter(t => t.type === 'deposit_sale')
      .reduce((sum, t) => sum + getAmount(t), 0);

    const depositPayments = currTxs
      .filter(t => t.type === 'deposit_payment')
      .reduce((sum, t) => sum + getAmount(t), 0);

    const installmentSales = currTxs
      .filter(t => t.type === 'installment_sale')
      .reduce((sum, t) => sum + getAmount(t), 0);

    const installmentPayments = currTxs
      .filter(t => t.type === 'installment_payment')
      .reduce((sum, t) => sum + getAmount(t), 0);

    const cashSalesTotal = currTxs
      .filter(t => t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
      .reduce((sum, t) => sum + getAmount(t), 0);

    const manualInflow = activeShift.manualTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);

    // وارد من المحافظ (استلام)
    const cashExchangeIn = currTxs
      .filter(t => t.type === 'cash_exchange_reverse')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const totalIncoming = cashSalesTotal + manualInflow + cashExchangeIn;

    // ── تفاصيل المسحوبات ──
    const cashReturns = currTxs
      .filter(t => t.type !== 'cash_exchange' && t.type !== 'cash_exchange_reverse' && (t.type === 'return' || t.type === 'deposit_return'))
      .reduce((sum, t) => sum + getAmount(t), 0);

    const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

    const cashPurchases = currTxs
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // كاش خارج للمحافظ (تسييل)
    const cashExchangeOut = currTxs
      .filter(t => t.type === 'cash_exchange')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const manualOutflow = activeShift.manualTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

    const totalWithdrawals = cashReturns + totalExpenses + cashPurchases + cashExchangeOut + manualOutflow;

    const openingBalance = activeShift.openingCash;

    return {
      openingBalance,
      // تفاصيل الوارد
      standardSales,
      depositSales,
      depositPayments,
      installmentSales,
      installmentPayments,
      cashSalesTotal,
      manualInflow,
      cashExchangeIn,
      totalIncoming,
      // تفاصيل المسحوبات
      cashReturns,
      totalExpenses,
      cashPurchases,
      cashExchangeOut,
      manualOutflow,
      totalWithdrawals,
      // الرصيد الحالي
      currentBalance: openingBalance + totalIncoming - totalWithdrawals
    };
  }, [transactions, activeShift, expenses, shiftStart]);

  // ═══════════════════════════════════════════════════════
  // القسم 4: ملخص مراجعة آخر اليوم (كاشير + تقسيط + كاش)
  // ═══════════════════════════════════════════════════════
  const reviewStats = useMemo(() => {
    if (!activeShift) return null;
    const currTxs = transactions.filter(t => t.timestamp >= shiftStart);

    // ── حسابات الكاشير ──
    const cashierCashSales = currTxs
      .filter(t => t.paymentMethod === 'cash' && t.type === 'sale')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const cashierCashReturns = currTxs
      .filter(t => t.paymentMethod === 'cash' && t.type === 'return')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const cashierVisaSales = currTxs
      .filter(t => t.paymentMethod === 'visa' && t.type === 'sale')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const cashierVisaReturns = currTxs
      .filter(t => t.paymentMethod === 'visa' && t.type === 'return')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // مبيعات المحافظ (فودافون + انستا + أي محفظة أخرى)
    const cashierWalletSales = currTxs
      .filter(t => t.paymentMethod !== 'cash' && t.paymentMethod !== 'visa' && t.type === 'sale')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const cashierWalletReturns = currTxs
      .filter(t => t.paymentMethod !== 'cash' && t.paymentMethod !== 'visa' && t.type === 'return')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const cashierNetCash = cashierCashSales - cashierCashReturns;
    const cashierNetVisa = cashierVisaSales - cashierVisaReturns;
    const cashierNetWallet = cashierWalletSales - cashierWalletReturns;

    // ── حسابات التقسيط ──
    // مقدمات مستلمة اليوم
    const installmentDownPayments = currTxs
      .filter(t => t.type === 'installment_sale')
      .reduce((sum, t) => sum + (t.depositAmount || 0), 0);

    // أقساط محصلة اليوم
    const installmentCollections = currTxs
      .filter(t => t.type === 'installment_payment')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // تفصيل الأقساط حسب طريقة الدفع
    const installmentCash = currTxs
      .filter(t => t.paymentMethod === 'cash' && (t.type === 'installment_payment' || t.type === 'installment_sale'))
      .reduce((sum, t) => sum + getAmount(t), 0);

    const installmentWallet = currTxs
      .filter(t => t.paymentMethod !== 'cash' && t.paymentMethod !== 'visa' && (t.type === 'installment_payment' || t.type === 'installment_sale'))
      .reduce((sum, t) => sum + getAmount(t), 0);

    // ── حسابات العربون ──
    const depositSalesAmount = currTxs
      .filter(t => t.type === 'deposit_sale')
      .reduce((sum, t) => sum + (t.depositAmount || 0), 0);

    const depositCollections = currTxs
      .filter(t => t.type === 'deposit_payment')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // ── حسابات الكاش (تسييل) ──
    const exchangeToWallets = currTxs
      .filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    const exchangeFromWallets = currTxs
      .filter(t => t.paymentMethod === 'cash' && t.type === 'cash_exchange_reverse')
      .reduce((sum, t) => sum + t.totalAmount, 0);

    // ── المصروفات ──
    const shiftExpenses = expenses.filter(e => e.timestamp >= shiftStart);
    const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

    // ── إجمالي اليوم ──
    const totalDayRevenue = cashierCashSales + cashierVisaSales + cashierWalletSales
      + installmentDownPayments + installmentCollections
      + depositSalesAmount + depositCollections;

    return {
      // كاشير
      cashierCashSales,
      cashierCashReturns,
      cashierVisaSales,
      cashierVisaReturns,
      cashierWalletSales,
      cashierWalletReturns,
      cashierNetCash,
      cashierNetVisa,
      cashierNetWallet,
      // تقسيط
      installmentDownPayments,
      installmentCollections,
      installmentCash,
      installmentWallet,
      // عربون
      depositSalesAmount,
      depositCollections,
      // كاش
      exchangeToWallets,
      exchangeFromWallets,
      // مصروفات
      totalExpenses,
      // إجمالي
      totalDayRevenue,
    };
  }, [transactions, expenses, shiftStart, activeShift]);

  const fmt = (n: number) => n.toLocaleString();

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto w-full" dir="rtl">

      {/* ═══ Header ═══ */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <span className="bg-gradient-to-br from-red-500 to-red-700 p-2.5 rounded-xl shadow-md">
              <Activity className="h-6 w-6 text-white" />
            </span>
            بند فودافون كاش
          </h1>
          <p className="text-sm text-gray-500 mt-1.5 mr-12 font-medium">
            المحافظ • النقدية (استلام) • السحب — مراجعة شاملة للوردية الحالية
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowAddWallet(true)}
            className="bg-white border-2 border-indigo-300 hover:bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            إضافة محفظة
          </button>
          <button
            onClick={() => setShowExchangeModal(true)}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2.5 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2 text-sm"
          >
            <ArrowRightLeft className="h-4 w-4" />
            عملية جديدة
          </button>
        </div>
      </div>

      {/* ═══ Success Message ═══ */}
      {showSuccess && lastExchange && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-5 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            <span className="text-base font-bold text-emerald-800">تم تنفيذ العملية بنجاح ✓</span>
          </div>
          <div className="mr-9 space-y-0.5 text-sm text-emerald-700 font-semibold">
            <div>الاتجاه: <span className="text-emerald-900 font-black">{lastExchange.direction}</span></div>
            <div>المبلغ: <span className="text-emerald-900 font-black">{lastExchange.amount.toLocaleString()} ج.م</span></div>
            <div>المحفظة: <span className="text-emerald-900 font-black">*{lastExchange.wallet}</span></div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
           القسم 1: المحافظ
           ═══════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3 bg-gradient-to-r from-indigo-50 to-indigo-100/50 p-3.5 rounded-xl border border-indigo-200/60">
          <h2 className="text-lg font-black text-indigo-900 flex items-center gap-2.5">
            <span className="bg-indigo-600 p-1.5 rounded-lg shadow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </span>
            1. المحافظ
            <span className="text-xs font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-md">أي مبلغ بيتبعت للمحفظة بيتسجل هنا</span>
          </h2>
          <button
            onClick={() => setShowAddWallet(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            إضافة محفظة
          </button>
        </div>

        {shiftAccounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 font-bold">
            لا توجد محافظ مضافة — اضغط "إضافة محفظة" لإضافة أول محفظة
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {walletsStats.map((w, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Wallet Header Row */}
                <button
                  onClick={() => toggleWallet(w.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown className={`h-5 w-5 text-indigo-500 transition-transform duration-300 ${expandedWallets[w.id] ? 'rotate-180' : ''}`} />
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-indigo-500" />
                      <span className="font-black text-base text-gray-900">{w.name}</span>
                      {w.subLabel && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md font-bold">{w.subLabel}</span>}
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-gray-400 font-bold">الرصيد الحالي</div>
                    <div className={`text-lg font-black ${w.currentBalance >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>{fmt(w.currentBalance)} ج.م</div>
                  </div>
                </button>

                {/* Wallet Details — expanded */}
                {expandedWallets[w.id] && (
                  <div className="border-t border-gray-100 p-4 animate-[fadeIn_0.2s_ease-out]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        {w.walletNumber && (
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-500 font-bold">رقم المحفظة:</span>
                            <span className="text-sm font-black text-gray-800 bg-gray-100 px-3 py-1 rounded-lg" dir="ltr">{w.walletNumber}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`هل أنت متأكد من حذف محفظة ${w.name}؟`)) {
                            removeShiftAccount(w.id);
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="حذف المحفظة"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-100 flex flex-col items-center justify-center">
                        <div className="text-[10px] text-gray-500 font-bold">رصيد افتتاحي</div>
                        <div className="font-black text-gray-700 mt-0.5 text-sm">{fmt(w.openingBalance)}</div>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100 flex flex-col items-center justify-center">
                        <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Download className="h-3 w-3" /> الوارد</div>
                        <div className="font-black text-emerald-700 mt-0.5 text-sm">{fmt(w.incoming)}</div>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-2 border border-amber-100 flex flex-col items-center justify-center">
                        <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Upload className="h-3 w-3" /> إضافات</div>
                        <div className="font-black text-amber-700 mt-0.5 text-sm">{fmt(w.additions)}</div>
                      </div>
                      <div className="bg-rose-50 rounded-lg p-2 border border-rose-100 flex flex-col items-center justify-center">
                        <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1"><Upload className="h-3 w-3" /> مسحوبات</div>
                        <div className="font-black text-rose-700 mt-0.5 text-sm">{fmt(w.outgoing)}</div>
                      </div>
                    </div>

                    <div className="bg-indigo-50 rounded-lg p-2.5 border border-indigo-100 flex justify-between items-center">
                      <div className="text-sm font-bold text-indigo-800">الرصيد الحالي</div>
                      <div className="text-lg font-black text-indigo-700">{fmt(w.currentBalance)} ج.م</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* إجمالي المحافظ */}
        {walletsStats.length > 0 && (
          <div className="mt-3 bg-indigo-600 rounded-xl p-3.5 shadow-md flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-200" />
              <span className="font-bold text-sm">إجمالي أرصدة المحافظ</span>
            </div>
            <span className="text-xl font-black">{fmt(walletsStats.reduce((sum, w) => sum + w.currentBalance, 0))} ج.م</span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
           القسم 2: النقدية (استلام)
           ═══════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <button
          onClick={() => setShowCashSection(!showCashSection)}
          className="w-full flex items-center justify-between mb-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-3.5 rounded-xl border border-emerald-200/60 hover:bg-emerald-100/60 transition-colors cursor-pointer"
        >
          <h2 className="text-lg font-black text-emerald-900 flex items-center gap-2.5">
            <span className="bg-emerald-600 p-1.5 rounded-lg shadow-sm">
              <Banknote className="h-5 w-5 text-white" />
            </span>
            2. النقدية (استلام)
            <span className="text-xs font-bold text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-md">المقابل النقدي المستلم</span>
          </h2>
          <div className="flex items-center gap-3">
            {cashStats && (
              <span className="text-lg font-black text-emerald-700">{fmt(cashStats.totalIncoming)} ج.م</span>
            )}
            {showCashSection ? <ChevronUp className="h-5 w-5 text-emerald-500" /> : <ChevronDown className="h-5 w-5 text-emerald-500" />}
          </div>
        </button>

        {showCashSection && (
          cashStats ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
              {/* رصيد افتتاحي */}
              <div className="flex justify-between items-center p-3.5 bg-blue-50/40 border-b border-gray-100">
                <div className="flex items-center gap-2 text-sm font-bold text-blue-800">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  الرصيد الافتتاحي للوردية
                </div>
                <span className="text-lg font-black text-blue-800">{fmt(cashStats.openingBalance)} ج.م</span>
              </div>

              {/* تفاصيل الوارد */}
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-black uppercase tracking-wide">تفاصيل الوارد النقدي</span>
                </div>

                <div className="bg-emerald-50/30 rounded-xl border border-emerald-100/50 divide-y divide-emerald-100/50">
                  {/* مبيعات كاشير نقدي */}
                  <div className="flex justify-between items-center py-2.5 px-3">
                    <div className="flex items-center gap-2 text-sm">
                      <BadgeDollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-emerald-800">مبيعات كاشير نقدي</span>
                    </div>
                    <span className="font-black text-emerald-700">+{fmt(cashStats.standardSales)}</span>
                  </div>

                  {/* عربون نقدي */}
                  {(cashStats.depositSales > 0 || cashStats.depositPayments > 0) && (
                    <div className="flex justify-between items-center py-2.5 px-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Receipt className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold text-emerald-800">عربون + تحصيلات عربون نقدي</span>
                      </div>
                      <span className="font-black text-emerald-700">+{fmt(cashStats.depositSales + cashStats.depositPayments)}</span>
                    </div>
                  )}

                  {/* أقساط نقدي */}
                  {(cashStats.installmentSales > 0 || cashStats.installmentPayments > 0) && (
                    <div className="flex justify-between items-center py-2.5 px-3">
                      <div className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold text-emerald-800">مقدمات + تحصيلات أقساط نقدي</span>
                      </div>
                      <span className="font-black text-emerald-700">+{fmt(cashStats.installmentSales + cashStats.installmentPayments)}</span>
                    </div>
                  )}

                  {/* وارد من المحافظ */}
                  {cashStats.cashExchangeIn > 0 && (
                    <div className="flex justify-between items-center py-2.5 px-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Download className="h-4 w-4 text-blue-500" />
                        <span className="font-bold text-blue-800">وارد من المحافظ (استلام)</span>
                      </div>
                      <span className="font-black text-blue-700">+{fmt(cashStats.cashExchangeIn)}</span>
                    </div>
                  )}

                  {/* إيداعات يدوية */}
                  {cashStats.manualInflow > 0 && (
                    <div className="flex justify-between items-center py-2.5 px-3">
                      <div className="flex items-center gap-2 text-sm">
                        <PlusCircle className="h-4 w-4 text-emerald-500" />
                        <span className="font-bold text-emerald-800">إيداعات يدوية (فكة)</span>
                      </div>
                      <span className="font-black text-emerald-700">+{fmt(cashStats.manualInflow)}</span>
                    </div>
                  )}
                </div>

                {/* إجمالي الوارد */}
                <div className="bg-emerald-600 rounded-lg p-3 shadow-inner flex justify-between items-center text-white mt-3">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <TrendingUp className="h-4 w-4 text-emerald-200" />
                    إجمالي الوارد النقدي
                  </div>
                  <div className="text-xl font-black">+{fmt(cashStats.totalIncoming)} ج.م</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center text-gray-400 font-bold">
              الوردية مغلقة — لا توجد بيانات للنقدية الحالية
            </div>
          )
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
           القسم 3: السحب
           ═══════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <button
          onClick={() => setShowWithdrawalsSection(!showWithdrawalsSection)}
          className="w-full flex items-center justify-between mb-3 bg-gradient-to-r from-rose-50 to-rose-100/50 p-3.5 rounded-xl border border-rose-200/60 hover:bg-rose-100/60 transition-colors cursor-pointer"
        >
          <h2 className="text-lg font-black text-rose-900 flex items-center gap-2.5">
            <span className="bg-rose-600 p-1.5 rounded-lg shadow-sm">
              <TrendingDown className="h-5 w-5 text-white" />
            </span>
            3. السحب
            <span className="text-xs font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-md">أي مبلغ بيتبعت من المحفظة بيتسجل هنا</span>
          </h2>
          <div className="flex items-center gap-3">
            {cashStats && (
              <span className="text-lg font-black text-rose-700">{fmt(cashStats.totalWithdrawals)} ج.م</span>
            )}
            {showWithdrawalsSection ? <ChevronUp className="h-5 w-5 text-rose-500" /> : <ChevronDown className="h-5 w-5 text-rose-500" />}
          </div>
        </button>

        {showWithdrawalsSection && cashStats && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown className="h-4 w-4 text-rose-600" />
                <span className="text-xs text-rose-700 font-black uppercase tracking-wide">تفاصيل المسحوبات والمنصرف</span>
              </div>

              <div className="bg-rose-50/30 rounded-xl border border-rose-100/50 divide-y divide-rose-100/50">
                {/* مرتجعات */}
                <div className="flex justify-between items-center py-2.5 px-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-rose-500" />
                    <span className="font-bold text-rose-800">مرتجعات العملاء</span>
                  </div>
                  <span className="font-black text-rose-700">-{fmt(cashStats.cashReturns)}</span>
                </div>

                {/* مصروفات */}
                <div className="flex justify-between items-center py-2.5 px-3">
                  <div className="flex items-center gap-2 text-sm">
                    <ReceiptText className="h-4 w-4 text-rose-500" />
                    <span className="font-bold text-rose-800">المصروفات والرواتب</span>
                  </div>
                  <span className="font-black text-rose-700">-{fmt(cashStats.totalExpenses)}</span>
                </div>

                {/* مشتريات مخزن */}
                <div className="flex justify-between items-center py-2.5 px-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-rose-500" />
                    <span className="font-bold text-rose-800">مشتريات مخزن كاش</span>
                  </div>
                  <span className="font-black text-rose-700">-{fmt(cashStats.cashPurchases)}</span>
                </div>

                {/* تسييل عهدة */}
                <div className="flex justify-between items-center py-2.5 px-3">
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowRightLeft className="h-4 w-4 text-amber-500" />
                    <span className="font-bold text-amber-800">تسييل عهدة محفظة (كاش → محفظة)</span>
                  </div>
                  <span className="font-black text-amber-700">-{fmt(cashStats.cashExchangeOut)}</span>
                </div>

                {/* مسحوبات يدوية */}
                {cashStats.manualOutflow > 0 && (
                  <div className="flex justify-between items-center py-2.5 px-3">
                    <div className="flex items-center gap-2 text-sm">
                      <MinusCircle className="h-4 w-4 text-rose-500" />
                      <span className="font-bold text-rose-800">مسحوبات نثرية يدوية</span>
                    </div>
                    <span className="font-black text-rose-700">-{fmt(cashStats.manualOutflow)}</span>
                  </div>
                )}
              </div>

              {/* إجمالي المسحوبات */}
              <div className="bg-rose-600 rounded-lg p-3 shadow-inner flex justify-between items-center text-white mt-3">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <TrendingDown className="h-4 w-4 text-rose-200" />
                  إجمالي المسحوبات
                </div>
                <div className="text-xl font-black">-{fmt(cashStats.totalWithdrawals)} ج.م</div>
              </div>

              {/* صافي الكاش بالدرج */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 shadow-lg flex justify-between items-center text-white mt-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-300 animate-pulse" />
                  <span className="font-black text-sm">صافي الكاش المتوقع بالدرج</span>
                </div>
                <div className="text-2xl font-black">{fmt(cashStats.currentBalance)} <span className="text-base font-bold text-gray-300">ج.م</span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
           القسم 4: ملخص مراجعة آخر اليوم
           ═══════════════════════════════════════════════════════ */}
      <div className="mb-5">
        <button
          onClick={() => setShowReviewSection(!showReviewSection)}
          className="w-full flex items-center justify-between mb-3 bg-gradient-to-r from-blue-900 to-indigo-900 p-4 rounded-xl border border-blue-700/30 hover:from-blue-800 hover:to-indigo-800 transition-colors cursor-pointer shadow-md"
        >
          <h2 className="text-lg font-black text-white flex items-center gap-2.5">
            <span className="bg-white/15 p-1.5 rounded-lg backdrop-blur-sm">
              <BarChart3 className="h-5 w-5 text-blue-200" />
            </span>
            ملخص مراجعة آخر اليوم
            <span className="text-xs font-bold text-blue-300 bg-blue-800/50 px-2 py-0.5 rounded-md">كاشير + تقسيط + كاش</span>
          </h2>
          <div className="flex items-center gap-2">
            {showReviewSection ? <ChevronUp className="h-5 w-5 text-blue-300" /> : <ChevronDown className="h-5 w-5 text-blue-300" />}
          </div>
        </button>

        {showReviewSection && reviewStats && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:divide-x lg:divide-x-reverse divide-gray-100">

              {/* ─── حسابات الكاشير ─── */}
              <div className="p-4 border-b lg:border-b-0 border-gray-100">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <span className="bg-blue-100 p-1.5 rounded-lg">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                  </span>
                  <h3 className="font-black text-sm text-gray-800">حسابات الكاشير</h3>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">مبيعات نقدي</span>
                    <div className="text-left">
                      <span className="font-black text-emerald-700">{fmt(reviewStats.cashierCashSales)}</span>
                      {reviewStats.cashierCashReturns > 0 && (
                        <span className="text-xs text-rose-500 mr-1">(مرتجع: {fmt(reviewStats.cashierCashReturns)})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">مبيعات فيزا</span>
                    <div className="text-left">
                      <span className="font-black text-blue-700">{fmt(reviewStats.cashierVisaSales)}</span>
                      {reviewStats.cashierVisaReturns > 0 && (
                        <span className="text-xs text-rose-500 mr-1">(مرتجع: {fmt(reviewStats.cashierVisaReturns)})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">مبيعات محافظ</span>
                    <div className="text-left">
                      <span className="font-black text-indigo-700">{fmt(reviewStats.cashierWalletSales)}</span>
                      {reviewStats.cashierWalletReturns > 0 && (
                        <span className="text-xs text-rose-500 mr-1">(مرتجع: {fmt(reviewStats.cashierWalletReturns)})</span>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                    <span className="font-black text-gray-700 text-xs">صافي الكاشير</span>
                    <span className="font-black text-gray-900">{fmt(reviewStats.cashierNetCash + reviewStats.cashierNetVisa + reviewStats.cashierNetWallet)} ج.م</span>
                  </div>
                </div>
              </div>

              {/* ─── حسابات التقسيط ─── */}
              <div className="p-4 border-b lg:border-b-0 border-gray-100">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <span className="bg-amber-100 p-1.5 rounded-lg">
                    <ClipboardList className="h-4 w-4 text-amber-600" />
                  </span>
                  <h3 className="font-black text-sm text-gray-800">حسابات التقسيط والعربون</h3>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">مقدمات تقسيط اليوم</span>
                    <span className="font-black text-amber-700">{fmt(reviewStats.installmentDownPayments)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">أقساط محصلة اليوم</span>
                    <span className="font-black text-amber-700">{fmt(reviewStats.installmentCollections)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">عربون مستلم اليوم</span>
                    <span className="font-black text-blue-700">{fmt(reviewStats.depositSalesAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">تحصيلات عربون</span>
                    <span className="font-black text-blue-700">{fmt(reviewStats.depositCollections)}</span>
                  </div>

                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-bold text-gray-500">منها نقدي</span>
                      <span className="font-black text-emerald-600">{fmt(reviewStats.installmentCash)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-500">منها محافظ</span>
                      <span className="font-black text-indigo-600">{fmt(reviewStats.installmentWallet)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ─── حسابات الكاش ─── */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                  <span className="bg-emerald-100 p-1.5 rounded-lg">
                    <Banknote className="h-4 w-4 text-emerald-600" />
                  </span>
                  <h3 className="font-black text-sm text-gray-800">حسابات الكاش (تسييل)</h3>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">تسييل كاش → محافظ</span>
                    <span className="font-black text-amber-700">{fmt(reviewStats.exchangeToWallets)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">استلام محافظ → كاش</span>
                    <span className="font-black text-emerald-700">{fmt(reviewStats.exchangeFromWallets)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-600">المصروفات</span>
                    <span className="font-black text-rose-700">{fmt(reviewStats.totalExpenses)}</span>
                  </div>

                  {cashStats && (
                    <div className="border-t border-gray-100 pt-2 flex justify-between items-center">
                      <span className="font-black text-gray-700 text-xs">الرصيد المتوقع بالدرج</span>
                      <span className="font-black text-gray-900">{fmt(cashStats.currentBalance)} ج.م</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ─── الإجمالي الشامل ─── */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-white">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-blue-300" />
                <div>
                  <div className="text-xs text-blue-300 font-bold">إجمالي إيرادات اليوم (كاشير + تقسيط + عربون)</div>
                  <div className="text-2xl font-black">{fmt(reviewStats.totalDayRevenue)} <span className="text-base font-bold text-blue-300">ج.م</span></div>
                </div>
              </div>
              {cashStats && (
                <div className="text-center sm:text-left bg-white/10 px-5 py-2.5 rounded-xl backdrop-blur-sm border border-white/10">
                  <div className="text-[10px] text-blue-300 font-bold">صافي الكاش بالدرج</div>
                  <div className="text-xl font-black">{fmt(cashStats.currentBalance)} ج.م</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
           Add Wallet Modal
           ═══════════════════════════════════════════════════════ */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                <Plus className="h-5 w-5" /> إضافة محفظة جديدة
              </h2>
              <button onClick={() => setShowAddWallet(false)} className="text-indigo-700 hover:bg-indigo-200 p-1 rounded-lg">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">اسم المحفظة <span className="text-red-500">*</span></label>
                <input type="text" value={newWalletName} onChange={e => setNewWalletName(e.target.value)} placeholder="مثال: أورانج كاش" className="w-full h-11 border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 font-bold outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">رقم المحفظة (اختياري)</label>
                <input type="text" value={newWalletNumber} onChange={e => setNewWalletNumber(e.target.value)} placeholder="مثال: 01012345678" className="w-full h-11 border-2 border-gray-200 focus:border-indigo-500 rounded-xl px-4 font-bold outline-none" dir="ltr" />
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  if (!newWalletName.trim()) return alert('أدخل اسم المحفظة');
                  addShiftAccount({
                    id: 'sa_' + Date.now(),
                    name: newWalletName.trim(),
                    walletNumber: newWalletNumber.trim() || undefined,
                  });
                  setShowAddWallet(false);
                  setNewWalletName('');
                  setNewWalletNumber('');
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg"
              >إضافة المحفظة</button>
              <button onClick={() => setShowAddWallet(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
           Exchange Modal
           ═══════════════════════════════════════════════════════ */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                عملية فودافون كاش
              </h2>
              <button onClick={() => setShowExchangeModal(false)} className="text-red-200 hover:text-white hover:bg-red-800 p-1 rounded-lg">✕</button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Main Tab Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMainTab('wallet')}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${mainTab === 'wallet'
                      ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                >
                  <Banknote className="h-4 w-4" />
                  <span>استلام محفظة</span>
                  <Upload className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setMainTab('cash')}
                  className={`py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${mainTab === 'cash'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                >
                  <Wallet className="h-4 w-4" />
                  <span>نقدية</span>
                  <Download className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Cash Sub Tab Toggle */}
              {mainTab === 'cash' && (
                <div className="grid grid-cols-2 gap-2 mt-[-8px]">
                  <button
                    onClick={() => setCashSubTab('receipt')}
                    className={`py-2 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${cashSubTab === 'receipt'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    <span>استلام نقدية</span>
                  </button>
                  <button
                    onClick={() => setCashSubTab('delivery')}
                    className={`py-2 rounded-lg border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${cashSubTab === 'delivery'
                        ? 'border-rose-400 bg-rose-50 text-rose-800 shadow-sm'
                        : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                  >
                    <span>تسليم نقدية</span>
                  </button>
                </div>
              )}

              {/* Visual Flow Indicator */}
              <div className={`rounded-xl border p-3 flex items-center justify-center gap-3 text-xs font-bold ${exchangeDirection === 'cash_to_wallet' ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-200'
                }`}>
                {exchangeDirection === 'cash_to_wallet' ? (
                  <>
                    <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                      <Banknote className="h-4 w-4 text-rose-600" /> <span className="text-rose-800">كاش (خروج من الدرج)</span>
                    </div>
                    <span className="text-amber-600 text-lg">→</span>
                    <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                      <Wallet className="h-4 w-4 text-emerald-600" /> <span className="text-emerald-800">{methodLabel} (دخول)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                      <Wallet className="h-4 w-4 text-rose-600" /> <span className="text-rose-800">{methodLabel} (خروج)</span>
                    </div>
                    <span className="text-emerald-600 text-lg">→</span>
                    <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                      <Banknote className="h-4 w-4 text-emerald-600" /> <span className="text-emerald-800">كاش (دخول للدرج)</span>
                    </div>
                  </>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                    <DollarSign className="h-4 w-4 text-gray-500" /> المبلغ (ج.م) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مثال: 5000"
                    className="w-full h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl px-4 text-lg font-black outline-none transition-all"
                    dir="ltr"
                    autoFocus
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                    الوجهة (المحفظة) <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {shiftAccounts.map(account => (
                      <button
                        key={account.id}
                        onClick={() => setTargetMethod(account.id)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${targetMethod === account.id ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-200 bg-white text-gray-600'}`}
                      >
                        <Wallet className="h-4 w-4 shrink-0" /> <span className="truncate">{account.name} {account.subLabel ? `(${account.subLabel})` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                    آخر 4 أرقام <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={walletLast4}
                    onChange={(e) => { const val = e.target.value; if (/^\d*$/.test(val)) setWalletLast4(val); }}
                    placeholder="1234"
                    className="w-full h-12 border-2 border-gray-200 focus:border-red-500 rounded-xl px-4 text-xl font-black text-center tracking-widest outline-none transition-all"
                    dir="ltr"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                    ملاحظات
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="تسييل لفلان..."
                    className="w-full h-10 border-2 border-gray-200 focus:border-red-500 rounded-xl px-4 text-sm font-medium outline-none transition-all"
                  />
                </div>
              </div>

            </div>

            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleSubmitExchange}
                disabled={!amount || Number(amount) <= 0 || walletLast4.length !== 4}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${amount && Number(amount) > 0 && walletLast4.length === 4
                    ? (exchangeDirection === 'cash_to_wallet' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700') + ' text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                {mainTab === 'cash' ? (cashSubTab === 'receipt' ? 'تنفيذ استلام النقدية' : 'تنفيذ تسليم النقدية') : 'تنفيذ استلام المحفظة'}
              </button>
              <button onClick={() => setShowExchangeModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 text-sm transition-all">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
