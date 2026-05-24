'use client';

import {
  ChevronsLeft,
  ChevronsRight,
  Edit3,
  Laptop,
  LogOut,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type FlowTopbarProps = {
  authUser: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  density: 'comfortable' | 'compact';
  isRefreshing: boolean;
  onCompose: () => void;
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
  onCompose,
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
  const userLabel = authUser.displayName || authUser.email || 'Flow user';
  const userInitial =
    userLabel
      .split(/\s|@/)
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'F';

  return (
    <header className="gmail-topbar">
      <div className="gmail-brand">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
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
        <div className="brand-mark">F</div>
        <div>
          <span>{valueLabel}</span>
          <h1>Flow Mail</h1>
        </div>
      </div>

      <div className="gmail-search" role="search">
        <Search className="size-5" />
        <Input
          value={query}
          onChange={event => onQueryChange(event.currentTarget.value)}
          placeholder="Search sender, subject, preview, or recipient"
          aria-label="Search mail"
          className="flow-search-input"
        />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Display options"
              />
            }
          >
            <SlidersHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flow-topbar-menu">
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
      </div>

      <div className="gmail-top-actions">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Compose email"
                onClick={onCompose}
              />
            }
          >
            <Edit3 className="size-5" />
          </TooltipTrigger>
          <TooltipContent>Compose email</TooltipContent>
        </Tooltip>
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
              />
            }
          >
            <RefreshCcw className={isRefreshing ? 'size-5 spin' : 'size-5'} />
          </TooltipTrigger>
          <TooltipContent>Refresh mail</TooltipContent>
        </Tooltip>
        <div className="flow-live-stat">
          <strong>{unreadCount}</strong>
          <span>unread</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="flow-account-trigger"
                aria-label="Account menu"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarImage src={authUser.photoURL || undefined} alt="" />
              <AvatarFallback>{userInitial}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flow-account-menu">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <span>{userLabel}</span>
                {authUser.email ? <small>{authUser.email}</small> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onSignOut()}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
