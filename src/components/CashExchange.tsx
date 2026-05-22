import React, { useState } from 'react';
import { useAppStore } from '../store';
import { ArrowRightLeft, Wallet, Banknote, CheckCircle2, Hash, StickyNote } from 'lucide-react';

type TargetMethod = 'vodafone_cash' | 'instapay';

export default function CashExchange() {
  const { addCashExchange } = useAppStore();
  
  const [amount, setAmount] = useState<string>('');
  const [targetMethod, setTargetMethod] = useState<TargetMethod>('vodafone_cash');
  const [walletLast4, setWalletLast4] = useState('');
  const [note, setNote] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastExchange, setLastExchange] = useState<{ amount: number; method: string; wallet: string } | null>(null);

  const methodLabel = targetMethod === 'vodafone_cash' ? 'فودافون كاش' : 'انستا باي';

  const handleSubmit = () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert('الرجاء إدخال مبلغ صحيح');
      return;
    }
    if (walletLast4.length !== 4) {
      alert('الرجاء إدخال آخر 4 أرقام من المحفظة');
      return;
    }

    addCashExchange(numAmount, targetMethod, walletLast4, note || undefined);
    
    setLastExchange({ amount: numAmount, method: methodLabel, wallet: walletLast4 });
    setShowSuccess(true);
    
    // Reset form
    setAmount('');
    setWalletLast4('');
    setNote('');
    
    // Hide success after 4 seconds
    setTimeout(() => setShowSuccess(false), 4000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto w-full" dir="rtl">
      
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span className="bg-amber-100 p-2 rounded-lg">
            <ArrowRightLeft className="h-6 w-6 text-amber-700" />
          </span>
          تسييل / تبادل عهدة
        </h1>
        <p className="text-sm text-gray-500 mt-2 mr-12">
          تحويل كاش من الدرج إلى محفظة إلكترونية (فودافون كاش / انستا باي)
        </p>
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
          <div className="mt-3 mr-10 text-xs text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-lg inline-block font-bold">
            ✓ تم خصم {lastExchange.amount.toLocaleString()} من الكاش &nbsp;|&nbsp; ✓ تم إضافة {lastExchange.amount.toLocaleString()} لـ{lastExchange.method}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Visual Flow Indicator */}
        <div className="bg-gradient-to-l from-emerald-50 via-amber-50 to-blue-50 border-b border-gray-200 p-4">
          <div className="flex items-center justify-center gap-4 text-sm font-bold">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-emerald-200 shadow-sm">
              <Banknote className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-800">كاش (الدرج)</span>
            </div>
            <div className="flex flex-col items-center">
              <ArrowRightLeft className="h-5 w-5 text-amber-600" />
              <span className="text-[10px] text-amber-600 font-bold mt-0.5">تحويل</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-blue-200 shadow-sm">
              <Wallet className="h-5 w-5 text-blue-600" />
              <span className="text-blue-800">{methodLabel}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Amount */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Banknote className="h-4 w-4 text-gray-500" />
              المبلغ (ج.م)
              <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مثال: 5000"
              className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 focus:border-amber-500 rounded-xl px-4 text-xl font-black text-gray-900 outline-none transition-all text-center"
              dir="ltr"
              autoFocus
            />
          </div>

          {/* Target Method */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Wallet className="h-4 w-4 text-gray-500" />
              الوجهة (المحفظة الإلكترونية)
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTargetMethod('vodafone_cash')}
                className={`flex items-center justify-center gap-3 py-4 rounded-xl border-2 font-bold text-base transition-all ${
                  targetMethod === 'vodafone_cash'
                    ? 'border-red-500 bg-red-50 text-red-800 shadow-md shadow-red-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Wallet className="h-5 w-5" />
                فودافون كاش
              </button>
              <button
                onClick={() => setTargetMethod('instapay')}
                className={`flex items-center justify-center gap-3 py-4 rounded-xl border-2 font-bold text-base transition-all ${
                  targetMethod === 'instapay'
                    ? 'border-purple-500 bg-purple-50 text-purple-800 shadow-md shadow-purple-100'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Wallet className="h-5 w-5" />
                انستا باي
              </button>
            </div>
          </div>

          {/* Wallet Last 4 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <Hash className="h-4 w-4 text-gray-500" />
              آخر 4 أرقام من المحفظة المرسلة
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={4}
              value={walletLast4}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) {
                  setWalletLast4(val);
                }
              }}
              placeholder="1234"
              className="w-full h-14 border-2 border-gray-200 hover:border-gray-300 focus:border-amber-500 rounded-xl px-4 text-2xl font-black text-gray-900 outline-none transition-all text-center tracking-[0.5em]"
              dir="ltr"
            />
            <p className="text-xs text-gray-400 mt-1 mr-1">آخر 4 أرقام من رقم المحفظة اللي بعتت الرصيد</p>
          </div>

          {/* Note */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mb-2">
              <StickyNote className="h-4 w-4 text-gray-500" />
              ملاحظات (اختياري)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثال: تسييل لمحمد - أو أي ملاحظة..."
              className="w-full h-11 border-2 border-gray-200 hover:border-gray-300 focus:border-amber-500 rounded-xl px-4 text-sm font-medium text-gray-700 outline-none transition-all"
            />
          </div>

          {/* Summary before submit */}
          {amount && Number(amount) > 0 && walletLast4.length === 4 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm space-y-2">
              <div className="font-bold text-amber-800 mb-2">ملخص العملية:</div>
              <div className="flex justify-between text-amber-900">
                <span className="font-bold">منصرف من الكاش (صادر):</span>
                <span className="font-black text-red-700">{Number(amount).toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-amber-900">
                <span className="font-bold">وارد لـ{methodLabel}:</span>
                <span className="font-black text-emerald-700">{Number(amount).toLocaleString()} ج.م</span>
              </div>
              <div className="flex justify-between text-amber-900">
                <span className="font-bold">محفظة:</span>
                <span className="font-black">*{walletLast4}</span>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || walletLast4.length !== 4}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${
              amount && Number(amount) > 0 && walletLast4.length === 4
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-200 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ArrowRightLeft className="h-5 w-5" />
            تنفيذ التسييل
          </button>
        </div>
      </div>
    </div>
  );
}
