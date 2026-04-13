'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useGoogleDrive } from '@/hooks/use-google-drive';
import type { Budget } from '@/types/budget';
import { 
  Cloud, 
  CloudOff, 
  Loader2, 
  Check, 
  AlertCircle,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface GoogleDriveUploadButtonProps {
  budget: Budget;
  getPdfBlob: () => Promise<Blob>;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function GoogleDriveUploadButton({
  budget,
  getPdfBlob,
  className,
  variant = 'outline',
}: GoogleDriveUploadButtonProps) {
  const {
    isAuthenticated,
    isLoading,
    isUploading,
    error,
    lastUploadResult,
    authenticate,
    disconnect,
    uploadBudget,
    clearUploadResult,
  } = useGoogleDrive();

  const [showPopover, setShowPopover] = useState(false);

  const handleUpload = async () => {
    try {
      const pdfBlob = await getPdfBlob();
      await uploadBudget(budget, pdfBlob);
      setShowPopover(true);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  // Loading state — verificando service account
  if (isLoading) {
    return (
      <Button variant={variant} disabled className={className}>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Drive...
      </Button>
    );
  }

  // Service account no configurada
  if (!isAuthenticated) {
    return (
      <Button variant={variant} disabled className={`${className} opacity-50`} title={error || 'GOOGLE_SERVICE_ACCOUNT_KEY no configurado'}>
        <CloudOff className="w-4 h-4 mr-2" />
        Drive no disponible
      </Button>
    );
  }

  // Listo para subir — show upload button with popover for results
  return (
    <Popover open={showPopover} onOpenChange={setShowPopover}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          onClick={handleUpload}
          disabled={isUploading}
          className={className}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Subiendo...
            </>
          ) : lastUploadResult?.success ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-600" />
              Archivado
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
              Error
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 mr-2" />
              Archivar en Drive
            </>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        {lastUploadResult?.success ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span className="font-medium">Archivo guardado</span>
            </div>
            <p className="text-sm text-muted-foreground">
              El presupuesto se archivó correctamente en Google Drive.
            </p>
            {lastUploadResult.webViewLink && (
              <a
                href={lastUploadResult.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Ver en Google Drive
              </a>
            )}
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearUploadResult();
                  setShowPopover(false);
                }}
              >
                Cerrar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnect}
                className="text-muted-foreground"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Desconectar
              </Button>
            </div>
          </div>
        ) : error || lastUploadResult?.error ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Error al subir</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {error || lastUploadResult?.error}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpload}
              >
                Reintentar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPopover(false)}
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Compact version for inline use
export function GoogleDriveStatus() {
  const { isAuthenticated, isLoading, authenticate, disconnect } = useGoogleDrive();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Verificando conexión...</span>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-green-600">
          <Cloud className="w-4 h-4" />
          <span>Conectado a Drive</span>
        </div>
        <Button variant="ghost" size="sm" onClick={disconnect}>
          <CloudOff className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="sm" onClick={authenticate}>
      <Cloud className="w-4 h-4 mr-1" />
      Conectar Google Drive
    </Button>
  );
}
