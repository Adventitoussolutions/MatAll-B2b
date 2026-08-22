import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

interface LogisticsRate {
  rate: number;
  mode: string;
}

interface DeliveryWaiverRules {
  firstOrder?: {
    enabled: boolean;
    minOrderValue: number;
    maxWeightCategory: string;
    referredCount?: number;
  };
  lightOnly?: {
    enabled: boolean;
    minOrderValue: number;
  };
  mediumLight?: {
    enabled: boolean;
    minOrderValue: number;
  };
  smallOrderCap?: {
    enabled: boolean;
    maxValue: number;
    cappedCharge: number;
  };
}

interface Settings {
  isServiceEnabled: boolean;
  offlineMessage: string;
  useOperatingHours: boolean;
  serviceStartTime: string;
  serviceEndTime: string;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  platformFee: number;
  isCodEnabled: boolean;
  isPartPaymentEnabled: boolean;
  isFullPaymentEnabled: boolean;
  partPaymentPercentage: number;
  logisticsRates: {
    light: LogisticsRate;
    medium: LogisticsRate;
    heavy: LogisticsRate;
  };
  deliveryWaiverRules?: DeliveryWaiverRules;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  serverTimeOffset: number; // Offset in milliseconds
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/products/site/settings').catch(err => {
        console.warn('[SettingsContext] Failed to fetch settings, using local fallbacks:', err.message);
        return {
          headers: { date: new Date().toUTCString() },
          data: {
            isServiceEnabled: true,
            offlineMessage: 'Service is temporarily offline.',
            useOperatingHours: false,
            serviceStartTime: '08:00',
            serviceEndTime: '20:00',
            deliveryCharge: 150,
            freeDeliveryThreshold: 2000,
            platformFee: 20,
            isCodEnabled: true,
            isPartPaymentEnabled: true,
            isFullPaymentEnabled: true,
            partPaymentPercentage: 25,
            logisticsRates: {
              light: { rate: 100, mode: 'Bike' },
              medium: { rate: 300, mode: 'Three-Wheeler' },
              heavy: { rate: 800, mode: 'Truck' }
            }
          }
        };
      });
      
      // Capture server time offset to handle timezone mismatches between device and server
      const serverDateHeader = response.headers.date;
      if (serverDateHeader) {
        const serverTime = new Date(serverDateHeader).getTime();
        const localTime = Date.now();
        setServerTimeOffset(serverTime - localTime);
      }
      
      setSettings(response.data);
    } catch (err) {
      console.error('[SettingsContext] Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, serverTimeOffset }}>
      {children}
    </SettingsContext.Provider>
  );
};


export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
