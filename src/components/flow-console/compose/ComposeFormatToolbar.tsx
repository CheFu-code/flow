'use client';

import {
  Bold,
  Italic,
  List,
  ListIndentDecrease,
  ListIndentIncrease,
  ListOrdered,
  Palette,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import { fontFamilies, fontSizes } from '@/lib/flow-console/constants';
import styles from '@/components/FlowConsole.module.css';

export interface ComposeFormatToolbarProps {
  isSending: boolean;
  onClearFormatting: () => void;
  onInsertList: (ordered: boolean) => void;
  onRunCommand: (command: string, value?: string) => void;
}

export function ComposeFormatToolbar({
  isSending,
  onClearFormatting,
  onInsertList,
  onRunCommand,
}: ComposeFormatToolbarProps) {
  return (
    <div aria-label="Formatting toolbar" className={styles.formatToolbar}>
      <button
        aria-label="Undo"
        className={styles.formatButton}
        data-tooltip="Undo (Ctrl+Z)"
        disabled={isSending}
        onClick={() => onRunCommand('undo')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Undo2 size={16} />
      </button>

      <button
        aria-label="Redo"
        className={styles.formatButton}
        data-tooltip="Redo (Ctrl+Y)"
        disabled={isSending}
        onClick={() => onRunCommand('redo')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Redo2 size={16} />
      </button>

      <span className={styles.formatDivider} />

      <label className={styles.formatSelectWrap}>
        <span>Font</span>
        <select
          aria-label="Font family"
          className={styles.formatSelect}
          defaultValue="Sans Serif"
          disabled={isSending}
          onChange={event => onRunCommand('fontName', event.target.value)}
        >
          {fontFamilies.map(font => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.formatSelectWrap}>
        <span>Size</span>
        <select
          aria-label="Font size"
          className={styles.formatSelect}
          defaultValue="3"
          disabled={isSending}
          onChange={event => onRunCommand('fontSize', event.target.value)}
        >
          {fontSizes.map(size => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </label>

      <span className={styles.formatDivider} />

      <button
        aria-label="Bold text"
        className={styles.formatButton}
        data-tooltip="Bold (Ctrl+B)"
        disabled={isSending}
        onClick={() => onRunCommand('bold')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Bold size={16} />
      </button>

      <button
        aria-label="Italic text"
        className={styles.formatButton}
        data-tooltip="Italic (Ctrl+I)"
        disabled={isSending}
        onClick={() => onRunCommand('italic')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Italic size={16} />
      </button>

      <button
        aria-label="Underline text"
        className={styles.formatButton}
        data-tooltip="Underline (Ctrl+U)"
        disabled={isSending}
        onClick={() => onRunCommand('underline')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Underline size={16} />
      </button>

      <label
        aria-label="Text color picker"
        className={styles.colorTool}
        data-tooltip="Text color"
      >
        <Palette size={16} />
        <input
          aria-label="Pick text color"
          disabled={isSending}
          onChange={event => onRunCommand('foreColor', event.target.value)}
          type="color"
        />
      </label>

      <span className={styles.formatDivider} />

      <label className={styles.formatSelectWrap}>
        <span>Align</span>
        <select
          aria-label="Text alignment"
          className={styles.formatSelect}
          defaultValue="justifyLeft"
          disabled={isSending}
          onChange={event => onRunCommand(event.target.value)}
        >
          <option value="justifyLeft">Left</option>
          <option value="justifyCenter">Center</option>
          <option value="justifyRight">Right</option>
        </select>
      </label>

      <button
        aria-label="Numbered list"
        className={styles.formatButton}
        data-tooltip="Numbered list"
        disabled={isSending}
        onClick={() => onInsertList(true)}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <ListOrdered size={16} />
      </button>

      <button
        aria-label="Bulleted list"
        className={styles.formatButton}
        data-tooltip="Bulleted list"
        disabled={isSending}
        onClick={() => onInsertList(false)}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <List size={16} />
      </button>

      <button
        aria-label="Decrease indent"
        className={styles.formatButton}
        data-tooltip="Decrease indent"
        disabled={isSending}
        onClick={() => onRunCommand('outdent')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <ListIndentDecrease size={16} />
      </button>

      <button
        aria-label="Increase indent"
        className={styles.formatButton}
        data-tooltip="Increase indent"
        disabled={isSending}
        onClick={() => onRunCommand('indent')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <ListIndentIncrease size={16} />
      </button>

      <button
        aria-label="Quote block"
        className={styles.formatButton}
        data-tooltip="Quote block"
        disabled={isSending}
        onClick={() => onRunCommand('formatBlock', 'blockquote')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Quote size={16} />
      </button>

      <button
        aria-label="Strikethrough"
        className={styles.formatButton}
        data-tooltip="Strikethrough"
        disabled={isSending}
        onClick={() => onRunCommand('strikeThrough')}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <Strikethrough size={16} />
      </button>

      <button
        aria-label="Clear text formatting"
        className={styles.formatButton}
        data-tooltip="Remove formatting"
        disabled={isSending}
        onClick={onClearFormatting}
        onMouseDown={event => event.preventDefault()}
        type="button"
      >
        <RemoveFormatting size={16} />
      </button>
    </div>
  );
}
