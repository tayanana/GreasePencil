import { Button } from '@/components/ui/button';

export default function PageStatus({ loading, error, onRetry, loadingLabel, children }) {
  if (loading) {
    return <p className="text-muted-foreground">{loadingLabel}</p>;
  }
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
        <p>{error}</p>
        {onRetry ? (
          <Button type="button" variant="outline" className="mt-3 h-10 bg-card" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }
  return children;
}
