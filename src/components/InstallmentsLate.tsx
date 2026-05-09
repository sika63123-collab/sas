import React, { useState } from 'react';
import { useAppStore } from '../store';

export function InstallmentsLate() {
  const { installmentContracts } = useAppStore();

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
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
    <div className="flex flex-col items-center min-h-[calc(100vh-64px)] bg-[#b0bec5] font-sans p-6" dir="rtl">
      
      <h2 className="text-center font-bold text-4xl text-blue-600 mb-8 tracking-wider" style={{ textShadow: '1px 1px 0px white, -1px -1px 0px white, 1px -1px 0px white, -1px 1px 0px white' }}>
        الأقساط المتأخرة
      </h2>

      <div className="w-full max-w-4xl bg-white p-6 shadow-md border border-gray-400 mb-6 flex items-center gap-4">
          <div className="flex flex-1 border border-gray-300 shadow-inner h-10">
              <div className="bg-[#111] text-white px-6 font-bold text-sm flex items-center justify-center">من تاريخ:</div>
              <input 
                type="date" 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                className="flex-1 px-4 outline-none text-sm font-bold bg-white" 
              />
          </div>
          <div className="flex flex-1 border border-gray-300 shadow-inner h-10">
              <div className="bg-[#111] text-white px-6 font-bold text-sm flex items-center justify-center">إلى تاريخ:</div>
              <input 
                 type="date" 
                 value={toDate}
                 onChange={e => setToDate(e.target.value)}
                 className="flex-1 px-4 outline-none text-sm font-bold bg-white" 
              />
          </div>
          <button 
             onClick={handleSearch}
             className="bg-blue-600 w-24 h-10 text-white font-bold hover:bg-blue-700 shadow-md"
          >
             بحث
          </button>
      </div>

      {searched && (
        <div className="w-full max-w-4xl space-y-4">
          {searchResults.length === 0 ? (
            <div className="text-center text-gray-700 font-bold p-6 bg-white shadow-md border border-gray-400 text-xl">لا يوجد أقساط متأخرة في هذه الفترة</div>
          ) : (
            searchResults.map(contract => (
               <div key={contract.id} className="bg-red-50 p-4 shadow-md border border-red-300">
                  <div className="flex justify-between items-start mb-4 border-b border-red-200 pb-2">
                    <div>
                      <h3 className="font-bold text-xl text-red-900">{contract.customerName}</h3>
                      <div className="text-sm text-red-700 font-bold mt-1">تليفون: <span dir="ltr">{contract.customerPhone}</span> | العنوان: {contract.customerAddress} | صفحة: {contract.pageNumber}</div>
                    </div>
                    <div className="text-left font-bold text-red-900 bg-white px-4 py-2 border border-red-200 shadow-sm">
                      الأقساط المتأخرة: <span className="text-2xl text-red-600 mx-2">{contract.latePayments.length}</span>
                    </div>
                  </div>

                  <div className="bg-white border border-red-200 shadow-inner">
                    <table className="w-full text-center">
                      <thead>
                        <tr className="border-b border-red-200 bg-red-100/50">
                          <th className="p-2 font-bold text-red-900 border-l border-red-200">رقم القسط</th>
                          <th className="p-2 font-bold text-red-900 border-l border-red-200">تاريخ الاستحقاق</th>
                          <th className="p-2 font-bold text-red-900">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {contract.latePayments.map((payment: any) => {
                          const idx = contract.payments.findIndex((p: any) => p.id === payment.id) + 1;
                          return (
                            <tr key={payment.id} className="border-b border-red-100 last:border-0 hover:bg-red-50 text-red-800 font-bold">
                              <td className="p-2 border-l border-red-100">قسط #{idx}</td>
                              <td className="p-2 border-l border-red-100" dir="ltr">{new Date(payment.dueDate).toLocaleDateString('ar-EG')}</td>
                              <td className="p-2">{payment.amount} ج.م</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
               </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
