// Google Drive integration module - OAuth based
// Uses API routes for user-authenticated operations

import type { DriveUploadResult } from '@/types/delivery';

export interface DriveFolderResult {
  success: boolean;
  folderId?: string;
  folderName?: string;
  existed?: boolean;
  error?: string;
}

/**
 * Upload a file to Google Drive using OAuth
 * 
 * @param file - The file blob to upload
 * @param fileName - Name for the file in Drive
 * @param folderId - Google Drive folder ID (root folder)
 * @param folderPath - Optional subfolder path (e.g., "2026/ClientName")
 */
export async function uploadFileToDrive(
  file: Blob,
  fileName: string,
  folderId: string,
  folderPath?: string
): Promise<DriveUploadResult> {
  console.log(`[GoogleDrive] Uploading file: ${fileName} to folder: ${folderId}`);
  
  try {
    // Determine MIME type
    let mimeType = 'application/octet-stream';
    if (fileName.endsWith('.pdf')) {
      mimeType = 'application/pdf';
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Create FormData for the upload
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('fileName', fileName);
    formData.append('rootFolderId', folderId);
    formData.append('mimeType', mimeType);
    if (folderPath) {
      formData.append('folderPath', folderPath);
    }

    // Call the OAuth API route
    const response = await fetch('/api/google-drive/upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('[GoogleDrive] Upload failed:', result.error);
      return {
        success: false,
        error: result.error || 'Error al subir archivo a Google Drive',
      };
    }

    console.log(`[GoogleDrive] File uploaded successfully: ${result.fileId}`);
    
    return {
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      fullPath: `/${fileName}`,
    };
    
  } catch (error) {
    console.error('[GoogleDrive] Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión al subir archivo',
    };
  }
}

/**
 * Check authentication status
 */
export async function checkDriveAuth(): Promise<{
  isAuthenticated: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const response = await fetch('/api/google-drive/status');
    const result = await response.json();
    
    return {
      isAuthenticated: result.isAuthenticated || false,
      email: result.email,
    };
  } catch (error) {
    return {
      isAuthenticated: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

/**
 * Get the web view URL for a file
 */
export function getDriveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Get the web view URL for a folder
 */
export function getDriveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

/**
 * Start OAuth authentication flow
 */
export function startDriveAuth(): void {
  window.location.href = '/api/google-drive/auth';
}
