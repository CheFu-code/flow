'use client';

import { useState, type FormEvent } from 'react';
import {
  AlertCircle,
  AtSign,
  Check,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { apiUrl, flowHeaders } from '@/lib/api';
import { getInitial } from '@/lib/flow-console/format';
import type { FlowSender } from '@/lib/flow-console/types';
import styles from '@/components/FlowConsole.module.css';

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
    <div
      aria-labelledby="senders-modal-title"
      aria-modal="true"
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
    >
      <div
        className={styles.sendersModalContent}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.sendersModalHeader}>
          <div className={styles.sendersModalTitleGroup}>
            <div className={styles.sendersModalIconBadge}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 id="senders-modal-title">Sender Addresses</h2>
              <p>
                Authorized @{CHEFU_DOMAIN} email addresses for Flow Mail
              </p>
            </div>
          </div>
          <button
            aria-label="Close modal"
            className={styles.composeIconButton}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage ? (
          <div className={styles.sendersAlertError} role="alert">
            <AlertCircle size={17} />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {successMessage ? (
          <div className={styles.sendersAlertSuccess} role="status">
            <Check size={17} />
            <span>{successMessage}</span>
          </div>
        ) : null}

        <form className={styles.addSenderForm} onSubmit={handleAddSender}>
          <div className={styles.addSenderFormHeader}>
            <strong>Add New Sender Address</strong>
            <span className={styles.domainBadge}>@{CHEFU_DOMAIN} only</span>
          </div>

          <div className={styles.addSenderGrid}>
            <div className={styles.inputWrap}>
              <label htmlFor="sender-email">Email Address</label>
              <div className={styles.inputWithIcon}>
                <AtSign className={styles.fieldIcon} size={16} />
                <input
                  className={isDomainInvalid ? styles.inputInvalid : undefined}
                  disabled={isSubmitting}
                  id="sender-email"
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="e.g. support@chefu.co.za or sales"
                  type="text"
                  value={emailInput}
                />
              </div>
              {isDomainInvalid ? (
                <span className={styles.inputHelperError}>
                  Only @{CHEFU_DOMAIN} domain addresses are accepted.
                </span>
              ) : (
                <span className={styles.inputHelper}>
                  Type full address or username prefix (domain is appended automatically).
                </span>
              )}
            </div>

            <div className={styles.inputWrap}>
              <label htmlFor="sender-name">Display Name (Optional)</label>
              <div className={styles.inputWithIcon}>
                <User className={styles.fieldIcon} size={16} />
                <input
                  disabled={isSubmitting}
                  id="sender-name"
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="e.g. CHEFU Support or Jane Doe"
                  type="text"
                  value={nameInput}
                />
              </div>
              <span className={styles.inputHelper}>
                Shows as sender name in recipients&apos; inboxes.
              </span>
            </div>
          </div>

          <div className={styles.addSenderActions}>
            <button
              className={styles.addSenderSubmitButton}
              disabled={
                isSubmitting ||
                !emailInput.trim() ||
                isDomainInvalid
              }
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className={styles.spin} size={16} />
                  <span>Adding Address...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Add @{CHEFU_DOMAIN} Address</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className={styles.sendersListSection}>
          <div className={styles.sendersListHeader}>
            <strong>Configured Senders ({senders.length})</strong>
          </div>

          <div className={styles.sendersList}>
            {senders.length === 0 ? (
              <div className={styles.sendersEmpty}>
                No senders configured. Add an address above to get started.
              </div>
            ) : (
              senders.map(sender => {
                const match = sender.email.match(/<([^>]+)>/);
                const bare = (match?.[1] || sender.email).trim().toLowerCase();
                const isDeleting = deletingEmail === bare;
                const isCustom = sender.source === 'custom';

                return (
                  <div className={styles.senderItem} key={sender.email}>
                    <div className={styles.senderAvatar}>
                      {getInitial(sender.name || sender.label || sender.email)}
                    </div>
                    <div className={styles.senderInfo}>
                      <div className={styles.senderLabelRow}>
                        <span className={styles.senderLabelName}>
                          {sender.name || sender.label}
                        </span>
                        <span
                          className={
                            isCustom
                              ? `${styles.senderBadge} ${styles.senderBadgeCustom}`
                              : `${styles.senderBadge} ${styles.senderBadgeSystem}`
                          }
                        >
                          {isCustom ? 'Custom' : 'System'}
                        </span>
                      </div>
                      <span className={styles.senderEmailAddress}>{bare}</span>
                    </div>

                    <div className={styles.senderItemActions}>
                      {onSelectSender ? (
                        <button
                          className={styles.senderUseButton}
                          onClick={() => {
                            onSelectSender(sender.email);
                            onClose();
                          }}
                          type="button"
                        >
                          Use in compose
                        </button>
                      ) : null}

                      {isCustom ? (
                        <button
                          aria-label={`Remove ${bare}`}
                          className={styles.senderDeleteButton}
                          disabled={isDeleting}
                          onClick={() => handleDeleteSender(sender.email)}
                          title="Remove custom sender address"
                          type="button"
                        >
                          {isDeleting ? (
                            <Loader2 className={styles.spin} size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
