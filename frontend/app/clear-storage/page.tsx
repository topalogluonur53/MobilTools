'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

export default function ClearStoragePage() {
    const clearAll = useAuthStore((state) => state.clearAll);
    const router = useRouter();

    useEffect(() => {
        // Tüm storage'ı temizle
        clearAll();

        // 2 saniye sonra login'e yönlendir
        setTimeout(() => {
            router.push('/login');
        }, 2000);
    }, [clearAll, router]);

    return (
        <div className="flex bg-white dark:bg-black min-h-screen items-center justify-center p-4">
            <div className="text-center">
                <div className="mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Temizleniyor...
                </h1>
                <p className="text-gray-500">
                    Tüm veriler temizleniyor. Giriş sayfasına yönlendiriliyorsunuz.
                </p>
            </div>
        </div>
    );
}
