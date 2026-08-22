import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

type Product = {
  id: string;
  _id?: string;
  productId?: string;
  parentProductId?: string;
  name: string;
  brand?: string;
  price: number;
  image: string;
  imageUrl?: string;
  material?: string;
  delivery?: string;
  discount?: string;
};

type FavoritesContextType = {
  favorites: Product[];
  toggleFavorite: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  loading: boolean;
  refreshFavorites: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();

  const fetchFavorites = async () => {
    if (!user || !token) {
      setFavorites([]);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get('/api/auth/favorites').catch(err => {
        console.log('[FavoritesContext] Fetch favorites failed, using empty array', err.message);
        return { data: [] };
      });
      // Normalize if nested: some APIs return [{ product: {...} }]
      const normalized = data.map((item: any) => item.product ? { ...item.product, favoriteId: item._id } : item);
      setFavorites(normalized);
    } catch (err) {
      console.error('Failed to fetch favorites', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user?._id]);

  const toggleFavorite = async (product: any) => {
    if (!user) return;
    const productId = product.parentProductId || product._id || product.id;
    
    // Optimistic UI update
    const isAdded = isFavorite(productId);
    if (isAdded) {
      setFavorites(prev => prev.filter(p => 
        (p as any)._id !== productId && 
        p.id !== productId && 
        (p as any).parentProductId !== productId &&
        (p as any).productId !== productId
      ));
    } else {
      setFavorites(prev => [...prev, { ...product, id: productId }]);
    }

    try {
      await api.post('/api/auth/favorites/toggle', { productId });
      // Re-fetch to be sure sync with server
      fetchFavorites();
    } catch (err) {
      console.error('Failed to toggle favorite', err);
      // Revert if error? For now just re-fetch
      fetchFavorites();
    }
  };

  const isFavorite = (productId: string) => {
    return favorites.some(p => 
      (p as any)._id === productId || 
      p.id === productId || 
      (p as any).parentProductId === productId || 
      (p as any).productId === productId
    );
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading, refreshFavorites: fetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
