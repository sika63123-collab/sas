import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store';
import { CheckCircle } from 'lucide-react';

export default function InstallmentsArchive() {
  const { installmentContracts } = useAppStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  // We'll store the selected customer key
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);

  // Group contracts by customer number
  const customers = useMemo(() => {
    const customerMap = new Map<number, {
      key: string;
      number: number;
      name: string;
      phone: string;
      contractsCount: number;
      totalRemaining: number;
      lastContractDate: string;
      contracts: typeof installmentContracts;
    }>();

    installmentContracts.forEach(c => {
      const num = c.customerNumber || 0;
      const keyStr = num.toString();
      
      const totalFinanced = c.totalAmount;
      const installmentsPaid = c.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0);
      const remaining = Math.max(0, totalFinanced - installmentsPaid);

      if (customerMap.has(num)) {
        const existing = customerMap.get(num)!;
        existing.contractsCount += 1;
        existing.totalRemaining += remaining;
        existing.contracts.push(c);
        if (new Date(c.createdAt || c.startDate) > new Date(existing.lastContractDate)) {
          existing.lastContractDate = c.createdAt || c.startDate;
        }
      } else {
        customerMap.set(num, {
          key: keyStr,
          number: num,
          name: c.customerName,
          phone: c.customerPhone,
          contractsCount: 1,
          totalRemaining: remaining,
          lastContractDate: c.createdAt || c.startDate,
          contracts: [c]
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => new Date(b.lastContractDate).getTime() - new Date(a.lastContractDate).getTime());
  }, [installmentContracts]);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    return customers.filter(c => 
      c.name.includes(searchTerm) || 
      c.phone.includes(searchTerm) ||
      c.contracts.some(con => 
        String(con.customerNumber) === searchTerm || 
        String(con.pageNumber) === searchTerm || 
        con.deviceName.includes(searchTerm)
      )
    );
  }, [searchTerm, customers]);

  useEffect(() => {
    if (filteredCustomers.length > 0 && (!selectedCustomerKey || !filteredCustomers.find(c => c.key === selectedCustomerKey))) {
      setSelectedCustomerKey(filteredCustomers[0].key);
    } else if (filteredCustomers.length === 0) {
      setSelectedCustomerKey(null);
    }
  }, [filteredCustomers, selectedCustomerKey]);

  const selectedCustomer = customers.find(c => c.key === selectedCustomerKey);

  const today = new Date();
  today.setHours(0,0,0,0);

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#b0bec5] font-sans p-6" dir="rtl">
        {/* Search Bar */}
        <div className="flex justify-center items-center mb-6">
            <input 
                className="w-1/2 max-w-lg h-12 px-4 shadow-sm outline-none text-right placeholder-gray-400 text-lg font-bold rounded-r-sm"
                placeholder="الاسم، الموبايل، رقم الصفحة..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="bg-black text-white px-6 py-[14px] font-bold text-lg text-center rounded-l-sm min-w-[200px]">
                بحث سريع:
            </div>
        </div>

        <div className="flex gap-4 w-full max-w-7xl mx-auto h-[75vh]">
           {/* Sidebar: List of Customers */}
           <div className="w-[300px] flex flex-col shrink-0 gap-4">
               {/* Total Box */}
               <div className="bg-[#eaeff1] border border-gray-400 p-4 flex flex-col items-center justify-center shadow-sm">
                   <div className="text-gray-600 font-bold text-sm mb-2">إجمالي المتبقي لجميع العملاء</div>
                   <div className="text-gray-900 font-extrabold text-xl">{filteredCustomers.reduce((sum, c) => sum + c.totalRemaining, 0).toLocaleString()} ج.م</div>
               </div>
               
               <div className="w-full flex flex-col flex-1 bg-black shadow-md border-l border-gray-400 overflow-hidden">
                   <div className="text-white py-2.5 text-center font-bold text-base shrink-0">العملاء ({filteredCustomers.length})</div>
                   <div className="flex-1 overflow-auto bg-[#eaeff1] w-full items-center flex flex-col pt-2 border-t border-gray-400">
                       {filteredCustomers.map((c) => {
                           const isSelected = selectedCustomerKey === c.key;
                           
                           return (
                               <div 
                                   key={c.key} 
                                   onClick={() => setSelectedCustomerKey(c.key)}
                                   className={`w-[96%] mb-2 p-3 cursor-pointer shadow-sm border ${isSelected ? 'bg-[#e3f2fd] border-blue-300' : 'bg-white border-white hover:border-gray-300'} transition-colors`}
                               >
                                   <div className="flex justify-between items-center">
                                       <div className={`font-bold text-sm ${c.totalRemaining > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                           {c.totalRemaining > 0 ? `متبقي: ${c.totalRemaining}` : 'خالص'}
                                       </div>
                                       <div className="text-right">
                                           <div className="font-bold text-gray-900">{c.name}</div>
                                           <div className="text-xs text-gray-500 mt-1">{c.contractsCount} عقد</div>
                                       </div>
                                   </div>
                               </div>
                           )
                       })}
                   </div>
               </div>
           </div>

           {/* Main Detail Area */}
           <div className="flex-1 bg-[#eaeff1] shadow-md flex flex-col min-w-0 overflow-auto">
               {selectedCustomer ? (
                  <div className="flex flex-col gap-8 p-4">
                     {selectedCustomer.contracts.map((contract, contractIndex) => {
                        const paid = contract.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0);
                        const remaining = Math.max(0, contract.totalAmount - paid);
                        const paidCount = contract.payments.filter(p => p.isPaid).length;
                        const totalCount = contract.payments.length;
                        const latePayments = contract.payments.filter(p => !p.isPaid && new Date(p.dueDate) < today);
                        const totalPaidAmount = contract.downPayment + paid;
                        // Find true index in overall contracts for UI consistency #1, #2...
                        const globalIndex = installmentContracts.findIndex(c => c.id === contract.id) + 1;

                        return (
                           <div key={contract.id} className="bg-white border border-gray-300 shadow-sm flex flex-col">
                              <div className="bg-[#1a365d] text-white px-4 py-2.5 flex justify-between items-center shrink-0">
                                 {latePayments.length > 0 ? (
                                    <div className="bg-red-100 text-red-600 px-3 py-1 font-bold text-sm">متأخر {latePayments.length} قسط</div>
                                 ) : <div/>}
                                 <div className="font-bold text-lg">عقد #{globalIndex} — {contract.deviceName}</div>
                              </div>

                              <div className="p-6 pb-2 shrink-0">
                                  <div className="grid grid-cols-4 gap-4 text-center">
                                      {/* Row 1 */}
                                      <div className="flex flex-col gap-2">
                                         <span className="text-gray-500 font-medium text-sm">رقم الصفحة</span>
                                         <span className="font-bold text-gray-900">{contract.pageNumber || '-'}</span>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                         <span className="text-gray-500 font-medium text-sm">التليفون</span>
                                         <span className="font-bold text-gray-900" dir="ltr">{contract.customerPhone}</span>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                         <span className="text-gray-500 font-medium text-sm">العنوان</span>
                                         <span className="font-bold text-gray-900">{contract.customerAddress || '-'}</span>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                         <span className="text-gray-500 font-medium text-sm">الضامن</span>
                                         <span className="font-bold text-gray-900">{contract.guarantorName || '-'}</span>
                                      </div>
                                      
                                      {/* Row 2 */}
                                      <div className="flex flex-col gap-2 mt-4 relative pb-5 border-b-2 border-blue-600">
                                         <span className="text-gray-500 font-medium text-sm">سعر الجهاز</span>
                                         <span className="font-bold text-gray-900">{contract.purchasePrice} ج.م</span>
                                         <span className="text-green-600 text-xs font-bold absolute bottom-0 left-0 right-0">مدفوع: {totalPaidAmount} ج.م</span>
                                      </div>
                                      <div className="flex flex-col gap-2 mt-4">
                                         <span className="text-gray-500 font-medium text-sm">المقدم</span>
                                         <span className="font-bold text-blue-600">{contract.downPayment} ج.م</span>
                                      </div>
                                      <div className="flex flex-col gap-2 mt-4">
                                         <span className="text-gray-500 font-medium text-sm">القسط الشهري</span>
                                         <span className="font-bold text-gray-900">{contract.monthlyPayment} ج.م</span>
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
                              <div className="overflow-auto mt-2 pb-6">
                                  <table className="w-full text-center">
                                      <thead className="bg-[#cbd5e1] text-gray-800">
                                          <tr>
                                              <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-12">#</th>
                                              <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-1/4">تاريخ الاستحقاق</th>
                                              <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-1/5">المبلغ</th>
                                              <th className="py-2.5 font-bold text-sm border-l border-gray-300 w-1/4">تاريخ الدفع</th>
                                              <th className="py-2.5 font-bold text-sm">الحالة</th>
                                          </tr>
                                      </thead>
                                      <tbody className="bg-white">
                                          {contract.payments.map((p, idx) => {
                                              const dueDate = new Date(p.dueDate);
                                              const isLate = !p.isPaid && dueDate < today;
                                              
                                              return (
                                                  <tr key={p.id} className={`${isLate ? 'bg-[#ffebee]' : 'even:bg-gray-50'} border-b border-gray-200`}>
                                                      <td className="py-2 text-sm font-bold border-l border-gray-200">{idx + 1}</td>
                                                      <td className="py-2 text-sm font-bold border-l border-gray-200" dir="ltr">{dueDate.toLocaleDateString('en-GB')}</td>
                                                      <td className="py-2 text-sm font-bold border-l border-gray-200 text-gray-900">
                                                          {p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : p.amount}
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
                                                  </tr>
                                              )
                                          })}
                                      </tbody>
                                  </table>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               ) : (
                  <div className="flex-1 flex justify-center items-center text-gray-500 font-bold text-lg">
                      لا يوجد عميل محدد
                  </div>
               )}
           </div>

        </div>
    </div>
  );
}

