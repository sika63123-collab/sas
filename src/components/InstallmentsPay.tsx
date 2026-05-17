import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Transaction } from '../types';
import { Search } from 'lucide-react';

export function InstallmentsPay({ onOpenInvoice }: { onOpenInvoice?: (invoiceId: string) => void }) {
  const { transactions } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const depositInvoices = useMemo(() => {
    const invoices = transactions.filter(t => t.type === 'deposit_sale' || t.type === 'deposit_return');
    if (!searchTerm.trim()) return invoices;
    const q = searchTerm.trim();
    return invoices.filter(t =>
      t.customerName?.includes(q) || t.customerPhone?.includes(q)
    );
  }, [transactions, searchTerm]);

  const cashierTransactions = useMemo(() => {
    return transactions.filter(t => t.type !== 'deposit_payment' && t.type !== 'installment_payment');
  }, [transactions]);

  const paidAmount = (t: Transaction) => Number(t.depositAmount) || 0;
  const remainingAmount = (t: Transaction) => Math.max(0, t.totalAmount - paidAmount(t));

  const inputTheme = "h-9 border border-gray-200 rounded-lg shadow-sm outline-none px-3 bg-white font-medium text-sm focus:ring-2 focus:ring-blue-100 transition-shadow";

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-[#f5f5f7] font-sans p-4 pb-0 gap-4" dir="rtl">
      {/* ===== يمين: التقرير ===== */}
      <div className="flex-1 flex flex-col items-center gap-4">
        
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="bg-gray-900 text-white px-4 py-2 rounded-lg font-bold text-sm shrink-0">بحث:</div>
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                className={`w-full pr-10 ${inputTheme}`}
                placeholder="ابحث باسم العميل أو رقم التليفون..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-sm font-bold text-gray-500 shrink-0">{depositInvoices.length} فاتورة</div>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 w-full max-w-5xl overflow-hidden">
          <div className="bg-gray-900 text-white py-3 text-center font-bold text-base">فواتير العربون</div>
          <div className="overflow-auto max-h-[calc(100vh-250px)]">
            <table className="w-full text-center text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 text-gray-500 font-medium z-10">
                <tr>
                  <th className="py-3 px-3 font-semibold">رقم الفاتورة</th>
                  <th className="py-3 px-3 font-semibold">تاريخ الفاتورة</th>
                  <th className="py-3 px-3 font-semibold text-right pr-6">اسم العميل</th>
                  <th className="py-3 px-3 font-semibold">المدفوع</th>
                  <th className="py-3 px-3 font-semibold">الباقي</th>
                  <th className="py-3 px-3 font-semibold">تاريخ السداد</th>
                  <th className="py-3 px-3 font-semibold">صافي الفاتورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {depositInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-400 font-medium">لا توجد فواتير عربون</td>
                  </tr>
                ) : (
                  depositInvoices.map(t => (
                    <tr 
                      key={t.id}
                      onClick={() => onOpenInvoice?.(t.id)}
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-3 font-bold text-gray-700 font-mono text-xs">{cashierTransactions.findIndex(tx => tx.id === t.id) + 1}</td>
                      <td className="py-3 px-3 text-gray-600">{new Date(t.timestamp).toLocaleDateString('en-GB')}</td>
                      <td className="py-3 px-3 font-bold text-gray-900 text-right pr-6">{t.customerName || '—'}</td>
                      <td className="py-3 px-3 font-bold text-green-600">{paidAmount(t).toFixed(2)}</td>
                      <td className="py-3 px-3 font-bold text-red-600">{remainingAmount(t).toFixed(2)}</td>
                      <td className="py-3 px-3 text-gray-600">{t.paymentDate ? new Date(t.paymentDate).toLocaleDateString('en-GB') : '—'}</td>
                      <td className="py-3 px-3 font-bold text-gray-900">{t.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
