export interface TrendPoint {
  day: string;
  collections: number;
  chats: number;
  jobs: number;
  users: number;
}
export function OperationsCharts({
  trend,
  locations,
  status,
}: {
  trend: TrendPoint[];
  locations: { location: string; total: number }[];
  status: Record<string, number>;
}) {
  const max = Math.max(1, ...trend.flatMap((day) => [day.collections, day.chats, day.jobs]));
  const points = (key: 'collections' | 'chats' | 'jobs') =>
    trend.map((day, index) => `${42 + index * 80},${142 - (day[key] / max) * 110}`).join(' ');
  const series = [
    ['jobs', 'New jobs', '#355f96'],
    ['collections', 'Collection runs', '#91a2b9'],
    ['chats', 'Chat requests', '#7787a5'],
  ] as const;
  const total = Object.values(status).reduce((sum, count) => sum + count, 0);
  const statusColor = (name: string) =>
    ({
      succeeded: '#4b806c',
      failed: '#ad645b',
      running: '#517ca7',
      queued: '#b69a60',
      empty: '#a4afbc',
      cancelled: '#c4ccd6',
    })[name] ?? '#8d9fb3';
  let offset = 0;
  return (
    <div className="portal-charts">
      <section className="portal-panel">
        <div className="portal-section-head">
          <h2>Activity trend</h2>
          <span>Last 7 days</span>
        </div>
        <svg
          className="portal-line-chart"
          viewBox="0 0 560 180"
          role="img"
          aria-label="Seven-day collection, job and chat activity"
        >
          <title>
            {trend
              .map(
                (day) =>
                  `${day.day}: ${day.jobs} new jobs, ${day.collections} runs, ${day.chats} chats`,
              )
              .join('; ')}
          </title>
          {[0, 0.5, 1].map((step) => (
            <g key={step}>
              <line x1="42" x2="530" y1={142 - step * 110} y2={142 - step * 110} stroke="#e4e9e5" />
              <text x="32" y={146 - step * 110} textAnchor="end">
                {Math.round(max * step)}
              </text>
            </g>
          ))}
          {series.map(([key, , color]) => (
            <polyline
              key={key}
              points={points(key)}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          ))}
          {trend.map((day, index) => (
            <text key={day.day} x={42 + index * 80} y="166" textAnchor="middle">
              {day.day.slice(5)}
            </text>
          ))}
        </svg>
        <div className="portal-legend">
          {series.map(([key, label, color]) => (
            <span key={key}>
              <i style={{ background: color }} />
              {label}
              <b>{trend.reduce((sum, day) => sum + day[key], 0)}</b>
            </span>
          ))}
        </div>
      </section>
      <section className="portal-panel">
        <div className="portal-section-head">
          <h2>Collection outcomes</h2>
          <span>24 hours</span>
        </div>
        <div className="portal-donut-row">
          <svg
            viewBox="0 0 120 120"
            className="portal-donut"
            role="img"
            aria-label={`${total} collection runs: ${Object.entries(status)
              .map(([name, count]) => `${name} ${count}`)
              .join(', ')}`}
          >
            <circle cx="60" cy="60" r="44" fill="none" stroke="#eef1ec" strokeWidth="13" />
            {Object.entries(status).map(([name, count]) => {
              const length = total ? (count / total) * 276.46 : 0;
              const start = offset;
              offset += length;
              return (
                <circle
                  key={name}
                  cx="60"
                  cy="60"
                  r="44"
                  fill="none"
                  stroke={statusColor(name)}
                  strokeWidth="13"
                  strokeDasharray={`${length} ${276.46 - length}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 60 60)"
                >
                  <title>
                    {name}: {count}
                  </title>
                </circle>
              );
            })}
            <text x="60" y="60" textAnchor="middle" className="portal-donut-number">
              {total}
            </text>
            <text x="60" y="76" textAnchor="middle">
              runs
            </text>
          </svg>
          <div className="portal-outcomes">
            {Object.entries(status).map(([name, count]) => (
              <span key={name}>
                <i style={{ background: statusColor(name) }} />
                {name}
                <b>{count}</b>
              </span>
            ))}
            {!total && <p>No runs yet</p>}
          </div>
        </div>
        <h3>Catalog coverage by location</h3>
        <div className="portal-bars">
          {locations.map((row) => (
            <div key={row.location}>
              <div>
                <span>{row.location}</span>
                <b>{row.total}</b>
              </div>
              <div className="portal-bar-track">
                <i
                  style={{
                    width: `${(row.total / Math.max(1, ...locations.map((item) => item.total))) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
          {!locations.length && <p>No location data collected.</p>}
        </div>
      </section>
    </div>
  );
}
