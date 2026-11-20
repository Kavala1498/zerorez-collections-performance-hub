type Props = {
  title: string;
  insights: string[];
};

export function InsightsCard({ title, insights }: Props) {
  if (!insights.length) return null;
  return (
    <div className="card">
      <h2>{title}</h2>
      <ul className="ins">
        {insights.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
