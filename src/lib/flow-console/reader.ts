import { cleanReplyBody } from './mail';
import type { MailMessage, MailThread } from './types';

const unsafeTagPattern =
  /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const unsafeSelfClosingTagPattern =
  /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option)[^>]*\/?>/gi;
const tagPattern = /<\/?([a-z][a-z0-9:-]*)([^>]*)>/gi;
const attributePattern =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const linkableTextPattern =
  /((?:https?:\/\/|www\.)[^\s<]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d\s().-]{7,}\d))/g;

const allowedTags = new Set([
  'a',
  'b',
  'blockquote',
  'br',
  'center',
  'code',
  'dd',
  'del',
  'div',
  'dl',
  'dt',
  'em',
  'font',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]);

const voidTags = new Set(['br', 'hr', 'img']);
const tableAttributes = new Set([
  'align',
  'bgcolor',
  'border',
  'cellpadding',
  'cellspacing',
  'colspan',
  'height',
  'rowspan',
  'valign',
  'width',
]);

const allowedStyleProperties = new Set([
  'background',
  'background-color',
  'border',
  'border-bottom',
  'border-color',
  'border-left',
  'border-radius',
  'border-right',
  'border-style',
  'border-top',
  'border-width',
  'color',
  'display',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'margin',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'margin-top',
  'max-width',
  'padding',
  'padding-bottom',
  'padding-left',
  'padding-right',
  'padding-top',
  'text-align',
  'text-decoration',
  'text-transform',
  'vertical-align',
  'white-space',
]);

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

function sanitizeReaderHtml(value: string) {
  const body = extractBody(value)
    .replace(/<!doctype[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(unsafeTagPattern, '')
    .replace(unsafeSelfClosingTagPattern, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  return body.replace(tagPattern, (match, tagName, rawAttributes) => {
    const tag = String(tagName).toLowerCase();
    if (!allowedTags.has(tag)) return '';
    if (match.startsWith('</')) return voidTags.has(tag) ? '' : `</${tag}>`;

    const attributes = sanitizeAttributes(tag, rawAttributes || '');
    return voidTags.has(tag) ? `<${tag}${attributes} />` : `<${tag}${attributes}>`;
  });
}

function extractBody(value: string) {
  const match = value.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1] || value;
}

function sanitizeAttributes(tag: string, rawAttributes: string) {
  const attributes: string[] = [];

  rawAttributes.replace(
    attributePattern,
    (_match, rawName, doubleQuoted, singleQuoted, unquoted) => {
      const name = String(rawName).toLowerCase();
      const value = String(doubleQuoted ?? singleQuoted ?? unquoted ?? '');
      if (!value || name.startsWith('on') || name === 'srcdoc') return '';

      if (name === 'style') {
        const style = sanitizeStyle(value);
        if (style) attributes.push(`style="${escapeAttribute(style)}"`);
        return '';
      }

      if (tag === 'a' && name === 'href') {
        const href = sanitizeUrl(value);
        if (href) {
          attributes.push(`href="${escapeAttribute(href)}"`);
          attributes.push('target="_blank"');
          attributes.push('rel="noreferrer noopener"');
        }
        return '';
      }

      if (tag === 'img' && name === 'src') {
        const src = sanitizeUrl(value, true);
        if (src) attributes.push(`src="${escapeAttribute(src)}"`);
        return '';
      }

      if (tag === 'img' && ['alt', 'height', 'title', 'width'].includes(name)) {
        attributes.push(`${name}="${escapeAttribute(value)}"`);
        return '';
      }

      if (name === 'title' || tableAttributes.has(name)) {
        attributes.push(`${name}="${escapeAttribute(value)}"`);
      }

      return '';
    },
  );

  return attributes.length ? ` ${attributes.join(' ')}` : '';
}

function sanitizeStyle(value: string) {
  return value
    .split(';')
    .map(rule => rule.trim())
    .filter(Boolean)
    .map(rule => {
      const separator = rule.indexOf(':');
      if (separator === -1) return '';

      const property = rule.slice(0, separator).trim().toLowerCase();
      const rawValue = rule.slice(separator + 1).trim();
      if (!allowedStyleProperties.has(property)) return '';
      if (/expression|javascript:|vbscript:|data:text\/html|url\s*\(/i.test(rawValue)) {
        return '';
      }

      return `${property}: ${rawValue}`;
    })
    .filter(Boolean)
    .join('; ');
}

function sanitizeUrl(value: string, allowImages = false) {
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return '';
  if (/^(https?:|mailto:|tel:|#)/i.test(cleaned)) return cleaned;
  if (/^www\./i.test(cleaned)) return `https://${cleaned}`;
  if (allowImages && /^(cid:|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i.test(cleaned)) {
    return cleaned;
  }
  return '';
}

function linkifyPlainText(value: string) {
  return linkifyText(escapeHtml(value)).replace(/\r?\n/g, '<br />');
}

function linkifyHtmlText(value: string) {
  const parts = value.split(/(<[^>]+>)/g);
  let insideAnchor = false;

  return parts
    .map(part => {
      if (!part.startsWith('<')) {
        return insideAnchor ? part : linkifyText(part);
      }

      if (/^<a\b/i.test(part)) insideAnchor = true;
      if (/^<\/a\b/i.test(part)) insideAnchor = false;
      return part;
    })
    .join('');
}

function linkifyText(value: string) {
  return value.replace(linkableTextPattern, token => {
    const { core, suffix } = trimTrailingPunctuation(token);
    const href = hrefForToken(core);
    if (!href) return token;

    return `<a href="${escapeAttribute(href)}" target="_blank" rel="noreferrer noopener">${core}</a>${suffix}`;
  });
}

function hrefForToken(value: string) {
  if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value)) {
    return `mailto:${value}`;
  }

  if (/^(?:https?:\/\/|www\.)/i.test(value)) {
    return sanitizeUrl(value);
  }

  const digits = value.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length >= 8) {
    return `tel:${digits}`;
  }

  return '';
}

function trimTrailingPunctuation(value: string) {
  const match = value.match(/^(.+?)([.,;:!?]+)?$/);
  return {
    core: match?.[1] || value,
    suffix: match?.[2] || '',
  };
}

function escapeHtml(value: string) {
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

function escapeAttribute(value: string) {
  return escapeHtml(value);
}
