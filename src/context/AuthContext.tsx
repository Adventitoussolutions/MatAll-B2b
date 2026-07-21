import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState } from "react";
// import { API_URL } from '../config'; // Assuming there is an API_URL config, if not use a generic one
import api from '../services/api';

export interface UserProfile {
    _id: string;
    fullName: string;
    phoneNumber: string;
    role: string;
    b2bContractorId?: string;
    // Affiliate fields
    isAffiliate?: boolean;
    affiliateCode?: string;
    walletBalance?: number;
    totalReferredUsers?: number;
    totalPointsAwarded?: number;
    totalPointsRedeemed?: number;
    // B2B Contractor specific fields
    b2bContractor?: any;
    [key: string]: any;
}

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    token: string | null;
    fetchProfile: (currentToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: UserProfile | null) => void;
    setToken: (token: string | null) => void;
}

//createContext creates an object containing provider and consumer.
export const AuthContext = createContext<AuthContextType>({} as any);

//the provider
export const AuthProvider = ({ children }: any) => {

    const [user, setUser] = useState<UserProfile | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const fetchProfile = async (currentToken?: string) => {
        const activeToken = currentToken || token;
        if (!activeToken) return;

        try {
            // Use the centralized api service which handles baseURL and errors automatically
            const response = await api.get('/api/b2b/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${activeToken}`
                }
            });
            
            const data = response.data;
            console.log('[AuthContext] Fetched Profile:', data.user);
            setUser({ ...data.user, b2bContractor: data.b2bContractor });
        } catch (error: any) {
            console.error('Failed to fetch profile', error.response?.data || error.message);
            // Handle invalid token scenario, maybe logout
            // await SecureStore.deleteItemAsync('token');
            // setToken(null);
            // setUser(null);
        }
    };

    useEffect(() => {
        async function checkLoginStatus() {
            try {
                const storedToken = await SecureStore.getItemAsync('token');
                if (storedToken) {
                    setToken(storedToken);
                    await fetchProfile(storedToken);
                }
            } catch (error) {
                console.error("Error reading token", error);
            } finally {
                setIsLoading(false);
            }
        }
        checkLoginStatus();
    }, []);

    const logout = async () => {
        await SecureStore.deleteItemAsync('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, token, fetchProfile, logout, setUser, setToken }}>
            {children}
        </AuthContext.Provider>
    );
}

//consumer
//custom hook is a function always returns a hook
export const useAuth = () => {
    return useContext(AuthContext);
};