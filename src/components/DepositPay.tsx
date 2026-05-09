import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Transaction, PaymentMethod } from '../types';

export function DepositPay() {
  const { transactions, updateTransaction, addTransaction } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const handleSearch = () => {
    if (!searchTerm) return;
    
    // Find active deposit
    const found = transactions.find(t => 
      t.type === 'deposit_sale' && 
      (!t.isDelivered || (typeof t.depositAmount === 'number' && t.depositAmount < t.totalAmount)) &&
      (
        t.id === searchTerm ||
        t.customerPhone === searchTerm ||
        t.pageNumber === searchTerm ||
        t.customerName?.includes(searchTerm)
      )
    );
    
    if (found) {
      setSelectedTransaction(found);
    } else {
      alert('لم يتم العثور على عربون مسجل بهذا البحث أو تم تسليمه بالفعل.');
      setSelectedTransaction(null);
    }
  };

  const handleCompletePayment = (method: PaymentMethod) => {
    if (!selectedTransaction) return;

    const remaining = selectedTransaction.totalAmount - (selectedTransaction.depositAmount || 0);

    if (window.confirm(`تأكيد استلام باقي المبلغ (${remaining} ج.م) وتسليم البضاعة؟`)) {
      
      // Update Original Transaction
      updateTransaction(selectedTransaction.id, {
        isDelivered: true,
      });

      // Create new completion transaction for reports
      if (remaining > 0) {
        addTransaction({
          type: 'deposit_payment',
          totalAmount: remaining,
          paymentMethod: method,
          items: [], // We don't replicate items to avoid double inventory counting
          customerName: selectedTransaction.customerName,
          customerPhone: selectedTransaction.customerPhone,
          depositAmount: 0,
        });
      }

      alert('تم سداد القسط/المتبقي بنجاح وتسليم البضاعة');
      setSelectedTransaction(null);
      setSearchTerm('');
    }
  };

  const currentDepositAmount = selectedTransaction?.depositAmount || 0;
  const remainingTotal = selectedTransaction ? selectedTransaction.totalAmount - currentDepositAmount : 0;

  return (
    <div className="flex flex-col items-center min-h-full bg-white font-sans p-6" dir="rtl">
        <div className="w-full max-w-4xl bg-white p-6 shadow-sm border border-gray-200">
            
            <div className="flex justify-between items-center mb-8 border-b pb-4">
               <h2 className="text-2xl font-bold text-[#1a2f4c]">سداد وتسليم العربون</h2>
               <div className="flex items-center gap-2">
                  <label className="text-lg font-bold">التاريخ</label>
                  <input className="w-48 h-10 border shadow-inner px-2 text-center text-lg outline-none" value={new Date().toLocaleDateString('ar-EG')} readOnly />
               </div>
            </div>

            <div className="flex items-center justify-center gap-4 mb-8">
                <input 
                    className="w-96 h-12 px-4 shadow-inner border-2 border-indigo-900 text-lg outline-none font-bold placeholder-gray-500" 
                    placeholder="بحث برقم الفاتورة / الاسم / التليفون / رقم الصفحة"
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button 
                    onClick={handleSearch}
                    className="h-12 px-6 bg-indigo-900 text-white font-bold text-lg hover:bg-indigo-800 transition"
                >
                    بحث
                </button>
            </div>

            {selectedTransaction && (
               <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 border shadow-inner">
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-lg font-bold">اسم العميل:</label>
                        <input className="flex-1 h-10 px-2 font-bold text-lg" value={selectedTransaction.customerName || ''} readOnly />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-lg font-bold">رقم التليفون:</label>
                        <input className="flex-1 h-10 px-2 font-bold text-lg" value={selectedTransaction.customerPhone || ''} readOnly dir="ltr" />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-lg font-bold">العنوان:</label>
                        <input className="flex-1 h-10 px-2 font-bold text-lg" value={selectedTransaction.customerAddress || ''} readOnly />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="w-32 text-lg font-bold">رقم الصفحة:</label>
                        <input className="flex-1 h-10 px-2 font-bold text-lg" value={selectedTransaction.pageNumber || ''} readOnly />
                    </div>
                 </div>

                 <div className="border border-gray-200">
                    <table className="w-full text-center text-lg">
                        <thead className="bg-[#e4ebf1] border-b">
                            <tr>
                                <th className="py-3 px-4 font-bold border-l border-white">الصنف</th>
                                <th className="py-3 px-4 font-bold border-l border-white">الكمية</th>
                                <th className="py-3 px-4 font-bold">السعر</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedTransaction.items.map((item, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                   <td className="py-3 px-4 border-l border-gray-200">{item.name}</td>
                                   <td className="py-3 px-4 border-l border-gray-200 font-bold">{item.quantity}</td>
                                   <td className="py-3 px-4 font-bold">{item.price}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>

                 <div className="flex justify-end gap-12 mt-6 p-4 bg-[#f8fafc] border-2 border-indigo-900 border-dashed">
                      <div className="text-center">
                          <div className="text-sm font-bold text-gray-500 mb-1">إجمالي الفاتورة</div>
                          <div className="text-2xl font-bold">{selectedTransaction.totalAmount} ج</div>
                      </div>
                      <div className="text-center">
                          <div className="text-sm font-bold text-gray-500 mb-1">المدفوع مسبقاً (عربون)</div>
                          <div className="text-2xl font-bold text-blue-600">{currentDepositAmount} ج</div>
                      </div>
                      <div className="text-center">
                          <div className="text-sm font-bold text-gray-500 mb-1">المتبقي المطلوب للسداد</div>
                          <div className="text-2xl font-bold text-red-600">{remainingTotal} ج</div>
                      </div>
                 </div>

                 <div className="mt-8 flex justify-center gap-4 border-t pt-8">
                     <p className="w-full text-center text-gray-500 mb-2 font-bold">إختر طريقة استلام المتبقي:</p>
                 </div>
                 <div className="flex justify-center gap-6">
                     <button onClick={() => handleCompletePayment('cash')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded shadow text-xl">استلام نقدي ({remainingTotal} ج)</button>
                     <button onClick={() => handleCompletePayment('visa')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow text-xl">استلام فيزا ({remainingTotal} ج)</button>
                 </div>
               </div>
            )}
        </div>
    </div>
  );
}
