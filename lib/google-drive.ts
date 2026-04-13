// Google Drive OAuth and API utilities

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
];

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_DRIVE_API = 'https://www.googleapis.com/drive/v3';
export const GOOGLE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type: string;
}

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  webViewLink?: string;
  error?: string;
}

/**
 * Build the Google OAuth authorization URL
 */
export function buildAuthUrl(redirectUri: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state && { state }),
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Keep the original refresh token
    expires_at: Date.now() + (data.expires_in * 1000),
    token_type: data.token_type,
  };
}

/**
 * Find or create a folder in Google Drive
 */
export async function findOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  // Search for existing folder
  const query = parentId
    ? `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const searchResponse = await fetch(
    `${GOOGLE_DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    throw new Error('Failed to search for folder');
  }

  const searchData = await searchResponse.json();
  
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const createResponse = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!createResponse.ok) {
    throw new Error('Failed to create folder');
  }

  const createData = await createResponse.json();
  return createData.id;
}

/**
 * Upload a file to Google Drive using multipart upload
 */
export async function uploadFileToDrive(
  accessToken: string,
  fileName: string,
  fileContent: Blob,
  folderId: string,
  mimeType: string = 'application/pdf'
): Promise<DriveUploadResult> {
  try {
    const metadata = {
      name: fileName,
      parents: [folderId],
    };

    // Create multipart body
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = 
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const arrayBuffer = await fileContent.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Build the multipart body
    const metadataBytes = new TextEncoder().encode(metadataPart);
    const contentTypeHeader = new TextEncoder().encode(
      delimiter + `Content-Type: ${mimeType}\r\n\r\n`
    );
    const closeBytes = new TextEncoder().encode(closeDelimiter);

    // Combine all parts
    const body = new Uint8Array(
      metadataBytes.length + contentTypeHeader.length + uint8Array.length + closeBytes.length
    );
    body.set(metadataBytes, 0);
    body.set(contentTypeHeader, metadataBytes.length);
    body.set(uint8Array, metadataBytes.length + contentTypeHeader.length);
    body.set(closeBytes, metadataBytes.length + contentTypeHeader.length + uint8Array.length);

    const uploadResponse = await fetch(
      `${GOOGLE_UPLOAD_API}/files?uploadType=multipart&fields=id,webViewLink`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: body,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();

    return {
      success: true,
      fileId: uploadData.id,
      webViewLink: uploadData.webViewLink,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown upload error',
    };
  }
}

/**
 * Parse a folder path and create nested folders
 * Returns the ID of the deepest folder
 */
export async function ensureFolderPath(
  accessToken: string,
  folderPath: string,
  rootFolderId?: string
): Promise<string> {
  const parts = folderPath.split('/').filter(Boolean);
  let currentParentId = rootFolderId;

  for (const folderName of parts) {
    currentParentId = await findOrCreateFolder(accessToken, folderName, currentParentId);
  }

  return currentParentId || '';
}

/**
 * Main function to upload a budget PDF to Google Drive
 * - Receives the budget object, PDF blob, and target folder path
 * - Creates folder structure if needed (Year/Client)
 * - Uses the company's root folder ID from COMPANIES config
 */
export async function uploadBudgetToDrive(
  accessToken: string,
  budget: { 
    companyId: string;
    meta: { number: string; date: string };
    customer: { name: string };
  },
  pdfBlob: Blob,
  folderPath?: string
): Promise<DriveUploadResult> {
  try {
    // Import COMPANIES to get the root folder ID
    const { COMPANIES } = await import('@/types/budget');
    const company = COMPANIES[budget.companyId as keyof typeof COMPANIES];
    
    if (!company) {
      return {
        success: false,
        error: `Empresa no encontrada: ${budget.companyId}`,
      };
    }

    // Use company's Drive folder ID as root
    const rootFolderId = company.driveFolderId;
    
    // Build folder path: Year/ClientName (or use custom folderPath)
    const year = new Date().getFullYear().toString();
    const clientName = budget.customer.name || 'Sin Cliente';
    const targetPath = folderPath || `${year}/${clientName}`;
    
    // Ensure folder structure exists and get final folder ID
    const targetFolderId = await ensureFolderPath(accessToken, targetPath, rootFolderId);
    
    // Build filename: Presupuesto_[numero]_[cliente]_[fecha].pdf
    const safeClientName = (budget.customer.name || 'SinCliente').replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
    const safeDate = budget.meta.date.replace(/\//g, '-');
    const fileName = `Presupuesto_${budget.meta.number}_${safeClientName}_${safeDate}.pdf`;
    
    // Upload file
    return await uploadFileToDrive(
      accessToken,
      fileName,
      pdfBlob,
      targetFolderId,
      'application/pdf'
    );
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al subir presupuesto',
    };
  }
}

/**
 * Build the default folder path for a budget
 */
export function buildBudgetFolderPath(budget: {
  customer: { name: string };
}): string {
  const year = new Date().getFullYear().toString();
  const clientName = budget.customer.name || 'Sin Cliente';
  return `${year}/${clientName}`;
}
