import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ALLOWED_STATUSES, type AllowedStatus } from '@zerorez/shared';
import { useState } from 'react';
import { ApiError, patchAccount } from '../api/client';
import type { AccountWithStage } from '../api/types';

type Props = {
  account: AccountWithStage;
  baseId: string;
  onClose: () => void;
};

export function AccountEditForm({ account, baseId, onClose }: Props) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>(account.status ?? '');
  const [nextAction, setNextAction] = useState(account.next_action ?? '');
  const [nextActionDate, setNextActionDate] = useState(account.next_action_date ?? '');
  const [notes, setNotes] = useState(account.acc_notes ?? '');
  const [lastContacted, setLastContacted] = useState(account.last_contacted ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      patchAccount(account.id, {
        status: (status || null) as AllowedStatus | null,
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate.trim() || null,
        notes: notes.trim() || null,
        last_contacted: lastContacted.trim() || null,
      }),
    onSuccess: async () => {
      setError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['base-accounts', baseId] }),
        queryClient.invalidateQueries({ queryKey: ['base-analytics', baseId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
      ]);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not save account');
    },
  });

  return (
    <div className="account-edit">
      <div className="account-edit-head">
        <div>
          <strong>{account.client_name}</strong>
          <div className="hint" style={{ margin: 0 }}>
            {account.invoice_number ? `Invoice ${account.invoice_number}` : account.id}
            {account.updated_by
              ? ` · last edited by ${account.updated_by}`
              : null}
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </button>
      </div>

      <div className="opts">
        <label className="field">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">—</option>
            {ALLOWED_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Last contacted
          <input
            type="date"
            value={lastContacted}
            onChange={(e) => setLastContacted(e.target.value)}
          />
        </label>
        <label className="field">
          Next action
          <input
            type="text"
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="e.g. Follow-up call"
          />
        </label>
        <label className="field">
          Next action date
          <input
            type="date"
            value={nextActionDate}
            onChange={(e) => setNextActionDate(e.target.value)}
          />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          Notes
          <textarea
            className="notes-input"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="CRM notes"
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="account-edit-actions">
        <button
          type="button"
          className="pri"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
