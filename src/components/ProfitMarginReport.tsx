import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Calculator } from 'lucide-react';

export default function ProfitMarginReport({ selectedDate }: { selectedDate: string }) {
  const { transactions, products, expenses } = useAppStore();

  const dailyTransactions = transactions.filter(t => t.timestamp.startsWith(selectedDate));
  
  // Calculate profits
  let totalSales = 0;
  let totalCost = 0;
  
  const profitDetails = dailyTransactions.filter(t => t.type === 'sale' || t.type === 'return').flatMap(t => {
    return t.items.map(item => {
      const product = products.find(p => p.id === item.productId);
      const costPrice = product?.costPrice || 0;
      const isReturn = t.type === 'return';
      const multiplier = isReturn ? -1 : 1;
      
      const itemSales = item.price * item.quantity * multiplier;
      const itemCost = costPrice * item.quantity * multiplier;
      const itemProfit = itemSales - itemCost;
      
      totalSales += itemSales;
      totalCost += itemCost;
      
      return {
        invoiceId: t.id,
        type: t.type,
        productId: item.productId,
        name: item.name,
        qty: item.quantity * multiplier,
        salePrice: item.price,
        costPrice: costPrice,
        profit: itemProfit,
        time: new Date(t.timestamp).toLocaleTimeString('ar-EG')
      };
    });
  });

  const totalProfit = totalSales - totalCost;

  // Expenses
  const dailyExpenses = expenses.filter(e => e.timestamp.startsWith(selectedDate));
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalProfit - totalExpenses;

  const marginPercentage = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
         <div className="flex items-center gap-2">
           <Calculator className="h-5 w-5 text-emerald-600" />
           <h3 className="font-bold text-gray-800">تقرير هامش الربح ({selectedDate})</h3>
         </div>
         <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors hidden print:hidden md:block">
           طباعة التقرير
         </button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
           <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
             <div className="text-emerald-800 mb-1 text-sm font-bold">إجمالي المبيعات</div>
             <div className="text-2xl font-black text-emerald-700">{totalSales.toLocaleString()} <span className="text-sm">ج.م</span></div>
           </div>
           <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-center">
             <div className="text-red-800 mb-1 text-sm font-bold">إجمالي التكلفة</div>
             <div className="text-2xl font-black text-red-700">{totalCost.toLocaleString()} <span className="text-sm">ج.م</span></div>
           </div>
           <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center">
              <div className="text-blue-800 mb-1 text-sm font-bold">إجمالي الربح</div>
              <div className="text-2xl font-black text-blue-700">{totalProfit.toLocaleString()} <span className="text-sm">ج.م</span></div>
            </div>
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-center">
              <div className="text-purple-800 mb-1 text-sm font-bold">نسبة الربح</div>
              <div className="text-2xl font-black text-purple-700">{marginPercentage}%</div>
            </div>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl text-center">
              <div className="text-orange-800 mb-1 text-sm font-bold">إجمالي المصروفات</div>
              <div className="text-2xl font-black text-orange-700">- {totalExpenses.toLocaleString()} <span className="text-sm">ج.م</span></div>
            </div>
            <div className={`${netProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'} border p-4 rounded-xl text-center`}>
              <div className={`${netProfit >= 0 ? 'text-emerald-800' : 'text-red-800'} mb-1 text-sm font-bold`}>صافي الربح بعد المصروفات</div>
              <div className={`text-2xl font-black ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{netProfit.toLocaleString()} <span className="text-sm">ج.م</span></div>
            </div>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
              <div className="text-gray-800 mb-1 text-sm font-bold">عدد المصروفات</div>
              <div className="text-2xl font-black text-gray-700">{dailyExpenses.length}</div>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">رقم الفاتورة</th>
                <th className="px-4 py-3 font-semibold">توقيت</th>
                <th className="px-4 py-3 font-semibold">الصنف</th>
                <th className="px-4 py-3 font-semibold text-center">الكمية</th>
                <th className="px-4 py-3 font-semibold text-center">سعر البيع</th>
                <th className="px-4 py-3 font-semibold text-center">سعر التكلفة</th>
                <th className="px-4 py-3 font-semibold text-center">الربح</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profitDetails.map((item, idx) => (
                <tr key={idx} className={`hover:bg-gray-50 ${item.type === 'return' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 font-bold">{item.invoiceId} {item.type === 'return' && <span className="text-red-500 text-xs">(مرتجع)</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{item.time}</td>
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 text-center">{item.qty}</td>
                  <td className="px-4 py-3 text-green-600 text-center font-bold">{item.salePrice}</td>
                  <td className="px-4 py-3 text-red-600 text-center font-bold">{item.costPrice}</td>
                  <td className={`px-4 py-3 text-center font-bold ${item.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {item.profit}
                  </td>
                </tr>
              ))}
              {profitDetails.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 font-medium">
                    لا توجد حركات مبيعات أو مرتجع في هذا اليوم
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
