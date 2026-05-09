import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { InstallmentPayment } from '../types';

export function InstallmentsAdd() {
  const { addInstallmentContract, installmentContracts } = useAppStore();
  
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
  // Simple monthly interest: Total Interest = remaining * (rate / 100) * months
  const totalInterest = remaining * (rate / 100) * m;
  const totalAmount = remaining + totalInterest;
  const monthlyPayment = m > 0 ? Math.ceil(totalAmount / m) : 0;

  const handleSave = () => {
    if (!customerName || !customerPhone || !deviceName || m <= 0) {
      alert('برجاء استكمال البيانات الأساسية وعـدد الشهور بشكل صحيح');
      return;
    }

    const payments: InstallmentPayment[] = [];
    const date = new Date();
    
    for (let i = 1; i <= m; i++) {
        const dueDate = new Date(date);
        dueDate.setMonth(dueDate.getMonth() + i);
        payments.push({
            id: `pay-${i}-${Date.now()}`,
            amount: monthlyPayment,
            dueDate: dueDate.toISOString(),
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
        startDate: date.toISOString(),
        payments
    });

    alert(`تم تسجيل بيانات التقسيط بنجاح\nرقم العميل: ${installmentContracts.length + 1}`);
    
    resetForm();
  };

  const resetForm = () => {
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

        <div className="flex w-full max-w-5xl gap-6">
            
            {/* Side Action (Right side visually because of RTL) */}
            <div className="w-48 bg-[#e0e0e0] border border-gray-400 p-4 shadow-sm flex flex-col justify-start">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                        {/* Right Column (Customer Info) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">اسم العميل</label>
                                <input className="flex-1 h-8 border-y border-l border-gray-400 shadow-inner px-2 outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center leading-tight">رقم الصفحة<br/>(الدفتر)</label>
                                <input className="flex-1 h-10 border-y border-l border-gray-400 shadow-inner px-2 outline-none" value={pageNumber} onChange={e => setPageNumber(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">رقم الهاتف</label>
                                <input className="flex-1 h-8 border-y border-l border-gray-400 shadow-inner px-2 outline-none text-left" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} dir="ltr" />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">الضامن</label>
                                <input className="flex-1 h-8 border-y border-l border-gray-400 shadow-inner px-2 outline-none" value={guarantorName} onChange={e => setGuarantorName(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">رقم الهاتف</label>
                                <input className="flex-1 h-8 border-y border-l border-gray-400 shadow-inner px-2 outline-none text-left" value={guarantorPhone} onChange={e => setGuarantorPhone(e.target.value)} dir="ltr" />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">اسم الجهاز</label>
                                <input className="flex-1 h-8 border-y border-l border-gray-400 shadow-inner px-2 outline-none" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
                            </div>
                            <div className="flex">
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">العنوان</label>
                                <input className="flex-1 h-8 border-y border-l border-gray-400 shadow-inner px-2 outline-none" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                            </div>
                        </div>

                        {/* Left Column (Calculations) */}
                        <div className="flex flex-col gap-4">
                            <div className="flex">
                                <input className="flex-1 h-8 border-y border-r border-gray-400 shadow-inner px-2 outline-none text-center" type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value === '' ? '' : Number(e.target.value))} />
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">سعر الشراء</label>
                            </div>
                            <div className="flex">
                                <input className="flex-1 h-8 border-y border-r border-gray-400 shadow-inner px-2 outline-none text-center" type="number" value={downPayment} onChange={e => setDownPayment(e.target.value === '' ? '' : Number(e.target.value))} />
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">المقدم</label>
                            </div>
                            <div className="flex">
                                <input className="flex-1 h-8 border-y border-r border-gray-400 shadow-inner px-2 outline-none text-center" type="number" value={interestRate} onChange={e => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))} />
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">النسبة (%)</label>
                            </div>
                            <div className="flex">
                                <input className="flex-1 h-10 border-y border-r border-gray-400 shadow-inner px-2 outline-none text-center font-bold text-blue-900 bg-blue-50" value={totalAmount > 0 ? totalAmount.toFixed(2) : ''} readOnly />
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center leading-tight">الاجمالي بعد<br/>المقدم</label>
                            </div>
                            <div className="flex">
                                <input className="flex-1 h-8 border-y border-r border-gray-400 shadow-inner px-2 outline-none text-center font-bold" type="number" value={months} onChange={e => setMonths(e.target.value === '' ? '' : Number(e.target.value))} />
                                <label className="w-36 bg-[#90caf9] text-black font-bold px-2 py-1 border border-gray-400 text-center flex items-center justify-center">عدد الشهور</label>
                            </div>

                            <div className="flex flex-col mt-4 border border-gray-400">
                                <div className="bg-[#ffebee] text-red-700 font-bold text-center py-1 border-b border-gray-400">
                                    الدفعات الشهرية
                                </div>
                                <div className="bg-white text-red-600 font-bold text-xl text-center py-2 h-10 flex items-center justify-center">
                                    {monthlyPayment > 0 ? monthlyPayment.toFixed(2) : '0.00'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button 
                          onClick={handleSave}
                          className="bg-[#f5f5f5] border border-gray-400 hover:bg-gray-300 text-gray-800 font-bold text-xl py-2 px-12 shadow"
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
