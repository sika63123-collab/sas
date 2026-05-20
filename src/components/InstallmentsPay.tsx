import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Transaction } from '../types';
import { Search, ChevronDown, ChevronUp, CreditCard, Banknote, Smartphone, Wallet } from 'lucide-react';

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  visa: 'فيزا',
  instapay: 'إنستاباي',
  vodafone_cash: 'فودافون كاش',
};

const METHOD_COLORS: Record<string, string> = {
  cash:          'bg-emerald-100 text-emerald-700',
  visa:          'bg-blue-100 text-blue-700',
  instapay:      'bg-purple-100 text-purple-700',
  vodafone_cash: 'bg-red-100 text-red-700',
};

export function InstallmentsPay({ onOpenInvoice }: { onOpenInvoice?: (invoiceId: string) => void }) {
  const { transactions, paymentTransactions } = useAppStore();
  const [searchTerm, setSearchTerm]   = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  /* -------- كل فواتير العربون (للترقيم) -------- */
  const allDepositInvoices = useMemo(
    () => transactions.filter(t => t.type === 'deposit_sale' || t.type === 'deposit_return'),
    [transactions]
  );

  /* -------- فواتير العربون المفلترة (للعرض) -------- */
  const depositInvoices = useMemo(() => {
    if (!searchTerm.trim()) return allDepositInvoices;
    const q = searchTerm.trim();
    return allDepositInvoices.filter(t =>
      t.customerName?.includes(q) || t.customerPhone?.includes(q)
    );
  }, [allDepositInvoices, searchTerm]);

  const paidAmount     = (t: Transaction) => Number(t.depositAmount) || 0;
  const remainingAmount = (t: Transaction) => Math.max(0, t.totalAmount - paidAmount(t));

  /* -------- toggle accordion -------- */
  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* -------- دبل كليك لفتح الفاتورة -------- */
  const handleRowDoubleClick = (invoiceId: string) => {
    onOpenInvoice?.(invoiceId);
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#f5f5f7] font-sans p-4 pb-0 gap-4" dir="rtl">
      <div className="flex-1 flex flex-col items-center gap-4">

        {/* ===== شريط البحث ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm shrink-0">بحث:</div>
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pr-10 h-9 border border-gray-200 rounded-lg shadow-sm outline-none px-3 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-100 transition-shadow"
                placeholder="ابحث باسم العميل أو رقم التليفون..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm font-bold text-gray-500 shrink-0">{depositInvoices.length} فاتورة</div>
          </div>
        </div>

        {/* ===== الجدول الرئيسي ===== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-5xl overflow-hidden">
          <div className="bg-gray-900 text-white py-3 text-center font-bold text-base">فواتير العربون</div>

          <div className="overflow-auto max-h-[calc(100vh-250px)]">
            <table className="w-full text-center text-sm border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 text-gray-500 font-medium z-10">
                <tr>
                  <th className="py-3 px-2 w-8"></th>{/* سهم التوسع */}
                  <th className="py-3 px-3 font-semibold">رقم الفاتورة</th>
                  <th className="py-3 px-3 font-semibold">تاريخ الفاتورة</th>
                  <th className="py-3 px-3 font-semibold text-right pr-6">اسم العميل</th>
                  <th className="py-3 px-3 font-semibold">إجمالي المدفوع</th>
                  <th className="py-3 px-3 font-semibold">الباقي</th>
                  <th className="py-3 px-3 font-semibold">تاريخ السداد</th>
                  <th className="py-3 px-3 font-semibold">صافي الفاتورة</th>
                </tr>
              </thead>

              <tbody>
                {depositInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400 font-medium">لا توجد فواتير عربون</td>
                  </tr>
                ) : (
                  depositInvoices.map(t => {
                    const isExpanded = expandedRows.has(t.id);
                    const invoicePayments = paymentTransactions.filter(pt => pt.invoiceId === t.id);
                    const hasPayments = invoicePayments.length > 0;
                    const invoiceSeq = allDepositInvoices.findIndex(inv => inv.id === t.id) + 1;
                    const paid = paidAmount(t);
                    const remaining = remainingAmount(t);
                    const isFullyPaid = remaining === 0;

                    return (
                      <React.Fragment key={t.id}>
                        {/* ===== السطر الرئيسي ===== */}
                        <tr
                          className={`border-b border-gray-50 transition-colors select-none cursor-pointer
                            ${isExpanded ? 'bg-blue-50/60' : 'hover:bg-blue-50/30'}
                            ${isFullyPaid ? 'opacity-60' : ''}`}
                          onDoubleClick={() => handleRowDoubleClick(t.id)}
                          title="دبل كليك لفتح الفاتورة"
                        >
                          {/* زر السهم */}
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={e => toggleRow(t.id, e)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all
                                ${hasPayments
                                  ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'
                                  : 'bg-gray-100 text-gray-300 cursor-default'}`}
                              disabled={!hasPayments}
                              title={hasPayments ? (isExpanded ? 'إخفاء الدفعات' : 'عرض الدفعات') : 'لا توجد دفعات'}
                            >
                              {isExpanded
                                ? <ChevronUp  className="w-4 h-4" />
                                : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>

                          <td className="py-3 px-3 font-bold text-gray-700 font-mono text-xs">{invoiceSeq}</td>
                          <td className="py-3 px-3 text-gray-600">{new Date(t.timestamp).toLocaleDateString('en-GB')}</td>
                          <td className="py-3 px-3 font-bold text-gray-900 text-right pr-6">
                            <span>{t.customerName || '—'}</span>
                            {hasPayments && (
                              <span className="mr-2 text-xs font-normal text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {invoicePayments.length} دفعة
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-green-600">{paid.toFixed(2)}</td>
                          <td className="py-3 px-3 font-bold text-red-600">{remaining.toFixed(2)}</td>
                          <td className="py-3 px-3 text-gray-600">
                            {t.paymentDate ? new Date(t.paymentDate).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-3 px-3 font-bold text-gray-900">{t.totalAmount.toFixed(2)}</td>
                        </tr>

                        {/* ===== السطر الموسَّع (Sub-table) ===== */}
                        {isExpanded && hasPayments && (
                          <tr className="bg-indigo-50/40 border-b border-indigo-100">
                            <td colSpan={8} className="p-0">
                              <div className="px-8 py-3 animate-[fadeIn_0.18s_ease]">
                                {/* عنوان الجدول الداخلي */}
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                                    تفاصيل الدفعات — {t.customerName}
                                  </span>
                                  <span className="text-xs text-indigo-400 mr-auto">
                                    إجمالي: {invoicePayments.reduce((s, p) => s + p.amount, 0).toFixed(2)} ج.م
                                  </span>
                                </div>

                                {/* الجدول الداخلي */}
                                <table className="w-full text-sm rounded-xl overflow-hidden border border-indigo-100 shadow-sm">
                                  <thead>
                                    <tr className="bg-indigo-600 text-white text-xs">
                                      <th className="py-2 px-4 font-semibold text-center">#</th>
                                      <th className="py-2 px-4 font-semibold text-center">المبلغ</th>
                                      <th className="py-2 px-4 font-semibold text-center">التاريخ</th>
                                      <th className="py-2 px-4 font-semibold text-center">طريقة الدفع</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-indigo-50">
                                    {invoicePayments.map((pt, idx) => (
                                      <tr key={pt.id} className="hover:bg-indigo-50/40 transition-colors">
                                        <td className="py-2 px-4 text-center text-gray-400 text-xs font-mono">
                                          دفعة {idx + 1}
                                        </td>
                                        <td className="py-2 px-4 text-center font-bold text-emerald-600">
                                          {pt.amount.toLocaleString('ar-EG')} ج.م
                                        </td>
                                        <td className="py-2 px-4 text-center text-gray-600">
                                          {new Date(pt.date).toLocaleDateString('ar-EG', {
                                            year: 'numeric', month: '2-digit', day: '2-digit'
                                          })}
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                          <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${METHOD_COLORS[pt.paymentMethod] || 'bg-gray-100 text-gray-600'}`}>
                                            {METHOD_LABELS[pt.paymentMethod] || pt.paymentMethod}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>

                                {/* تلميح الدبل كليك */}
                                <div className="mt-2 text-center text-xs text-gray-400">
                                  💡 دبل كليك على السطر الرئيسي لفتح الفاتورة وإضافة دفعة جديدة
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
