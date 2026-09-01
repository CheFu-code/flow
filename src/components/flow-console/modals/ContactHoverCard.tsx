'use client';

import {
  CalendarDays,
  Mail,
  MessageSquare,
  UserPlus,
  Video,
} from 'lucide-react';
import { getInitial } from '@/lib/flow-console/format';
import type { ContactPreview } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

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
  return (
    <span className={styles.contactCard} role="dialog">
      <span className={styles.contactCardTop}>
        <span className={styles.contactAvatar} aria-hidden="true">
          {getInitial(contact.name || contact.email)}
        </span>
        <span className={styles.contactIdentity}>
          <strong>{contact.name}</strong>
          <span>{contact.email}</span>
        </span>
        <button
          aria-label={`Add ${contact.name} to contacts`}
          className={styles.contactIconButton}
          data-tooltip="Add contact"
          onClick={event => {
            event.stopPropagation();
            onTool('Contact card', contact);
          }}
          type="button"
        >
          <UserPlus size={18} />
        </button>
      </span>
      <span className={styles.contactActions}>
        <button
          className={styles.contactMailButton}
          onClick={event => {
            event.stopPropagation();
            onCompose(contact);
          }}
          type="button"
        >
          <Mail size={18} />
          Send Mail
        </button>
        <button
          aria-label={`Chat with ${contact.name}`}
          className={styles.contactIconButton}
          data-tooltip="Chat"
          onClick={event => {
            event.stopPropagation();
            onTool('Chat', contact);
          }}
          type="button"
        >
          <MessageSquare size={18} />
        </button>
        <button
          aria-label={`Start video meeting with ${contact.name}`}
          className={styles.contactIconButton}
          data-tooltip="Video call"
          onClick={event => {
            event.stopPropagation();
            onTool('Video call', contact);
          }}
          type="button"
        >
          <Video size={18} />
        </button>
        <button
          aria-label={`Schedule with ${contact.name}`}
          className={styles.contactIconButton}
          data-tooltip="Schedule"
          onClick={event => {
            event.stopPropagation();
            onTool('Calendar', contact);
          }}
          type="button"
        >
          <CalendarDays size={18} />
        </button>
      </span>
    </span>
  );
}
