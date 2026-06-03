import type { ComposeAttachment } from './types';

export function escapeEditorHtml(value: string) {
  return value.replace(/[&<>"']/g, char => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return map[char];
  });
}

export function newComposeId(prefix: string) {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function fileToComposeAttachment(file: File, inline = false) {
  return new Promise<ComposeAttachment>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error(`${file.name} could not be read.`));
    reader.onload = () => {
      const result = String(reader.result || '');
      const content = result.includes(',') ? result.split(',')[1] : result;
      const id = newComposeId('attachment');

      resolve({
        content,
        contentId: inline ? newComposeId('flow-inline').slice(0, 120) : undefined,
        contentType: file.type || undefined,
        filename: file.name || 'attachment',
        id,
        inline,
        size: file.size,
      });
    };

    reader.readAsDataURL(file);
  });
}

export function parseRecipients(value: string) {
  return [
    ...new Set(
      value
        .split(/[,\s;]+/)
        .map(item => item.trim())
        .filter(item => /^\S+@\S+\.\S+$/.test(item)),
    ),
  ];
}
