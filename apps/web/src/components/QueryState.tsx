import type { ReactNode } from 'react';

type Props = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  children: ReactNode;
};

export function QueryState({
  isLoading,
  isError,
  error,
  isEmpty = false,
  emptyTitle = 'No data',
  emptyMessage = 'Upload an Excel file to populate the dashboard.',
  children,
}: Props) {
  if (isLoading) {
    return (
      <div className="state-box" role="status">
        <h2>Loading…</h2>
        <p>Reading local portfolio data.</p>
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : 'Could not load the data.';
    return (
      <div className="state-box error" role="alert">
        <h2>Error</h2>
        <p>{message}</p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="state-box">
        <h2>{emptyTitle}</h2>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
