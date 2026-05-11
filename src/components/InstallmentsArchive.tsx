import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Users, Search, Target, FileText } from 'lucide-react';

export default function InstallmentsArchive() {
  const { installmentContracts } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Group contracts by customer phone and name to ensure uniqueness
  const customers = useMemo(() => {
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      contractsCount: number;
      totalFinanced: number;
      totalPaid: number;
      totalRemaining: number;
      lastContractDate: string;
    }>();

    installmentContracts.forEach(c => {
      const key = `${c.customerName}-${c.customerPhone}`;
      
      const totalPaidForContract = c.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0) + c.downPayment;
      // totalAmount is the total amount financed (including downpayment or not? In InstallmentsAdd: totalAmount = purchasePrice - dPayment + totalInterest)
      // Actually totalRequired = c.totalAmount + c.downPayment? Let's check InstallmentsPay for logic:
      // InstallmentsPay logic for total remaining: Math.max(0, selectedContract.totalAmount - selectedContract.payments.reduce(...))
      // It means totalAmount is the sum of all installments, and downpayment is paid separately. 
      // Let's rely on total financed = c.totalAmount (sum of installments for the device)
      
      const totalFinanced = c.totalAmount;
      const installmentsPaid = c.payments.reduce((sum, p) => sum + (p.isPaid ? (p.paidAmount !== undefined ? p.paidAmount : p.amount) : 0), 0);
      const totalRemaining = Math.max(0, totalFinanced - installmentsPaid);

      if (customerMap.has(key)) {
        const existing = customerMap.get(key)!;
        existing.contractsCount += 1;
        existing.totalFinanced += totalFinanced;
        existing.totalPaid += installmentsPaid;
        existing.totalRemaining += totalRemaining;
        if (new Date(c.createdAt || c.startDate) > new Date(existing.lastContractDate)) {
          existing.lastContractDate = c.createdAt || c.startDate;
        }
      } else {
        customerMap.set(key, {
          name: c.customerName,
          phone: c.customerPhone,
          contractsCount: 1,
          totalFinanced: totalFinanced,
          totalPaid: installmentsPaid,
          totalRemaining: totalRemaining,
          lastContractDate: c.createdAt || c.startDate
        });
      }
    });

    return Array.from(customerMap.values()).sort((a, b) => new Date(b.lastContractDate).getTime() - new Date(a.lastContractDate).getTime());
  }, [installmentContracts]);

  const filteredCustomers = customers.filter(c => 
    c.name.includes(searchTerm) || 
    c.phone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f5f5f7] font-sans p-6" dir="rtl">
      <div className="max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-sm text-white">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">أرشيف العملاء</h1>
            <p className="text-gray-500 text-sm font-medium">سجل بأسماء وتفاصيل عملاء التقسيط</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
          
          <div className="flex items-center justify-between mb-6">
            <div className="relative w-full max-w-md">
              <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="ابحث بالاسم أو رقم الهاتف..." 
                className="w-full h-12 pr-12 pl-4 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-sm transition-all shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="px-5 py-2.5 bg-red-50 text-red-800 font-bold rounded-xl text-sm border border-red-100">
                إجمالي المتبقي: {filteredCustomers.reduce((sum, c) => sum + c.totalRemaining, 0).toFixed(2)} ج.م
              </div>
              <div className="px-5 py-2.5 bg-blue-50 text-blue-800 font-bold rounded-xl text-sm border border-blue-100">
                إجمالي العملاء: {filteredCustomers.length}
              </div>
            </div>
          </div>

          <div className="border border-gray-100 rounded-2xl overflow-hidden flex-1 flex flex-col bg-gray-50/50">
            <div className="overflow-auto flex-1">
              <table className="w-full text-center text-sm">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-500 font-semibold sticky top-0">
                  <tr>
                    <th className="py-4 px-4 text-right pr-6 w-1/4">اسم العميل</th>
                    <th className="py-4 px-4 w-1/6">رقم الهاتف</th>
                    <th className="py-4 px-4 w-1/6 text-center">عدد العقود</th>
                    <th className="py-4 px-4 w-1/6 text-center">إجمالي المديونية</th>
                    <th className="py-4 px-4 w-1/6 text-center">المدفوع</th>
                    <th className="py-4 px-4 w-1/6 text-center">المتبقي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                        لا يوجد عملاء متاحين بالبيانات المدخلة
                      </td>
                    </tr>
                  ) : (
                    filteredCustomers.map((customer, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 text-right pr-6 font-bold text-gray-800 flex items-center gap-3">
                           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">
                             {customer.name.substring(0, 1)}
                           </div>
                           {customer.name}
                        </td>
                        <td className="py-4 px-4 font-medium text-gray-600" dir="ltr">{customer.phone}</td>
                        <td className="py-4 px-4 text-center">
                          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">
                            {customer.contractsCount}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-800">{customer.totalFinanced.toFixed(2)}</td>
                        <td className="py-4 px-4 font-bold text-green-600">{customer.totalPaid.toFixed(2)}</td>
                        <td className="py-4 px-4 font-bold text-red-600">{customer.totalRemaining.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
