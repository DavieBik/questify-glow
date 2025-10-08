import { supabase } from "@/integrations/supabase/client";

/**
 * Phase 1: Certificate signed URL utilities
 * These functions are implemented but not yet active.
 * They will be activated in Phase 2 when the certificates bucket becomes private.
 */

const CERTIFICATES_BUCKET = 'certificates';
const SIGNED_URL_EXPIRY = 60 * 60; // 1 hour in seconds

export interface CertificateDownloadResult {
  success: boolean;
  url?: string;
  error?: string;
  usesSignedUrl: boolean;
}

/**
 * Get a download URL for a certificate PDF.
 * In Phase 1: Returns public URL (bucket is still public)
 * In Phase 2: Will return signed URL (bucket will be private)
 * 
 * @param storagePath - The storage path of the certificate (e.g., "user-uuid/cert-uuid.pdf")
 * @returns Download result with URL or error
 */
export async function getCertificateDownloadUrl(
  storagePath: string
): Promise<CertificateDownloadResult> {
  try {
    if (!storagePath) {
      return {
        success: false,
        error: 'No storage path provided',
        usesSignedUrl: false
      };
    }

    // Phase 1: Use public URL (bucket is still public)
    // Phase 2: This will switch to signed URL when bucket becomes private
    const useSignedUrl = false; // TODO: Set to true in Phase 2

    if (useSignedUrl) {
      // Generate signed URL with expiry
      const { data, error } = await supabase.storage
        .from(CERTIFICATES_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

      if (error) {
        console.error('Error generating signed URL:', error);
        return {
          success: false,
          error: error.message,
          usesSignedUrl: true
        };
      }

      return {
        success: true,
        url: data.signedUrl,
        usesSignedUrl: true
      };
    } else {
      // Phase 1: Use public URL (current behavior)
      const { data } = supabase.storage
        .from(CERTIFICATES_BUCKET)
        .getPublicUrl(storagePath);

      return {
        success: true,
        url: data.publicUrl,
        usesSignedUrl: false
      };
    }
  } catch (error) {
    console.error('Unexpected error in getCertificateDownloadUrl:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      usesSignedUrl: false
    };
  }
}

/**
 * Download a certificate file using the appropriate URL method
 * 
 * @param storagePath - The storage path of the certificate
 * @param certificateNumber - The certificate number for filename
 */
export async function downloadCertificate(
  storagePath: string,
  certificateNumber: string
): Promise<void> {
  const result = await getCertificateDownloadUrl(storagePath);

  if (!result.success || !result.url) {
    throw new Error(result.error || 'Failed to get download URL');
  }

  // Create temporary link and trigger download
  const link = document.createElement('a');
  link.href = result.url;
  link.download = `certificate-${certificateNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Check if a certificate file exists in storage
 * 
 * @param storagePath - The storage path to check
 */
export async function certificateExists(storagePath: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage
      .from(CERTIFICATES_BUCKET)
      .list(storagePath.split('/')[0], {
        search: storagePath.split('/')[1]
      });

    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}
