import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { InstallmentContract } from '../types';

export function InstallmentsPayCustomer() {
  const { installmentContracts, payInstallment } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<InstallmentContract | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');

  const handleSearch = () => {
    const q = searchTerm.trim();
    if (!q) return;

    const match = installmentContracts.find(c =>
      String(c.customerNumber) === q ||
      String(c.pageNumber) === q ||
      c.customerName.includes(q) ||
      c.customerPhone.includes(q)
    );

    if (match) {
      setSelectedContract(match);
      // Find next unpaid installment amount
      const nextPayment = match.payments.find(p => !p.isPaid);
      setPayAmount(nextPayment ? nextPayment.amount : '');
    } else {
      alert('لم يتم العثور على عميل بهذه البيانات');
      setSelectedContract(null);
      setPayAmount('');
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedContract(null);
    setPayAmount('');
  };

  // Calculations for selected contract
  const contractCalcs = useMemo(() => {
    if (!selectedContract) return null;
    const totalPaidInstallments = selectedContract.payments.reduce(
      (sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0
    );
    const remaining = Math.max(0, selectedContract.totalAmount - totalPaidInstallments);
    const paidCount = selectedContract.payments.filter(p => p.isPaid).length;
    const totalCount = selectedContract.payments.length;
    const nextPayment = selectedContract.payments.find(p => !p.isPaid);
    const globalIndex = installmentContracts.findIndex(c => c.id === selectedContract.id) + 1;
    return { totalPaidInstallments, remaining, paidCount, totalCount, nextPayment, globalIndex };
  }, [selectedContract, installmentContracts]);

  const handlePay = (method: 'cash' | 'visa') => {
    if (!selectedContract || !contractCalcs?.nextPayment) return;
    const amount = typeof payAmount === 'number' ? payAmount : 0;
    if (amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    if (window.confirm(`تأكيد دفع مبلغ ${amount.toFixed(2)} ج.م لقسط رقم ${contractCalcs.paidCount + 1} (${method === 'cash' ? 'نقدي' : 'فيزا'})؟`)) {
      payInstallment(selectedContract.id, contractCalcs.nextPayment.id, amount, method);
      alert('تم تسجيل الدفع بنجاح');
      // Refresh selected contract from store
      const updated = installmentContracts.find(c => c.id === selectedContract.id);
      if (updated) {
        const nextUnpaid = updated.payments.find(p => !p.isPaid && p.id !== contractCalcs.nextPayment!.id);
        setPayAmount(nextUnpaid ? nextUnpaid.amount : '');
      }
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#b0bec5] font-sans p-6" dir="rtl">
        
        <h2 className="text-center font-bold text-4xl text-blue-600 mb-8 tracking-wider" style={{ textShadow: '1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white' }}>
            بـــرنـامـــج الـتـقـسـيـــــط
        </h2>

        <div className="flex flex-col md:flex-row w-full max-w-6xl gap-6">
            
            {/* Side Action (Right side visually because of RTL) */}
            <div className="w-full md:w-48 bg-[#e0e0e0] border border-gray-400 p-4 shadow-sm flex flex-col justify-start shrink-0 gap-2">
               <button 
                  onClick={handleReset}
                  className="w-full bg-[#cfd8db] border border-gray-400 hover:bg-gray-300 text-black font-bold py-2 px-2 shadow-sm text-lg"
               >
                  بحث جديد
               </button>
            </div>

            {/* Main Form container */}
            <div className="flex-1 bg-[#eeeeee] pt-0 pb-6 px-6 border border-gray-400 shadow-sm relative">
                
                {/* Header Tag */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-[#40e0d0] text-black font-bold text-lg py-2 px-10 border border-gray-400 shadow-sm">
                        تسديد قسط عميل
                    </div>
                </div>

                <div className="border border-gray-400 mt-12 p-6">
                    {/* Search Bar */}
                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                        <div className="flex items-center gap-2">
                            <label className="bg-black text-white font-bold px-4 py-1 text-sm">التاريخ :</label>
                            <input className="border border-gray-400 h-8 px-2 text-center shadow-inner outline-none font-bold text-sm w-40" type="date" value={new Date().toISOString().split('T')[0]} readOnly />
                        </div>
                    </div>

                    {/* Search Row */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="flex flex-1">
                            <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">رقم العميل :</label>
                            <input 
                              className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right font-bold" 
                              placeholder="رقم العميل / الاسم / التليفون / رقم الصفحة"
                              value={searchTerm} 
                              onChange={e => setSearchTerm(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button 
                          onClick={handleSearch}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-6 shadow text-lg transition-colors"
                        >
                            🔍
                        </button>
                    </div>

                    {selectedContract && contractCalcs && (
                      <>
                        {/* Customer Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-6">
                            {/* Right Column (Customer Info) */}
                            <div className="flex flex-col gap-4">
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">اسم العميل :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right bg-gray-50 font-bold" value={selectedContract.customerName} readOnly />
                                </div>
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">رقم التليفون :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-left bg-gray-50 font-bold" value={selectedContract.customerPhone} readOnly dir="ltr" />
                                </div>
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">الضامن :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right bg-gray-50 font-bold" value={selectedContract.guarantorName || ''} readOnly />
                                </div>
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center text-xs leading-tight">رقم الهاتف<br/>(الضامن) :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-left bg-gray-50 font-bold" value={selectedContract.guarantorPhone || ''} readOnly dir="ltr" />
                                </div>
                            </div>

                            {/* Left Column (Device & Financial Info) */}
                            <div className="flex flex-col gap-4">
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">اسم الجهاز :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right bg-gray-50 font-bold" value={selectedContract.deviceName} readOnly />
                                </div>
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">سعر الجهاز :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold bg-gray-50" value={selectedContract.purchasePrice} readOnly />
                                </div>
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">المقدم :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold bg-gray-50" value={selectedContract.downPayment} readOnly />
                                </div>
                                <div className="flex">
                                    <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">النسبة :</label>
                                    <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold bg-gray-50" value={selectedContract.interestRate + '%'} readOnly />
                                </div>
                            </div>
                        </div>

                        {/* Summary Row */}
                        <div className="flex justify-center gap-6 mb-6">
                            <div className="flex">
                                <label className="w-48 bg-[#eef5fa] text-blue-900 font-bold px-2 py-2 border border-indigo-200 text-center flex items-center justify-center text-lg">الدفعات الشهرية :</label>
                                <div className="flex-1 min-w-[200px] border border-gray-300 bg-white text-red-600 font-bold text-2xl text-center flex items-center justify-center shadow-inner py-2 tracking-wider">
                                    {selectedContract.monthlyPayment.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center gap-6 mb-6">
                            <div className="flex">
                                <label className="w-48 bg-[#eef5fa] text-blue-900 font-bold px-2 py-2 border border-indigo-200 text-center flex items-center justify-center">عدد الشهور :</label>
                                <div className="flex-1 min-w-[200px] border border-gray-300 bg-white font-bold text-xl text-center flex items-center justify-center shadow-inner py-2">
                                    {selectedContract.months}
                                </div>
                            </div>
                        </div>

                        {/* Payments Table */}
                        <div className="border border-gray-300 overflow-auto max-h-[400px]">
                            <table className="w-full text-center text-sm">
                                <thead className="bg-[#dde4e9] border-b border-gray-400 sticky top-0">
                                    <tr>
                                        <th className="py-2.5 px-3 font-bold border-l border-gray-300">رقم القسط</th>
                                        <th className="py-2.5 px-3 font-bold border-l border-gray-300">تاريخ الدفعات (المتوقع)</th>
                                        <th className="py-2.5 px-3 font-bold border-l border-gray-300">مبلغ الدفع</th>
                                        <th className="py-2.5 px-3 font-bold border-l border-gray-300">تاريخ الدفع (الفعلي)</th>
                                        <th className="py-2.5 px-3 font-bold">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {selectedContract.payments.map((p, idx) => {
                                        const dueDate = new Date(p.dueDate);
                                        const isLate = !p.isPaid && dueDate < today;
                                        const isNextDue = !p.isPaid && contractCalcs.nextPayment?.id === p.id;

                                        return (
                                            <tr key={p.id} className={`border-b border-gray-200 ${isLate ? 'bg-[#ffebee]' : p.isPaid ? 'bg-green-50' : 'even:bg-gray-50'}`}>
                                                <td className="py-2.5 px-3 font-bold border-l border-gray-200">{idx + 1}</td>
                                                <td className="py-2.5 px-3 font-bold border-l border-gray-200" dir="ltr">{dueDate.toLocaleDateString('en-GB')}</td>
                                                <td className="py-2.5 px-3 border-l border-gray-200">
                                                    {isNextDue ? (
                                                        <input 
                                                          type="number" 
                                                          className="w-28 h-7 border-2 border-blue-400 text-center font-bold outline-none shadow-inner bg-yellow-50"
                                                          value={payAmount}
                                                          onChange={e => setPayAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                                        />
                                                    ) : (
                                                        <span className="font-bold">{p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : p.amount}</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 font-bold border-l border-gray-200 text-gray-600" dir="ltr">
                                                    {p.isPaid ? new Date(p.paidDate!).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    {p.isPaid ? (
                                                        <span className="text-green-600 font-bold">✓ تم الدفع</span>
                                                    ) : isNextDue ? (
                                                        <div className="flex flex-col gap-1">
                                                          <button 
                                                            onClick={() => handlePay('cash')}
                                                            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-1 px-3 shadow transition-colors"
                                                          >
                                                            نقدي
                                                          </button>
                                                          <button 
                                                            onClick={() => handlePay('visa')}
                                                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1 px-3 shadow transition-colors"
                                                          >
                                                            فيزا
                                                          </button>
                                                        </div>
                                                    ) : isLate ? (
                                                        <span className="text-red-600 font-bold">متأخر</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Remaining Amount */}
                        <div className="flex justify-center mt-6">
                            <div className="flex w-full max-w-lg">
                                <div className="flex-1 border border-gray-300 bg-white text-red-600 font-bold text-2xl text-center flex items-center justify-center shadow-inner py-3 tracking-wider">
                                    {contractCalcs.remaining.toFixed(2)}
                                </div>
                                <label className="w-64 bg-[#eef5fa] text-red-600 font-bold px-2 py-2 border border-indigo-200 text-center flex items-center justify-center text-lg">المبلغ المتبقي للعميل:</label>
                            </div>
                        </div>
                      </>
                    )}

                    {!selectedContract && (
                        <div className="flex justify-center items-center py-20 text-gray-400 font-bold text-xl">
                            ابحث عن عميل لعرض بيانات التقسيط
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}
