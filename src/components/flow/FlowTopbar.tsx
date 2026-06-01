'use client';

import { CheFuUserDropdown } from 'chefu-ui';
import {
  ChevronsLeft,
  ChevronsRight,
  Laptop,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { chefuManageAccountUrl } from '@/lib/chefu-account';
import styles from './FlowTopbar.module.css';

type FlowTopbarProps = {
  authUser: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  density: 'comfortable' | 'compact';
  isRefreshing: boolean;
  onQueryChange: (value: string) => void;
  onRefresh: () => void;
  onSignOut: () => Promise<void>;
  onToggleDensity: () => void;
  onToggleSidebar: () => void;
  query: string;
  sidebarOpen: boolean;
  unreadCount: number;
  valueLabel: string;
};

export function FlowTopbar({
  authUser,
  density,
  isRefreshing,
  onQueryChange,
  onRefresh,
  onSignOut,
  onToggleDensity,
  onToggleSidebar,
  query,
  sidebarOpen,
  unreadCount,
  valueLabel,
}: FlowTopbarProps) {
  const { setTheme, theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <header className={styles.topbar} aria-label="Flow Mail header">
      <section className={styles.identity} aria-label="Workspace">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={styles.iconButton}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
                onClick={onToggleSidebar}
              />
            }
          >
            {sidebarOpen ? (
              <ChevronsLeft className="size-5" />
            ) : (
              <ChevronsRight className="size-5" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
          </TooltipContent>
        </Tooltip>

        <div className={styles.productLockup}>
          <div className={styles.brandMark} aria-hidden="true">
            <span>F</span>
          </div>
          <div className={styles.brandCopy}>
            <h1>Flow</h1>
          </div>
        </div>
      </section>

      <section className={styles.commandCenter} aria-label="Mail tools">
        <div className={styles.search} role="search">
          <Search className="size-5" />
          <Input
            value={query}
            onChange={event => onQueryChange(event.currentTarget.value)}
            placeholder="Search mail, recipients, senders"
            aria-label="Search mail"
            className={styles.searchInput}
          />
          {query ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={styles.searchOptions}
                    aria-label="Clear search"
                    onClick={() => onQueryChange('')}
                  />
                }
              >
                <X className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Clear search</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </section>

      <section className={styles.topActions} aria-label="Header actions">

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Refresh mail"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={styles.iconButton}
              />
            }
          >
            <RefreshCcw className={isRefreshing ? 'size-5 spin' : 'size-5'} />
          </TooltipTrigger>
          <TooltipContent>Refresh mail</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={styles.iconButton}
                aria-label="Display options"
              />
            }
          >
            <SlidersHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={styles.topbarMenu}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className={styles.menuSummary}>
                <span>{valueLabel}</span>
                <small>{unreadCount} unread messages</small>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Display</DropdownMenuLabel>
              <DropdownMenuItem onClick={onToggleDensity}>
                <SlidersHorizontal className="size-4" />
                {density === 'comfortable'
                  ? 'Compact density'
                  : 'Comfortable density'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleSidebar}>
                {sidebarOpen ? (
                  <PanelLeftClose className="size-4" />
                ) : (
                  <PanelLeftOpen className="size-4" />
                )}
                {sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                Dark mode
                <Switch
                  checked={isDark}
                  onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
                  className="ml-auto"
                  aria-label="Toggle dark mode"
                />
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>
                <Laptop className="size-4" />
                Use system theme
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <CheFuUserDropdown
          accountHref={chefuManageAccountUrl()}
          onSignOut={onSignOut}
          triggerClassName={styles.accountTrigger}
          user={authUser}
          variant="neutral"
        />
      </section>
    </header>
  );
}
