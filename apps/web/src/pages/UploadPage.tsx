import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { StageMode } from '@zerorez/shared';
import { useData } from '../data/DataContext';

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function UploadPage() {
  const { state, ready, uploadWorkbook, updateSettings, clearData } = useData();
  const [cutoffDate, setCutoffDate] = useState(todayIso);
  const [stageMode, setStageMode] = useState<StageMode>('date');
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const uploads = [...state.uploads].sort((a, b) =>
    b.uploaded_at.localeCompare(a.uploaded_at),
  );
  const latest = uploads[0];

  useEffect(() => {
    if (!latest) return;
    setCutoffDate(latest.cutoff_date);
    setStageMode(latest.stage_mode);
  }, [latest?.id, latest?.cutoff_date, latest?.stage_mode]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || pending) return;
    setPending(true);
    try {
      const result = await uploadWorkbook({ file, cutoffDate, stageMode });
      showToast(
        `Loaded ${result.rowsLoaded} rows · ${result.accountsOpen} open · ${result.warnings.length} warning(s)`,
      );
      setFile(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setPending(false);
    }
  };

  const onCutoffChange = async (value: string) => {
    setCutoffDate(value);
    if (!latest || !value) return;
    try {
      await updateSettings({ cutoffDate: value, stageMode });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update cutoff');
    }
  };

  const onModeChange = async (value: StageMode) => {
    setStageMode(value);
    if (!latest) return;
    try {
      await updateSettings({ cutoffDate, stageMode: value });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update stage mode');
    }
  };

  const onClear = async () => {
    await clearData();
    setFile(null);
    setCutoffDate(todayIso());
    setStageMode('date');
    showToast('Cleared loaded data');
  };

  if (!ready) {
    return (
      <div className="card">
        <p>Loading local data…</p>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <h2>Upload the collections Excel file</h2>
        <form onSubmit={onSubmit}>
          <div className="drop">
            <b>Choose your .xlsx file</b>
            <span>
              The tabs for the 14 bases are read (Residential and Commercial tables); all other
              tabs are ignored with a warning. Everything is processed in your browser — nothing
              is uploaded to a server.
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
                onChange={(e) => void onCutoffChange(e.target.value)}
                required
              />
            </label>
            <label className="field">
              How to calculate the stage
              <select
                value={stageMode}
                onChange={(e) => void onModeChange(e.target.value as StageMode)}
              >
                <option value="date">By service date</option>
                <option value="label">Use the Aging bucket column</option>
              </select>
            </label>
          </div>

          <p className="hint">
            By service date, using dashboard ranges: 0–14, 15–29, 30–48, 49–63 and over 63 days
            before the cutoff date. Data stays in this browser (IndexedDB).
          </p>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="pri" type="submit" disabled={!file || pending}>
              {pending ? 'Processing…' : 'Upload file'}
            </button>
            {uploads.length > 0 ? (
              <button type="button" onClick={() => void onClear()}>
                Clear loaded data
              </button>
            ) : null}
            <Link to="/" className="hint" style={{ alignSelf: 'center' }}>
              Back to dashboard
            </Link>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Upload history</h2>
        {uploads.length === 0 ? (
          <p className="hint">No uploads yet. When you upload an Excel file, it will appear here.</p>
        ) : (
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
                {uploads.map((u) => (
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
        )}
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
