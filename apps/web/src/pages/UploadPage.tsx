import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { uploadWorkbook, fetchUploads } from '../api/client';
import { QueryState } from '../components/QueryState';

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function UploadPage() {
  const queryClient = useQueryClient();
  const [cutoffDate, setCutoffDate] = useState(todayIso);
  const [stageMode, setStageMode] = useState<'date' | 'label'>('date');
  const [file, setFile] = useState<File | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const uploads = useQuery({
    queryKey: ['uploads'],
    queryFn: fetchUploads,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('Choose a .xlsx file');
      return uploadWorkbook({ file, cutoffDate, stageMode });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries();
      setToast(
        `Loaded ${result.rowsLoaded} rows · ${result.accountsOpen} open · ${result.warnings.length} warning(s)`,
      );
      setTimeout(() => setToast(null), 3200);
      setFile(null);
    },
    onError: (err) => {
      setToast(err instanceof Error ? err.message : 'Upload failed');
      setTimeout(() => setToast(null), 3200);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const latest = uploads.data?.uploads[0];

  return (
    <>
      <div className="card">
        <h2>Upload the collections Excel file</h2>
        <form onSubmit={onSubmit}>
          <div className="drop">
            <b>Choose your .xlsx file</b>
            <span>
              The tabs for the 14 bases are read (Residential and Commercial tables); all other
              tabs are ignored with a warning. Processing happens on the server.
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? <span>Selected: {file.name}</span> : null}
          </div>

          <div className="opts">
            <label className="field">
              Cutoff date
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                required
              />
            </label>
            <label className="field">
              How to calculate the stage
              <select
                value={stageMode}
                onChange={(e) => setStageMode(e.target.value as 'date' | 'label')}
              >
                <option value="date">By service date</option>
                <option value="label">Use the Aging bucket column</option>
              </select>
            </label>
          </div>

          <p className="hint">
            By service date, using dashboard ranges: 0–15, 16–30, 31–45, 46–60 and 61+ days before
            the cutoff date.
          </p>

          <div style={{ marginTop: 14 }}>
            <button className="pri" type="submit" disabled={!file || mutation.isPending}>
              {mutation.isPending ? 'Uploading…' : 'Upload file'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Upload history</h2>
        <QueryState
          isLoading={uploads.isLoading}
          isError={uploads.isError}
          error={uploads.error}
          isEmpty={!uploads.isLoading && (uploads.data?.uploads.length ?? 0) === 0}
          emptyTitle="No uploads yet"
          emptyMessage="When you upload an Excel file, it will appear here."
        >
          {uploads.data ? (
            <div className="wrap">
              <table className="data" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>File</th>
                    <th>Cutoff</th>
                    <th>Mode</th>
                    <th>Read</th>
                    <th>Loaded</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.data.uploads.map((u) => (
                    <tr key={u.id} style={{ cursor: 'default' }}>
                      <td className="n">{u.filename}</td>
                      <td>{u.cutoff_date}</td>
                      <td>{u.stage_mode === 'date' ? 'Date' : 'Aging'}</td>
                      <td>{u.rows_read}</td>
                      <td>{u.rows_loaded}</td>
                      <td>{new Date(u.uploaded_at).toLocaleString('en-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </QueryState>
        {latest ? (
          <p className="hint">
            Latest: {latest.filename} · cutoff {latest.cutoff_date}
            {latest.warnings.length ? ` · ${latest.warnings.length} warning(s)` : ''}
          </p>
        ) : null}
      </div>

      {toast ? (
        <div className="toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
