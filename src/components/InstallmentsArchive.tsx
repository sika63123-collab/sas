import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { InstallmentContract } from '../types';

export function InstallmentsArchive() {
  const { installmentContracts } = useAppStore();

  const [searchName, setSearchName] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<InstallmentContract | null>(null);

  // Get unique customer names grouped with their contracts
  const customerGroups = useMemo(() => {
    const filtered = installmentContracts.filter(c =>
      searchName.trim() === '' || c.customerName.includes(searchName)
    );

    // Group by customerName
    const groups: Record<string, InstallmentContract[]> = {};
    filtered.forEach(c => {
      const key = c.customerName.trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0], 'ar'));
  }, [installmentContracts, searchName]);

  const getTotals = (contracts: InstallmentContract[]) => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalRemaining = 0;

    contracts.forEach(c => {
      totalAmount += c.totalAmount + c.downPayment;
      c.payments.forEach(p => {
        if (p.isPaid) totalPaid += (p.paidAmount ?? p.amount);
      });
      totalPaid += c.downPayment; // count down payment as paid
    });
    totalRemaining = totalAmount - totalPaid;
    return { totalAmount, totalPaid, totalRemaining };
  };

  const getContractStatus = (c: InstallmentContract) => {
    const unpaid = c.payments.filter(p => !p.isPaid);
    if (unpaid.length === 0) return { label: 'منتهي', color: 'text-green-700 bg-green-100' };
    const overdue = unpaid.filter(p => new Date(p.dueDate) < new Date());
    if (overdue.length > 0) return { label: `متأخر ${overdue.length} قسط`, color: 'text-red-700 bg-red-100' };
    return { label: 'نشط', color: 'text-blue-700 bg-blue-100' };
  };

  // Calculate overall total remaining for all contracts
  const grandTotalRemaining = useMemo(() => {
    let total = 0;
    installmentContracts.forEach(c => {
      const totalContractAmount = c.totalAmount + c.downPayment;
      let paid = c.downPayment;
      c.payments.forEach(p => {
        if (p.isPaid) paid += (p.paidAmount ?? p.amount);
      });
      total += (totalContractAmount - paid);
    });
    return total;
  }, [installmentContracts]);

  return (
    <div className="flex flex-col min-h-screen bg-[#a8bec9] font-sans p-4" dir="rtl">
      <h2 className="text-center font-bold text-3xl text-blue-800 mb-4 tracking-wider"
        style={{ textShadow: '1px 1px 0px white, -1px -1px 0px white' }}>
        أرشيف عملاء التقسيط
      </h2>

      {/* Search Bar */}
      <div className="flex items-center gap-2 mb-4 max-w-xl mx-auto w-full">
        <div className="bg-black text-white px-4 h-9 flex items-center font-bold text-sm">بحث باسم العميل:</div>
        <input
          type="text"
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          placeholder="اكتب اسم العميل..."
          className="flex-1 h-9 border border-[#6eb1d6] px-3 outline-none bg-white font-bold text-sm"
        />
        {searchName && (
          <button onClick={() => setSearchName('')}
            className="bg-gray-400 hover:bg-gray-500 text-white font-bold h-9 px-3 text-sm">
            مسح
          </button>
        )}
      </div>

      <div className="flex gap-4 flex-1">
        {/* Customer List */}
        <div className="w-64 shrink-0 flex flex-col gap-1 overflow-auto max-h-[calc(100vh-200px)]">
          {/* Grand Total Box */}
          <div className="bg-white border-2 border-[#1a3a5c] p-2 mb-1 shadow-sm text-center rounded-sm">
            <div className="text-[10px] font-bold text-gray-500 mb-0.5">إجمالي المتبقي لجميع العملاء</div>
            <div className="text-lg font-black text-[#1a3a5c]">{grandTotalRemaining.toLocaleString()} <span className="text-xs">ج.م</span></div>
          </div>

          <div className="bg-black text-white text-center font-bold py-1 text-sm">
            العملاء ({customerGroups.length})
          </div>
          {customerGroups.length === 0 ? (
            <div className="bg-white text-center text-gray-500 py-6 font-bold">لا يوجد عملاء</div>
          ) : (
            customerGroups.map(([name, contracts]) => {
              const { totalRemaining } = getTotals(contracts);
              const isSelected = selectedCustomer && contracts.some(c => c.id === selectedCustomer.id);
              const hasOverdue = contracts.some(c => c.payments.some(p => !p.isPaid && new Date(p.dueDate) < new Date()));
              return (
                <div
                  key={name}
                  onClick={() => setSelectedCustomer(contracts[0])}
                  className={`cursor-pointer p-2 border-b border-gray-200 hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-100 border-r-4 border-r-blue-600' : 'bg-white'}`}
                >
                  <div className="font-bold text-sm text-gray-800">{name}</div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-xs text-gray-500">{contracts.length} عقد</span>
                    <span className={`text-xs font-bold ${hasOverdue ? 'text-red-600' : 'text-green-700'}`}>
                      {totalRemaining > 0 ? `متبقي: ${totalRemaining.toFixed(0)}` : '✓ مسدد'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Customer Details */}
        <div className="flex-1 flex flex-col gap-3 overflow-auto max-h-[calc(100vh-200px)]">
          {!selectedCustomer ? (
            <div className="flex-1 bg-[#e5ebed] flex items-center justify-center text-gray-500 font-bold text-lg border border-gray-300">
              اختر عميل من القائمة لعرض تفاصيله
            </div>
          ) : (
            <>
              {/* Show all contracts for selected customer name */}
              {customerGroups
                .find(([name]) => name === selectedCustomer.customerName.trim())?.[1]
                .map((contract, idx) => {
                  const status = getContractStatus(contract);
                  const paidPayments = contract.payments.filter(p => p.isPaid).length;
                  const totalPayments = contract.payments.length;
                  const paidAmount = contract.payments.filter(p => p.isPaid).reduce((s, p) => s + (p.paidAmount ?? p.amount), 0) + contract.downPayment;
                  const remaining = (contract.totalAmount + contract.downPayment) - paidAmount;

                  return (
                    <div key={contract.id} className="bg-[#e5ebed] border border-gray-300 shadow-sm">
                      {/* Contract Header */}
                      <div className="bg-[#1a3a5c] text-white px-3 py-1.5 flex justify-between items-center">
                        <span className="font-bold text-sm">عقد #{idx + 1} — {contract.deviceName}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${status.color}`}>{status.label}</span>
                      </div>

                      {/* Contract Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 text-sm">
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">رقم الصفحة</span>
                          <span className="font-bold">{contract.pageNumber || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">التليفون</span>
                          <span className="font-bold" dir="ltr">{contract.customerPhone || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">العنوان</span>
                          <span className="font-bold">{contract.customerAddress || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">الضامن</span>
                          <span className="font-bold">{contract.guarantorName || '—'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">سعر الجهاز</span>
                          <span className="font-bold">{contract.purchasePrice.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">المقدم</span>
                          <span className="font-bold text-blue-700">{contract.downPayment.toLocaleString()} ج.م</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">القسط الشهري</span>
                          <span className="font-bold">{contract.monthlyPayment.toFixed(0)} ج.م</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-gray-500 text-xs">الأقساط</span>
                          <span className="font-bold">{paidPayments}/{totalPayments} دُفع</span>
                        </div>
                      </div>

                      {/* Payment Progress */}
                      <div className="px-3 pb-2">
                        <div className="flex justify-between text-xs mb-1 font-bold">
                          <span className="text-green-700">مدفوع: {paidAmount.toLocaleString()} ج.م</span>
                          <span className={remaining > 0 ? 'text-red-600' : 'text-green-700'}>
                            {remaining > 0 ? `متبقي: ${remaining.toLocaleString()} ج.م` : '✓ تم السداد'}
                          </span>
                        </div>
                        <div className="w-full bg-gray-300 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (paidAmount / (contract.totalAmount + contract.downPayment)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Payments Table */}
                      <div className="overflow-auto max-h-[200px] border-t border-gray-300">
                        <table className="w-full text-center text-xs">
                          <thead className="bg-[#d0d8dc] sticky top-0">
                            <tr>
                              <th className="py-1 px-2 font-bold border-l border-white">#</th>
                              <th className="py-1 px-2 font-bold border-l border-white">تاريخ الاستحقاق</th>
                              <th className="py-1 px-2 font-bold border-l border-white">المبلغ</th>
                              <th className="py-1 px-2 font-bold border-l border-white">تاريخ الدفع</th>
                              <th className="py-1 px-2 font-bold">الحالة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contract.payments.map((p, i) => {
                              const isOverdue = !p.isPaid && new Date(p.dueDate) < new Date();
                              return (
                                <tr key={p.id} className={`border-b border-gray-200 ${p.isPaid ? 'bg-green-50' : isOverdue ? 'bg-red-50' : 'bg-white'}`}>
                                  <td className="py-1 px-2 font-bold text-gray-600">{i + 1}</td>
                                  <td className="py-1 px-2">{new Date(p.dueDate).toLocaleDateString('ar-EG')}</td>
                                  <td className="py-1 px-2 font-bold">{(p.paidAmount ?? p.amount).toLocaleString()}</td>
                                  <td className="py-1 px-2">{p.paidDate ? new Date(p.paidDate).toLocaleDateString('ar-EG') : '—'}</td>
                                  <td className="py-1 px-2">
                                    <span className={`px-2 py-0.5 rounded font-bold text-xs ${p.isPaid ? 'bg-green-200 text-green-800' : isOverdue ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-700'}`}>
                                      {p.isPaid ? 'مدفوع' : isOverdue ? 'متأخر' : 'قادم'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
