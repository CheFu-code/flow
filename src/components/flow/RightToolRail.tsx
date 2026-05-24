import { Clock, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RightToolRail() {
  return (
    <aside className="gmail-right-rail" aria-label="Flow tools">
      <Button type="button" variant="ghost" size="icon" aria-label="Calendar">
        <Clock className="size-5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Contacts">
        <Users className="size-5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Add tool">
        <Plus className="size-5" />
      </Button>
    </aside>
  );
}
