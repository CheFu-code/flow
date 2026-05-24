import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { formatMessageTime } from './date';
import type { MailThread } from './types';

type MessageReaderSheetProps = {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  thread: MailThread | null;
};

export function MessageReaderSheet({
  onOpenChange,
  open,
  thread,
}: MessageReaderSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="message-sheet w-[min(720px,100vw)] sm:max-w-none"
      >
        {thread ? (
          <>
            <SheetHeader className="message-sheet-header">
              <SheetTitle>{thread.subject || '(no subject)'}</SheetTitle>
              <SheetDescription>
                {thread.direction === 'outbound'
                  ? `To ${thread.to.join(', ')}`
                  : thread.from}
              </SheetDescription>
            </SheetHeader>
            <article className="message-body">
              <div className="sender-avatar">
                {(thread.from || 'F').slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="message-from">
                  <strong>{thread.from}</strong>
                  <span>{formatMessageTime(thread.sentAt || thread.receivedAt)}</span>
                </div>
                <p>{thread.text || thread.preview}</p>
              </div>
            </article>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
