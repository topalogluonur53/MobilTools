import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production URL
export const API_URL = 'https://mobil.onurtopaloglu.uk/api';
// Local testing URL (Physical device)
// export const API_URL = 'http://192.168.1.100:8001/api'; 
// Emulator URL
// export const API_URL = 'http://10.0.2.2:8001/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Add token
api.interceptors.request.use(
    async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`; // CHANGED to Bearer
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            await AsyncStorage.removeItem('authToken');
            // User will be redirected to login by the navigation flow
        }
        return Promise.reject(error);
    }
);

export default api;
