'use client';

import styles from '@/components/FlowConsole.module.css';

export function MailboxSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div aria-live="polite" className={styles.mailboxSkeleton} role="status">
      <div className={styles.srOnly}>Loading your mailbox</div>
      {Array.from({ length: count }, (_, index) => (
        <div
          className={styles.skeletonRow}
          key={index}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <span className={`${styles.skeletonBlock} ${styles.skeletonCheckbox}`} />
          <span className={`${styles.skeletonBlock} ${styles.skeletonStar}`} />
          <span className={`${styles.skeletonBlock} ${styles.skeletonSender}`} />
          <span className={`${styles.skeletonBlock} ${styles.skeletonPreview}`} />
          <span className={`${styles.skeletonBlock} ${styles.skeletonDate}`} />
        </div>
      ))}
    </div>
  );
}
