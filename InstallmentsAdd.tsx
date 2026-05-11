import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { InstallmentPayment } from '../types';

export function InstallmentsAdd() {
  const { addInstallmentContract, installmentContracts } = useAppStore();
  
  const [contractDate, setContractDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [pageNumber, setPageNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Calculate next page number automatically when pageNumber is empty
  useEffect(() => {
    if (pageNumber === '') {
      let max = 0;
      installmentContracts.forEach(c => {
        if (c.pageNumber) {
          const num = parseInt(c.pageNumber, 10);
          if (!isNaN(num) && num > max) {
            max = num;
          }
        }
      });
      setPageNumber(max > 0 ? (max + 1).toString() : '1');
    }
  }, [pageNumber, installmentContracts]);
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [purchasePrice, setPurchasePrice] = useState<number | ''>('');
  const [downPayment, setDownPayment] = useState<number | ''>('');
  const [interestRate, setInterestRate] = useState<number | ''>('');
  const [months, setMonths] = useState<number | ''>('');

  const pPrice = typeof purchasePrice === 'number' ? purchasePrice : 0;
  const dPayment = typeof downPayment === 'number' ? downPayment : 0;
  const m = typeof months === 'number' ? months : 0;
  const rate = typeof interestRate === 'number' ? interestRate : 0;

  // Calculations
  const remaining = Math.max(0, pPrice - dPayment);
  // Flat percentage interest: Total Interest = remaining * (rate / 100)
  const totalInterest = remaining * (rate / 100);
  const totalAmount = remaining + totalInterest;
  const monthlyPayment = m > 0 ? (totalAmount / m) : 0;

  const handleSave = () => {
    if (!customerName || !customerPhone || !deviceName || m <= 0 || !contractDate) {
      alert('برجاء استكمال البيانات الأساسية وعـدد الشهور بشكل صحيح');
      return;
    }

    const payments: InstallmentPayment[] = [];
    const [yearStr, monthStr, dayStr] = contractDate.split('-');
    let currYear = parseInt(yearStr, 10);
    let currMonth = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    
    for (let i = 1; i <= m; i++) {
        let nMonth = currMonth + i;
        let nYear = currYear;
        while (nMonth > 12) {
            nMonth -= 12;
            nYear++;
        }
        
        // Handle last day of month if necessary
        const targetDate = new Date(Date.UTC(nYear, nMonth - 1, day));
        // JS Date auto-corrects overflow (e.g. Feb 31 -> Mar 3)
        // If we want to clamp to month end:
        if (targetDate.getUTCMonth() !== (nMonth - 1)) {
            targetDate.setUTCDate(0); // set to last day of previous month
        }

        payments.push({
            id: `pay-${i}-${Date.now()}`,
            amount: monthlyPayment,
            dueDate: targetDate.toISOString().split('T')[0] + 'T00:00:00.000Z',
            isPaid: false
        });
    }

    addInstallmentContract({
        customerName,
        pageNumber,
        customerPhone,
        customerAddress,
        guarantorName,
        guarantorPhone,
        deviceName,
        purchasePrice: pPrice,
        downPayment: dPayment,
        interestRate: rate,
        months: m,
        monthlyPayment,
        totalAmount, // This is total after downpayment in this context
        startDate: new Date(contractDate).toISOString(),
        payments
    });

    alert(`تم تسجيل بيانات التقسيط بنجاح\nرقم الصفحة: ${pageNumber}`);
    
    resetForm();
  };

  const resetForm = () => {
     setContractDate(new Date().toISOString().split('T')[0]);
     setCustomerName('');
     setPageNumber('');
     setCustomerPhone('');
     setGuarantorName('');
     setGuarantorPhone('');
     setDeviceName('');
     setCustomerAddress('');
     setPurchasePrice('');
     setDownPayment('');
     setInterestRate('');
     setMonths('');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-[#b0bec5] font-sans p-6" dir="rtl">
        
        <h2 className="text-center font-bold text-4xl text-blue-600 mb-8 tracking-wider" style={{ textShadow: '1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white' }}>
            بـــرنـامـــج الـتـقـسـيـــــط
        </h2>

        <div className="flex flex-col md:flex-row w-full max-w-6xl gap-6">
            
            {/* Side Action (Right side visually because of RTL) */}
            <div className="w-full md:w-48 bg-[#e0e0e0] border border-gray-400 p-4 shadow-sm flex flex-col justify-start shrink-0">
               <button 
                  onClick={resetForm}
                  className="w-full bg-[#cfd8db] border border-gray-400 hover:bg-gray-300 text-black font-bold py-2 px-2 shadow-sm text-lg"
               >
                   عميل جديد
               </button>
            </div>

            {/* Main Form container */}
            <div className="flex-1 bg-[#eeeeee] pt-0 pb-6 px-6 border border-gray-400 shadow-sm relative">
                
                {/* Header Tag */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="bg-[#40e0d0] text-black font-bold text-lg py-2 px-10 border border-gray-400 shadow-sm">
                        بيانات العميل
                    </div>
                </div>

                <div className="border border-gray-400 mt-12 p-6">
                    {/* Top Top bar for Date and Search conceptually, we just add Date and maybe page number if we want to extract it, but keeping inside the grid is fine. Let's add Date on top. */}
                    <div className="flex justify-between items-center mb-6 border-b border-gray-300 pb-4">
                        <div className="flex items-center gap-2">
                            <label className="bg-black text-white font-bold px-4 py-1 text-sm">التاريخ :</label>
                            <input className="border border-gray-400 h-8 px-2 text-center shadow-inner outline-none font-bold text-sm w-40" type="date" value={contractDate} onChange={e => setContractDate(e.target.value)} />
                        </div>
                        {/* Optional page number here if we want to mimic screenshot completely, but user just said "contract date at the top". Let's leave pageNumber in the main grid for now as it's part of the pairs, or we can move it up. The grid is fine. */}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                        {/* Right Column (Customer Info) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">اسم العميل :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">رقم الصفحة :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold bg-gray-100" value={pageNumber} readOnly />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">رقم التليفون :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-left" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">العنوان :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">الضامن :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right" value={guarantorName} onChange={e => setGuarantorName(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center text-xs leading-tight">رقم الهاتف<br/>(الضامن) :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-left" value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)} dir="ltr" />
                            </div>
                        </div>

                        {/* Left Column (Calculations & Device Info) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">اسم الجهاز :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-right" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">سعر الجهاز :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold" type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">المقدم :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold" type="number" value={downPayment} onChange={e => setDownPayment(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">النسبة (%) :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold" type="number" value={interestRate} onChange={e => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center text-xs leading-tight">الاجمالي بعد<br/>المقدم :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold text-blue-700 bg-gray-50" value={totalAmount > 0 ? totalAmount.toFixed(2) : ''} readOnly />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#eef5fa] text-blue-900 font-bold px-2 py-1 border border-indigo-200 text-center flex items-center justify-center">عدد الشهور :</label>
                                <input className="flex-1 h-8 border border-gray-300 shadow-inner px-2 outline-none text-center font-bold text-xl" type="number" value={months} onChange={e => setMonths(e.target.value === '' ? '' : Number(e.target.value))} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center mt-12 mb-6">
                        <div className="flex w-full max-w-lg">
                            <label className="w-48 bg-[#eef5fa] text-blue-900 font-bold px-2 py-2 border border-indigo-200 text-center flex items-center justify-center text-lg">الدفعات الشهرية :</label>
                            <div className="flex-1 border border-gray-300 bg-white text-red-600 font-bold text-4xl text-center flex items-center justify-center shadow-inner py-3 tracking-wider">
                                {monthlyPayment > 0 ? monthlyPayment.toFixed(2) : ''}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center border-t border-gray-300 pt-6">
                        <button 
                          onClick={handleSave}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-3 px-16 shadow rounded transition-colors"
                        >
                            تسجيل العميل
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
