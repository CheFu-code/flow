import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeMailMessageContent } from './mail';

test('mergeMailMessageContent keeps full loaded message when incoming payload is only a preview snippet', () => {
  const existing = {
    attachments: 0,
    body: '<p>Full email body</p>',
    contentLoaded: true,
    date: '2026-01-01T00:00:00.000Z',
    direction: 'inbound' as const,
    folder: 'inbox' as const,
    from: 'hello@example.com',
    html: '<p>Full email body</p>',
    id: 'msg-1',
    name: 'Hello',
    preview: 'Short preview',
    starred: false,
    subject: 'Subject',
    to: ['me@example.com'],
    unread: false,
  };

  const incoming = {
    ...existing,
    body: 'Short preview',
    html: undefined,
    preview: 'Short preview',
    contentLoaded: false,
  };

  const merged = mergeMailMessageContent(existing, incoming);

  assert.equal(merged.body, '<p>Full email body</p>');
  assert.equal(merged.html, '<p>Full email body</p>');
  assert.equal(merged.contentLoaded, true);
});
