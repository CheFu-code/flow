import { decode, encode } from 'he';
import linkifyHtml from 'linkify-html';
import sanitizeHtml from 'sanitize-html';
import { cleanReplyBody } from './mail';
import type { MailMessage, MailThread } from './types';

// All standard presentational/structural HTML tags used in emails.
// Dangerous execution tags (script, iframe, object, embed, applet,
// frame, frameset, noscript) are intentionally omitted — the iframe
// sandbox blocks JS anyway, but we drop them at parse time too.
const EMAIL_ALLOWED_TAGS = [
  'a', 'abbr', 'article', 'aside', 'b', 'bdi', 'blockquote', 'br',
  'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'data',
  'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt', 'em',
  'figcaption', 'figure', 'font', 'footer', 'h1', 'h2', 'h3', 'h4',
  'h5', 'h6', 'head', 'header', 'hr', 'html', 'i', 'img', 'ins',
  'kbd', 'label', 'li', 'link', 'main', 'mark', 'meta', 'nav',
  'ol', 'p', 'pre', 'q', 's', 'samp', 'section', 'small', 'span',
  'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody',
  'td', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'u', 'ul',
  'var', 'wbr', 'body',
];

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

/**
 * Sanitize inbound email HTML for rendering inside a sandboxed iframe.
 *
 * Security model:
 *  - Execution tags (script, iframe, object, embed...) are dropped at parse time.
 *  - ALL attributes are preserved so inline styles, class names, data-* attrs,
 *    and table layout attrs survive untouched.
 *  - on* event handlers are stripped via transformTags.
 *  - javascript: and expression() in href/src/style/background values are scrubbed.
 *  - The iframe sandbox="allow-same-origin allow-popups" is the runtime security
 *    layer; no allow-scripts means JS can never execute even if something slips through.
 */
export function sanitizeReaderHtml(value: string): string {
  return sanitizeHtml(decode(value), {
    allowedTags: EMAIL_ALLOWED_TAGS,
    // false = pass ALL attributes through (style, class, id, data-*, width, height...)
    allowedAttributes: false,
    allowedSchemes: ['http', 'https', 'mailto', 'tel', 'cid', 'data'],
    allowedSchemesByTag: {
      a:    ['http', 'https', 'mailto', 'tel'],
      img:  ['http', 'https', 'cid', 'data'],
      link: ['http', 'https'],
    },
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      '*': (tagName, attribs) => {
        // Drop every on* event handler attribute (onclick, onload, onerror...)
        const safe: Record<string, string> = {};
        for (const [key, val] of Object.entries(attribs)) {
          if (key.startsWith('on')) continue;
          safe[key] = val;
        }
        // Scrub javascript: / expression() from URL and style values
        for (const attr of ['href', 'src', 'action', 'style', 'background']) {
          if (safe[attr]) {
            safe[attr] = safe[attr]
              .replace(/javascript\s*:/gi, '')
              .replace(/expression\s*\(/gi, '');
          }
        }
        return { tagName, attribs: safe };
      },
    },
  });
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
