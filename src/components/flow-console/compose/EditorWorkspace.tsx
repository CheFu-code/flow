'use client';

import { type RefObject } from 'react';
import { EmailEditor, type EmailEditorRef } from '@react-email/editor';
import { Inspector } from '@react-email/editor/ui';
import { SlidersHorizontal, X } from 'lucide-react';
import styles from '@/components/FlowConsole.module.css';

export interface EditorWorkspaceProps {
  initialContent?: string;
  isSending?: boolean;
  placeholder?: string;
  editorRef: RefObject<EmailEditorRef | null>;
  onReady?: (ref: EmailEditorRef) => void;
  onUpdate?: (ref: EmailEditorRef) => void;
  onUploadImage?: (file: File) => Promise<{ url: string }>;
  showInspector?: boolean;
  onToggleInspector?: () => void;
}

export function EditorWorkspace({
  initialContent,
  isSending = false,
  placeholder,
  editorRef,
  onReady,
  onUpdate,
  onUploadImage,
  showInspector = false,
  onToggleInspector,
}: EditorWorkspaceProps) {
  return (
    <div className={styles.editorWorkspaceFlex}>
      <EmailEditor
        className={styles.flowEmailEditorRoot}
        content={initialContent || undefined}
        editable={!isSending}
        onReady={onReady}
        onUpdate={onUpdate}
        onUploadImage={onUploadImage}
        placeholder={placeholder}
        ref={editorRef}
      >
        {showInspector ? (
          <aside className={styles.flowInspectorPanel}>
            <div className={styles.flowInspectorHeader}>
              <div className={styles.flowInspectorTitle}>
                <SlidersHorizontal size={13} />
                <span>Design Inspector</span>
              </div>
              {onToggleInspector ? (
                <button
                  aria-label="Close Inspector"
                  className={styles.flowInspectorCloseBtn}
                  onClick={onToggleInspector}
                  title="Close Inspector"
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className={styles.flowInspectorScroll}>
              <Inspector.Root>
                <div className={styles.flowInspectorBreadcrumbs}>
                  <Inspector.Breadcrumb />
                </div>
                <div className={styles.flowInspectorSections}>
                  <Inspector.Node />
                  <Inspector.Text />
                </div>
              </Inspector.Root>
            </div>
          </aside>
        ) : null}
      </EmailEditor>
    </div>
  );
}
