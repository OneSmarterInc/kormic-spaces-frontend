import { useState } from 'react';
export interface CoverageState {
  enabled: boolean; week: string; next_week: string; target: number; min_domains: number; batch_size: number;
  states: {country: string; state: string; status: string; attempts: number; collected: number; domains: number; reason: string}[];
}
export function WeeklyCoverage({ data }: { data?: CoverageState }) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<'state' | 'country' | 'status' | 'collected'>('state');
  const [descending, setDescending] = useState(false);
  if (!data) return null;
  const rows = [...data.states].sort((a, b) => {
    const left = a[sort], right = b[sort];
    return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))) * (descending ? -1 : 1);
  });
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages - 1);
  function order(key: typeof sort) { setDescending(sort === key ? !descending : false); setSort(key); setPage(0); }
  return <section className="agent-console weekly-coverage" aria-label="Weekly state coverage">
    <style>{`.weekly-coverage table{min-width:650px}.weekly-coverage th{position:sticky;top:0;z-index:1;background:#f5f7fa;border-block:1px solid #dce3eb}.weekly-coverage td{padding:9px 12px;border-bottom:1px solid #e8edf3;overflow-wrap:anywhere}.weekly-coverage th button{border:0;background:transparent;padding:4px 0;font-weight:600}.weekly-coverage tbody tr:hover{background:#f7f9fc}.weekly-coverage footer{flex-wrap:wrap}.weekly-coverage footer>span:first-child{flex:1;min-width:180px}.weekly-coverage footer>span:nth-of-type(2){white-space:nowrap}`}</style>
    <header><div><h2>Weekly state coverage</h2><p>India · 28 states / USA · 50 states</p></div><span>{data.enabled ? `${rows.filter(r => r.status === 'complete').length} / 78 complete` : 'Disabled'}</span></header>
    <p style={{padding:'0 16px'}}>Week of {data.week} · Next cycle {data.next_week} (UTC). Up to {data.batch_size} states in progress. Target {data.target} distinct jobs across at least {data.min_domains} domains per state, posted within 7 days.</p>
    {!rows.length ? <p style={{padding:16}}>Waiting for the collection worker to start this week’s coverage.</p> : <>
      <div className="coverage-scroll" style={{overflowX:'auto'}}><table style={{width:'100%',tableLayout:'fixed',borderCollapse:'collapse'}}>
        <thead><tr>{(['state','country','status','collected'] as const).map(key => <th key={key} aria-sort={sort === key ? descending ? 'descending' : 'ascending' : 'none'} style={{textAlign:'left',padding:'8px 12px'}}><button className="secondary" onClick={() => order(key)}>{key === 'collected' ? 'Jobs' : key.charAt(0).toUpperCase()+key.slice(1)} {sort === key ? descending ? '↓' : '↑' : '↕'}</button></th>)}<th>Domains</th><th>Searches</th></tr></thead>
        <tbody>{rows.slice(current*10,current*10+10).map(row => <tr key={`${row.country}:${row.state}`} title={row.reason}>
          <td style={{padding:'10px 12px',overflowWrap:'anywhere',borderTop:'1px solid #dce3eb'}}>{row.state}</td>
          <td>{row.country === 'usa' ? 'USA' : 'India'}</td><td><span className={`admin-badge status-${row.status === 'complete' ? 'succeeded' : row.status === 'shortfall' ? 'failed' : row.status}`}>{row.status === 'shortfall' ? 'Below target' : row.status.charAt(0).toUpperCase()+row.status.slice(1)}</span></td><td>{row.collected} / {data.target}</td><td style={{textAlign:'center'}}>{row.domains}</td><td style={{textAlign:'center'}}>{row.attempts} / 20</td>
        </tr>)}</tbody>
      </table></div>
      <footer style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:12,gap:8}}><span>Shortfalls remain visible when sources return too few qualifying jobs.</span><button className="secondary" disabled={current === 0} onClick={() => setPage(current-1)}>Previous</button><span>{current+1} / {pages}</span><button className="secondary" disabled={current+1 === pages} onClick={() => setPage(current+1)}>Next</button></footer>
    </>}
  </section>;
}
