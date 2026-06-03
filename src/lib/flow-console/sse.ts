import type { ServerSentEvent } from './types';

export function parseServerSentEvent(rawEvent: string): ServerSentEvent {
  const eventLines = rawEvent.split('\n');
  const data: string[] = [];
  let event = 'message';

  eventLines.forEach(line => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      return;
    }

    if (line.startsWith('data:')) {
      data.push(line.slice(5).trimStart());
    }
  });

  return { data: data.join('\n'), event };
}
