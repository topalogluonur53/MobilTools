'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const setAuth = useAuthStore((state) => state.setAuth);

    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/core/auth/register/', {
                full_name: fullName,
                phone_number: phoneNumber,
                password: password
            });

            // Kayıt başarılı - token'ları kaydet ve giriş yap
            const { user, access, refresh } = res.data;
            setAuth(user, access, refresh);
            router.push('/');
        } catch (err: any) {
            if (err.response?.data) {
                // Backend'den gelen hataları göster
                const errors = err.response.data;
                if (errors.phone_number) {
                    setError(errors.phone_number[0]);
                } else if (errors.full_name) {
                    setError(errors.full_name[0]);
                } else if (errors.password) {
                    setError(errors.password[0]);
                } else if (errors.error) {
                    setError(errors.error);
                } else {
                    setError('Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.');
                }
            } else {
                setError('Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.');
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
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Kayıt Ol</h1>
                    <p className="text-gray-500 mt-2">Hesap oluşturun ve başlayın</p>
                </div>

                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleRegister}
                    className="space-y-4"
                >
                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ad Soyad</label>
                        <input
                            type="text"
                            required
                            placeholder="Onur Topaloğlu"
                            className="ios-input w-full text-black"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Telefon Numarası</label>
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
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Şifre Oluştur</label>
                        <input
                            type="password"
                            required
                            placeholder="En az 4 karakter"
                            minLength={4}
                            className="ios-input w-full text-black"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="ios-btn w-full disabled:opacity-50"
                    >
                        {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
                    </button>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Zaten hesabınız var mı?{' '}
                            <Link href="/login" className="text-blue-500 hover:text-blue-600 font-medium">
                                Giriş Yap
                            </Link>
                        </p>
                    </div>
                </motion.form>
            </div>
        </div>
    );
}
