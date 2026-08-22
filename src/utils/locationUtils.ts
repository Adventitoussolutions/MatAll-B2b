import { Jobsite } from '../context/AuthContext';

/**
 * Calculates the Haversine distance between two points in meters.
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (v: number) => (v * Math.PI) / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Finds a matching saved jobsite based on coordinates or address string.
 */
export const findMatchingJobsite = (
  jobsites: Jobsite[] | undefined,
  latitude: number,
  longitude: number,
  addressText?: string
): Jobsite | null => {
  if (!jobsites || jobsites.length === 0) return null;

  // 1. Try coordinate matching first (most accurate)
  for (const site of jobsites) {
    let sLat = 0, sLng = 0;
    
    if (site.location && site.location.coordinates) {
      sLng = site.location.coordinates[0];
      sLat = site.location.coordinates[1];
    } else if (site.coordinates) {
      sLat = site.coordinates.latitude || 0;
      sLng = site.coordinates.longitude || 0;
    }

    if (sLat && sLng) {
      const distance = calculateDistance(latitude, longitude, sLat, sLng);
      if (distance <= 50) { // Matching within 50m
        return site;
      }
    }
  }

  // 2. Fallback to address string matching if provided
  if (addressText) {
    const normalizedSearch = addressText.toLowerCase().trim();
    for (const site of jobsites) {
      const siteAddr = (site.addressText || site.fullAddress || site.address || '').toLowerCase().trim();
      if (siteAddr === normalizedSearch && siteAddr !== '') {
        return site;
      }
    }
  }

  return null;
};
