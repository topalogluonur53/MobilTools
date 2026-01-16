'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Load saved credentials from localStorage on mount
    useEffect(() => {
        const savedPhone = localStorage.getItem('savedPhoneNumber');
        const savedPassword = localStorage.getItem('savedPassword');
        const savedRemember = localStorage.getItem('rememberMe') === 'true';

        if (savedRemember && savedPhone) {
            setPhoneNumber(savedPhone);
            setRememberMe(true);
            if (savedPassword) {
                setPassword(savedPassword);
            }
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/core/auth/login/', {
                phone_number: phoneNumber,
                password: password
            });

            // Beni hatırla seçiliyse kaydet
            if (rememberMe) {
                localStorage.setItem('savedPhoneNumber', phoneNumber);
                localStorage.setItem('savedPassword', password);
                localStorage.setItem('rememberMe', 'true');
            } else {
                // Beni hatırla seçili değilse temizle
                localStorage.removeItem('savedPhoneNumber');
                localStorage.removeItem('savedPassword');
                localStorage.removeItem('rememberMe');
            }

            const { user, access, refresh } = res.data;
            setAuth(user, access, refresh);
            router.push('/');
        } catch (err: any) {
            if (err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError('Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-white dark:bg-black min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Giriş Yap</h1>
                    <p className="text-gray-500 mt-2">Dosyalarınıza erişmek için giriş yapın.</p>
                </div>

                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Telefon</label>
                        <input
                            type="text"
                            required
                            placeholder="5551234567"
                            className="ios-input w-full text-black"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Şifre</label>
                        <input
                            type="password"
                            required
                            placeholder="Şifrenizi girin"
                            className="ios-input w-full text-black"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {/* Beni Hatırla Checkbox */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="rememberMe"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="rememberMe" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Beni Hatırla
                        </label>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="ios-btn w-full disabled:opacity-50"
                    >
                        {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                    </button>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Hesabınız yok mu?{' '}
                            <Link href="/register" className="text-blue-500 hover:text-blue-600 font-medium">
                                Kayıt Ol
                            </Link>
                        </p>
                    </div>
                </motion.form>
            </div>
        </div>
    );
}
