import { AlertCircle, CheckCircle2, ChevronDown, Mail } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';

export function ConnectionRow({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}) {
  return (
    <div className="connection-row">
      {connected ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <AlertCircle className="size-4 text-amber-600" />
      )}
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <Card className="empty-state" size="sm">
      <CardHeader>
        <Mail className="size-8" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Label className="field">
      <span>{label}</span>
      {children}
    </Label>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="metric-card" size="sm">
      <CardContent>
        <Icon className="size-5" />
        <span>{label}</span>
        <strong>{value}</strong>
      </CardContent>
    </Card>
  );
}

export function TaskSection({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  description: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <Collapsible className="task-section">
      <CollapsibleTrigger className="task-trigger">
        <div className="task-title">
          <Icon className="size-4" />
          <div>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
        </div>
        <ChevronDown className="size-4 task-chevron" />
      </CollapsibleTrigger>
      <CollapsibleContent className="task-content">{children}</CollapsibleContent>
    </Collapsible>
  );
}
