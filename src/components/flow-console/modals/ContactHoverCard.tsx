'use client';

import {
  CalendarDays,
  Mail,
  MessageSquare,
  UserPlus,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getInitial } from '@/lib/flow-console/format';
import type { ContactPreview } from '@/lib/flow-console/types';

export type ContactHoverCardProps = {
  contact: ContactPreview;
  onCompose: (contact: ContactPreview) => void;
  onTool: (tool: string, contact: ContactPreview) => void;
};

export function ContactHoverCard({
  contact,
  onCompose,
  onTool,
}: ContactHoverCardProps) {
  const initial = getInitial(contact.name || contact.email);

  return (
    <div
      className="absolute top-[calc(100%+6px)] left-0 z-50 flex w-80 flex-col gap-3.5 rounded-2xl border bg-card p-4 text-card-foreground shadow-2xl transition-all duration-150 animate-in fade-in-0 zoom-in-95 cursor-default select-none"
      onClick={e => e.stopPropagation()}
      role="dialog"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-lg font-bold text-teal-700 dark:text-teal-300">
          {initial}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-base font-semibold text-foreground">
            {contact.name}
          </strong>
          <span className="truncate text-xs text-muted-foreground">
            {contact.email}
          </span>
        </div>
        <Button
          aria-label={`Add ${contact.name} to contacts`}
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={event => {
            event.stopPropagation();
            onTool('Contact card', contact);
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <UserPlus className="size-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
        <Button
          className="flex-1 bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700 h-8 text-xs font-semibold"
          onClick={event => {
            event.stopPropagation();
            onCompose(contact);
          }}
          size="sm"
          type="button"
        >
          <Mail className="size-3.5 mr-1" />
          Send Mail
        </Button>

        <Button
          aria-label={`Chat with ${contact.name}`}
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={event => {
            event.stopPropagation();
            onTool('Chat', contact);
          }}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <MessageSquare className="size-3.5" />
        </Button>

        <Button
          aria-label={`Start video meeting with ${contact.name}`}
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={event => {
            event.stopPropagation();
            onTool('Video call', contact);
          }}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <Video className="size-3.5" />
        </Button>

        <Button
          aria-label={`Schedule with ${contact.name}`}
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={event => {
            event.stopPropagation();
            onTool('Calendar', contact);
          }}
          size="icon-sm"
          type="button"
          variant="outline"
        >
          <CalendarDays className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
