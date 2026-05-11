import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { InstallmentContract, InstallmentPayment } from '../types';
import { CheckCircle } from 'lucide-react';

export function InstallmentsPay() {
  const { installmentContracts, payInstallment } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<InstallmentContract | null>(null);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});

  // When selectedContract is null, select the first in the filtered list
  const filteredContracts = useMemo(() => {
    if (!searchTerm) return installmentContracts;
    return installmentContracts.filter(c => 
      String(c.customerNumber) === searchTerm || 
      c.customerPhone === searchTerm || 
      c.pageNumber === searchTerm ||
      c.customerName.includes(searchTerm) ||
      c.deviceName.includes(searchTerm)
    );
  }, [searchTerm, installmentContracts]);

  useEffect(() => {
    if (filteredContracts.length > 0 && (!selectedContract || !filteredContracts.find(c => c.id === selectedContract.id))) {
      setSelectedContract(filteredContracts[0]);
    } else if (filteredContracts.length === 0) {
      setSelectedContract(null);
    }
  }, [filteredContracts, selectedContract]);

  const handlePay = (paymentId: string) => {
    if (!selectedContract) return;
    
    const originalPayment = selectedContract.payments.find(p => p.id === paymentId);
    
    const inputValue = paymentInputs[paymentId];
    const paidVal = inputValue !== undefined ? Number(inputValue) : (originalPayment ? originalPayment.amount : 0);

    if (!paidVal || paidVal <= 0) {
      alert('الرجاء كتابة مبلغ الدفع');
      return;
    }

    payInstallment(selectedContract.id, paymentId, paidVal);
      
    // Update local view
    setSelectedContract(prev => {
       if (!prev) return prev;
       return {
          ...prev,
          payments: prev.payments.map(p => p.id === paymentId ? { ...p, isPaid: true, paidDate: new Date().toISOString(), paidAmount: paidVal } : p)
       }
    });

    setPaymentInputs({...paymentInputs, [paymentId]: ''});
  };

  const getRemainingAmount = (c: InstallmentContract) => {
    const paid = c.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0);
    return Math.max(0, c.totalAmount - paid);
  };

  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#b0bec5] font-sans p-6" dir="rtl">
        {/* Search Bar */}
        <div className="flex justify-center items-center mb-6">
            <input 
                className="w-1/2 max-w-lg h-12 px-4 shadow-sm outline-none text-right placeholder-gray-400 text-lg font-bold rounded-r-sm"
                placeholder="اكتب اسم العميل..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="bg-black text-white px-6 py-[14px] font-bold text-lg text-center rounded-l-sm min-w-[200px]">
                بحث باسم العميل:
            </div>
        </div>

        <div className="flex gap-4 w-full max-w-7xl mx-auto h-[75vh]">
           {/* Sidebar: List of Contracts */}
           <div className="w-[300px] flex flex-col shrink-0 gap-4">
               {/* Total Box */}
               <div className="bg-[#eaeff1] border border-gray-400 p-4 flex flex-col items-center justify-center shadow-sm">
                   <div className="text-gray-600 font-bold text-sm mb-2">إجمالي المتبقي لجميع العملاء</div>
                   <div className="text-gray-900 font-extrabold text-xl">{filteredContracts.reduce((sum, c) => sum + getRemainingAmount(c), 0).toLocaleString()} ج.م</div>
               </div>
               
               <div className="w-full flex flex-col flex-1 bg-black shadow-md border-l border-gray-400 overflow-hidden">
                   <div className="text-white py-2.5 text-center font-bold text-base shrink-0">العملاء ({filteredContracts.length})</div>
                   <div className="flex-1 overflow-auto bg-[#eaeff1] w-full items-center flex flex-col pt-2 border-t border-gray-400">
                       {filteredContracts.map((c, idx) => {
                           const rem = getRemainingAmount(c);
                           const isSelected = selectedContract?.id === c.id;
                           
                           return (
                               <div 
                                   key={c.id} 
                                   onClick={() => setSelectedContract(c)}
                                   className={`w-[96%] mb-2 p-3 cursor-pointer shadow-sm border ${isSelected ? 'bg-[#e3f2fd] border-blue-300' : 'bg-white border-white hover:border-gray-300'} transition-colors`}
                               >
                                   <div className="flex justify-between items-center">
                                       <div className={`font-bold text-sm ${rem > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                           {rem > 0 ? `متبقي: ${rem}` : 'خالص'}
                                       </div>
                                       <div className="text-right">
                                           <div className="font-bold text-gray-900">{c.customerName}</div>
                                           <div className="text-xs text-gray-500 mt-1">{c.payments.filter(p => p.isPaid).length} من {c.payments.length} قسط</div>
                                       </div>
                                   </div>
                               </div>
                           )
                       })}
                   </div>
               </div>
           </div>

           {/* Main Detail Area */}
           <div className="flex-1 bg-[#eaeff1] shadow-md flex flex-col min-w-0">
               {selectedContract ? (() => {
                  const remaining = getRemainingAmount(selectedContract);
                  const paidCount = selectedContract.payments.filter(p => p.isPaid).length;
                  const totalCount = selectedContract.payments.length;
                  const latePayments = selectedContract.payments.filter(p => !p.isPaid && new Date(p.dueDate) < today);
                  const totalPaidAmount = selectedContract.downPayment + selectedContract.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount ?? p.amount) : 0), 0);
                  const contractIndex = installmentContracts.findIndex(c => c.id === selectedContract.id) + 1;

                  return (
                     <>
                        <div className="bg-[#1a365d] text-white px-4 py-2.5 flex justify-between items-center shrink-0">
                           {latePayments.length > 0 ? (
                              <div className="bg-red-100 text-red-600 px-3 py-1 font-bold text-sm">متأخر {latePayments.length} قسط</div>
                           ) : <div/>}
                           <div className="font-bold text-lg">عقد #{contractIndex} — {selectedContract.deviceName}</div>
                        </div>

                        <div className="p-6 pb-2 shrink-0">
                            <div className="grid grid-cols-4 gap-4 text-center">
                                {/* Row 1 */}
                                <div className="flex flex-col gap-2">
                                   <span className="text-gray-500 font-medium text-sm">رقم الصفحة</span>
                                   <span className="font-bold text-gray-900">{selectedContract.pageNumber || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                   <span className="text-gray-500 font-medium text-sm">التليفون</span>
                                   <span className="font-bold text-gray-900" dir="ltr">{selectedContract.customerPhone}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                   <span className="text-gray-500 font-medium text-sm">العنوان</span>
                                   <span className="font-bold text-gray-900">{selectedContract.customerAddress || '-'}</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                   <span className="text-gray-500 font-medium text-sm">الضامن</span>
                                   <span className="font-bold text-gray-900">{selectedContract.guarantorName || '-'}</span>
                                </div>
                                
                                {/* Row 2 */}
                                <div className="flex flex-col gap-2 mt-4 relative pb-5 border-b-2 border-blue-600">
                                   <span className="text-gray-500 font-medium text-sm">سعر الجهاز</span>
                                   <span className="font-bold text-gray-900">{selectedContract.purchasePrice} ج.م</span>
                                   <span className="text-green-600 text-xs font-bold absolute bottom-0 left-0 right-0">مدفوع: {totalPaidAmount} ج.م</span>
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                   <span className="text-gray-500 font-medium text-sm">المقدم</span>
                                   <span className="font-bold text-blue-600">{selectedContract.downPayment} ج.م</span>
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                   <span className="text-gray-500 font-medium text-sm">القسط الشهري</span>
                                   <span className="font-bold text-gray-900">{selectedContract.monthlyPayment} ج.م</span>
                                </div>
                                <div className="flex flex-col gap-2 mt-4">
                                   <span className="text-gray-500 font-medium text-sm">الأقساط</span>
                                   <span className="font-bold text-gray-900">{paidCount}/{totalCount} دفع</span>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-2 pt-4 flex justify-start shrink-0">
                           <span className="text-red-600 font-bold mt-2">متبقي: {remaining} ج.م</span>
                        </div>

                        {/* Table Area */}
                        <div className="flex-1 overflow-auto mt-2 pb-6">
                            <table className="w-full text-center">
                                <thead className="bg-[#cbd5e1] text-gray-800 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-12">#</th>
                                        <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-1/4">تاريخ الاستحقاق</th>
                                        <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-1/5">المبلغ</th>
                                        <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-1/4">تاريخ الدفع</th>
                                        <th className="py-2.5 font-bold text-sm w-24">الحالة</th>
                                        <th className="py-2.5 font-bold text-sm w-32 border-r border-gray-300">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {selectedContract.payments.map((p, idx) => {
                                        const dueDate = new Date(p.dueDate);
                                        const isLate = !p.isPaid && dueDate < today;
                                        const nextUnpaid = selectedContract.payments.find(up => !up.isPaid);
                                        const isCurrent = nextUnpaid?.id === p.id;
                                        
                                        return (
                                            <tr key={p.id} className={`${isLate ? 'bg-[#ffebee]' : 'even:bg-gray-50'} border-b border-gray-200`}>
                                                <td className="py-2 text-sm font-bold border-l border-gray-200">{idx + 1}</td>
                                                <td className="py-2 text-sm font-bold border-l border-gray-200" dir="ltr">{dueDate.toLocaleDateString('en-GB')}</td>
                                                <td className="py-2 text-sm font-bold border-l border-gray-200 text-gray-900">
                                                    {p.isPaid ? (
                                                        <span>{p.paidAmount !== undefined ? p.paidAmount : p.amount}</span>
                                                    ) : isCurrent ? (
                                                        <input 
                                                            type="number"
                                                            className="w-24 h-7 border border-blue-400 text-center font-bold text-blue-700 outline-none bg-white focus:border-blue-600 rounded-sm"
                                                            placeholder={p.amount.toString()}
                                                            value={paymentInputs[p.id] !== undefined ? paymentInputs[p.id] : p.amount.toString()}
                                                            onChange={(e) => setPaymentInputs(prev => ({...prev, [p.id]: e.target.value}))}
                                                        />
                                                    ) : p.amount}
                                                </td>
                                                <td className="py-2 text-sm font-bold border-l border-gray-200 text-gray-600">
                                                    {p.isPaid ? new Date(p.paidDate!).toLocaleDateString('en-GB') : '—'}
                                                </td>
                                                <td className="py-2 text-sm font-bold">
                                                    {p.isPaid ? (
                                                        <span className="text-green-600">تم الدفع</span>
                                                    ) : isLate ? (
                                                        <span className="text-red-600 bg-red-100 px-2 py-0.5 rounded">متأخر</span>
                                                    ) : (
                                                        <span className="text-gray-600">قادم</span>
                                                    )}
                                                </td>
                                                <td className="py-1 border-r border-gray-200">
                                                   {!p.isPaid && isCurrent ? (
                                                       <button onClick={() => handlePay(p.id)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1 text-xs rounded transition-colors focus:ring-2 focus:ring-blue-300">
                                                          تسديد
                                                       </button>
                                                   ) : p.isPaid ? (
                                                       <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                                                   ) : null}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                     </>
                  );
               })() : (
                  <div className="flex-1 flex justify-center items-center text-gray-500 font-bold text-lg">
                      لا يوجد عقد محدد
                  </div>
               )}
           </div>

        </div>
    </div>
  );
}

