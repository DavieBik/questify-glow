// Video provider configuration
export const VIDEO_PROVIDER = (
  typeof process !== 'undefined' 
    ? process.env.VIDEO_PROVIDER 
    : import.meta.env.VITE_VIDEO_PROVIDER || 'mux'
).toLowerCase();

export const isMux = VIDEO_PROVIDER === 'mux';
export const isCloudflare = VIDEO_PROVIDER === 'cloudflare';

// Client-side provider detection
export const getClientVideoProvider = () => {
  return (import.meta.env.VITE_VIDEO_PROVIDER || 'mux').toLowerCase();
};

export const isClientMux = () => getClientVideoProvider() === 'mux';
export const isClientCloudflare = () => getClientVideoProvider() === 'cloudflare';