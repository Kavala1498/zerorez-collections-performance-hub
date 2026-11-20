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
      if (!file) throw new Error('Selecciona un archivo .xlsx');
      return uploadWorkbook({ file, cutoffDate, stageMode });
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries();
      setToast(
        `Carga OK: ${result.rowsLoaded} filas · ${result.accountsOpen} abiertas · ${result.warnings.length} avisos`,
      );
      setTimeout(() => setToast(null), 3200);
      setFile(null);
    },
    onError: (err) => {
      setToast(err instanceof Error ? err.message : 'Error al cargar');
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
        <h2>Cargar el Excel de cobranza</h2>
        <form onSubmit={onSubmit}>
          <div className="drop">
            <b>Elige tu archivo .xlsx</b>
            <span>
              Se leen las pestañas de las 14 bases (tablas Residencial y Comercial). El resto
              se ignora con un aviso. El procesamiento ocurre en el servidor.
            </span>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? <span>Seleccionado: {file.name}</span> : null}
          </div>

          <div className="opts">
            <label className="field">
              Fecha de corte
              <input
                type="date"
                value={cutoffDate}
                onChange={(e) => setCutoffDate(e.target.value)}
                required
              />
            </label>
            <label className="field">
              Cómo calcular la etapa
              <select
                value={stageMode}
                onChange={(e) => setStageMode(e.target.value as 'date' | 'label')}
              >
                <option value="date">Por fecha de servicio</option>
                <option value="label">Usar columna Aging bucket</option>
              </select>
            </label>
          </div>

          <p className="hint">
            Por fecha de servicio: ventanas 0–15, 16–30, 31–45, 46–60 y 61+ días respecto a la
            fecha de corte.
          </p>

          <div style={{ marginTop: 14 }}>
            <button className="pri" type="submit" disabled={!file || mutation.isPending}>
              {mutation.isPending ? 'Subiendo…' : 'Subir archivo'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Historial de cargas</h2>
        <QueryState
          isLoading={uploads.isLoading}
          isError={uploads.isError}
          error={uploads.error}
          isEmpty={!uploads.isLoading && (uploads.data?.uploads.length ?? 0) === 0}
          emptyTitle="Sin cargas aún"
          emptyMessage="Cuando subas un Excel aparecerá aquí el historial."
        >
          {uploads.data ? (
            <div className="wrap">
              <table className="data" style={{ minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>Archivo</th>
                    <th>Corte</th>
                    <th>Modo</th>
                    <th>Leídas</th>
                    <th>Cargadas</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.data.uploads.map((u) => (
                    <tr key={u.id} style={{ cursor: 'default' }}>
                      <td className="n">{u.filename}</td>
                      <td>{u.cutoff_date}</td>
                      <td>{u.stage_mode === 'date' ? 'Fecha' : 'Aging'}</td>
                      <td>{u.rows_read}</td>
                      <td>{u.rows_loaded}</td>
                      <td>{new Date(u.uploaded_at).toLocaleString('es-US')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </QueryState>
        {latest ? (
          <p className="hint">
            Última carga: {latest.filename} · corte {latest.cutoff_date}
            {latest.warnings.length
              ? ` · ${latest.warnings.length} aviso(s)`
              : ''}
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
