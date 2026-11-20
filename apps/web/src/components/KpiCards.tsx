type Kpi = {
  label: string;
  value: string;
  hint?: string;
};

type Props = {
  items: Kpi[];
};

export function KpiCards({ items }: Props) {
  return (
    <div className="kpis">
      {items.map((item) => (
        <div className="k" key={item.label}>
          <span>{item.label}</span>
          <b>{item.value}</b>
          {item.hint ? <span>{item.hint}</span> : null}
        </div>
      ))}
    </div>
  );
}
