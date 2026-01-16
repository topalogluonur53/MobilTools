import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: string;
    phone_number: string;
    username?: string;
    full_name?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, access: string, refresh: string) => void;
    logout: () => void;
    clearAll: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            setAuth: (user, access, refresh) =>
                set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true }),
            logout: () => {
                // Auth state'i temizle
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });

                // Sadece auth tokenları temizlenmeli, kayıtlı bilgiler (rememberMe) korunmalı
                if (typeof window !== 'undefined') {
                    // Sadece auth-storage temizlenir, diğerleri kalır
                    localStorage.removeItem('auth-storage');

                    // Eğer beni hatırla seçili DEĞİLSE kayıtlı bilgileri de sil
                    if (localStorage.getItem('rememberMe') !== 'true') {
                        localStorage.removeItem('savedPhoneNumber');
                        localStorage.removeItem('savedPassword');
                        localStorage.removeItem('rememberMe');
                    }
                }
            },
            clearAll: () => {
                // Tüm state ve storage'ı temizle
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
                if (typeof window !== 'undefined') {
                    localStorage.clear();
                }
            }
        }),
        {
            name: 'auth-storage',
        }
    )
);
