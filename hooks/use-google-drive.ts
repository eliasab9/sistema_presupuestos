'use client';

/**
 * useGoogleDrive — Service Account edition
 *
 * No requiere OAuth ni login del usuario.
 * Simplemente verifica que GOOGLE_SERVICE_ACCOUNT_KEY esté configurado
 * y sube archivos directamente a Drive.
 */
import { useState, useEffect, useCallback } from 'react';
import type { Budget } from '@/types/budget';
import { COMPANIES } from '@/types/budget';

interface GoogleDriveState {
  isAuthenticated: boolean;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  lastUploadResult: {
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    error?: string;
  } | null;
}

export function useGoogleDrive() {
  const [state, setState] = useState<GoogleDriveState>({
    isAuthenticated: false,
    isLoading: true,
    isUploading: false,
    error: null,
    lastUploadResult: null,
  });

  // Verifica que la service account esté configurada en el servidor
  const checkAuthStatus = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch('/api/google-drive/status');
      const data = await res.json() as { isAuthenticated: boolean; error?: string };
      setState(prev => ({
        ...prev,
        isAuthenticated: data.isAuthenticated,
        isLoading: false,
        error: data.isAuthenticated ? null : (data.error || 'Service Account no configurada'),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error al verificar Drive',
      }));
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Sube el PDF de un presupuesto a la carpeta correcta de Drive
  const uploadBudget = useCallback(async (
    budget: Budget,
    pdfBlob: Blob,
    options?: { folderPath?: string; fileName?: string }
  ) => {
    setState(prev => ({ ...prev, isUploading: true, error: null, lastUploadResult: null }));

    try {
      const company = COMPANIES[budget.companyId];
      const date    = budget.meta.date.replace(/\//g, '-');
      const defaultFileName   = `Presupuesto_${company.name}_${budget.meta.number}_${date}.pdf`;
      const year              = new Date().getFullYear().toString();
      const clientName        = budget.customer.name || 'Sin Cliente';
      const defaultFolderPath = `${year}/${clientName}`;

      const formData = new FormData();
      formData.append('file',          pdfBlob);
      formData.append('fileName',      options?.fileName   || defaultFileName);
      formData.append('folderPath',    options?.folderPath || defaultFolderPath);
      formData.append('rootFolderId',  company.driveFolderId);
      formData.append('mimeType',      'application/pdf');

      const res    = await fetch('/api/google-drive/upload', { method: 'POST', body: formData });
      const result = await res.json() as { success: boolean; fileId?: string; webViewLink?: string; error?: string };

      setState(prev => ({
        ...prev,
        isUploading: false,
        lastUploadResult: result,
        error: result.success ? null : (result.error || 'Error al subir'),
      }));
      return result;

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al subir a Drive';
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: msg,
        lastUploadResult: { success: false, error: msg },
      }));
      return { success: false, error: msg };
    }
  }, []);

  const clearError        = useCallback(() => setState(prev => ({ ...prev, error: null })), []);
  const clearUploadResult = useCallback(() => setState(prev => ({ ...prev, lastUploadResult: null })), []);

  // Stub para compatibilidad con componentes que usan authenticate/disconnect
  const authenticate = useCallback(() => checkAuthStatus(), [checkAuthStatus]);
  const disconnect   = useCallback(() => setState(prev => ({ ...prev, lastUploadResult: null })), []);

  return {
    ...state,
    authenticate,
    disconnect,
    uploadBudget,
    checkAuthStatus,
    clearError,
    clearUploadResult,
  };
}
