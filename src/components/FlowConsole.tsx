'use client';

import type { User } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { apiUrl, flowHeaders } from '@/lib/api';
import type { FlowRecipient } from '@/lib/email-schema';
import { renderEmailShell, textToHtml } from '@/lib/email-templates';
import { ComposeSheet } from './flow/ComposeSheet';
import { FlowSidebar } from './flow/FlowSidebar';
import { FlowTopbar } from './flow/FlowTopbar';
import { InboxPanel } from './flow/InboxPanel';
import { MessageReaderSheet } from './flow/MessageReaderSheet';
import type {
  Delivery,
  FlowConfig,
  FolderName,
  MailThread,
  MessagesResponse,
  StatusMessage,
} from './flow/types';

type FlowConsoleProps = {
  authUser: User;
  onSignOut: () => Promise<void>;
};

export default function FlowConsole({ authUser, onSignOut }: FlowConsoleProps) {
  const [activeFolder, setActiveFolder] = useState<FolderName>('inbox');
  const [audienceName, setAudienceName] = useState('Manual audience');
  const [body, setBody] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [config, setConfig] = useState<FlowConfig>({
    defaultFrom: 'Flow Mail <mail@flow.chefuinc.com>',
    defaultReplyTo: '',
    inboundAddress: '',
    inboundConfigured: false,
    maxRecipients: 100,
    resendConfigured: false,
    senders: [],
  });
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem('flow-deliveries');
    return stored ? JSON.parse(stored) : [];
  });
  const [from, setFrom] = useState('Flow Mail <mail@flow.chefuinc.com>');
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [manualRecipient, setManualRecipient] = useState('');
  const [messages, setMessages] = useState<MailThread[]>([]);
  const [messageCounts, setMessageCounts] = useState<
    Partial<Record<FolderName, number>>
  >({});
  const [messageOpen, setMessageOpen] = useState(false);
  const [preheader, setPreheader] = useState('');
  const [recipients, setRecipients] = useState<FlowRecipient[]>([]);
  const [refreshSeq, setRefreshSeq] = useState(0);
  const [replyTo, setReplyTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [subject, setSubject] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [density, setDensity] = useState<'comfortable' | 'compact'>(
    'comfortable',
  );

  useEffect(() => {
    fetch(apiUrl('/flow/config'), { credentials: 'include' })
      .then(response => response.json())
      .then((nextConfig: FlowConfig) => {
        setConfig(nextConfig);
        setFrom(nextConfig.defaultFrom || nextConfig.senders?.[0]?.email || '');
        setReplyTo(nextConfig.defaultReplyTo);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(apiUrl(`/flow/messages?folder=${activeFolder}`), {
      credentials: 'include',
      headers: flowHeaders(),
    })
      .then(response => response.json())
      .then((data: MessagesResponse) => {
        if (cancelled) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setMessageCounts(data.counts || {});
        setSelectedThreadId(data.messages?.[0]?.id || null);
      })
      .catch(() => {
        if (cancelled) return;
        setMessages([]);
        setSelectedThreadId(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeFolder, refreshSeq]);

  useEffect(() => {
    localStorage.setItem('flow-deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  const selectedThread = useMemo(
    () => messages.find(thread => thread.id === selectedThreadId) || null,
    [messages, selectedThreadId],
  );
  const filteredMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return messages;

    return messages.filter(thread => {
      const haystack = [
        thread.from,
        thread.subject,
        thread.preview,
        thread.to.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [messages, searchQuery]);
  const unreadCount = useMemo(
    () => messages.filter(thread => thread.unread).length,
    [messages],
  );
  const previewHtml = useMemo(
    () =>
      renderEmailShell({
        body: textToHtml(body || 'Your message will appear here.'),
        ctaLabel,
        ctaUrl,
        preheader,
        title: subject || 'New message',
      }),
    [body, ctaLabel, ctaUrl, preheader, subject],
  );
  const readinessScore = useMemo(() => {
    let score = 100;
    if (!config.resendConfigured) score -= 35;
    if (!config.inboundConfigured) score -= 15;
    if (!from.includes('@')) score -= 20;
    if (!subject.trim()) score -= 15;
    if (!body.trim()) score -= 15;
    if (!testEmail && recipients.length === 0) score -= 10;
    return Math.max(0, score);
  }, [
    body,
    config.inboundConfigured,
    config.resendConfigured,
    from,
    recipients.length,
    subject,
    testEmail,
  ]);

  const importCsv = async (file?: File) => {
    if (!file) return;

    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map(row => row.trim())
      .filter(Boolean);
    const imported = rows
      .slice(rows[0]?.toLowerCase().includes('email') ? 1 : 0)
      .map(row => {
        const [email, firstName = '', lastName = '', company = ''] = row
          .split(',')
          .map(cell => cell.trim());
        return { company, email, firstName, lastName, tags: ['csv'] };
      })
      .filter(row => /^\S+@\S+\.\S+$/.test(row.email));

    if (imported.length) {
      setRecipients(imported);
      setStatus({
        kind: 'success',
        text: `Imported ${imported.length} recipients.`,
      });
    }
  };

  const addRecipient = () => {
    const email = manualRecipient.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setStatus({ kind: 'error', text: 'Enter a valid recipient email.' });
      return;
    }

    setRecipients(prev => [
      ...prev,
      {
        company: 'CheFu Inc',
        email,
        firstName: email.split('@')[0],
        lastName: '',
        tags: ['manual'],
      },
    ]);
    setManualRecipient('');
    setStatus(null);
  };

  const sendEmail = async (action: 'test' | 'campaign') => {
    setIsSending(true);
    setStatus(null);

    try {
      const response = await fetch(apiUrl('/flow/send'), {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...flowHeaders() },
        body: JSON.stringify({
          action,
          audienceName,
          ctaLabel,
          ctaUrl,
          from,
          html: body,
          preheader,
          recipients,
          replyTo,
          subject,
          tags: ['flow'],
          testEmail,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Send failed.');
      }

      setDeliveries(prev => [
        {
          action,
          count: data.count,
          id: crypto.randomUUID(),
          sentAt: data.sentAt,
          subject: subject || '(no subject)',
        },
        ...prev,
      ]);
      setStatus({
        kind: 'success',
        text:
          action === 'test'
            ? 'Test email sent through Flow.'
            : `Email sent to ${data.count} recipients.`,
      });
      setActiveFolder('sent');
      refreshMessages();
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Send failed.',
      });
    } finally {
      setIsSending(false);
    }
  };

  const refreshMessages = () => {
    setIsLoadingMessages(true);
    setRefreshSeq(value => value + 1);
  };

  const selectFolder = (folder: FolderName) => {
    if (activeFolder === folder) return;
    setIsLoadingMessages(true);
    setActiveFolder(folder);
  };

  const openMessage = (threadId: string) => {
    setSelectedThreadId(threadId);
    setMessageOpen(true);
  };

  return (
    <main
      className={[
        'gmail-shell',
        sidebarOpen ? 'sidebar-open' : 'sidebar-closed',
        density === 'compact' ? 'density-compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <FlowTopbar
        authUser={{
          displayName: authUser.displayName,
          email: authUser.email,
          photoURL: authUser.photoURL,
        }}
        density={density}
        isRefreshing={isLoadingMessages}
        onQueryChange={setSearchQuery}
        onRefresh={refreshMessages}
        onSignOut={onSignOut}
        onToggleDensity={() =>
          setDensity(value => (value === 'comfortable' ? 'compact' : 'comfortable'))
        }
        onToggleSidebar={() => setSidebarOpen(value => !value)}
        query={searchQuery}
        sidebarOpen={sidebarOpen}
        unreadCount={unreadCount}
        valueLabel={
          config.resendConfigured
            ? 'Sending connected'
            : 'Set up sending to unlock campaigns'
        }
      />

      <div className="gmail-workspace">
        {sidebarOpen ? (
          <FlowSidebar
            activeFolder={activeFolder}
            messageCounts={messageCounts}
            onCompose={() => setComposeOpen(true)}
            onSelectFolder={selectFolder}
          />
        ) : null}

        <InboxPanel
          activeFolder={activeFolder}
          density={density}
          filteredCount={filteredMessages.length}
          isLoadingMessages={isLoadingMessages}
          messageCounts={messageCounts}
          messages={filteredMessages}
          onOpenMessage={openMessage}
          onRefresh={refreshMessages}
          onSearchClear={() => setSearchQuery('')}
          query={searchQuery}
          status={status}
          totalCount={messages.length}
        />
      </div>

      <MessageReaderSheet
        open={messageOpen}
        onOpenChange={setMessageOpen}
        thread={selectedThread}
      />

      <ComposeSheet
        audienceName={audienceName}
        body={body}
        config={config}
        ctaLabel={ctaLabel}
        ctaUrl={ctaUrl}
        deliveries={deliveries}
        from={from}
        isSending={isSending}
        manualRecipient={manualRecipient}
        onAddRecipient={addRecipient}
        onAudienceNameChange={setAudienceName}
        onBodyChange={setBody}
        onCtaLabelChange={setCtaLabel}
        onCtaUrlChange={setCtaUrl}
        onFromChange={setFrom}
        onImportCsv={file => void importCsv(file)}
        onManualRecipientChange={setManualRecipient}
        onOpenChange={setComposeOpen}
        onPreheaderChange={setPreheader}
        onReplyToChange={setReplyTo}
        onSend={action => void sendEmail(action)}
        onSubjectChange={setSubject}
        onTestEmailChange={setTestEmail}
        open={composeOpen}
        preheader={preheader}
        previewHtml={previewHtml}
        readinessScore={readinessScore}
        recipients={recipients}
        replyTo={replyTo}
        subject={subject}
        testEmail={testEmail}
      />
    </main>
  );
}
