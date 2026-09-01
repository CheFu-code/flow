'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AtSign,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { apiUrl, flowHeaders } from '@/lib/api';
import { getInitial } from '@/lib/flow-console/format';
import type { FlowSender } from '@/lib/flow-console/types';

const CHEFU_DOMAIN = 'chefu.co.za';

export type ManageSendersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSenderAdded: (sender: FlowSender) => void;
  onSenderRemoved: (email: string) => void;
  onSelectSender?: (email: string) => void;
  senders: FlowSender[];
};

export function ManageSendersModal({
  isOpen,
  onClose,
  onSenderAdded,
  onSenderRemoved,
  onSelectSender,
  senders,
}: ManageSendersModalProps) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalizedInput = emailInput.trim().toLowerCase();
  const domainPart = normalizedInput.includes('@')
    ? normalizedInput.split('@').pop() || ''
    : '';
  const isDomainInvalid =
    normalizedInput.length > 0 &&
    normalizedInput.includes('@') &&
    domainPart !== CHEFU_DOMAIN;

  const handleAddSender = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    let cleanEmail = normalizedInput;
    if (!cleanEmail) {
      setErrorMessage('Please enter an email address.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@${CHEFU_DOMAIN}`;
    }

    if (!cleanEmail.endsWith(`@${CHEFU_DOMAIN}`)) {
      setErrorMessage(`Only emails belonging to @${CHEFU_DOMAIN} are allowed.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl('/flow/allowed-emails'), {
        body: JSON.stringify({
          email: cleanEmail,
          name: nameInput.trim() || undefined,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...flowHeaders(),
        },
        method: 'POST',
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            data.error ||
            'Failed to add sender. Please make sure the domain is @chefu.co.za.',
        );
      }

      const newSender: FlowSender = data.sender || {
        addedAt: new Date().toISOString(),
        email: data.email || cleanEmail,
        label: data.label || cleanEmail,
        name: nameInput.trim() || undefined,
        source: 'custom',
      };

      onSenderAdded(newSender);
      if (onSelectSender) {
        onSelectSender(newSender.email);
      }

      setSuccessMessage(`Successfully added ${newSender.label}!`);
      setEmailInput('');
      setNameInput('');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while adding sender.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSender = async (senderEmail: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setDeletingEmail(senderEmail);

    const match = senderEmail.match(/<([^>]+)>/);
    const bareEmail = (match?.[1] || senderEmail).trim().toLowerCase();

    try {
      const res = await fetch(
        apiUrl(`/flow/allowed-emails/${encodeURIComponent(bareEmail)}`),
        {
          credentials: 'include',
          headers: flowHeaders(),
          method: 'DELETE',
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to remove sender.');
      }

      onSenderRemoved(bareEmail);
      setSuccessMessage(`Removed ${bareEmail} from active senders.`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'An error occurred while removing sender.',
      );
    } finally {
      setDeletingEmail(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto gap-5 p-6 sm:p-7">
        <DialogHeader className="flex flex-row items-center gap-3.5 border-b pb-4 text-left">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-400">
            <ShieldCheck className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl font-bold">Sender Addresses</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Authorized @{CHEFU_DOMAIN} email addresses for Flow Mail
            </DialogDescription>
          </div>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        ) : null}

        <form
          className="flex flex-col gap-4 rounded-xl border bg-muted/40 p-4"
          onSubmit={handleAddSender}
        >
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm font-semibold text-foreground">
              Add New Sender Address
            </strong>
            <Badge variant="brand" className="font-semibold">
              @{CHEFU_DOMAIN} only
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="sender-email">
                Email Address
              </label>
              <div className="relative flex items-center">
                <AtSign className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-8 text-xs sm:text-sm"
                  disabled={isSubmitting}
                  id="sender-email"
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="support or sales@chefu.co.za"
                  type="text"
                  value={emailInput}
                />
              </div>
              {isDomainInvalid ? (
                <span className="text-[11px] font-medium text-destructive">
                  Only @{CHEFU_DOMAIN} domain addresses are accepted.
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">
                  Username or full @{CHEFU_DOMAIN} address.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="sender-name">
                Display Name (Optional)
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-2.5 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-8 text-xs sm:text-sm"
                  disabled={isSubmitting}
                  id="sender-name"
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="e.g. CHEFU Support"
                  type="text"
                  value={nameInput}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Sender display name shown to recipients.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              className="bg-teal-700 hover:bg-teal-800 text-white dark:bg-teal-600 dark:hover:bg-teal-700"
              disabled={isSubmitting || !emailInput.trim() || isDomainInvalid}
              size="sm"
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  Adding Address...
                </>
              ) : (
                <>
                  <Plus className="size-3.5 mr-1" />
                  Add Address
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Configured Senders ({senders.length})
            </span>
          </div>

          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
            {senders.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                No senders configured. Add an address above to get started.
              </div>
            ) : (
              senders.map(sender => {
                const match = sender.email.match(/<([^>]+)>/);
                const bare = (match?.[1] || sender.email).trim().toLowerCase();
                const isDeleting = deletingEmail === bare;
                const isCustom = sender.source === 'custom';

                return (
                  <div
                    key={sender.email}
                    className="flex items-center gap-3 rounded-xl border bg-card p-2.5 px-3 transition-colors hover:border-teal-500/30 shadow-xs"
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      {getInitial(sender.name || sender.label || sender.email)}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs sm:text-sm font-semibold text-foreground">
                          {sender.name || sender.label}
                        </span>
                        <Badge
                          variant={isCustom ? 'brand' : 'secondary'}
                          className="text-[10px] px-1.5 py-0"
                        >
                          {isCustom ? 'Custom' : 'System'}
                        </Badge>
                      </div>
                      <span className="truncate font-mono text-[11px] text-muted-foreground">
                        {bare}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onSelectSender ? (
                        <Button
                          onClick={() => {
                            onSelectSender(sender.email);
                            onClose();
                          }}
                          size="xs"
                          type="button"
                          variant="outline"
                        >
                          Use
                        </Button>
                      ) : null}

                      {isCustom ? (
                        <Button
                          aria-label={`Remove ${bare}`}
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          disabled={isDeleting}
                          onClick={() => handleDeleteSender(sender.email)}
                          size="icon-xs"
                          type="button"
                          variant="ghost"
                        >
                          {isDeleting ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
