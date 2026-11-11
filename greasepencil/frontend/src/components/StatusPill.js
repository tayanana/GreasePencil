import { Badge } from '@/components/ui/badge';
import { statusLabel } from '../lib/format';

const STYLES = {
  overdue: 'border-transparent bg-red-950 text-red-50',
  due_now: 'border-transparent bg-primary text-primary-foreground',
  due_soon: 'border-transparent bg-amber-200 text-amber-950',
  ok: 'border-transparent bg-emerald-800 text-emerald-50',
  unlogged: 'border-transparent bg-secondary text-secondary-foreground',
};

export default function StatusPill({ state }) {
  return (
    <Badge className={`h-6 px-2.5 ${STYLES[state] || STYLES.unlogged}`}>
      {statusLabel(state)}
    </Badge>
  );
}
