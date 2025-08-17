// Video provider configuration
// Client-side provider detection (safe for browser)
export const getClientVideoProvider = () => {
  return (import.meta.env.VITE_VIDEO_PROVIDER || 'mux').toLowerCase();
};

// Use client-side provider for browser environment
export const VIDEO_PROVIDER = getClientVideoProvider();
export const isMux = VIDEO_PROVIDER === 'mux';
export const isCloudflare = VIDEO_PROVIDER === 'cloudflare';

export const isClientMux = () => getClientVideoProvider() === 'mux';
export const isClientCloudflare = () => getClientVideoProvider() === 'cloudflare';

// Server-side provider detection (for edge functions only)
// This is only used in Deno edge functions, not in the client bundle
export const getServerVideoProvider = () => {
  return 'mux'; // Default for client-side builds
};