import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { ArrowRightLeft, Wallet, Banknote, CheckCircle2, Hash, StickyNote, Activity, Download, Upload, CreditCard, DollarSign, Trash2, Plus } from 'lucide-react';
import { Transaction } from '../types';

type TargetMethod = string;

export default function BalancesScreen() {
  const { addCashExchange, transactions, activeShift, expenses, shiftAccounts, deleteShiftAccount, addShiftAccount } = useAppStore();
  
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [amount, setAmount] = useState<string>('');
  const [targetMethod, setTargetMethod] = useState<TargetMethod>(shiftAccounts.length > 0 ? shiftAccounts[0].id : 'vodafone_cash');
  const [walletLast4, setWalletLast4] = useState('');
  const [exchangeRecordNumber, setExchangeRecordNumber] = useState('');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastExchange, setLastExchange] = useState<{ amount: number; method: string; wallet: string; recordNumber?: string } | null>(null);

  const [showAddWallet, setShowAddWallet] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletNumber, setNewWalletNumber] = useState('');

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

    addCashExchange(numAmount, targetMethod, walletLast4, note || undefined, exchangeRecordNumber || undefined);
    
    setLastExchange({ amount: numAmount, method: methodLabel, wallet: walletLast4, recordNumber: exchangeRecordNumber || undefined });
    setShowSuccess(true);
    
    // Reset form
    setAmount('');
    setWalletLast4('');
    setExchangeRecordNumber('');
    setNote('');
    setShowExchangeModal(false);
    
    // Hide success after 4 seconds
    setTimeout(() => setShowSuccess(false), 4000);
  };

  const shiftStart = activeShift?.openedAt || new Date().toISOString();

  const getAmount = (t: Transaction) => (t.type === 'deposit_sale' || t.type === 'deposit_return' || t.type === 'installment_sale') ? (t.depositAmount || 0) : t.totalAmount;

  // Wallet Stats Memo
  const walletsStats = useMemo(() => {
    return shiftAccounts.map(account => {
      // Real check for Vodafone/Instapay or matching name
      const filteredTxs = transactions.filter(t => {
         if (account.name.includes('فودافون') && t.paymentMethod === 'vodafone_cash') return true;
         if (account.name.includes('انستا') && t.paymentMethod === 'instapay') return true;
         return t.paymentMethod === account.id || t.paymentMethod === account.name;
      });

      const prevTxs = filteredTxs.filter(t => t.timestamp < shiftStart);
      const currTxs = filteredTxs.filter(t => t.timestamp >= shiftStart);

      const calcIn = (txs: Transaction[]) => txs
        .filter(t => t.type !== 'cash_exchange' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
        .reduce((sum, t) => sum + getAmount(t), 0);
        
      const calcOut = (txs: Transaction[]) => txs
        .filter(t => t.type !== 'cash_exchange' && (t.type === 'return' || t.type === 'deposit_return' || t.type === 'purchase'))
        .reduce((sum, t) => sum + getAmount(t), 0);

      const calcExchangeIn = (txs: Transaction[]) => txs
        .filter(t => t.type === 'cash_exchange')
        .reduce((sum, t) => sum + t.totalAmount, 0);

      const prevIn = calcIn(prevTxs) + calcExchangeIn(prevTxs);
      const prevOut = calcOut(prevTxs);
      const openingBalance = prevIn - prevOut;

      const shiftIn = calcIn(currTxs);
      const shiftExchange = calcExchangeIn(currTxs);
      const shiftOut = calcOut(currTxs);

      return {
        ...account,
        openingBalance,
        incoming: shiftIn,
        additions: shiftExchange,
        outgoing: shiftOut,
        currentBalance: openingBalance + shiftIn + shiftExchange - shiftOut
      };
    });
  }, [transactions, shiftStart, shiftAccounts]);

  const cashStats = useMemo(() => {
    if (!activeShift) return null;
    const currTxs = transactions.filter(t => t.timestamp >= shiftStart && t.paymentMethod === 'cash');
    const shiftExpenses = expenses.filter(e => e.timestamp >= shiftStart);

    const cashSales = currTxs
      .filter(t => t.type !== 'cash_exchange' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment' || t.type === 'installment_sale'))
      .reduce((sum, t) => sum + getAmount(t), 0);
      
    const manualInflow = activeShift.manualTransactions.filter(t => t.type === 'inflow').reduce((sum, t) => sum + t.amount, 0);
    
    const cashReturns = currTxs
      .filter(t => t.type !== 'cash_exchange' && (t.type === 'return' || t.type === 'deposit_return'))
      .reduce((sum, t) => sum + getAmount(t), 0);
      
    const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cashPurchases = currTxs
      .filter(t => t.type === 'purchase')
      .reduce((sum, t) => sum + t.totalAmount, 0);
      
    const cashExchangeOut = currTxs
      .filter(t => t.type === 'cash_exchange')
      .reduce((sum, t) => sum + t.totalAmount, 0);
      
    const manualOutflow = activeShift.manualTransactions.filter(t => t.type === 'outflow').reduce((sum, t) => sum + t.amount, 0);

    const withdrawals = totalExpenses + cashPurchases + manualOutflow;
    const incoming = cashSales + manualInflow;
    const openingBalance = activeShift.openingCash;
    
    return {
      openingBalance,
      incoming,
      exchangeOut: cashExchangeOut,
      returns: cashReturns,
      withdrawals,
      currentBalance: openingBalance + incoming - cashReturns - withdrawals - cashExchangeOut
    };
  }, [transactions, activeShift, expenses, shiftStart]);


  return (
    <div className="p-6 max-w-5xl mx-auto w-full" dir="rtl">
      
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span className="bg-blue-100 p-2 rounded-lg">
              <Activity className="h-6 w-6 text-blue-700" />
            </span>
            شاشة الأرصدة
          </h1>
          <p className="text-sm text-gray-500 mt-2 mr-12">
            متابعة أرصدة المحافظ الإلكترونية، النقدية، والمسحوبات للوردية الحالية
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddWallet(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-5 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            إضافة محفظة
          </button>
          <button
            onClick={() => setShowExchangeModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-xl font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <ArrowRightLeft className="h-5 w-5" />
            تسييل / تبادل عهدة
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && lastExchange && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-5 mb-6 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <span className="text-lg font-bold text-emerald-800">تم تنفيذ التسييل بنجاح ✓</span>
          </div>
          <div className="mr-10 space-y-1 text-sm text-emerald-700 font-semibold">
            <div>المبلغ: <span className="text-emerald-900 font-black">{lastExchange.amount.toLocaleString()} ج.م</span></div>
            <div>الوجهة: <span className="text-emerald-900 font-black">{lastExchange.method}</span></div>
            <div>المحفظة: <span className="text-emerald-900 font-black">*{lastExchange.wallet}</span></div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Wallets Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
            <Wallet className="h-6 w-6 text-indigo-600" /> المحافظ الإلكترونية
          </h2>
          
          {walletsStats.map((w, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow relative">
              <button 
                onClick={() => {
                  if (window.confirm(`هل أنت متأكد من حذف محفظة ${w.name}؟`)) {
                    deleteShiftAccount(w.id);
                  }
                }}
                className="absolute top-4 left-4 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="حذف المحفظة"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                <div className="pr-10 lg:pr-0 pl-10">
                  <h3 className="font-black text-lg text-gray-900">{w.name}</h3>
                  {(w.subLabel || w.walletNumber) && (
                    <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-md">
                      رقمها: {w.walletNumber || w.subLabel}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-500 font-bold">رصيد افتتاحي</div>
                  <div className="text-lg font-black text-gray-700">{w.openingBalance.toLocaleString()} ج.م</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Download className="h-3 w-3"/> الوارد</div>
                  <div className="font-black text-emerald-700">{w.incoming.toLocaleString()}</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-2 border border-amber-100">
                  <div className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Upload className="h-3 w-3"/> إضافات (تسييل)</div>
                  <div className="font-black text-amber-700">{w.additions.toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 flex justify-between items-center">
                <div className="text-sm font-bold text-indigo-800">الرصيد الحالي</div>
                <div className="text-xl font-black text-indigo-700">{w.currentBalance.toLocaleString()} ج.م</div>
              </div>
            </div>
          ))}
        </div>

        {/* Cash and Withdrawals Section */}
        <div className="space-y-6">
          
          {/* Cash */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <Banknote className="h-6 w-6 text-emerald-600" /> النقدية (الكاش)
            </h2>
            {cashStats ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
                  <div className="text-sm text-gray-500 font-bold">الرصيد الافتتاحي للوردية</div>
                  <div className="text-xl font-black text-gray-700">{cashStats.openingBalance.toLocaleString()} ج.م</div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-bold flex items-center gap-2"><Download className="h-4 w-4 text-emerald-500"/> مبيعات ووارد نقدية:</span>
                    <span className="font-black text-emerald-600">+{cashStats.incoming.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-bold flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-amber-500"/> تحويلات למحافظ (تسييل):</span>
                    <span className="font-black text-amber-600">-{cashStats.exchangeOut.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 font-bold flex items-center gap-2"><Upload className="h-4 w-4 text-rose-500"/> مسحوبات ومصروفات:</span>
                    <span className="font-black text-rose-600">-{cashStats.withdrawals.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-emerald-600 rounded-lg p-4 shadow-inner flex justify-between items-center text-white">
                  <div className="text-sm font-bold">صافي الكاش الحالي بالدرج</div>
                  <div className="text-2xl font-black">{cashStats.currentBalance.toLocaleString()} ج.م</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-500 font-bold">الوردية مغلقة. لا توجد تفاصيل للنقدية الحالية.</div>
            )}
          </div>

          {/* Withdrawals */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <CreditCard className="h-6 w-6 text-rose-600" /> إجمالي المسحوبات والمصروفات
            </h2>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm">
              <div className="text-center">
                <div className="text-sm text-rose-600 font-bold mb-1">إجمالي المسحوبات خلال الوردية</div>
                <div className="text-4xl font-black text-rose-700">
                  {cashStats ? cashStats.withdrawals.toLocaleString() : 0} <span className="text-xl">ج.م</span>
                </div>
                <div className="text-xs text-rose-500 mt-2">شامل المصروفات، والمشتريات النقدية، والمسحوبات اليدوية</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Add Wallet Modal */}
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

      {/* Exchange Modal */}
      {showExchangeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                تسييل / تبادل عهدة
              </h2>
              <button onClick={() => setShowExchangeModal(false)} className="text-amber-700 hover:bg-amber-200 p-1 rounded-lg">✕</button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              
              {/* Visual Flow Indicator */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 flex items-center justify-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-emerald-200">
                  <Banknote className="h-4 w-4 text-emerald-600" /> <span className="text-emerald-800">كاش (الدرج)</span>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                  <Wallet className="h-4 w-4 text-blue-600" /> <span className="text-blue-800">{methodLabel}</span>
                </div>
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
                    className="w-full h-12 border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 text-lg font-black outline-none transition-all"
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
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold text-sm transition-all ${targetMethod === account.id ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 bg-white text-gray-600'}`}
                      >
                        <Wallet className="h-4 w-4 shrink-0" /> <span className="truncate">{account.name} {account.subLabel ? `(${account.subLabel})` : ''}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                    آخر 4 أرقام <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={walletLast4}
                    onChange={(e) => { const val = e.target.value; if (/^\d*$/.test(val)) setWalletLast4(val); }}
                    placeholder="1234"
                    className="w-full h-12 border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 text-xl font-black text-center tracking-widest outline-none transition-all"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-1.5">
                    رقم السجل
                  </label>
                  <input
                    type="text"
                    value={exchangeRecordNumber}
                    onChange={(e) => setExchangeRecordNumber(e.target.value)}
                    placeholder="اختياري"
                    className="w-full h-12 border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 text-center font-bold outline-none transition-all"
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
                    className="w-full h-10 border-2 border-gray-200 focus:border-amber-500 rounded-xl px-4 text-sm font-medium outline-none transition-all"
                  />
                </div>
              </div>

            </div>
            
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleSubmitExchange}
                disabled={!amount || Number(amount) <= 0 || walletLast4.length !== 4}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  amount && Number(amount) > 0 && walletLast4.length === 4
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <ArrowRightLeft className="h-4 w-4" /> تنفيذ التسييل
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
