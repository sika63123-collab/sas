import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';

export function InstallmentsLate() {
  const { installmentContracts } = useAppStore();

  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [searched, setSearched] = useState(false);

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = () => {
    if (!fromDate || !toDate) {
      alert("الرجاء اختيار 'من تاريخ' و 'إلى تاريخ'");
      return;
    }

    const start = new Date(fromDate);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);

    const results: any[] = [];

    installmentContracts.forEach(contract => {
      const latePayments = contract.payments.filter(p => {
        if (p.isPaid) return false;
        const dueDate = new Date(p.dueDate);
        return dueDate >= start && dueDate <= end;
      });

      if (latePayments.length > 0) {
        results.push({
          ...contract,
          latePayments
        });
      }
    });

    setSearchResults(results);
    setSearched(true);
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#a8bec9] font-sans p-6" dir="rtl">
      
      <h2 className="text-center font-bold text-4xl text-blue-600 mb-8 tracking-wider" style={{ textShadow: '1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white' }}>
        الأقساط المتأخرة
      </h2>

      <div className="w-full max-w-4xl bg-[#e5ebed] p-4 shadow-sm border border-gray-300 mb-6 flex flex-row-reverse items-center justify-between gap-4">
          <button 
             onClick={handleSearch}
             className="bg-blue-600 w-24 h-10 text-white font-bold hover:bg-blue-700 shadow flex items-center justify-center cursor-pointer"
          >
             بحث
          </button>
          <div className="flex flex-1 border border-gray-300 shadow-inner h-10 bg-white items-center max-w-[300px]">
              <div className="bg-[#3e3432] text-white px-4 h-full font-bold text-sm flex items-center justify-center whitespace-nowrap">إلى تاريخ:</div>
              <input 
                 type="date" 
                 value={toDate}
                 onChange={e => setToDate(e.target.value)}
                 className="flex-1 px-2 outline-none text-sm font-bold bg-transparent mx-2" 
              />
          </div>
          <div className="flex flex-1 border border-gray-300 shadow-inner h-10 bg-white items-center max-w-[300px]">
              <div className="bg-[#3e3432] text-white px-4 h-full font-bold text-sm flex items-center justify-center whitespace-nowrap">من تاريخ:</div>
              <input 
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="flex-1 px-2 outline-none text-sm font-bold bg-transparent mx-2" 
              />
          </div>
      </div>

      {searched && (
        <div className="w-full max-w-4xl bg-white border border-gray-300 shadow-sm mt-4">
          <table className="w-full text-center table-fixed">
            <thead>
              <tr className="bg-[#3e3432] text-white text-sm">
                <th className="py-3 px-2 font-bold border-l border-[#5a4c4a]">رقم الصفحة</th>
                <th className="py-3 px-2 font-bold border-l border-[#5a4c4a]">اسم العميل</th>
                <th className="py-3 px-2 font-bold border-l border-[#5a4c4a]">رقم التليفون</th>
                <th className="py-3 px-2 font-bold border-l border-[#5a4c4a]">بداية القسط</th>
                <th className="py-3 px-2 font-bold border-l border-[#5a4c4a]">عدد الأقساط (المتأخرة)</th>
                <th className="py-3 px-2 font-bold">إجمالي المبلغ المستحق</th>
              </tr>
            </thead>
            <tbody>
              {searchResults.length === 0 ? (
                <tr>
                   <td colSpan={6} className="py-8 text-center text-gray-700 font-bold bg-[#eef5fa]">
                     لا يوجد أقساط متأخرة في هذه الفترة
                   </td>
                </tr>
              ) : (
                searchResults.map(contract => (
                  <tr key={contract.id} className="border-t border-gray-300 hover:bg-gray-50 bg-[#eef5fa] text-gray-800 font-bold text-sm">
                    <td className="py-3 px-2 border-l border-gray-300">{contract.pageNumber || '-'}</td>
                    <td className="py-3 px-2 border-l border-gray-300 text-[#543b3b]">{contract.customerName}</td>
                    <td className="py-3 px-2 border-l border-gray-300" dir="ltr">{contract.customerPhone}</td>
                    <td className="py-3 px-2 border-l border-gray-300" dir="ltr">{contract.payments.length > 0 ? new Date(contract.payments[0].dueDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td className="py-3 px-2 border-l border-gray-300 text-gray-700">{contract.latePayments.length}</td>
                    <td className="py-3 px-2 text-gray-700">{contract.latePayments.reduce((sum: number, p: any) => sum + p.amount, 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
