import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store';
import { Package, Plus, Minus, Filter, Printer } from 'lucide-react';

export default function Inventory() {
  const { products, transactions, updateProductStock, currentUser } = useAppStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const productStats = useMemo(() => {
    const stats: Record<string, { incoming: number, sold: number }> = {};
    products.forEach(p => stats[p.id] = { incoming: 0, sold: 0 });

    transactions.forEach(t => {
      // Ignore payment transactions
      if (t.type === 'deposit_payment' || t.type === 'installment_payment') return;

      const isIncoming = t.type === 'purchase' || t.type === 'return' || t.type === 'deposit_return';
      const isOutgoing = t.type === 'sale' || t.type === 'deposit_sale';

      t.items.forEach(item => {
        if (!stats[item.productId]) {
          stats[item.productId] = { incoming: 0, sold: 0 };
        }
        if (isIncoming) stats[item.productId].incoming += item.quantity;
        if (isOutgoing) stats[item.productId].sold += item.quantity;
      });
    });
    return stats;
  }, [transactions, products]);

  const totalItemsAvailable = filteredProducts.reduce((sum, p) => sum + p.stock, 0);
  const totalCostValue = filteredProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * p.stock), 0);
  const totalSellValue = filteredProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            جرد المخزن وكميات الأصناف
          </h1>
          <p className="text-gray-500 mt-1">تصفية وجرد الأصناف والمجموعات</p>
        </div>
        
        <div className="flex items-center gap-3">
          {categories.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
              <Filter className="h-4 w-4 text-gray-500" />
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none text-sm font-medium text-gray-700 outline-none cursor-pointer"
              >
                <option value="all">كل المجموعات</option>
                {categories.map((cat, i) => (
                  <option key={i} value={cat as string}>{cat}</option>
                ))}
              </select>
            </div>
          )}
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            طباعة الجرد
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="bg-gray-50 p-3 text-center border-b border-gray-200 hidden print:block">
           <h2 className="text-xl font-bold">جرد أصناف {selectedCategory === 'all' ? 'المحل (كل المجموعات)' : `المجموعة: ${selectedCategory}`}</h2>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-right min-w-[600px]">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
            <tr>
              <th className="px-6 py-4 font-semibold text-sm">كود الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">المجموعة</th>
              <th className="px-6 py-4 font-semibold text-sm">اسم الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">سعر البيع</th>
              <th className="px-6 py-4 font-semibold text-sm text-green-700">رصيد افتتاحي</th>
              <th className="px-6 py-4 font-semibold text-sm text-red-700">كميات مباعة</th>
              <th className="px-6 py-4 font-semibold text-sm">الرصيد المتاح</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map(product => {
              const stats = productStats[product.id] || { incoming: 0, sold: 0 };
              return (
              <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium font-mono text-blue-600">{product.id}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {product.category ? (
                    <button 
                      onClick={() => setSelectedCategory(product.category!)}
                      className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded-md cursor-pointer transition-colors font-medium"
                    >
                      {product.category}
                    </button>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 text-gray-700 font-bold">
                  {product.price}
                </td>
                <td className="px-6 py-4 text-green-700 font-bold">
                  {stats.incoming}
                </td>
                <td className="px-6 py-4 text-red-700 font-bold">
                  {stats.sold}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${product.stock > 5 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock}
                  </span>
                </td>
              </tr>
            )})}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                  لا يوجد أصناف مطابقة
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
