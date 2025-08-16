import { toast } from 'sonner';

export interface AppError extends Error {
  code?: string;
  status?: number;
  details?: any;
}

export const createAppError = (message: string, code?: string, status?: number): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  error.status = status;
  return error;
};

export const handleSupabaseError = (error: any): void => {
  console.error('Supabase error:', error);
  
  if (error?.code === 'PGRST116') {
    toast.error('Access denied. You don\'t have permission to perform this action.');
    return;
  }

  if (error?.code === 'PGRST301') {
    toast.error('Resource not found. The requested item may have been deleted.');
    return;
  }

  if (error?.message?.includes('JWT')) {
    toast.error('Session expired. Please sign in again.');
    return;
  }

  if (error?.message?.includes('RLS')) {
    toast.error('Access denied. You don\'t have permission to view this data.');
    return;
  }

  if (error?.message?.includes('connection')) {
    toast.error('Connection error. Please check your internet connection.');
    return;
  }

  // Generic error
  toast.error(error?.message || 'An unexpected error occurred. Please try again.');
};

export const handleNetworkError = (): void => {
  toast.error('Network error. Please check your connection and try again.');
};

export const handleEnvError = (missingVars: string[]): void => {
  console.error('Missing environment variables:', missingVars);
  toast.error('Application configuration error. Please contact support.');
};

export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  customErrorHandler?: (error: any) => void
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    if (customErrorHandler) {
      customErrorHandler(error);
    } else {
      handleSupabaseError(error);
    }
    return null;
  }
};