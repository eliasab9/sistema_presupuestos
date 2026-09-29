/**
 * Threading RFC 5322: engancha el mail del presupuesto al hilo donde el cliente
 * lo pidió. Es opcional — cuando el pedido llegó por teléfono o WhatsApp no hay
 * nada que pegar y el mail sale como conversación nueva.
 *
 * Funciona igual en Outlook y en Gmail: los dos agrupan por `In-Reply-To` /
 * `References`, no por un id propietario.
 */
import type { EmailThreadRef } from '@/types/delivery';

/** Un solo Message-ID, de punta a punta. Sirve para validar. */
const MESSAGE_ID_EXACT = /^<[^<>@\s]+@[^<>@\s]+>$/;
/** Todos los Message-ID sueltos dentro de un texto. Sirve para extraer. */
const MESSAGE_ID_ALL = /<[^<>@\s]+@[^<>@\s]+>/g;
/** `Re:`, `RE:`, `Rv:`, `Fwd:`, `RE[2]:` … al principio del asunto. */
const REPLY_PREFIX = /^\s*(re|rv|fwd|fw)\s*(\[\d+\])?\s*:\s*/i;

/**
 * Deshace el "folding" de los encabezados: una línea que arranca con espacio o
 * tab es continuación de la anterior. Sin esto, un `References` largo (que el
 * cliente de mail parte en varias líneas) se lee cortado.
 */
function unfold(raw: string): string {
  return raw.replace(/\r\n/g, '\n').replace(/\n[ \t]+/g, ' ');
}

function readHeader(unfolded: string, name: string): string | null {
  const re = new RegExp(`^${name}\\s*:\\s*(.*)$`, 'im');
  const match = unfolded.match(re);
  return match ? match[1].trim() : null;
}

/** Agrega los `<>` si faltan y descarta lo que no sea un Message-ID válido. */
function normalizeMessageId(raw: string): string | null {
  const trimmed = raw.trim();
  const withBrackets = trimmed.startsWith('<') ? trimmed : `<${trimmed}>`;
  return MESSAGE_ID_EXACT.test(withBrackets) ? withBrackets : null;
}

/** Deja una cadena `References` limpia: IDs válidos, sin repetir, separados por espacio. */
function normalizeReferences(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const ids = raw.match(MESSAGE_ID_ALL);
  if (!ids || ids.length === 0) return undefined;
  return Array.from(new Set(ids)).join(' ');
}

/** Saca todos los `Re:` / `Fwd:` acumulados al principio del asunto. */
export function stripReplyPrefix(subject: string): string {
  let result = subject.trim();
  while (REPLY_PREFIX.test(result)) {
    result = result.replace(REPLY_PREFIX, '').trim();
  }
  return result;
}

/**
 * Lee lo que el usuario pegó en el panel de envío. Acepta tanto los encabezados
 * completos del mail original como un Message-ID suelto.
 * Devuelve `null` si no hay un Message-ID usable: en ese caso el mail sale como
 * conversación nueva, sin encabezados de hilo.
 */
export function parseEmailThreadRef(raw: string): EmailThreadRef | null {
  if (!raw || !raw.trim()) return null;

  const unfolded = unfold(raw);

  // Message-ID del encabezado, o el texto pelado si pegaron sólo el ID.
  const headerId = readHeader(unfolded, 'Message-ID');
  const looseId = unfolded.match(MESSAGE_ID_ALL)?.[0];
  const messageId = normalizeMessageId(headerId ?? looseId ?? unfolded);
  if (!messageId) return null;

  // La cadena del padre: preferimos su References; si no lo tiene, su In-Reply-To.
  const parentChain =
    normalizeReferences(readHeader(unfolded, 'References')) ??
    normalizeReferences(readHeader(unfolded, 'In-Reply-To'));
  // El propio Message-ID no forma parte de la cadena heredada.
  const references = parentChain
    ? normalizeReferences(parentChain.split(' ').filter((id) => id !== messageId).join(' '))
    : undefined;

  const rawSubject = readHeader(unfolded, 'Subject');
  const subject = rawSubject ? stripReplyPrefix(rawSubject) || undefined : undefined;

  return { messageId, references, subject };
}

/**
 * Encabezados que van en el mail de respuesta. `References` es la cadena del
 * padre más el padre mismo, que es lo que los clientes usan para armar el árbol.
 */
export function buildReplyHeaders(thread: EmailThreadRef): {
  inReplyTo: string;
  references: string;
} {
  const chain = thread.references ? thread.references.split(/\s+/).filter(Boolean) : [];
  chain.push(thread.messageId);
  return {
    inReplyTo: thread.messageId,
    references: Array.from(new Set(chain)).join(' '),
  };
}

/** `Re: <asunto original>`, sin encadenar `Re: Re:`. */
export function buildReplySubject(subject: string): string {
  return `Re: ${stripReplyPrefix(subject)}`;
}
