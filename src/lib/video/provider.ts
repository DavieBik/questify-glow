// Video provider configuration
// Server-side provider detection (for edge functions)
export const getServerVideoProvider = () => {
  if (typeof process !== 'undefined' && process.env) {
    return (process.env.VIDEO_PROVIDER || 'mux').toLowerCase();
  }
  return 'mux';
};

// Client-side provider detection
export const getClientVideoProvider = () => {
  return (import.meta.env.VITE_VIDEO_PROVIDER || 'mux').toLowerCase();
};

// Use client-side provider for browser environment
export const VIDEO_PROVIDER = getClientVideoProvider();
export const isMux = VIDEO_PROVIDER === 'mux';
export const isCloudflare = VIDEO_PROVIDER === 'cloudflare';

export const isClientMux = () => getClientVideoProvider() === 'mux';
export const isClientCloudflare = () => getClientVideoProvider() === 'cloudflare';