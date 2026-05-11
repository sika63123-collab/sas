import React, { useState } from 'react';
import { useAppStore } from '../store';

export function Login() {
  const [code, setCode] = useState('');
  const { login } = useAppStore();

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.trim() === '') return;
    
    const success = login(code);
    if (!success) {
      alert('كود الدخول غير صحيح!');
      setCode('');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#b0bec5]" dir="rtl">
        <div className="bg-white p-10 shadow-xl border border-gray-400 max-w-sm w-full text-center">
            <h1 className="text-3xl font-bold text-blue-800 mb-8" style={{ textShadow: '1px 1px 0px white' }}>تسجيل الدخول</h1>
            
            <form onSubmit={handleLogin} className="space-y-6">
                <div>
                   <label className="block text-xl font-bold mb-4 text-gray-800">كود المستخدم</label>
                   <input 
                      type="password" 
                      className="w-full text-center text-4xl h-16 border-2 border-gray-400 shadow-inner outline-none tracking-[1em]" 
                      maxLength={2}
                      value={code}
                      onChange={e => setCode(e.target.value)}
                      autoFocus
                   />
                </div>
                
                <button 
                   type="submit"
                   className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-3 shadow-md"
                >
                   دخول
                </button>
            </form>
        </div>
    </div>
  );
}
