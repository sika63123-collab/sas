import React, { useState } from 'react';
import { useAppStore } from '../store';
import { FileText, CreditCard, Box, Calendar, Wallet } from 'lucide-react';
import ProfitMarginReport from './ProfitMarginReport';

export default function Reports({ view = 'cash' }: { view?: 'visa' | 'cash' | 'shift' | 'item-card' | 'profit-margin' }) {
  const { transactions, expenses } = useAppStore();
  const saleTransactions = transactions.filter(t => t.type === 'sale' || t.type === 'deposit_sale');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter transactions by selected date
  const dailyTransactions = transactions.filter(t => t.timestamp.startsWith(selectedDate));

  // Helper to calculate actual paid/returned amount
  const getAmount = (t: any) => (t.type === 'deposit_sale' || t.type === 'deposit_return') ? (t.depositAmount || 0) : t.totalAmount;

  // --- Cash Account Logic ---
  const cashSales = dailyTransactions.filter(t => t.paymentMethod === 'cash' && (t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment')).reduce((sum, t) => sum + getAmount(t), 0);
  const cashReturns = dailyTransactions.filter(t => t.paymentMethod === 'cash' && (t.type === 'return' || t.type === 'deposit_return')).reduce((sum, t) => sum + getAmount(t), 0);
  const netCash = cashSales - cashReturns;

  // --- Expenses Logic ---
  const dailyExpenses = expenses.filter(e => e.timestamp.startsWith(selectedDate));
  const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashAfterExpenses = netCash - totalExpenses;

  // --- Electronic Account Logic ---
  const electronicTransactions = dailyTransactions.filter(t => t.paymentMethod !== 'cash');
  const elecSales = electronicTransactions.filter(t => t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment' || t.type === 'installment_payment').reduce((sum, t) => sum + getAmount(t), 0);
  const elecReturns = electronicTransactions.filter(t => t.type === 'return' || t.type === 'deposit_return').reduce((sum, t) => sum + getAmount(t), 0);
  const netElec = elecSales - elecReturns;

  const getMethodName = (method: string) => {
    switch(method) {
      case 'visa': return 'فيزا';
      case 'instapay': return 'انستا باي';
      case 'vodafone_cash': return 'فودافون كاش';
      default: return 'نقدي';
    }
  };

  const getTypeName = (type: string) => {
    switch(type) {
      case 'sale': return { label: 'بيع', color: 'text-green-600 bg-green-50' };
      case 'return': return { label: 'مرتجع', color: 'text-red-600 bg-red-50' };
      case 'deposit_sale': return { label: 'مبيعات عربون', color: 'text-orange-600 bg-orange-50' };
      case 'deposit_return': return { label: 'مرتجع عربون', color: 'text-purple-600 bg-purple-50' };
      case 'deposit_payment': return { label: 'سداد عربون', color: 'text-teal-600 bg-teal-50' };
      case 'installment_payment': return { label: 'سداد قسط', color: 'text-blue-600 bg-blue-50' };
      case 'purchase': return { label: 'فاتورة مشتريات', color: 'text-emerald-600 bg-emerald-50' };
      default: return { label: type, color: 'text-gray-600 bg-gray-50' };
    }
  };

  const getTitle = () => {
    switch(view) {
      case 'cash': return 'كشف حساب نقدي';
      case 'visa': return 'كشف حساب الفيزا والإلكتروني';
      case 'shift': return 'تقفيل وردية';
      case 'item-card': return 'كارت الصنف';
      case 'profit-margin': return 'تقرير هامش الربح';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 w-full">
      
      {/* Header & Date Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          {getTitle()}
        </h1>
        <div className="flex items-center gap-2">
          <label className="text-gray-600 font-medium">اختر التاريخ:</label>
          <div className="relative">
             <input 
               type="date" 
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
               className="border border-gray-300 rounded-lg pl-3 pr-10 py-2 focus:ring-2 focus:ring-blue-500 outline-none w-48 text-left"
               dir="ltr"
             />
             <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {view === 'cash' && (
      <>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-2xl mx-auto">
          <div className="bg-emerald-50 border-b border-emerald-100 p-4">
            <h2 className="text-lg font-bold text-emerald-800 flex items-center gap-2">
              <span className="bg-emerald-200 p-1 rounded-md"><Wallet className="h-5 w-5 text-emerald-700" /></span>
              كشف حساب النقدي
            </h2>
            <p className="text-sm text-emerald-600/80 mt-1">يجمع إجمالي الفاتورة النقدية والمرتجعات</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-600 text-lg">إجمالي المبيعات النقدية:</span>
              <span className="font-bold text-2xl text-gray-900">{cashSales} ج.م</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-600 text-lg">إجمالي المرتجعات النقدية:</span>
              <span className="font-bold text-xl text-red-600">- {cashReturns} ج.م</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-600 text-lg">إجمالي المصروفات:</span>
              <span className="font-bold text-xl text-orange-600">- {totalExpenses} ج.م</span>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-gray-800">صافي النقدي بعد المصروفات:</span>
              <span className="text-3xl font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 shadow-inner">{netCashAfterExpenses} ج.م</span>
            </div>
          </div>
        </div>

        {/* Daily Expenses Table */}
        {dailyExpenses.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-2xl mx-auto mt-6">
            <div className="bg-orange-50 border-b border-orange-100 p-4">
              <h2 className="text-lg font-bold text-orange-800">تفاصيل المصروفات</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold border-b">رقم</th>
                    <th className="px-4 py-3 font-semibold border-b">الوقت</th>
                    <th className="px-4 py-3 font-semibold border-b">النوع</th>
                    <th className="px-4 py-3 font-semibold border-b">المبلغ</th>
                    <th className="px-4 py-3 font-semibold border-b">ملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dailyExpenses.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-500">{e.expenseNumber}</td>
                      <td className="px-4 py-3 text-gray-500" dir="ltr">{new Date(e.timestamp).toLocaleTimeString('ar-EG')}</td>
                      <td className="px-4 py-3 font-medium text-orange-700">
                        <span className="bg-orange-50 px-2 py-0.5 rounded">{e.expenseType}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{e.amount} ج.م</td>
                      <td className="px-4 py-3 text-gray-500">{e.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50 font-bold">
                    <td colSpan={3} className="px-4 py-3 text-orange-800">إجمالي المصروفات</td>
                    <td className="px-4 py-3 text-orange-800">{totalExpenses} ج.م</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </>
      )}

      {view === 'visa' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-100 p-4">
              <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                <span className="bg-blue-200 p-1 rounded-md"><CreditCard className="h-5 w-5 text-blue-700" /></span>
                كشف حساب الفيزا والإلكتروني
              </h2>
              <p className="text-sm text-blue-600/80 mt-1">جميع عمليات (فيزا، انستا باي، فودافون كاش)</p>
            </div>
            <div className="p-6 space-y-4">
               <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-600 text-lg">إجمالي المبيعات الإلكترونية:</span>
                <span className="font-bold text-2xl text-gray-900">{elecSales} ج.م</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <span className="text-gray-600 text-lg">إجمالي المرتجعات الإلكترونية:</span>
                <span className="font-bold text-xl text-red-600">- {elecReturns} ج.م</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xl font-bold text-gray-800">الصافي الإلكتروني:</span>
                <span className="text-3xl font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 shadow-inner">{netElec} ج.م</span>
              </div>
            </div>
          </div>

          {electronicTransactions.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">تفاصيل العمليات الإلكترونية (المحافظ والفيزا)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm min-w-[700px]">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold border-b">الوقت</th>
                      <th className="px-4 py-3 font-semibold border-b">النوع</th>
                      <th className="px-4 py-3 font-semibold border-b">طريقة الدفع</th>
                      <th className="px-4 py-3 font-semibold border-b">القيمة</th>
                      <th className="px-4 py-3 font-semibold border-b">المحفظة المرسلة</th>
                      <th className="px-4 py-3 font-semibold border-b">المحفظة المستلمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {electronicTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500" dir="ltr">{new Date(t.timestamp).toLocaleTimeString('ar-EG')}</td>
                        <td className="px-4 py-3">
                           <span className={`font-medium px-2 py-0.5 rounded ${getTypeName(t.type).color}`}>
                             {getTypeName(t.type).label}
                           </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-800">{getMethodName(t.paymentMethod)}</td>
                        <td className="px-4 py-3 font-bold">{getAmount(t)} ج.م</td>
                        <td className="px-4 py-3 text-gray-600 font-mono tracking-widest">{t.senderWalletLast4 ? `*${t.senderWalletLast4}` : '-'}</td>
                        <td className="px-4 py-3 text-gray-600 font-mono tracking-widest">{t.receiverWalletLast4 ? `*${t.receiverWalletLast4}` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'shift' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-4xl mx-auto p-8 text-center space-y-6">
           <FileText className="h-16 w-16 text-gray-300 mx-auto" />
           <h2 className="text-2xl font-bold text-gray-800">تقفيل الوردية</h2>
           <p className="text-gray-500">تفاصيل إجمالي الحركات اليومية</p>
           
           <div className="grid grid-cols-2 gap-4 text-right">
              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-sm text-emerald-600 font-bold mb-2">صافي النقدية</div>
                  <div className="text-3xl font-black text-emerald-700">{netCash} ج.م</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <div className="text-sm text-blue-600 font-bold mb-2">صافي المدفوعات الإلكترونية</div>
                  <div className="text-3xl font-black text-blue-700">{netElec} ج.م</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <div className="text-sm text-orange-600 font-bold mb-2">إجمالي المصروفات</div>
                  <div className="text-3xl font-black text-orange-700">- {totalExpenses} ج.م</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div className="text-sm text-gray-600 font-bold mb-2">صافي النقدية بعد المصروفات</div>
                  <div className="text-3xl font-black text-gray-800">{netCashAfterExpenses} ج.م</div>
              </div>
           </div>
           
           <div className="bg-gray-100 p-6 rounded-xl border border-gray-200 mt-6 flex justify-between items-center">
               <span className="text-xl font-bold text-gray-700">إجمالي إيراد اليوم:</span>
               <span className="text-4xl font-black text-gray-900">{netCashAfterExpenses + netElec} ج.م</span>
           </div>

           <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg mt-4 w-full md:w-auto">
             طباعة تقرير الوردية
           </button>
        </div>
      )}

      {view === 'item-card' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
             <div className="flex items-center gap-2">
               <Box className="h-5 w-5 text-gray-700" />
               <h3 className="font-bold text-gray-800">حركة الأصناف</h3>
             </div>
             <span className="text-xs text-gray-500">يرحل كل الأصناف التي يتم بيعها أو استرجاعها</span>
          </div>
          
          <div className="p-0 overflow-x-auto">
            {dailyTransactions.length === 0 ? (
               <div className="p-8 text-center text-gray-500">لا توجد حركات في هذا اليوم</div>
            ) : (
              <table className="w-full text-right text-sm min-w-[500px]">
                 <thead className="bg-gray-50 text-gray-600">
                   <tr>
                     <th className="px-6 py-3 font-semibold border-b">الوقت</th>
                     <th className="px-6 py-3 font-semibold border-b">عملية</th>
                     <th className="px-6 py-3 font-semibold border-b">طريقة الدفع</th>
                     <th className="px-6 py-3 font-semibold border-b">الأصناف (الكمية × السعر)</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {dailyTransactions.map(t => (
                     <tr key={t.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 text-gray-500 whitespace-nowrap" dir="ltr">{new Date(t.timestamp).toLocaleTimeString('ar-EG')}</td>
                       <td className="px-6 py-4">
                         <div className="flex flex-col items-start gap-1">
                           <span className={`font-medium px-2 py-0.5 rounded ${getTypeName(t.type).color}`}>
                             {getTypeName(t.type).label}
                           </span>
                           {t.returnInvoiceNumber && (() => {
                             const origIdx = saleTransactions.findIndex(tx => tx.id === t.returnInvoiceNumber);
                             const origInvoiceDisplay = origIdx >= 0 ? String(origIdx + 1) : t.returnInvoiceNumber;
                             return (
                               <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-1 rounded">
                                 فاتورة رقم: {origInvoiceDisplay}
                               </span>
                             );
                           })()}
                         </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                            {getMethodName(t.paymentMethod)}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <ul className="space-y-1">
                            {t.items.map((item, idx) => (
                               <li key={idx} className="flex gap-2">
                                 <span className="font-bold text-gray-800">{item.id}</span>
                                 <span className="text-gray-400">|</span>
                                 <span className="font-medium text-gray-800">{item.name}</span>
                                 <span className="text-gray-400">|</span>
                                 <span className="text-gray-600">{item.quantity} قطع</span>
                                 <span className="text-gray-400">|</span>
                                 <span className="text-gray-600">{item.price} ج.م</span>
                               </li>
                            ))}
                          </ul>
                          {(t.type === 'deposit_sale' || t.type === 'deposit_return') && (
                            <div className="mt-2 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded inline-block">
                              عربون: {t.depositAmount || 0} ج.م | 
                              متبقي: {t.totalAmount - (t.depositAmount || 0)} ج.م | 
                              العميل: {t.customerName} ({t.customerPhone}) {t.customerAddress ? `- ${t.customerAddress}` : ''} | 
                              {t.isDelivered ? 'تم استلام العميل' : 'لم يتم استلام العميل'}
                            </div>
                          )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {view === 'profit-margin' && (
        <ProfitMarginReport selectedDate={selectedDate} />
      )}
    </div>
  );
}
