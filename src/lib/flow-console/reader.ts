import { decode, encode } from 'he';
import linkifyHtml from 'linkify-html';
import sanitizeHtml from 'sanitize-html';
import { cleanReplyBody } from './mail';
import type { MailMessage, MailThread } from './types';

const allowedTags = [
  'a', 'b', 'blockquote', 'br', 'center', 'code', 'dd', 'del', 'div', 'dl',
  'dt', 'em', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img',
  'li', 'ol', 'p', 'pre', 's', 'small', 'span', 'strong', 'sub', 'sup',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul',
  // Email layout primitives
  'head', 'style', 'meta', 'title',
];

const allowedAttributes = {
  a: ['href', 'title', 'target', 'rel'],
  img: ['alt', 'height', 'src', 'title', 'width'],
  meta: ['name', 'content', 'charset', 'http-equiv'],
  '*': [
    'align', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'class',
    'colspan', 'height', 'role', 'rowspan', 'valign', 'width',
    // Preserve inline styles (javascript: expressions are blocked below)
    'style',
  ],
};

export function renderReaderMessageHtml(message: MailMessage) {
  if (message.html?.trim()) {
    return linkifyHtmlText(sanitizeReaderHtml(message.html));
  }

  return linkifyPlainText(cleanReplyBody(message.body || message.preview || ''));
}

export function renderReaderPrintDocument(thread: MailThread) {
  const messages = thread.messages
    .map(
      message => `
        <section class="message">
          <header>
            <strong>${escapeHtml(message.name)}</strong>
            <span>${escapeHtml(message.from)}</span>
            <time>${escapeHtml(new Date(message.date).toLocaleString())}</time>
          </header>
          <div class="body">${renderReaderMessageHtml(message)}</div>
        </section>
      `,
    )
    .join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(thread.subject)}</title>
    <style>
      body { color: #202124; font-family: Arial, sans-serif; margin: 32px; }
      h1 { font-size: 24px; font-weight: 500; margin: 0 0 24px; }
      .message { border-top: 1px solid #e5e7eb; padding: 18px 0; }
      .message:first-of-type { border-top: 0; }
      header { display: grid; gap: 4px; margin-bottom: 18px; }
      header span, time { color: #5f6368; font-size: 12px; }
      .body { font-size: 14px; line-height: 1.65; max-width: 900px; }
      img, table { max-width: 100%; }
      a { color: #0f766e; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(thread.subject)}</h1>
    ${messages}
  </body>
</html>`;
}

/** Strip javascript: expressions from inline style values before they reach the DOM */
function sanitizeStyleAttr(value: string) {
  return value.replace(/expression\s*\(/gi, '').replace(/javascript\s*:/gi, '');
}

export function sanitizeReaderHtml(value: string) {
  return sanitizeHtml(decode(value), {
    allowedTags: false as unknown as string[], // allow ALL tags — iframe renders in sandbox
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'cid'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
      img: ['http', 'https', 'cid'],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    // Strip javascript: from style values to prevent CSS-based XSS
    transformTags: {
      '*': (tagName, attribs) => ({
        tagName,
        attribs: attribs['style']
          ? { ...attribs, style: sanitizeStyleAttr(attribs['style']) }
          : attribs,
      }),
    },
  });
}

function extractBody(value: string) {
  const match = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1] || value;
}

function linkifyPlainText(value: string) {
  return linkifyHtml(escapeHtml(value), {
    rel: 'noreferrer noopener',
    target: '_blank',
  }).replace(/\r?\n/g, '<br />');
}

function linkifyHtmlText(value: string) {
  return linkifyHtml(value, {
    rel: 'noreferrer noopener',
    target: '_blank',
  });
}

function escapeHtml(value: string) {
  return encode(value);
}
