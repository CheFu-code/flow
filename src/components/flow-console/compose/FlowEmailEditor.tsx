'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import dynamic from 'next/dynamic';
import type { EmailEditorRef } from '@react-email/editor';
import '@react-email/editor/themes/default.css';
import styles from '@/components/FlowConsole.module.css';

export interface FlowEmailEditorRef {
  getHtml: () => string;
  getEmailHtml: () => Promise<string>;
  setHtml: (html: string) => void;
  clear: () => void;
  focus: () => void;
  insertHtml: (html: string) => void;
  insertText: (text: string) => void;
  runCommand: (command: string, value?: string) => void;
  insertList: (ordered: boolean) => void;
  clearFormatting: () => void;
  innerHTML?: string;
}

export interface FlowEmailEditorProps {
  initialContent?: string;
  isSending?: boolean;
  placeholder?: string;
  onChange?: (html: string) => void;
  showInspector?: boolean;
  onToggleInspector?: () => void;
}

// Inner component that renders EmailEditor + Inspector
const DynamicEditorWorkspace = dynamic(
  () => import('./EditorWorkspace').then((mod) => mod.EditorWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className={styles.composeEditorLoading}>
        <span className="text-muted-foreground text-sm">Loading rich editor...</span>
      </div>
    ),
  },
);

interface ChainedEditorCommand {
  toggleBold: () => ChainedEditorCommand;
  toggleItalic: () => ChainedEditorCommand;
  toggleUnderline: () => ChainedEditorCommand;
  toggleStrike: () => ChainedEditorCommand;
  undo: () => ChainedEditorCommand;
  redo: () => ChainedEditorCommand;
  toggleBlockquote: () => ChainedEditorCommand;
  toggleHeading: (options: { level: 1 | 2 | 3 | 4 | 5 | 6 }) => ChainedEditorCommand;
  toggleOrderedList: () => ChainedEditorCommand;
  toggleBulletList: () => ChainedEditorCommand;
  setTextAlign?: (align: string) => ChainedEditorCommand;
  setLink: (options: { href: string }) => ChainedEditorCommand;
  unsetLink: () => ChainedEditorCommand;
  run: () => boolean;
}

export const FlowEmailEditor = forwardRef<FlowEmailEditorRef, FlowEmailEditorProps>(
  function FlowEmailEditor(
    {
      initialContent = '',
      isSending = false,
      placeholder = "Write your message here... (press '/' for commands)",
      onChange,
      showInspector = false,
      onToggleInspector,
    },
    ref,
  ) {
    const editorRef = useRef<EmailEditorRef | null>(null);
    const initialContentLoadedRef = useRef(false);

    const handleUploadImage = useCallback(async (file: File) => {
      return new Promise<{ url: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ url: reader.result as string });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }, []);

    useImperativeHandle(
      ref,
      () => {
        const getEditor = () => editorRef.current?.editor;

        const handle: FlowEmailEditorRef = {
          getHtml: () => getEditor()?.getHTML() || '',
          getEmailHtml: async () => {
            if (editorRef.current?.getEmailHTML) {
              return await editorRef.current.getEmailHTML();
            }
            return getEditor()?.getHTML() || '';
          },
          setHtml: (html: string) => {
            getEditor()?.commands.setContent(html);
          },
          clear: () => {
            getEditor()?.commands.clearContent();
          },
          focus: () => {
            getEditor()?.commands.focus();
          },
          insertHtml: (html: string) => {
            getEditor()?.chain().focus().insertContent(html).run();
          },
          insertText: (text: string) => {
            getEditor()?.chain().focus().insertContent(text).run();
          },
          runCommand: (command: string, value?: string) => {
            const editor = getEditor();
            if (!editor) return;

            const chain = (editor.chain().focus() as unknown) as ChainedEditorCommand;

            switch (command) {
              case 'bold':
                chain.toggleBold().run();
                break;
              case 'italic':
                chain.toggleItalic().run();
                break;
              case 'underline':
                chain.toggleUnderline().run();
                break;
              case 'strikeThrough':
                chain.toggleStrike().run();
                break;
              case 'undo':
                chain.undo().run();
                break;
              case 'redo':
                chain.redo().run();
                break;
              case 'formatBlock':
                if (value === 'blockquote') {
                  chain.toggleBlockquote().run();
                } else if (value?.startsWith('h')) {
                  const level = parseInt(value[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
                  if (!Number.isNaN(level)) {
                    chain.toggleHeading({ level }).run();
                  }
                }
                break;
              case 'justifyLeft':
                if (chain.setTextAlign) {
                  chain.setTextAlign('left').run();
                } else {
                  chain.run();
                }
                break;
              case 'justifyCenter':
                if (chain.setTextAlign) {
                  chain.setTextAlign('center').run();
                } else {
                  chain.run();
                }
                break;
              case 'justifyRight':
                if (chain.setTextAlign) {
                  chain.setTextAlign('right').run();
                } else {
                  chain.run();
                }
                break;
              case 'createLink':
                if (value) {
                  chain.setLink({ href: value }).run();
                }
                break;
              case 'unlink':
                chain.unsetLink().run();
                break;
              case 'removeFormat':
                editor.chain().focus().unsetAllMarks().clearNodes().run();
                break;
              default:
                break;
            }
          },
          insertList: (ordered: boolean) => {
            const editor = getEditor();
            if (!editor) return;
            const chain = (editor.chain().focus() as unknown) as ChainedEditorCommand;
            if (ordered) {
              chain.toggleOrderedList().run();
            } else {
              chain.toggleBulletList().run();
            }
          },
          clearFormatting: () => {
            const editor = getEditor();
            if (!editor) return;
            editor.chain().focus().unsetAllMarks().clearNodes().run();
          },
        };

        // Legacy compatibility property
        Object.defineProperty(handle, 'innerHTML', {
          get: () => getEditor()?.getHTML() || '',
          set: (val: string) => {
            getEditor()?.commands.setContent(val);
          },
          configurable: true,
          enumerable: true,
        });

        return handle;
      },
      [],
    );

    // Populate initial content when editor mounts
    const handleReady = useCallback(
      (emailEditorRef: EmailEditorRef) => {
        editorRef.current = emailEditorRef;
        if (initialContent && !initialContentLoadedRef.current) {
          initialContentLoadedRef.current = true;
          emailEditorRef.editor?.commands.setContent(initialContent);
        }
      },
      [initialContent],
    );

    // Keep initialContent updated if it changes externally and editor is empty
    useEffect(() => {
      if (initialContent && editorRef.current?.editor && !initialContentLoadedRef.current) {
        initialContentLoadedRef.current = true;
        editorRef.current.editor.commands.setContent(initialContent);
      }
    }, [initialContent]);

    return (
      <div className={styles.flowEmailEditorWrap}>
        <DynamicEditorWorkspace
          editorRef={editorRef}
          initialContent={initialContent}
          isSending={isSending}
          onReady={handleReady}
          onToggleInspector={onToggleInspector}
          onUpdate={reRef => {
            editorRef.current = reRef;
            const html = reRef.editor?.getHTML() || '';
            onChange?.(html);
          }}
          onUploadImage={handleUploadImage}
          placeholder={placeholder}
          showInspector={showInspector}
        />
      </div>
    );
  },
);

FlowEmailEditor.displayName = 'FlowEmailEditor';
