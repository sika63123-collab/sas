import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { InstallmentContract } from '../types';

export function InstallmentsPayCustomer() {
  const { installmentContracts, payInstallment, selectedContractIdForPayment, setSelectedContractIdForPayment } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<InstallmentContract | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'cash' | 'visa' | 'instapay' | 'vodafone_cash'>('cash');
  const [walletLast4, setWalletLast4] = useState('');
  const [receiverWalletLast4, setReceiverWalletLast4] = useState('');
  const [searchResults, setSearchResults] = useState<InstallmentContract[]>([]);

  // Bulk payment state
  const [showBulkPay, setShowBulkPay] = useState(false);
  const [bulkAmount, setBulkAmount] = useState<string>('');
  const [bulkMethod, setBulkMethod] = useState<'cash' | 'visa' | 'instapay' | 'vodafone_cash'>('cash');
  const [bulkWalletLast4, setBulkWalletLast4] = useState('');
  const [bulkReceiverWalletLast4, setBulkReceiverWalletLast4] = useState('');

  // Sync selectedContract with store whenever installmentContracts change (e.g. after payment)
  useEffect(() => {
    if (selectedContract) {
      const updated = installmentContracts.find(c => c.id === selectedContract.id);
      if (updated) {
        setSelectedContract(updated);
        // Auto-set next unpaid installment amount
        const nextUnpaid = updated.payments.find(p => !p.isPaid);
        if (nextUnpaid && (payAmount === '' || Number(payAmount) === 0)) {
          setPayAmount(String(nextUnpaid.amount));
        }
      }
    }
  }, [installmentContracts]);

  // Handle pre-selected contract from Archive double click
  useEffect(() => {
    if (selectedContractIdForPayment) {
      const match = installmentContracts.find(c => c.id === selectedContractIdForPayment);
      if (match) {
        setSelectedContract(match);
        const nextPayment = match.payments.find(p => !p.isPaid);
        setPayAmount(nextPayment ? String(nextPayment.amount) : '');
        setSearchTerm(match.pageNumber || match.customerName);
      }
      setSelectedContractIdForPayment(null);
    }
  }, [selectedContractIdForPayment, installmentContracts, setSelectedContractIdForPayment]);

  const handleSearch = () => {
    const q = searchTerm.trim();
    if (!q) return;

    const matches = installmentContracts.filter(c =>
      String(c.customerNumber) === q ||
      String(c.pageNumber) === q ||
      c.customerName.includes(q) ||
      c.customerPhone.includes(q)
    );

    if (matches.length > 1) {
      setSearchResults(matches);
      setSelectedContract(null);
      setPayAmount('');
    } else if (matches.length === 1) {
      setSearchResults([]);
      setSelectedContract(matches[0]);
      const nextPayment = matches[0].payments.find(p => !p.isPaid);
      setPayAmount(nextPayment ? String(nextPayment.amount) : '');
    } else {
      alert('لم يتم العثور على عميل بهذه البيانات');
      setSearchResults([]);
      setSelectedContract(null);
      setPayAmount('');
    }
  };

  const handleReset = () => {
    setSearchTerm('');
    setSelectedContract(null);
    setPayAmount('');
    setSelectedMethod('cash');
    setWalletLast4('');
    setSearchResults([]);
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

  const handlePay = () => {
    if (!selectedContract || !contractCalcs?.nextPayment) return;
    if (contractCalcs.remaining <= 0) {
      alert('لا يمكن الدفع لأن المبلغ المتبقي صفر (العقد مسدد بالكامل)');
      return;
    }
    const amount = payAmount !== '' ? Number(payAmount) : 0;
    if (amount <= 0) {
      alert('يرجى إدخال مبلغ صحيح');
      return;
    }

    // Prevent paying more than the remaining balance of the contract to prevent cashier excess
    if (amount > contractCalcs.remaining) {
      alert(`عذراً، المبلغ المطلوب لسداد العقد بالكامل هو ${contractCalcs.remaining.toFixed(2)} ج.م فقط.\nلقد أدخلت: ${amount.toFixed(2)} ج.م.\nلا يمكنك دفع مبلغ أكبر من المتبقي لتجنب حدوث زيادة بالخزنة.`);
      return;
    }

    if (selectedMethod !== 'cash') {
      if (!walletLast4 || walletLast4.trim().length < 4) {
        alert('يرجى إدخال آخر 4 أرقام لوسيلة الدفع (المرسلة) (على الأقل 4 أرقام)');
        return;
      }
      if (!receiverWalletLast4 || receiverWalletLast4.trim().length < 4) {
        alert('يرجى إدخال آخر 4 أرقام للمحفظة المستقبلة (على الأقل 4 أرقام)');
        return;
      }
    }

    const methodName = selectedMethod === 'cash' ? 'نقدي' : selectedMethod === 'visa' ? 'فيزا' : selectedMethod === 'instapay' ? 'إنستا باي' : 'فودافون كاش';
    const confirmMsg = `تأكيد دفع مبلغ ${amount.toFixed(2)} ج.م لقسط رقم ${contractCalcs.paidCount + 1} (${methodName})${selectedMethod !== 'cash' ? ` - من: *${walletLast4} إلى: *${receiverWalletLast4}` : ''}؟`;

    if (window.confirm(confirmMsg)) {
      payInstallment(selectedContract.id, contractCalcs.nextPayment.id, amount, selectedMethod, selectedMethod !== 'cash' ? walletLast4 : undefined, selectedMethod !== 'cash' ? receiverWalletLast4 : undefined);
      alert('تم تسجيل الدفع بنجاح');
      
      // Reset inputs — the useEffect above will sync selectedContract with updated store data
      setSelectedMethod('cash');
      setWalletLast4('');
      setReceiverWalletLast4('');
      setPayAmount('');
    }
  };

  // Bulk payment handler
  const handleBulkPay = () => {
    if (!selectedContract || !contractCalcs) return;
    if (contractCalcs.remaining <= 0) {
      alert('لا يمكن الدفع لأن المبلغ المتبقي صفر (العقد مسدد بالكامل)');
      return;
    }
    const totalAmount = bulkAmount !== '' ? Number(bulkAmount) : 0;
    if (totalAmount <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    // Prevent paying more than the remaining balance of the contract to prevent cashier excess
    if (totalAmount > contractCalcs.remaining) {
      alert(`عذراً، المبلغ المطلوب لسداد العقد بالكامل هو ${contractCalcs.remaining.toFixed(2)} ج.م فقط.\nلقد أدخلت: ${totalAmount.toFixed(2)} ج.م.\nلا يمكنك دفع مبلغ أكبر من المتبقي.`);
      return;
    }

    if (bulkMethod !== 'cash') {
      if (!bulkWalletLast4 || bulkWalletLast4.trim().length < 4) {
        alert('يرجى إدخال آخر 4 أرقام لوسيلة الدفع (المرسلة)');
        return;
      }
      if (!bulkReceiverWalletLast4 || bulkReceiverWalletLast4.trim().length < 4) {
        alert('يرجى إدخال آخر 4 أرقام للمحفظة المستقبلة');
        return;
      }
    }

    const unpaidPayments = selectedContract.payments.filter(p => !p.isPaid);
    if (unpaidPayments.length === 0) {
      alert('جميع الأقساط مسددة بالفعل');
      return;
    }

    // Calculate how many installments this covers
    let remaining = totalAmount;
    const paymentsPlan: { id: string; amount: number; index: number }[] = [];
    for (const p of unpaidPayments) {
      if (remaining <= 0) break;
      const payAmt = Math.min(remaining, p.amount);
      const idx = selectedContract.payments.findIndex(pp => pp.id === p.id) + 1;
      paymentsPlan.push({ id: p.id, amount: payAmt, index: idx });
      remaining -= payAmt;
    }

    const methodName = bulkMethod === 'cash' ? 'نقدي' : bulkMethod === 'visa' ? 'فيزا' : bulkMethod === 'instapay' ? 'إنستا باي' : 'فودافون كاش';
    const installmentsList = paymentsPlan.map(p => `  • قسط #${p.index}: ${p.amount.toFixed(2)} ج.م`).join('\n');
    const confirmMsg = `دفعة إجمالية بمبلغ ${totalAmount.toFixed(2)} ج.م (${methodName})\n\nسيتم تسديد ${paymentsPlan.length} قسط:\n${installmentsList}${remaining > 0 ? `\n\n⚠️ سيتبقى ${remaining.toFixed(2)} ج.م زيادة عن الأقساط المتاحة` : ''}\n\nتأكيد؟`;

    if (window.confirm(confirmMsg)) {
      for (const p of paymentsPlan) {
        payInstallment(
          selectedContract.id,
          p.id,
          p.amount,
          bulkMethod,
          bulkMethod !== 'cash' ? bulkWalletLast4 : undefined,
          bulkMethod !== 'cash' ? bulkReceiverWalletLast4 : undefined
        );
      }
      alert(`تم تسديد ${paymentsPlan.length} قسط بنجاح بإجمالي ${totalAmount.toFixed(2)} ج.م`);
      setShowBulkPay(false);
      setBulkAmount('');
      setBulkMethod('cash');
      setBulkWalletLast4('');
      setBulkReceiverWalletLast4('');
    }
  };

  // Preview for bulk payment
  const bulkPayPreview = useMemo(() => {
    if (!selectedContract || !showBulkPay || bulkAmount === '' || bulkAmount <= 0) return null;
    const unpaid = selectedContract.payments.filter(p => !p.isPaid);
    let rem = bulkAmount;
    let count = 0;
    for (const p of unpaid) {
      if (rem <= 0) break;
      rem -= p.amount;
      count++;
    }
    return { count, excess: rem > 0 ? rem : 0 };
  }, [selectedContract, showBulkPay, bulkAmount]);

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

                    {/* Multiple Search Results Picker */}
                    {searchResults.length > 0 && (
                     <div className="bg-[#cbd5e1] border-2 border-[#94a3b8] p-4 rounded-sm mb-6">
                       <h3 className="font-bold text-[#1e293b] mb-4 text-center text-lg">العميل لديه أكثر من عقد، يرجى اختيار العقد المطلوب لسداده:</h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {searchResults.map((contract) => {
                           const globalIndex = installmentContracts.findIndex(c => c.id === contract.id) + 1;
                           const paid = contract.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0);
                           const remaining = Math.max(0, contract.totalAmount - paid);
                           return (
                             <button
                               key={contract.id}
                               onClick={() => {
                                 setSelectedContract(contract);
                                 const nextPayment = contract.payments.find(p => !p.isPaid);
                                 setPayAmount(nextPayment ? String(nextPayment.amount) : '');
                                 setSearchResults([]);
                               }}
                               className="border border-[#475569] hover:border-black bg-white hover:bg-blue-50 p-4 rounded-sm text-right transition-all flex flex-col gap-1.5 shadow-sm"
                             >
                               <div className="font-black text-blue-900 text-lg">عقد #{globalIndex} — {contract.deviceName}</div>
                               <div className="text-sm font-bold text-gray-700">اسم العميل: <span className="text-gray-900">{contract.customerName}</span></div>
                               <div className="text-sm font-bold text-gray-700">رقم الصفحة: <span className="text-gray-900">{contract.pageNumber || '-'}</span></div>
                               <div className="text-sm font-extrabold text-red-600 mt-1">المتبقي: {remaining.toLocaleString()} ج.م</div>
                             </button>
                           );
                         })}
                       </div>
                     </div>
                    )}

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

                        {contractCalcs.remaining <= 0 && (
                          <div className="bg-green-100 border-2 border-green-500 text-green-800 font-extrabold text-xl py-4 px-6 text-center my-6 rounded shadow-md">
                            🎉 تم سداد هذا العقد بالكامل! لا توجد أقساط متبقية.
                          </div>
                        )}

                        {/* Bulk Payment Section */}
                        {contractCalcs.remaining > 0 && (
                          <div className="flex justify-center gap-4 mb-6">
                            <button
                              onClick={() => { setShowBulkPay(!showBulkPay); setBulkAmount(''); }}
                              className={`font-bold py-2 px-6 shadow text-sm transition-colors border ${
                                showBulkPay 
                                  ? 'bg-gray-300 text-gray-700 border-gray-400' 
                                  : 'bg-[#1565c0] hover:bg-[#0d47a1] text-white border-[#0d47a1]'
                              }`}
                            >
                              💰 دفعة إجمالية (تسديد أكثر من قسط)
                            </button>
                          </div>
                        )}

                        {contractCalcs.remaining > 0 && showBulkPay && (
                          <div className="bg-[#e3f2fd] border-2 border-[#90caf9] p-5 mb-6 space-y-4">
                            <div className="flex items-center gap-2 border-b border-blue-200 pb-3">
                              <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                              <h3 className="font-bold text-blue-900 text-base">تسديد دفعة إجمالية</h3>
                              <span className="text-xs text-blue-600 font-medium mr-auto">أدخل المبلغ الإجمالي وسيتم توزيعه على الأقساط المتبقية بالترتيب</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-blue-900">المبلغ الإجمالي (ج.م):</label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="h-10 border-2 border-blue-400 text-center font-bold text-lg outline-none shadow-inner bg-white"
                                  placeholder="مثال: 3000"
                                  value={bulkAmount}
                                  onChange={e => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    const parts = val.split('.');
                                    const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                    setBulkAmount(cleanVal);
                                  }}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-blue-900">طريقة الدفع:</label>
                                <select
                                  className="h-10 border border-gray-300 px-2 text-sm font-bold bg-white"
                                  value={bulkMethod}
                                  onChange={e => setBulkMethod(e.target.value as any)}
                                >
                                  <option value="cash">كاش</option>
                                  <option value="visa">فيزا</option>
                                  <option value="instapay">إنستا باي</option>
                                  <option value="vodafone_cash">فودافون كاش</option>
                                </select>
                              </div>
                            </div>

                            {bulkMethod !== 'cash' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-bold text-blue-900">المرسل: آخر 4 أرقام:</label>
                                  <input
                                    type="text"
                                    className="h-10 border border-gray-300 text-center text-sm font-bold bg-white"
                                    placeholder="آخر 4 أرقام"
                                    value={bulkWalletLast4}
                                    onChange={e => setBulkWalletLast4(e.target.value.replace(/\D/g, ''))}
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-sm font-bold text-blue-900">المستلم: آخر 4 أرقام:</label>
                                  <input
                                    type="text"
                                    className="h-10 border border-gray-300 text-center text-sm font-bold bg-white"
                                    placeholder="آخر 4 أرقام"
                                    value={bulkReceiverWalletLast4}
                                    onChange={e => setBulkReceiverWalletLast4(e.target.value.replace(/\D/g, ''))}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Preview */}
                            {bulkPayPreview && (
                              <div className={`p-3 border text-sm font-bold flex items-center gap-2 ${
                                bulkPayPreview.excess > 0 
                                  ? 'bg-amber-50 border-amber-300 text-amber-800' 
                                  : 'bg-green-50 border-green-300 text-green-800'
                              }`}>
                                <span>📋</span>
                                <span>سيتم تسديد <strong>{bulkPayPreview.count}</strong> قسط من أصل {contractCalcs.totalCount - contractCalcs.paidCount} متبقي</span>
                                {bulkPayPreview.excess > 0 && (
                                  <span className="mr-2 text-amber-600">| ⚠️ زيادة {bulkPayPreview.excess.toFixed(2)} ج.م لن يتم احتسابها</span>
                                )}
                              </div>
                            )}

                            {bulkAmount !== '' && Number(bulkAmount) > contractCalcs.remaining && (
                              <div className="p-3 border text-sm font-bold bg-red-50 border-red-300 text-red-800 flex items-center gap-2 rounded shadow-sm">
                                <span>⚠️</span>
                                <span>عذراً، المبلغ المدخل أكبر من المتبقي للعقد بالكامل ({contractCalcs.remaining.toFixed(2)} ج.م)</span>
                              </div>
                            )}

                            <button
                              onClick={handleBulkPay}
                              disabled={bulkAmount === '' || Number(bulkAmount) <= 0 || Number(bulkAmount) > contractCalcs.remaining}
                              className="w-full bg-[#2e7d32] hover:bg-[#1b5e20] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-2.5 px-6 shadow text-base transition-colors"
                            >
                              ✅ تأكيد الدفعة الإجمالية
                            </button>
                          </div>
                        )}

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
                                        const isNextDue = !p.isPaid && contractCalcs.nextPayment?.id === p.id && contractCalcs.remaining > 0;

                                        return (
                                            <tr key={p.id} className={`border-b border-gray-200 ${isLate ? 'bg-[#ffebee]' : p.isPaid ? 'bg-green-50' : 'even:bg-gray-50'}`}>
                                                <td className="py-2.5 px-3 font-bold border-l border-gray-200">{idx + 1}</td>
                                                <td className="py-2.5 px-3 font-bold border-l border-gray-200" dir="ltr">{dueDate.toLocaleDateString('en-GB')}</td>
                                                <td className="py-2.5 px-3 border-l border-gray-200">
                                                    {isNextDue ? (
                                                        <input 
                                                          type="text" 
                                                          inputMode="decimal"
                                                          className="w-28 h-7 border-2 border-blue-400 text-center font-bold outline-none shadow-inner bg-yellow-50"
                                                          value={payAmount}
                                                          onChange={e => {
                                                            const val = e.target.value.replace(/[^0-9.]/g, '');
                                                            const parts = val.split('.');
                                                            const cleanVal = parts[0] + (parts.length > 1 ? '.' + parts.slice(1).join('') : '');
                                                            setPayAmount(cleanVal);
                                                          }}
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
                                                        <div className="flex flex-col items-center">
                                                          <span className="text-green-600 font-bold">✓ تم الدفع</span>
                                                          <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.5 rounded mt-0.5">
                                                            {p.paymentMethod === 'cash' ? 'كاش' : p.paymentMethod === 'visa' ? 'فيزا' : p.paymentMethod === 'instapay' ? 'إنستاباي' : p.paymentMethod === 'vodafone_cash' ? 'فودافون كاش' : 'كاش'}
                                                            {p.walletLast4 ? ` (*${p.walletLast4})` : ''}
                                                            {p.receiverWalletLast4 ? ` ➔ (*${p.receiverWalletLast4})` : ''}
                                                          </span>
                                                        </div>
                                                    ) : isNextDue ? (
                                                        <div className="flex flex-col gap-1.5 p-1.5 items-center justify-center bg-gray-50 rounded border border-gray-300">
                                                          <div className="flex flex-col gap-1 w-full">
                                                            <select 
                                                              className="h-8 border border-gray-300 rounded px-1 text-xs font-bold bg-white w-full"
                                                              value={selectedMethod}
                                                              onChange={e => setSelectedMethod(e.target.value as any)}
                                                            >
                                                              <option value="cash">كاش</option>
                                                              <option value="visa">فيزا</option>
                                                              <option value="instapay">إنستا باي</option>
                                                              <option value="vodafone_cash">فودافون كاش</option>
                                                            </select>
                                                            {selectedMethod !== 'cash' && (
                                                              <div className="flex flex-col gap-1 w-full mt-1">
                                                                <input 
                                                                  type="text" 
                                                                  placeholder="المرسل: آخر 4 أرقام"
                                                                  className="w-full h-8 border border-gray-300 rounded text-center text-xs font-bold bg-white"
                                                                  value={walletLast4}
                                                                  onChange={e => setWalletLast4(e.target.value.replace(/\D/g, ''))}
                                                                />
                                                                <input 
                                                                  type="text" 
                                                                  placeholder="المستلم: آخر 4 أرقام"
                                                                  className="w-full h-8 border border-gray-300 rounded text-center text-xs font-bold bg-white"
                                                                  value={receiverWalletLast4}
                                                                  onChange={e => setReceiverWalletLast4(e.target.value.replace(/\D/g, ''))}
                                                                />
                                                              </div>
                                                            )}
                                                          </div>
                                                          {payAmount !== '' && Number(payAmount) > contractCalcs.remaining && (
                                                            <div className="text-[11px] text-red-600 font-bold text-center leading-tight bg-red-50 p-1.5 border border-red-200 mt-1 rounded w-full">
                                                              ⚠️ خطأ: أكبر من المتبقي للعقد ({contractCalcs.remaining.toFixed(2)} ج.م)
                                                            </div>
                                                          )}
                                                          <button 
                                                            onClick={handlePay}
                                                            disabled={payAmount !== '' && Number(payAmount) > contractCalcs.remaining}
                                                            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-xs py-1.5 px-4 shadow transition-colors w-full rounded mt-1.5"
                                                          >
                                                            تأكيد الدفع
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
