export const getFullImageUrl = (path: any): string => {
  // 1. Handle empty or null paths
  if (!path) {
    return 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecb?auto=format&fit=crop&q=80&w=200';
  }

  // 2. If path is an array, take the first element
  if (Array.isArray(path)) {
    return getFullImageUrl(path[0]);
  }

  // 3. If it's already a full URL, return it
  if (typeof path === 'string' && (path.startsWith('http') || path.startsWith('data:'))) {
    return path;
  }

  // 4. Get base URL from environment
  let baseUrl = (process.env.EXPO_PUBLIC_API_URL || 'https://api.matall.app').replace(/\/$/, '');

  // 5. Clean the path
  const cleanPath = path.toString().startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
};
