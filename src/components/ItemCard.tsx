import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { FileText, Search } from 'lucide-react';

export default function ItemCard() {
  const { transactions, products } = useAppStore();
  
  const today = new Date().toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Find product by code or name
  const matchedProduct = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.trim().toLowerCase();
    return products.find(p => 
      p.id.toLowerCase() === q || 
      p.name.toLowerCase().includes(q)
    ) || null;
  }, [searchQuery, products]);

  const activeProduct = selectedProductId 
    ? products.find(p => p.id === selectedProductId) 
    : matchedProduct;

  // Get all movements for this product within date range
  const movements = useMemo(() => {
    if (!activeProduct) return [];
    
    const rows: {
      invoiceId: string;
      date: string;
      time: string;
      description: string;
      incoming: number; // وارد
      outgoing: number; // صادر
      details: string;
    }[] = [];

    // Filter transactions by date range
    const filtered = transactions.filter(t => {
      const tDate = t.timestamp.split('T')[0];
      return tDate >= dateFrom && tDate <= dateTo;
    });

    filtered.forEach(t => {
      // Check if this transaction contains our product
      const item = t.items.find(i => i.productId === activeProduct.id);
      if (!item) return;

      const isReturn = t.type === 'return' || t.type === 'deposit_return';
      const isSale = t.type === 'sale' || t.type === 'deposit_sale' || t.type === 'deposit_payment';

      let description = '';
      let details = '';

      if (isSale) {
        switch(t.type) {
          case 'sale': description = 'فاتورة مبيعات'; break;
          case 'deposit_sale': description = 'مبيعات عربون'; break;
          case 'deposit_payment': description = 'سداد عربون'; break;
        }
        details = `${item.quantity} قطعة × ${item.price} ج.م`;
        if (t.customerName) details += ` | العميل: ${t.customerName}`;
        if (t.paymentMethod) {
          const methodNames: Record<string, string> = { cash: 'نقدي', visa: 'فيزا', instapay: 'انستا باي', vodafone_cash: 'فودافون كاش' };
          details += ` | ${methodNames[t.paymentMethod] || t.paymentMethod}`;
        }
      } else if (isReturn) {
        description = t.type === 'return' ? 'مرتجع مبيعات' : 'مرتجع عربون';
        details = `${item.quantity} قطعة × ${item.price} ج.م`;
        if (t.returnInvoiceNumber) details += ` | فاتورة رقم: ${t.returnInvoiceNumber}`;
      }

      rows.push({
        invoiceId: t.id,
        date: new Date(t.timestamp).toLocaleDateString('ar-EG'),
        time: new Date(t.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        description,
        incoming: isReturn ? item.quantity : 0,
        outgoing: isSale ? item.quantity : 0,
        details,
      });
    });

    return rows;
  }, [activeProduct, transactions, dateFrom, dateTo]);

  const totalIncoming = movements.reduce((sum, m) => sum + m.incoming, 0);
  const totalOutgoing = movements.reduce((sum, m) => sum + m.outgoing, 0);

  const handleSearch = () => {
    if (matchedProduct) {
      setSelectedProductId(matchedProduct.id);
    } else if (searchQuery.trim()) {
      alert('لم يتم العثور على الصنف');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-blue-600" />
          كارت الصنف
        </h1>
        
        {/* Search & Date Filters */}
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search by code or name */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-sm font-semibold text-gray-500">بحث بالكود أو الاسم:</label>
            <div className="flex gap-2">
              <input
                className="flex-1 h-10 border border-gray-200 rounded-lg px-3 outline-none focus:ring-2 focus:ring-blue-100 font-medium"
                placeholder="كود الصنف أو اسمه..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedProductId(null); }}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
              <button
                onClick={handleSearch}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 h-10 rounded-lg text-sm font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Search className="w-4 h-4" />
                بحث
              </button>
            </div>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-500">من تاريخ:</label>
            <input
              type="date"
              className="h-10 border border-gray-200 rounded-lg px-3 outline-none focus:ring-2 focus:ring-blue-100 text-left"
              dir="ltr"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-500">إلى تاريخ:</label>
            <input
              type="date"
              className="h-10 border border-gray-200 rounded-lg px-3 outline-none focus:ring-2 focus:ring-blue-100 text-left"
              dir="ltr"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product Info Card */}
      {activeProduct && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-600 font-semibold">كود الصنف:</span>
            <span className="font-bold text-blue-800 font-mono text-lg">{activeProduct.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-600 font-semibold">اسم الصنف:</span>
            <span className="font-bold text-blue-800 text-lg">{activeProduct.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-600 font-semibold">السعر:</span>
            <span className="font-bold text-blue-800">{activeProduct.price} ج.م</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-600 font-semibold">الرصيد الحالي:</span>
            <span className={`font-bold text-lg ${activeProduct.stock > 0 ? 'text-green-700' : 'text-red-700'}`}>{activeProduct.stock}</span>
          </div>
        </div>
      )}

      {/* Movements Table */}
      {activeProduct && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Summary */}
          <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-bold text-gray-800">حركة الصنف</h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">إجمالي الوارد:</span>
                <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg border border-green-100">{totalIncoming}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">إجمالي الصادر:</span>
                <span className="font-bold text-red-700 bg-red-50 px-3 py-1 rounded-lg border border-red-100">{totalOutgoing}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm min-w-[700px]">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">رقم الفاتورة</th>
                  <th className="px-4 py-3 font-semibold">تاريخ الفاتورة</th>
                  <th className="px-4 py-3 font-semibold">البيان</th>
                  <th className="px-4 py-3 font-semibold text-center text-green-700">وارد</th>
                  <th className="px-4 py-3 font-semibold text-center text-red-700">صادر</th>
                  <th className="px-4 py-3 font-semibold">تفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{m.invoiceId}</td>
                    <td className="px-4 py-3 text-gray-600">{m.date} - {m.time}</td>
                    <td className="px-4 py-3">
                      <span className={`font-medium px-2 py-0.5 rounded text-xs ${
                        m.incoming > 0 
                          ? 'text-green-700 bg-green-50' 
                          : 'text-orange-700 bg-orange-50'
                      }`}>
                        {m.description}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.incoming > 0 ? (
                        <span className="font-bold text-green-700">{m.incoming}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.outgoing > 0 ? (
                        <span className="font-bold text-red-700">{m.outgoing}</span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.details}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400 font-medium">
                      لا توجد حركات لهذا الصنف في الفترة المحددة
                    </td>
                  </tr>
                )}
              </tbody>
              {movements.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-bold border-t border-gray-200">
                    <td colSpan={3} className="px-4 py-3 text-gray-700">الإجمالي</td>
                    <td className="px-4 py-3 text-center text-green-700">{totalIncoming}</td>
                    <td className="px-4 py-3 text-center text-red-700">{totalOutgoing}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!activeProduct && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-12 text-center">
          <FileText className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400 text-lg font-medium">ابحث بكود الصنف أو اسمه لعرض الحركات</p>
        </div>
      )}
    </div>
  );
}
