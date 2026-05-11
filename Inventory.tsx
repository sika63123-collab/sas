import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Package, Plus, Minus, Filter, Printer } from 'lucide-react';

export default function Inventory() {
  const { products, updateProductStock, currentUser } = useAppStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
         <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 mb-1">إجمالي القطع المعروضة</span>
            <span className="text-2xl font-bold text-blue-600">{totalItemsAvailable} <span className="text-sm font-normal text-gray-500">قطعة</span></span>
         </div>
         {currentUser?.role === 'admin' && (
           <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
              <span className="text-gray-500 mb-1">إجمالي التكلفة</span>
              <span className="text-2xl font-bold text-emerald-600">{totalCostValue.toLocaleString()} <span className="text-sm font-normal text-gray-500">ج.م</span></span>
           </div>
         )}
         <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
            <span className="text-gray-500 mb-1">إجمالي سعر البيع المتوقع</span>
            <span className="text-2xl font-bold text-gray-800">{totalSellValue.toLocaleString()} <span className="text-sm font-normal text-gray-500">ج.م</span></span>
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
              <th className="px-6 py-4 font-semibold text-sm">التكلفة / البيع</th>
              <th className="px-6 py-4 font-semibold text-sm">الرصيد المتاح</th>
              <th className="px-6 py-4 font-semibold text-sm text-center print:hidden">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProducts.map(product => (
              <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 font-medium font-mono text-blue-600">{product.id}</td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {product.category ? (
                    <span className="bg-gray-100 px-2 py-1 rounded-md">{product.category}</span>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                <td className="px-6 py-4 text-gray-700 text-sm">
                  <span className="text-gray-400 line-through mr-2">{product.costPrice || 0}</span>
                  <span className="font-bold">{product.price}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${product.stock > 5 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-center print:hidden">
                  <div className="flex justify-center gap-2">
                     <button onClick={() => updateProductStock(product.id, 1)} className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded" title="زيادة المخزون">
                        <Plus className="h-4 w-4" />
                     </button>
                     <button onClick={() => updateProductStock(product.id, -1)} disabled={product.stock <= 0} className="text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded disabled:opacity-50" title="تقليل المخزون">
                         <Minus className="h-4 w-4" />
                     </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
