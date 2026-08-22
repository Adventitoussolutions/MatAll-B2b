/**
 * Utility to check if the service is currently offline based on operating hours.
 * 
 * Note: If the backend and frontend have timezone mismatches, this check might 
 * diverge. The backend remains the source of truth (returning 403).
 */

export interface ServiceSettings {
  isServiceEnabled: boolean;
  useOperatingHours: boolean;
  serviceStartTime: string; // e.g., "09:00"
  serviceEndTime: string;   // e.g., "22:00"
}

export const isServiceOffline = (settings: ServiceSettings | null, serverTimeOffset: number = 0): boolean => {
  if (!settings) return false;
  if (!settings.isServiceEnabled) return true;

  if (settings.useOperatingHours && settings.serviceStartTime && settings.serviceEndTime) {
    // We use the server time (calculated via offset) to handle timezone mismatches
    const now = new Date(Date.now() + serverTimeOffset);
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = settings.serviceStartTime.split(':').map(Number);
    const [endH, endM] = settings.serviceEndTime.split(':').map(Number);

    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (startMin < endMin) {
      // Normal range: e.g., 09:00 to 22:00
      return currentMin < startMin || currentMin > endMin;
    } else {
      // Overnight shift case: e.g., 22:00 to 06:00
      // Online if: [startMin, 24:00) OR [00:00, endMin]
      // Offline if: (endMin, startMin)
      return currentMin < startMin && currentMin > endMin;
    }
  }

  return false;
};
