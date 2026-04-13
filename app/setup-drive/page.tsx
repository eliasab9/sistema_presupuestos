'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { CheckCircle2, AlertCircle, HardDrive, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react';

function SetupContent() {
  const params        = useSearchParams();
  const refreshToken  = params.get('refresh_token');
  const success       = params.get('success') === 'true';
  const error         = params.get('error');
  const [copied, setCopied]   = useState(false);

  const handleCopy = async () => {
    if (!refreshToken) return;
    await navigator.clipboard.writeText(`GOOGLE_OAUTH_REFRESH_TOKEN=${refreshToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-md mb-4">
            <HardDrive className="h-7 w-7 text-slate-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Configurar Google Drive</h1>
          <p className="text-slate-500 mt-1 text-sm">Autorización única — 2 minutos</p>
        </div>

        {/* ── SUCCESS: mostrar refresh token ── */}
        {success && refreshToken && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">¡Autorización exitosa!</span>
            </div>
            <p className="text-sm text-slate-600">
              Copiá esta línea y pegala en tu archivo <code className="bg-slate-100 px-1 rounded">.env.local</code>:
            </p>
            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 break-all relative">
              GOOGLE_OAUTH_REFRESH_TOKEN={refreshToken}
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                title="Copiar"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Después de pegar la línea en <code>.env.local</code>, reiniciá el servidor (<code>npm run dev</code>) y listo.
            </p>
            <a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
              Ir al Sistema de Presupuestos <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* ── ERROR ── */}
        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 space-y-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span className="font-semibold">Error de autorización</span>
            </div>
            <p className="text-sm text-slate-600 break-words">{decodeURIComponent(error)}</p>
            <a
              href="/api/google-drive/auth"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
            >
              Intentar de nuevo <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* ── INSTRUCCIONES (estado inicial) ── */}
        {!success && !error && (
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
            <h2 className="font-semibold text-slate-800">Antes de autorizar, necesitás:</h2>

            <ol className="space-y-4 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">1</span>
                <span>
                  En <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="w-3 h-3" /></a>, ir al proyecto <strong>presupuestos-492919</strong> →{' '}
                  <strong>APIs y servicios → Credenciales → + Crear credenciales → ID de cliente OAuth 2.0</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">2</span>
                <span>
                  Tipo: <strong>Aplicación web</strong>. En <strong>URIs de redireccionamiento autorizados</strong> agregar:{' '}
                  <code className="bg-slate-100 px-1 rounded">http://localhost:3000/api/google-drive/callback</code>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">3</span>
                <span>
                  Copiá el <strong>Client ID</strong> y <strong>Client Secret</strong> en <code className="bg-slate-100 px-1 rounded">.env.local</code>:
                </span>
              </li>
            </ol>

            <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-green-400 space-y-1">
              <p>GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com</p>
              <p>GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret</p>
            </div>

            <p className="text-xs text-slate-500">
              Reiniciá el servidor después de editar <code>.env.local</code>, y luego hacé click en Autorizar.
            </p>

            <a
              href="/api/google-drive/auth"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              Autorizar Google Drive con mi cuenta
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetupDrivePage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}
