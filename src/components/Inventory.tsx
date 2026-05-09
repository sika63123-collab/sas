import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Package, Plus, Minus, Filter, Printer } from 'lucide-react';

export default function Inventory() {
  const { products, updateProductStock, currentUser, transactions } = useAppStore();
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const getProductStats = (productId: string) => {
    let incoming = 0;
    let outgoing = 0;

    transactions.forEach(t => {
      if (t.type === 'sale' || t.type === 'deposit_sale') {
        const item = t.items.find(i => i.productId === productId);
        if (item) outgoing += item.quantity;
      } else if (t.type === 'return' || t.type === 'deposit_return') {
        const item = t.items.find(i => i.productId === productId);
        if (item) incoming += item.quantity;
      }
    });

    return { incoming, outgoing };
  };

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
              <th className="px-6 py-4 font-semibold text-sm">اسم الصنف</th>
              <th className="px-6 py-4 font-semibold text-sm">الرصيد الافتتاحي</th>
              <th className="px-6 py-4 font-semibold text-sm">وارد</th>
              <th className="px-6 py-4 font-semibold text-sm">صادر</th>
              <th className="px-6 py-4 font-semibold text-sm">صافي الرصيد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.filter(cat => selectedCategory === 'all' || selectedCategory === cat).map(cat => {
              const catProducts = filteredProducts.filter(p => p.category === cat);
              if (catProducts.length === 0) return null;
              
              return (
                <React.Fragment key={cat as string}>
                  <tr>
                    <td colSpan={6} className="px-6 py-3 bg-gray-100 font-bold text-center text-gray-800">
                      المجموعة: {cat}
                    </td>
                  </tr>
                  {catProducts.map(product => {
                    const { incoming, outgoing } = getProductStats(product.id);
                    const openingBalance = product.stock + outgoing - incoming;
                    return (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium font-mono text-blue-600">{product.id}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-gray-600">{openingBalance}</td>
                        <td className="px-6 py-4 text-green-600 font-medium">{incoming}</td>
                        <td className="px-6 py-4 text-red-600 font-medium">{outgoing}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${product.stock > 5 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {product.stock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
            
            {/* Uncategorized products if any */}
            {filteredProducts.filter(p => !p.category).length > 0 && (
                <React.Fragment>
                  <tr>
                    <td colSpan={6} className="px-6 py-3 bg-gray-100 font-bold text-center text-gray-800">
                      بدون مجموعة
                    </td>
                  </tr>
                  {filteredProducts.filter(p => !p.category).map(product => {
                    const { incoming, outgoing } = getProductStats(product.id);
                    const openingBalance = product.stock + outgoing - incoming;
                    return (
                      <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-medium font-mono text-blue-600">{product.id}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                        <td className="px-6 py-4 text-gray-600">{openingBalance}</td>
                        <td className="px-6 py-4 text-green-600 font-medium">{incoming}</td>
                        <td className="px-6 py-4 text-red-600 font-medium">{outgoing}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${product.stock > 5 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {product.stock}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
            )}

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
