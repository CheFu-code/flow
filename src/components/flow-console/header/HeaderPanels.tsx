'use client';

import { AtSign, Palette, Settings, Sparkles } from 'lucide-react';

export interface HeaderPanelsProps {
  activePanel: 'settings' | null;
  onClosePanel: () => void;
  onOpenManageSenders: () => void;
  onSetDensity: (density: 'comfortable' | 'compact') => void;
  onToggleFormatToolbar: () => void;
}

export function HeaderPanels({
  activePanel,
  onClosePanel,
  onOpenManageSenders,
  onSetDensity,
  onToggleFormatToolbar,
}: HeaderPanelsProps) {
  if (!activePanel) return null;

  return (
    <section
      aria-label="Settings panel"
      className="absolute right-12 top-[calc(100%+8px)] z-50 flex w-72 flex-col gap-2 rounded-2xl border bg-card p-3 text-card-foreground shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {activePanel === 'settings' ? (
        <>
          <div className="flex items-center gap-2 border-b px-2 py-2 pb-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
              <Settings className="size-4" />
            </div>
            <strong className="text-xs font-semibold text-foreground">
              Preferences &amp; Senders
            </strong>
          </div>

          <div className="flex flex-col gap-1 text-xs">
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                onClosePanel();
                onOpenManageSenders();
              }}
              type="button"
            >
              <AtSign className="size-4 text-muted-foreground" />
              <span>Manage senders (@chefu.co.za)</span>
            </button>

            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                onSetDensity('comfortable');
                onClosePanel();
              }}
              type="button"
            >
              <Palette className="size-4 text-muted-foreground" />
              <span>Comfortable display density</span>
            </button>

            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                onSetDensity('compact');
                onClosePanel();
              }}
              type="button"
            >
              <Palette className="size-4 text-muted-foreground" />
              <span>Compact display density</span>
            </button>

            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted"
              onClick={() => {
                onToggleFormatToolbar();
                onClosePanel();
              }}
              type="button"
            >
              <Sparkles className="size-4 text-muted-foreground" />
              <span>Toggle formatting toolbar</span>
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
