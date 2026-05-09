import React, { useState } from 'react';
import { useAppStore } from '../store';
import { InstallmentContract, InstallmentPayment } from '../types';

export function InstallmentsPay() {
  const { installmentContracts, payInstallment } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<InstallmentContract | null>(null);
  const [paymentInputs, setPaymentInputs] = useState<Record<string, string>>({});

  const handleSearch = () => {
    if (!searchTerm) return;
    
    const found = installmentContracts.find(c => 
      String(c.customerNumber) === searchTerm || 
      c.customerPhone === searchTerm || 
      c.pageNumber === searchTerm ||
      c.customerName.includes(searchTerm)
    );
    
    if (found) {
      setSelectedContract(found);
    } else {
      alert('لم يتم العثور على العميل');
      setSelectedContract(null);
    }
  };

  const handlePay = (paymentId: string) => {
    if (!selectedContract) return;
    
    const paidVal = Number(paymentInputs[paymentId]);
    if (!paidVal || paidVal <= 0) {
      alert('الرجاء كتابة مبلغ الدفع');
      return;
    }

    if (window.confirm(`هل أنت متأكد من سداد مبلغ ${paidVal} ج.م لهذا القسط؟`)) {
      payInstallment(selectedContract.id, paymentId, paidVal);
      
      // Update local view
      setSelectedContract(prev => {
         if (!prev) return prev;
         return {
            ...prev,
            payments: prev.payments.map(p => p.id === paymentId ? { ...p, isPaid: true, paidDate: new Date().toISOString(), paidAmount: paidVal } : p)
         }
      })
      alert('تم سداد القسط بنجاح');
    }
  };

  // derived values based on the layout
  const totalAfterDownPayment = selectedContract ? selectedContract.totalAmount : 0; // The stored totalAmount is remaining + interest

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] bg-[#b0bec5] font-sans p-6" dir="rtl">
        <div className="w-full max-w-5xl bg-white p-8 shadow-md border border-gray-400">
            
            {/* Search & Date */}
            <div className="flex justify-between items-center mb-8 pb-8 border-b border-gray-300">
               {/* Right (Search) */}
               <div className="flex items-center w-1/2 gap-0">
                  <div className="bg-black text-white px-4 py-2 font-bold text-sm w-32 text-center ml-2">رقم العميل :</div>
                  <div className="flex border border-gray-400 flex-1 h-10">
                     <button 
                        onClick={handleSearch}
                        className="w-12 flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700"
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     </button>
                     <input 
                        className="flex-1 px-2 outline-none text-right placeholder-gray-400 text-sm font-bold" 
                        placeholder="كود، اسم، هاتف، رقم صفحة"
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                     />
                  </div>
               </div>

               {/* Left (Date) */}
               <div className="flex items-center gap-2 justify-end">
                  <div className="bg-black text-white px-6 py-2 font-bold text-sm text-center">التاريخ :</div>
                  <input className="w-40 h-10 border border-gray-400 bg-gray-50 px-2 text-center text-sm font-bold outline-none" value={new Date().toLocaleDateString('en-GB')} readOnly />
               </div>
            </div>

            {/* Form Details Grid */}
            <div className="flex flex-col gap-4 mb-8">
                
                {/* Row 1 */}
                <div className="flex gap-4">
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#e3f2fd] text-blue-900 font-bold px-2 py-1.5 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">اسم العميل :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white" value={selectedContract?.customerName || ''} readOnly />
                    </div>
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#e3f2fd] text-blue-900 font-bold px-2 py-1.5 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">الضامن :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white" value={selectedContract?.guarantorName || ''} readOnly />
                    </div>
                </div>

                {/* Row 2 */}
                <div className="flex gap-4">
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#e3f2fd] text-blue-900 font-bold px-2 py-1.5 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">رقم التليفون :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white" value={selectedContract?.customerPhone || ''} readOnly dir="ltr" />
                    </div>
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#e3f2fd] text-blue-900 font-bold px-2 py-1.5 border border-gray-300 border-l-0 text-center text-xs leading-tight flex items-center justify-center">رقم الهاتف<br/>(الضامن) :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white" value={selectedContract?.guarantorPhone || ''} readOnly dir="ltr" />
                    </div>
                </div>

                {/* Row 3 (Full width wrapper) */}
                <div className="flex">
                    <div className="w-32 bg-[#e3f2fd] text-blue-900 font-bold px-2 py-1.5 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">العنوان :</div>
                    <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white" value={selectedContract?.customerAddress || ''} readOnly />
                </div>

                {/* Row 4 */}
                <div className="flex gap-4 mt-2">
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#e8f5e9] text-green-900 font-bold px-2 py-2 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">اسم الجهاز :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white" value={selectedContract?.deviceName || ''} readOnly />
                    </div>
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#e8f5e9] text-green-900 font-bold px-2 py-2 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">سعر الجهاز :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white text-center" value={selectedContract?.purchasePrice ?? ''} readOnly />
                    </div>
                </div>

                {/* Row 5 */}
                <div className="flex gap-4">
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#fff9c4] text-yellow-900 font-bold px-2 py-2 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">المقدم :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white text-center" value={selectedContract?.downPayment ?? ''} readOnly />
                    </div>
                    <div className="flex flex-1 gap-4">
                        <div className="flex w-1/3">
                            <div className="w-20 bg-[#fff9c4] text-yellow-900 font-bold px-2 py-2 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">النسبة :</div>
                            <input className="flex-1 border border-gray-300 px-2 text-sm font-bold bg-white text-center" value={selectedContract?.interestRate ?? ''} readOnly />
                        </div>
                        <div className="flex flex-1">
                            <div className="w-36 bg-[#e3f2fd] text-blue-900 font-bold px-2 py-2 border border-blue-300 border-l-0 text-center text-sm flex items-center justify-center whitespace-nowrap">الاجمالي بعد المقدم :</div>
                            <input className="flex-1 border border-blue-300 px-2 text-lg font-bold bg-blue-50 text-center text-blue-700" value={selectedContract ? totalAfterDownPayment : ''} readOnly />
                        </div>
                    </div>
                </div>

                {/* Row 6 */}
                <div className="flex gap-4">
                    <div className="flex flex-1">
                        <div className="w-32 bg-[#fff9c4] text-yellow-900 font-bold px-2 py-3 border border-gray-300 border-l-0 text-center text-sm flex items-center justify-center">عدد الشهور :</div>
                        <input className="flex-1 border border-gray-300 px-2 text-lg font-bold bg-white text-center" value={selectedContract?.months ?? ''} readOnly />
                    </div>
                    <div className="flex flex-1">
                        <div className="w-36 bg-[#ffebee] text-red-800 font-bold px-2 py-3 border border-red-300 border-l-0 text-center text-sm flex items-center justify-center">الدفعات الشهرية :</div>
                        <input className="flex-1 border border-red-300 px-2 text-xl font-bold bg-[#fff5f5] text-center text-red-600" value={selectedContract?.monthlyPayment ?? ''} readOnly />
                    </div>
                </div>

            </div>

            {/* Table */}
            <div className="border border-indigo-900 min-h-[300px]">
                <table className="w-full text-center text-lg">
                    <thead>
                       <tr>
                          <th className="border-b border-l border-indigo-900 border-dashed py-3 font-bold text-blue-800 bg-[#eef5fa]">رقم القسط</th>
                          <th className="border-b border-l border-indigo-900 border-dashed py-3 font-bold bg-[#eef5fa]">تاريخ الدفعات</th>
                          <th className="border-b border-l border-indigo-900 border-dashed py-3 font-bold bg-[#eef5fa]">مبلغ الدفع</th>
                          <th className="border-b border-l border-indigo-900 border-dashed py-3 font-bold bg-[#eef5fa]">تاريخ الدفع</th>
                          <th className="border-b border-indigo-900 border-dashed py-3 font-bold bg-[#eef5fa]">إجراء</th>
                       </tr>
                    </thead>
                    <tbody>
                       {selectedContract?.payments.map((p, index) => {
                          const nextUnpaid = selectedContract.payments.find(pay => !pay.isPaid);
                          const isCurrent = nextUnpaid?.id === p.id;
                          return (
                           <tr key={p.id} className={p.isPaid ? "bg-green-50" : "hover:bg-gray-50"}>
                              <td className="border-b border-l border-indigo-900 border-dashed py-2 font-bold">{index + 1}</td>
                              <td className="border-b border-l border-indigo-900 border-dashed py-2" dir="ltr">{new Date(p.dueDate).toLocaleDateString('ar-EG')}</td>
                              <td className="border-b border-l border-indigo-900 border-dashed py-2 font-bold flex justify-center">
                                 {p.isPaid ? (
                                    <span className="text-green-800">{p.paidAmount !== undefined ? p.paidAmount : p.amount} ج.م</span>
                                 ) : (
                                    <input 
                                       type="number"
                                       disabled={!isCurrent}
                                       className={`w-28 h-8 border border-gray-400 shadow-inner text-center font-bold outline-none ${isCurrent ? 'bg-[#fffadc]' : 'bg-gray-100 opacity-50 cursor-not-allowed'}`}
                                       placeholder={p.amount.toString()}
                                       value={paymentInputs[p.id] || ''}
                                       onChange={(e) => setPaymentInputs(prev => ({...prev, [p.id]: e.target.value}))}
                                    />
                                 )}
                              </td>
                              <td className="border-b border-l border-indigo-900 border-dashed py-2 font-bold text-green-700">
                                 {p.isPaid ? new Date(p.paidDate!).toLocaleDateString('ar-EG') : '-'}
                              </td>
                              <td className="border-b border-indigo-900 border-dashed py-2">
                                 {!p.isPaid && isCurrent && (
                                     <button onClick={() => handlePay(p.id)} className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-1 text-sm shadow">
                                        سداد الان
                                     </button>
                                 )}
                              </td>
                           </tr>
                          )
                       })}
                    </tbody>
                </table>
            </div>

        </div>
    </div>
  );
}
