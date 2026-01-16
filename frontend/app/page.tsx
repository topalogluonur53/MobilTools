'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Cloud, LogOut, HardHat } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, logout, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-black dark:text-white">Uygulamalar</h1>
          <p className="text-gray-500 mt-1">Merhaba, {user?.username || user?.phone_number}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-3 bg-white dark:bg-[#1C1C1E] rounded-full shadow-sm active:scale-95 transition-transform"
        >
          <LogOut size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

        {/* ooCloud App Icon */}
        <button
          onClick={() => router.push('/ooCloud')}
          className="group flex flex-col items-center gap-3 p-4 bg-transparent border-0 outline-none"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[22px] shadow-lg flex items-center justify-center group-active:scale-95 transition-transform duration-200">
            <Cloud className="text-white w-10 h-10" />
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">ooCloud</span>
        </button>

        {/* Mobil Şantiye App Icon */}
        <button
          onClick={() => window.location.href = 'https://onurtopaloglu.uk'}
          className="group flex flex-col items-center gap-3 p-4 bg-transparent border-0 outline-none"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-[22px] shadow-lg flex items-center justify-center group-active:scale-95 transition-transform duration-200">
            <HardHat className="text-white w-10 h-10" />
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">Mobil Şantiye</span>
        </button>

        {/* Placeholder for future apps */}
        {/* <div className="flex flex-col items-center gap-3 opacity-30 grayscale">
          <div className="w-20 h-20 bg-gray-300 rounded-[22px] shadow-sm flex items-center justify-center">
            <div className="w-10 h-10 bg-gray-400 rounded-lg" />
          </div>
          <span className="font-medium text-sm text-gray-900 dark:text-white">Yakında</span>
        </div> */}

      </div>
    </div>
  );
}
