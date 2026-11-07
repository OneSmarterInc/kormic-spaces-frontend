// Bundled with the app so separate hosts cannot omit the shadow-root stylesheet.
export const workspaceStyles = String.raw`
/* Live Spaces design system. Scoped by the app's shadow root. */
:host {
  --accent: var(--palette-accent, #435deb);
  --header: var(--palette-header, #15233d);
  --wash: var(--palette-wash, #eef1ff);
  --ink: #202b3d;
  --muted: #5e6c80;
  --line: #dfe5ed;
  --bg: #f5f7fa;
  --card: #fff;
  display: block;
  width: 100%;
  min-height: 100vh;
  color: var(--ink);
  background: var(--bg);
  font:
    14px/1.5 'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  -webkit-font-smoothing: antialiased;
}
*,
*::before,
*::after {
  box-sizing: border-box;
}
h1,
h2,
h3,
h4,
p {
  margin: 0;
}
h1 {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.8px;
  line-height: 1.25;
}
h2 {
  font-size: 17px;
  font-weight: 650;
  letter-spacing: -0.3px;
}
h3 {
  font-size: 14px;
  font-weight: 650;
}
p {
  line-height: 1.6;
}
a {
  color: var(--accent);
  text-underline-offset: 3px;
}
button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}
button {
  cursor: pointer;
  border: 0;
  background: none;
}
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
button,
a,
input,
select,
textarea,
summary {
  -webkit-tap-highlight-color: transparent;
}
:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 3px;
}
svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}
.muted,
.small,
.tiny {
  color: var(--muted);
}
.small {
  font-size: 12px;
}
.tiny {
  font-size: 11px;
}
.row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.between {
  justify-content: space-between;
}
.wrap {
  flex-wrap: wrap;
}
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 36px;
  padding: 7px 12px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.btn:hover:not(:disabled) {
  background: var(--wash);
  border-color: var(--accent);
}
.btn.primary {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}
.btn.primary:hover:not(:disabled) {
  background: var(--header);
  border-color: var(--header);
}
.link-btn {
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  text-align: left;
}
input:not([type='checkbox']),
select,
textarea {
  width: 100%;
  min-height: 38px;
  padding: 8px 11px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  font-size: 13px;
}
input::placeholder,
textarea::placeholder {
  color: #6c788b;
}
textarea {
  min-height: 90px;
  resize: vertical;
}
select {
  width: auto;
  max-width: 100%;
}
input[type='checkbox'] {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
  vertical-align: middle;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
  font-size: 12px;
  font-weight: 600;
}
.field select {
  width: 100%;
}
.field input,
.field select,
.field textarea {
  font-weight: 400;
}
.skip {
  position: fixed;
  top: -100px;
  left: 12px;
  z-index: 100;
  background: white;
  padding: 10px 16px;
  border-radius: 6px;
}
.skip:focus {
  top: 12px;
}
.shell {
  min-height: 100vh;
}
.workspace-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: 212px;
  display: flex;
  flex-direction: column;
  padding: 26px 14px 18px;
  background: var(--header);
  color: #e4eaf4;
  z-index: 30;
  overflow-y: auto;
}
.home-brand {
  display: flex;
  gap: 10px;
  align-items: center;
  text-align: left;
  color: white;
  padding: 0 10px;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 35px;
  height: 37px;
  background: #ffffff18;
  border: 1px solid #ffffff26;
  border-radius: 9px;
  font-size: 27px;
  font-weight: 700;
}
.home-brand strong {
  display: block;
  font-size: 22px;
  letter-spacing: -0.8px;
  line-height: 1.05;
}
.home-brand small {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  letter-spacing: 3px;
  color: #b8c6dc;
}
.workspace-identity {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 25px 0;
  padding: 12px 9px;
  border: 1px solid #ffffff1c;
  border-radius: 8px;
  background: #ffffff06;
}
.workspace-identity > div {
  min-width: 0;
}
.workspace-identity strong {
  display: block;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.workspace-identity small {
  font-size: 10px;
  color: #b8c6dc;
}
.workspace-avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: white;
  background: #ffffff18;
  font-size: 12px;
  font-weight: 600;
}
.nav-label {
  color: #a5b5ce;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1.6px;
  padding: 0 10px;
  margin-bottom: 8px;
}
.workspace-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 11px;
  min-height: 41px;
  padding: 10px 12px;
  border-radius: 7px;
  color: #c5d1e3;
  text-align: left;
  font-size: 13px;
  font-weight: 500;
}
.nav-item:hover {
  background: #ffffff0d;
  color: white;
}
.nav-item.active {
  background: #ffffff16;
  color: white;
  box-shadow: inset 3px 0 0 #aab9ff;
}
.nav-item.active svg {
  color: #bdc9ff;
}
.sidebar-bottom {
  margin-top: auto;
  padding: 28px 10px 0;
}
.sidebar-bottom p {
  font-size: 11px;
  color: #adbed7;
  margin-bottom: 15px;
}
.sidebar-bottom .btn {
  background: transparent;
  border-color: #ffffff26;
  color: #e4eaf4;
  width: 100%;
}
.sidebar-bottom .btn:hover:not(:disabled) {
  background: #ffffff12;
}
.main {
  margin-left: 212px;
  padding: 0 28px 28px;
  min-width: 0;
  max-width: 2000px;
  outline: none;
}
.workspace-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 54px;
  margin-bottom: 22px;
  border-bottom: 1px solid var(--line);
  font-size: 11px;
  color: var(--muted);
}
.workspace-topbar strong {
  color: var(--ink);
  font-weight: 500;
}
.workspace-topbar span span {
  margin: 0 10px;
  color: #a2aebe;
}
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.page-head p {
  color: var(--muted);
  font-size: 12px;
  margin-top: 6px;
  max-width: 500px;
}
.page-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}
.page-actions .job-selector {
  width: 240px;
}
.context-loading {
  color: var(--muted);
  margin: -12px 0 12px;
  font-size: 12px;
}
.metrics-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--line);
  background: white;
  border-radius: 10px;
  margin-bottom: 16px;
}
.strip-metric {
  padding: 17px 20px;
  border-right: 1px solid var(--line);
}
.strip-metric:last-child {
  border-right: 0;
}
.metric-label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}
.metric-number {
  font-size: 30px;
  font-weight: 650;
  letter-spacing: -1px;
  line-height: 1.3;
  margin: 4px 0;
  font-variant-numeric: tabular-nums;
}
.metric-caption {
  font-size: 10px;
  color: var(--muted);
}
.insight-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--line);
  border-left: 3px solid var(--accent);
  background: white;
  padding: 14px 18px;
  border-radius: 8px;
  margin-bottom: 22px;
}
.insight-label {
  font-size: 9px;
  font-weight: 650;
  letter-spacing: 1px;
  color: var(--muted);
  margin-bottom: 4px;
}
.insight-banner h2 {
  font-size: 15px;
}
.insight-banner p {
  font-size: 12px;
  color: var(--muted);
  margin-top: 2px;
}
.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 22px 0 10px;
}
.section-heading h2 {
  font-size: 15px;
}
.section-heading .btn {
  border-color: transparent;
  background: transparent;
  color: var(--accent);
}
.opportunity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 14px;
}
.opportunity-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: white;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 18px;
}
.opportunity-title {
  font-size: 16px;
  margin: 13px 0 5px;
  letter-spacing: -0.3px;
}
.opportunity-card p {
  font-size: 12px;
}
.opportunity-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0;
}
.opportunity-skills span {
  padding: 3px 7px;
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--line);
  border-radius: 5px;
  font-size: 11px;
}
.opportunity-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin-top: auto;
  font-size: 11px;
  color: var(--muted);
}
.opportunity-bottom .row {
  gap: 6px;
}
.opportunity-card > .tiny {
  margin-top: 8px;
  font-size: 10px;
}
.page-overview .opportunity-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 7px;
  border: 1px solid var(--line);
  background: #f5f7fa;
  color: #516077;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  max-width: 100%;
}
.tag[data-status='Live'],
.tag[data-status='Eligible'],
.tag[data-status='Accepted'] {
  color: #17664a;
  background: #eaf6ef;
  border-color: #cce8d8;
}
.tag[data-status='Shortlisted'],
.tag[data-status='Interview'] {
  color: #4c48a8;
  background: #f0edfd;
  border-color: #dfd8f6;
}
.tag[data-status='In review'],
.tag[data-status='Needs review'],
.tag[data-status='Paused'] {
  color: #875a15;
  background: #fff6e5;
  border-color: #f1dfb9;
}
.tag[data-status='Rejected'],
.tag[data-status='Not eligible'] {
  color: #9a3945;
  background: #fceff1;
  border-color: #f0d5da;
}
.live-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}
.live-toolbar .live-search {
  width: auto;
  min-width: 180px;
  flex: 1;
}
.live-toolbar select {
  min-width: 125px;
  font-size: 12px;
}
.live-toolbar .btn {
  min-height: 38px;
}
.candidate-table-wrap {
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: white;
}
.candidate-table {
  table-layout: fixed;
  width: 100%;
  min-width: 800px;
  border-collapse: collapse;
  text-align: left;
}
.candidate-table th {
  background: #f8fafc;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  padding: 8px 14px;
}
.candidate-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #edf0f4;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.candidate-table tr:last-child td {
  border-bottom: 0;
}
.candidate-table tbody tr:hover {
  background: #f8fafc;
}
.live-sort {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: inherit;
  font-weight: inherit;
  padding: 4px 0;
  text-align: left;
}
.live-sort span {
  color: var(--accent);
}
.person-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  padding: 0;
  text-align: left;
}
.person-cell > span:last-child {
  min-width: 0;
}
.person-cell strong {
  font-size: 12px;
  font-weight: 600;
}
.person-cell .role {
  font-size: 11px;
  color: var(--muted);
  margin-top: 1px;
}
.avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 34px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--wash);
  color: var(--header);
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}
.fit {
  color: var(--accent);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}
.candidate-pagination {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0;
  font-size: 11px;
  color: var(--muted);
}
.candidate-pagination > span:first-child {
  margin-right: auto;
}
.candidate-pagination label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.candidate-pagination select {
  min-height: 32px;
  padding: 5px 8px;
  font-size: 11px;
}
.candidate-pagination .btn {
  min-height: 32px;
}
.live-panel {
  padding: 20px;
  border: 1px solid var(--line);
  background: white;
  border-radius: 10px;
  margin: 16px 0;
}
.live-panel > h2 {
  margin-bottom: 12px;
}
.activity-panel .activity-entry {
  display: grid;
  grid-template-columns: 34px minmax(0,1fr) auto;
  gap: 16px;
  font-size: 12px;
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.activity-heading{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:8px}
.activity-heading p{font-size:12px;margin-top:4px}
.activity-readonly{font-size:11px;color:var(--muted);white-space:nowrap}
.activity-list{list-style:none;margin:0;padding:0}
.activity-shortcut{display:flex;align-items:center;justify-content:space-between;gap:16px;border-top:1px solid var(--line);padding:20px 0;margin-top:18px}
.activity-shortcut h2{font-size:15px}.activity-shortcut p{font-size:12px;margin-top:5px}
.audit-log{background:var(--surface,#fff);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.audit-search-row{display:flex;align-items:flex-end;gap:16px;padding:20px 20px 14px}
.audit-log label{display:flex;flex-direction:column;gap:6px;font-size:11px;font-weight:600;min-width:0}
.audit-search{flex:1}
.audit-log input,.audit-log select{width:100%;min-width:0;border:1px solid var(--line);border-radius:6px;background:var(--surface,#fff);padding:10px 12px;color:var(--ink);font:inherit;font-size:12px;height:40px}
.audit-log input::placeholder{color:var(--muted)}
.audit-filters{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;padding:0 20px 18px}
.audit-status{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:11px;color:var(--muted);padding:12px 20px;border-top:1px solid var(--line)}
.audit-status>span:first-child{color:var(--ink);font-weight:600}.audit-status button{margin-left:auto}
.audit-table-scroll{overflow:auto;min-height:230px;border-top:1px solid var(--line)}
.audit-table{width:100%;min-width:810px;table-layout:fixed;border-collapse:collapse;text-align:left}
.audit-table th{background:var(--wash);text-align:left;padding:0;font-size:11px}
.audit-table th:nth-child(1){width:180px}.audit-table th:nth-child(2){width:170px}.audit-table th:nth-child(3){width:220px}
.audit-table th button{display:flex;align-items:center;justify-content:space-between;width:100%;border:0;background:transparent;color:var(--ink);padding:14px 16px;cursor:pointer;font:inherit;font-weight:600}
.audit-table th[aria-sort]:not([aria-sort=none]) button{color:var(--accent)}
.audit-table td{padding:16px;border-top:1px solid var(--line);font-size:12px;vertical-align:top;overflow-wrap:anywhere;line-height:1.6}
.audit-table td strong{font-weight:600}.audit-table time strong,.audit-table small{display:block}.audit-table small{font-size:10px;color:var(--muted);margin-top:3px}.audit-event-id{font-variant-numeric:tabular-nums}
.audit-table tbody tr:hover{background:var(--wash)}.audit-table.is-loading tbody{opacity:.55}
.audit-description{font-size:12px;color:var(--muted);margin:5px 0 0}
.audit-table .activity-transition{flex-wrap:wrap}
.audit-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)}
.audit-pagination label{flex-direction:row;align-items:center;font-weight:400}.audit-pagination select{width:72px}.audit-pagination>div{display:flex;gap:8px}
.audit-empty{padding:44px 20px;text-align:center;color:var(--muted)}.audit-empty h2{font-size:16px;color:var(--ink);margin-bottom:8px}
.audit-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
@media(max-width:1280px){.audit-filters{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:600px){.audit-filters{grid-template-columns:repeat(2,minmax(0,1fr));padding:0 14px 14px}.audit-search-row{padding:14px;align-items:stretch;flex-direction:column;gap:10px}.audit-status,.audit-pagination{padding:12px 14px}.audit-pagination{flex-wrap:wrap}.audit-pagination>div{margin-left:auto}.activity-shortcut{align-items:flex-start;flex-direction:column}}
.activity-avatar{width:34px;height:34px;border-radius:50%;background:var(--wash);color:var(--ink);display:grid;place-items:center;font-weight:600}
.activity-summary{margin:0;font-size:13px;line-height:1.6;overflow-wrap:anywhere}
.activity-context{display:flex;flex-wrap:wrap;gap:4px 16px;margin:6px 0 0;font-size:11px;color:var(--muted)}
.activity-context strong{font-weight:500}
.activity-transition{display:flex;align-items:center;gap:8px;font-size:11px;margin-top:8px;color:var(--muted)}
.activity-transition>span:not([aria-hidden]){border:1px solid var(--line);padding:2px 8px;border-radius:5px}
.activity-transition .activity-stage-new{color:var(--ink);background:var(--wash)}
.activity-panel .activity-entry:last-child {
  border: 0;
}
.activity-entry time {
  white-space: nowrap;
  font-size: 11px;
}
.live-board {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 210px), 1fr));
  gap: 12px;
  padding-bottom: 14px;
  align-items: start;
}
.live-column {
  min-width: 0;
  overflow-wrap: anywhere;
  background: #edf1f6;
  border: 1px solid var(--line);
  border-radius: 9px;
  padding: 10px;
  min-height: 260px;
}
.live-column h3 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 3px 12px;
  font-size: 12px;
}
.live-pipeline-card {
  border: 1px solid var(--line);
  border-radius: 7px;
  background: white;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px #1a2b3c04;
}
.live-pipeline-card p {
  font-size: 11px;
  margin: 4px 0;
}
.live-pipeline-card select {
  width: 100%;
  margin-top: 8px;
  font-size: 11px;
  min-height: 32px;
  padding: 5px 8px;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 32px 20px;
  color: var(--muted);
}
.empty h3 {
  color: var(--ink);
}
.empty p {
  max-width: 380px;
  font-size: 12px;
}
.live-messages {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  background: white;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
  min-height: 420px;
}
.live-messages aside {
  border-right: 1px solid var(--line);
  padding: 8px;
  max-height: 620px;
  overflow-y: auto;
}
.live-messages > section {
  min-width: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
}
.live-messages > section > .empty {
  flex: 1;
}
.thread {
  display: flex;
  flex-direction: column;
  align-items: start;
  gap: 3px;
  text-align: left;
  width: 100%;
  border-radius: 6px;
  padding: 12px;
}
.thread strong {
  font-size: 12px;
}
.thread span {
  font-size: 11px;
  color: var(--muted);
}
.thread.active,
.thread:hover {
  background: var(--wash);
}
.message-list {
  flex: 1;
  max-height: 440px;
  min-height: 200px;
  overflow-y: auto;
  padding: 16px 0;
}
.bubble {
  width: fit-content;
  max-width: 85%;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 10px 10px 10px 2px;
  padding: 10px 12px;
  margin: 8px 0;
  font-size: 13px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
.bubble.mine {
  margin-left: auto;
  background: var(--wash);
  border-radius: 10px 10px 2px 10px;
}
.bubble time {
  display: block;
  margin-top: 5px;
  font-size: 10px;
  color: var(--muted);
}
.message-compose {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}
.message-compose textarea {
  min-height: 74px;
}
.copilot-panel {
  max-width: 1100px;
  margin: 0;
}
.copilot-panel > .small {
  margin-top: 12px;
}
.copilot-panel .row.wrap {
  margin: 16px 0;
}
.copilot-panel .row.wrap .btn {
  white-space: normal;
  text-align: left;
}
.copilot-welcome {
  padding: 32px 16px;
  text-align: center;
}
.copilot-welcome p {
  color: var(--muted);
  font-size: 12px;
  margin-top: 6px;
}
.copilot-symbol {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  border-radius: 12px;
  background: var(--wash);
  color: var(--accent);
  font-size: 25px;
}
.live-answer-list {
  max-height: 420px;
  overflow-y: auto;
}
.live-answer-list article {
  border: 1px solid var(--line);
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
  margin-top: 14px;
  font-size: 13px;
}
.live-answer-list article p {
  margin: 5px 0 14px;
}
.live-answer-list article p:last-child {
  margin-bottom: 0;
}
.copilot-panel form {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.page-settings .live-panel {
  max-width: 1100px;
}
.evidence-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}
.evidence-row:last-child {
  border-bottom: 0;
}
.live-theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 16px;
}
.live-theme {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px;
  text-align: left;
  background: white;
}
.live-theme[aria-pressed='true'] {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
  background: var(--wash);
}
.live-theme > span {
  display: inline-block;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  margin-right: 4px;
  border: 1px solid #00000010;
}
.live-theme strong {
  display: block;
  font-size: 12px;
  margin: 5px 0 2px;
}
.live-theme small {
  font-size: 10px;
  color: var(--muted);
}
.page-settings .live-panel > p {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 12px;
}
.live-alert,
.info-box {
  padding: 10px 14px;
  border-radius: 7px;
  margin-bottom: 14px;
  font-size: 12px;
}
.live-alert {
  color: #8e2c3c;
  background: #fff1f3;
  border: 1px solid #efccd4;
}
.info-box {
  color: #245d47;
  background: #edf7f1;
  border: 1px solid #cce6d8;
}
.live-dialog {
  width: min(720px, calc(100vw - 32px));
  max-height: calc(100dvh - 48px);
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: white;
  color: var(--ink);
  box-shadow: 0 24px 100px #0c182844;
}
.live-dialog[open] {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.live-dialog::backdrop {
  background: #15233880;
  backdrop-filter: blur(3px);
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  padding: 16px 22px;
  border-bottom: 1px solid var(--line);
  background: white;
}
.modal-head h2 {
  font-size: 18px;
}
.modal-body {
  overflow-y: auto;
  padding: 20px 22px;
}
.modal-body > p {
  margin-bottom: 12px;
  font-size: 13px;
}
.live-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}
.form-section-title {
  margin: 18px 0 12px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.form-section-title:first-child {
  margin-top: 0;
  padding-top: 0;
  border: 0;
}
.job-form > .row.wrap {
  font-size: 12px;
}
.job-form > .muted {
  margin-bottom: 12px;
}
.job-form > .row.wrap:last-child {
  margin-top: 16px;
}
.candidate-dialog {
  width: min(900px, calc(100vw - 32px));
}
.candidate-profile {
  font-size: 13px;
}
.candidate-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.candidate-intro > div {
  flex: 1;
  min-width: 0;
}
.candidate-avatar {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  background: var(--wash);
  color: var(--accent);
  border: 1px solid var(--line);
  border-radius: 10px;
  font-weight: 600;
}
.candidate-role {
  font-size: 14px;
  font-weight: 600;
}
.candidate-meta {
  font-size: 12px;
  color: var(--muted);
}
.candidate-fit {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 16px 24px;
  padding: 18px;
  background: #f8fafc;
  border: 1px solid var(--line);
  border-radius: 9px;
}
.candidate-eyebrow {
  display: block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--muted);
  margin-bottom: 6px;
  font-weight: 600;
}
.big-score {
  display: inline-block;
  font-size: 38px;
  letter-spacing: -1.5px;
  line-height: 1.4;
  color: var(--accent);
  margin-right: 12px;
}
.candidate-criterion {
  margin-bottom: 10px;
}
.candidate-criterion:last-child {
  margin-bottom: 0;
}
.candidate-criterion > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 11px;
  margin-bottom: 5px;
}
.candidate-criterion progress {
  appearance: none;
  width: 100%;
  height: 5px;
  border: 0;
  border-radius: 10px;
  background: #e1e7f0;
  accent-color: var(--accent);
}
.candidate-criterion progress::-webkit-progress-bar {
  background: #e1e7f0;
  border-radius: 10px;
}
.candidate-criterion progress::-webkit-progress-value {
  background: var(--accent);
  border-radius: 10px;
}
.candidate-criterion progress::-moz-progress-bar {
  background: var(--accent);
  border-radius: 10px;
}
.candidate-fit-reasons {
  grid-column: 1/-1;
  border-top: 1px solid var(--line);
  padding-top: 10px;
  color: var(--muted);
  font-size: 11px;
}
.profile-section {
  padding: 18px 0;
  border-bottom: 1px solid var(--line);
}
.profile-section > h3 {
  margin-bottom: 10px;
}
.profile-section > p {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 10px;
}
.candidate-preferences {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px 20px;
  margin: 0;
}
.candidate-preferences dt {
  color: var(--muted);
  font-size: 11px;
  margin-bottom: 3px;
}
.candidate-preferences dd {
  margin: 0;
  font-size: 12px;
}
.candidate-evidence-list {
  margin-top: 14px;
}
.candidate-evidence {
  border: 1px solid var(--line);
  border-radius: 7px;
  margin-top: 8px;
  overflow: hidden;
}
.candidate-evidence summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
  padding: 12px;
  background: #f8fafc;
}
.candidate-evidence summary::after {
  content: '+';
  color: var(--muted);
}
.candidate-evidence[open] summary::after {
  content: '−';
}
.candidate-evidence summary > span:first-child {
  flex: 1;
}
.candidate-evidence summary .candidate-eyebrow {
  font-size: 9px;
  margin-bottom: 2px;
}
.candidate-record-details {
  margin: 12px;
}
.candidate-record-details > div {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  padding: 5px 0;
  font-size: 12px;
}
.candidate-record-details dt {
  color: var(--muted);
  text-transform: capitalize;
}
.candidate-record-details dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.candidate-evidence-meta {
  display: block;
  padding: 0 12px 12px;
  font-size: 10px;
  color: var(--muted);
}
.candidate-note {
  margin-top: 18px;
}
.candidate-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  position: sticky;
  bottom: -20px;
  background: white;
  border-top: 1px solid var(--line);
  padding: 12px 22px;
  margin: 16px -22px 0;
  box-shadow: 0 -5px 12px #15233804;
}
.candidate-actions label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.candidate-actions select {
  min-height: 36px;
  font-size: 12px;
}
.candidate-profile > .tiny {
  padding-top: 12px;
}
.job-selector {
  position: relative;
  width: 280px;
  max-width: 100%;
}
.job-selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 36px;
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: white;
  text-align: left;
  font-size: 12px;
}
.job-selector-trigger > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.job-selector small {
  color: var(--muted);
  margin-left: 6px;
  font-size: 10px;
}
.job-selector-popover {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  width: max(100%, 300px);
  max-width: calc(100vw - 32px);
  z-index: 25;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: white;
  box-shadow: 0 10px 40px #15233826;
}
.job-selector-popover ul {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  max-height: 280px;
  overflow-y: auto;
}
.job-selector-popover li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 12px;
  overflow-wrap: anywhere;
}
.job-selector-popover li small {
  display: block;
  margin: 2px 0 0;
}
.job-selector-popover li.is-active,
.job-selector-popover li:hover {
  background: var(--wash);
}
.job-selector-popover li[aria-selected='true'] {
  color: var(--accent);
}
.job-selector-popover p {
  padding: 12px;
  font-size: 12px;
  color: var(--muted);
}
.login {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  background: white;
}
.login-story {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: var(--header);
  color: #fff;
  padding: clamp(32px, 6vw, 90px);
}
.login-story h2 {
  font-size: 22px;
  letter-spacing: -0.7px;
  margin-bottom: 60px;
}
.login-story h1 {
  font-size: clamp(30px, 3.6vw, 52px);
  line-height: 1.2;
  letter-spacing: -1.7px;
}
.login-story h1 em {
  font-style: normal;
  color: #b9c8ff;
}
.login-story > p {
  font-size: 14px;
  color: #c3cfe2;
  margin-top: 22px;
}
.login-benefits {
  list-style: none;
  padding: 0;
  margin: 28px 0;
  color: #d9e3f3;
  font-size: 12px;
}
.login-benefits li {
  padding: 8px 0;
}
.login-benefits li::before {
  content: '✓';
  color: #b9c8ff;
  margin-right: 12px;
}
.login-story a {
  color: #d9e3f3;
  font-size: 12px;
  margin-top: 14px;
}
.login-form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}
.login-form {
  width: 100%;
  max-width: 380px;
}
.login-form .eyebrow {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 1.5px;
  font-weight: 600;
  margin-bottom: 10px;
}
.login-form h2 {
  font-size: 28px;
  letter-spacing: -0.8px;
}
.login-form > p {
  color: var(--muted);
  font-size: 13px;
  margin: 8px 0 26px;
}
.login-form .field {
  margin-bottom: 16px;
}
.login-form input {
  min-height: 42px;
}
.login-form .btn {
  width: 100%;
  min-height: 42px;
}
.login-form > .btn {
  margin-top: 12px;
}
.login-form [role='alert'] {
  color: #962e41;
  background: #fff1f3;
  padding: 10px;
  border-radius: 6px;
  font-size: 12px;
  margin-bottom: 16px;
}
@media (min-width: 1600px) {
  .main {
    padding-left: 40px;
    padding-right: 40px;
  }
}
@media (max-width: 1200px) {
  .page-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }
  .page-actions {
    justify-content: flex-start;
  }
  .page-overview .opportunity-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .workspace-sidebar {
    width: 184px;
    padding: 22px 10px 16px;
  }
  .main {
    margin-left: 184px;
    padding-left: 20px;
    padding-right: 20px;
  }
  .metrics-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .strip-metric:nth-child(2) {
    border-right: 0;
  }
  .strip-metric:nth-child(-n + 2) {
    border-bottom: 1px solid var(--line);
  }
  .page-overview .opportunity-grid {
    grid-template-columns: 1fr;
  }
  .live-theme-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .live-messages {
    grid-template-columns: 210px minmax(0, 1fr);
  }
  .message-compose {
    flex-direction: column;
    align-items: stretch;
  }
  .activity-panel .activity-entry {
    grid-template-columns:34px minmax(0,1fr);
    gap:6px 12px;
  }
  .activity-entry time{grid-column:2;white-space:normal}
  .activity-heading{align-items:flex-start;flex-direction:column;gap:6px}
}
@media (max-width: 640px) {
  :host {
    font-size: 13px;
  }
  .workspace-sidebar {
    position: static;
    width: 100%;
    padding: 14px 16px 10px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    overflow: visible;
  }
  .home-brand {
    padding: 0;
  }
  .home-brand strong {
    font-size: 19px;
  }
  .home-brand small {
    font-size: 8px;
    margin-top: 3px;
  }
  .brand-mark {
    width: 30px;
    height: 32px;
    font-size: 23px;
  }
  .workspace-identity,
  .nav-label,
  .sidebar-bottom p {
    display: none;
  }
  .sidebar-bottom {
    grid-column: 2;
    grid-row: 1;
    padding: 0;
    margin: 0;
    align-self: center;
  }
  .sidebar-bottom .btn {
    min-height: 36px;
    font-size: 11px;
  }
  .workspace-nav {
    grid-column: 1/-1;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
  }
  .nav-item {
    flex-direction: column;
    justify-content: center;
    text-align: center;
    gap: 5px;
    padding: 8px 2px;
    min-height: 52px;
    font-size: 10px;
  }
  .nav-item svg {
    width: 17px;
    height: 17px;
  }
  .nav-item.active {
    box-shadow: inset 0 -2px 0 #aab9ff;
  }
  .main {
    margin: 0;
    padding: 0 16px 22px;
  }
  .workspace-topbar {
    height: 42px;
    margin-bottom: 16px;
    font-size: 10px;
  }
  .page-head {
    gap: 12px;
    margin-bottom: 16px;
  }
  h1 {
    font-size: 23px;
  }
  .page-head p {
    font-size: 12px;
  }
  .page-actions {
    width: 100%;
    gap: 8px;
  }
  .page-actions .job-selector {
    width: 100%;
  }
  .page-actions > .btn {
    flex: 1;
  }
  .btn {
    min-height: 40px;
  }
  .strip-metric {
    padding: 13px;
  }
  .metric-number {
    font-size: 27px;
  }
  .metric-label {
    font-size: 11px;
  }
  .metric-caption {
    font-size: 9px;
  }
  .insight-banner {
    flex-direction: column;
    align-items: stretch;
    padding: 14px;
  }
  .insight-banner .btn {
    align-self: flex-start;
  }
  .section-heading {
    margin-top: 18px;
  }
  .section-heading h2 {
    font-size: 14px;
  }
  .section-heading .btn {
    padding: 5px;
    font-size: 11px;
  }
  .opportunity-card {
    padding: 14px;
  }
  .live-toolbar .live-search {
    flex-basis: 100%;
  }
  .live-toolbar select,
  .live-toolbar > .btn {
    flex: 1;
    min-height: 40px;
  }
  .candidate-pagination {
    gap: 8px;
  }
  .candidate-pagination > span:first-child {
    flex-basis: 100%;
  }
  .live-messages {
    grid-template-columns: 1fr;
    min-height: 360px;
  }
  .live-messages aside {
    max-height: 160px;
    border-right: 0;
    border-bottom: 1px solid var(--line);
  }
  .live-messages > section {
    padding: 16px;
  }
  .live-messages aside .empty {
    padding: 18px;
  }
  .live-panel {
    padding: 16px;
  }
  .live-panel > .row.between {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .live-theme-grid {
    gap: 8px;
  }
  .live-theme {
    padding: 10px;
  }
  .live-theme small {
    display: none;
  }
  .live-form-grid {
    grid-template-columns: 1fr;
  }
  .live-dialog,
  .candidate-dialog {
    width: calc(100vw - 16px);
    max-height: calc(100dvh - 24px);
  }
  .modal-head {
    padding: 12px 16px;
  }
  .modal-head h2 {
    font-size: 16px;
  }
  .modal-body {
    padding: 16px;
  }
  .candidate-fit {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 14px;
  }
  .candidate-preferences {
    gap: 12px;
  }
  .candidate-record-details > div {
    grid-template-columns: 1fr;
    gap: 2px;
  }
  .candidate-intro {
    gap: 10px;
    flex-wrap: wrap;
  }
  .candidate-actions {
    bottom: -16px;
    margin-left: -16px;
    margin-right: -16px;
    padding: 12px 16px;
  }
  .candidate-actions .btn {
    flex: 1;
  }
  .candidate-actions label {
    width: 100%;
  }
  .candidate-actions select {
    flex: 1;
  }
  .login {
    grid-template-columns: 1fr;
  }
  .login-story {
    padding: 24px;
  }
  .login-story h2 {
    margin-bottom: 24px;
  }
  .login-story h1 {
    font-size: 28px;
    letter-spacing: -0.8px;
  }
  .login-story > p {
    margin-top: 12px;
    font-size: 12px;
  }
  .login-benefits {
    display: none;
  }
  .login-story a {
    margin-top: 14px;
  }
  .login-form-side {
    padding: 28px 24px;
  }
  .login-form h2 {
    font-size: 24px;
  }
  .login-form > p {
    margin-bottom: 22px;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    scroll-behavior: auto !important;
  }
}

.candidate-update-status {
  height: 20px;
  margin-top: -8px;
  font-size: 11px;
  color: var(--muted);
}
.candidate-table-wrap[aria-busy='true'] tbody {
  opacity: 0.6;
}

/* Company workspace shares the administration palette and compact navigation. */
:host{--ink:#253244;--muted:#5c6879;--line:#dde3eb;--bg:#f3f5f8;font-family:"Segoe UI",Arial,sans-serif}
:host([data-theme="portal"]) .workspace-sidebar{background:#fff;color:var(--ink);border-right:1px solid var(--line)}
:host([data-theme="portal"]) .home-brand{color:#25394f}
:host([data-theme="portal"]) .brand-mark,:host([data-theme="portal"]) .workspace-avatar{background:var(--wash);color:var(--accent);border-color:var(--line)}
:host([data-theme="portal"]) .home-brand small,:host([data-theme="portal"]) .workspace-identity small,:host([data-theme="portal"]) .sidebar-bottom p{color:var(--muted)}
:host([data-theme="portal"]) .workspace-identity{border-color:var(--line);background:#f8fafc}
:host([data-theme="portal"]) .nav-item{color:#526178;border-radius:5px}
:host([data-theme="portal"]) .nav-item:hover{background:#f3f5f8;color:var(--accent)}
:host([data-theme="portal"]) .nav-item.active{background:var(--wash);color:#244f80;box-shadow:none}
:host([data-theme="portal"]) .nav-item.active svg{color:inherit}
:host([data-theme="portal"]) .sidebar-bottom .btn{color:var(--accent);border-color:var(--line);background:#fff}
.nav-label{display:none}
:host([data-theme="portal"]) .login-story{background:#25394f}

.verification-page{min-height:100dvh;background:#f3f5f8;padding:32px 16px;display:flex;flex-direction:column;align-items:center;gap:20px}
.verification-intro{width:100%;max-width:580px}.verification-intro>h2{font-size:18px;color:#294f7c;margin:0 0 20px}.verification-intro h1{font-size:28px;line-height:1.25;margin:0 0 10px}.verification-intro p{font-size:14px;color:#526277;line-height:1.6}
.verification-page>.login-form-side{display:block;width:100%;max-width:580px;padding:0;background:transparent}
.verification-page .login-form{width:100%;max-width:none;margin:0;padding:24px;background:#fff;border:1px solid #dde3eb;border-radius:12px;box-sizing:border-box;display:grid;gap:14px}
.verification-page .login-form>h2{font-size:19px;overflow-wrap:anywhere;margin:0 0 4px}.verification-page h3{font-size:15px;margin:8px 0 0;padding-top:14px;border-top:1px solid #dde3eb}.verification-page p{font-size:14px;line-height:1.6;margin:0;color:#526277}.verification-page form{display:grid;gap:12px}.verification-page input[name=code]{font-size:22px;letter-spacing:7px;font-variant-numeric:tabular-nums}.verification-page .btn{min-height:40px}.verification-page [role=alert]{color:#a52b27}.verification-page [role=status]{color:#286747}
@media(max-width:600px){.verification-page{padding:20px 12px}.verification-page .login-form{padding:18px}.verification-intro h1{font-size:25px}}
.shell>.main{padding-top:22px}
.audit-change-details{font-size:12px;margin-top:8px}.audit-change-details summary{cursor:pointer;color:var(--accent)}.audit-change-details dl{margin:8px 0}.audit-change-details dt{text-transform:capitalize;font-weight:600}.audit-change-details dd{margin:2px 0 8px;color:var(--muted);overflow-wrap:anywhere}
.team-settings{background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.team-company{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px;border-bottom:1px solid var(--line)}
.team-company h2{font-size:19px;margin:4px 0}.team-company p{font-size:13px;color:var(--muted)}.team-eyebrow{font-size:10px;letter-spacing:1px;color:var(--muted)}
.team-table-heading{padding:16px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}.team-table-heading h2{font-size:16px}.team-table-heading h2 span{font-size:12px;background:var(--wash);padding:3px 7px;border-radius:4px;margin-left:6px}
.team-table-scroll{overflow:auto;position:relative}.team-table{width:100%;border-collapse:collapse;table-layout:fixed;min-width:760px;text-align:left}
.team-table th{padding:12px 18px;background:var(--bg);border-block:1px solid var(--line);font-size:12px;font-weight:600;color:var(--muted)}.team-table th:first-child{width:25%}.team-table th:nth-child(2){width:18%}.team-table th:nth-child(3){width:13%}.team-table th:last-child{width:145px}
.team-table td{padding:16px 18px;border-bottom:1px solid var(--line);font-size:13px;vertical-align:middle;overflow-wrap:anywhere;line-height:1.5}.team-table tbody tr:last-child td{border-bottom:0}.team-table small{display:block;color:var(--muted);font-size:12px;margin-top:4px}.team-table .team-you{display:inline;background:var(--wash);padding:2px 5px;margin-left:7px;font-size:10px;font-weight:500}.team-row-actions{display:flex;gap:6px;justify-content:flex-end}
.team-notice{padding:12px 20px;color:var(--accent);font-size:13px}.team-invitations{border-top:1px solid var(--line)}.team-invitations h3{font-size:14px;padding:18px 20px}
.team-dialog{margin:auto;width:min(560px,calc(100vw - 32px));max-height:85dvh;overflow:auto;border:1px solid var(--line);border-radius:12px;padding:22px;color:var(--ink);box-sizing:border-box;background:#fff}.team-dialog::backdrop{background:#14243880}.team-dialog header{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}.team-dialog h2{font-size:20px}.team-dialog form{display:grid;gap:14px}.team-dialog .field{margin:0}.team-dialog footer{display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--line);padding-top:16px}.team-dialog p{font-size:13px;line-height:1.6}.team-permissions{border:1px solid var(--line);padding:12px;border-radius:8px;display:grid;grid-template-columns:1fr 1fr;gap:12px}.team-permissions legend{padding:0 6px;font-size:13px;font-weight:600}.team-permissions label{display:flex;align-items:center;gap:8px;font-size:13px}.team-permissions input{width:17px;height:17px}.team-own-profile dl{display:grid;grid-template-columns:100px 1fr;gap:12px;font-size:14px;margin-bottom:18px}.team-own-profile dt{color:var(--muted)}.team-own-profile dd{margin:0;overflow-wrap:anywhere}.team-own-profile .btn{margin-top:16px}
.company-account-footer{display:flex;align-items:center;gap:8px;border-top:1px solid var(--line);padding-top:16px}.company-footer-identity{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.company-footer-identity>div{min-width:0}.company-footer-identity strong{display:block;font-size:13px;overflow:hidden;text-overflow:ellipsis}.company-footer-identity small{display:block;font-size:11px;color:var(--muted);margin-top:4px;overflow-wrap:anywhere}.company-account-footer>.btn{width:36px;min-width:36px;padding:8px;border:0;background:transparent;display:grid;place-items:center}
.page-settings .page-head{margin-bottom:16px}.page-settings .team-settings{max-width:none}
@media(max-width:600px){.team-company{align-items:flex-start;flex-direction:column;padding:16px}.team-company .row{flex-wrap:wrap}.team-table-heading{padding:14px 16px}.team-permissions{grid-template-columns:1fr}.company-account-footer{border-top:0;padding-top:0}.company-footer-identity{display:none}}
.page-copilot{height:100dvh;display:flex;flex-direction:column;overflow:hidden}
.page-copilot .workspace-topbar{height:38px;flex-shrink:0;margin-bottom:12px}
.page-copilot .page-head{flex-shrink:0;margin-bottom:14px}
.hiring-chat-layout{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px;flex:1;min-height:0;padding-bottom:16px}
.hiring-chat-layout .copilot-panel{max-width:none;min-height:0;margin:0;padding:0;display:flex;flex-direction:column;overflow:hidden}
.hiring-chat-header{padding:16px 20px;border-bottom:1px solid var(--line);flex-shrink:0}
.hiring-chat-header h2{font-size:17px}.hiring-chat-header p{font-size:12px;margin-top:4px}
.hiring-chat-layout .live-answer-list{max-height:none;flex:1;min-height:0;padding:24px clamp(16px,4vw,60px);overscroll-behavior:contain}
.hiring-chat-layout .live-answer-list>[role=status]{max-width:540px;margin:40px auto;text-align:center;display:grid;gap:14px;justify-items:center;line-height:1.6}
.hiring-chat-layout .live-answer-list article{background:transparent;border:0;padding:12px 0;margin:0 auto 16px;max-width:760px;line-height:1.65}
.hiring-chat-layout .live-answer-list article>p:first-of-type{background:var(--wash);border-radius:12px;padding:12px 16px;margin-left:32px}
.hiring-chat-suggestions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;max-width:760px;margin:20px auto}
.hiring-chat-suggestions .btn{white-space:normal;text-align:left;line-height:1.5;font-weight:500;padding:12px}
.hiring-chat-layout .hiring-chat-composer{margin:0;padding:14px 20px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:end;background:#fff;flex-shrink:0}
.hiring-chat-composer .field{margin:0;gap:6px;font-size:12px}.hiring-chat-composer textarea{min-height:64px;max-height:140px;resize:vertical;border-radius:10px;line-height:1.5}.hiring-chat-composer small{grid-column:1/-1;color:var(--muted);font-size:11px}
.hiring-chat-context{align-self:start;border:1px solid var(--line);background:#fff;border-radius:10px;padding:18px;font-size:13px;line-height:1.6}
.hiring-chat-context h2{font-size:15px;margin-bottom:16px}.hiring-chat-context h3{font-size:13px;margin:16px 0 6px}.hiring-chat-context p{color:var(--muted);margin:8px 0}.hiring-chat-context dl{margin:16px 0}.hiring-chat-context dl>div{display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}.hiring-chat-context dd{margin:0;font-weight:600}
.page-activity .page-head{margin:0 0 14px}.page-activity .audit-search-row{padding:14px 18px}.page-activity .audit-search{max-width:620px}.page-activity .audit-status{padding:8px 18px}.page-activity .audit-table-scroll{min-height:0}
@media(max-width:1050px){.hiring-chat-layout{grid-template-columns:minmax(0,1fr)}.hiring-chat-context{display:none}.hiring-chat-suggestions{grid-template-columns:1fr}}
@media(max-width:600px){.page-copilot{height:auto;min-height:100dvh;overflow:visible}.hiring-chat-layout{min-height:65dvh}.hiring-chat-layout .live-answer-list{max-height:50dvh}.hiring-chat-layout .hiring-chat-composer{padding:12px;grid-template-columns:1fr}.hiring-chat-composer .btn{justify-self:end}.hiring-chat-header{padding:14px}.hiring-chat-header p{max-width:210px}}
/* Overview density: preserve readable text and touch targets, shorten repeated chrome. */
.page-overview .workspace-topbar{height:38px;margin-bottom:14px}
.page-overview .page-head{margin-bottom:14px;gap:12px}
.page-overview .page-head h1{font-size:26px;line-height:1.25}
.page-overview .metrics-strip{margin-bottom:12px}
.page-overview .strip-metric{padding:12px 16px}
.page-overview .strip-metric>div{display:grid;grid-template-columns:1fr auto;column-gap:10px;align-items:center}
.page-overview .metric-label{font-size:13px}
.page-overview .metric-number{grid-column:2;grid-row:1 / span 2;font-size:27px;margin:0;line-height:1.25;letter-spacing:-.5px}
.page-overview .metric-caption{font-size:11px;margin-top:4px}
.page-overview .insight-banner{padding:12px 16px;margin-bottom:14px}
.page-overview .insight-label{font-size:10px;letter-spacing:.6px;margin-bottom:5px}
.page-overview .section-heading{margin:16px 0 8px}
.page-overview .opportunity-grid{gap:12px}
.page-overview .opportunity-card{padding:14px 16px}
.page-overview .opportunity-title{margin:10px 0 5px;font-size:17px;line-height:1.3}
.page-overview .opportunity-card p{font-size:13px;line-height:1.5}
.page-overview .opportunity-skills{margin:10px 0;gap:5px}
.page-overview .opportunity-bottom{padding-top:10px;font-size:12px}
.page-overview .opportunity-bottom .btn{min-height:36px;padding:6px 10px}
@media(max-width:1100px){.page-overview .page-head{align-items:flex-start;flex-direction:column}.page-overview .page-actions{justify-content:flex-start}}
@media(max-width:600px){.page-overview .strip-metric{padding:12px}.page-overview .metric-number{font-size:24px}.page-overview .insight-banner{align-items:flex-start;flex-direction:column}.page-overview .page-actions{width:100%}.page-overview .page-actions .job-selector{width:100%}.page-overview .opportunity-bottom .btn{min-height:40px}}

.assistant-copy{display:block;line-height:1.7;overflow-wrap:anywhere;min-width:0}
.assistant-copy p{white-space:normal!important;margin:0 0 12px!important}
.assistant-copy h1,.assistant-copy h2,.assistant-copy h3,.assistant-copy h4,.assistant-copy h5,.assistant-copy h6{font-size:1.05em;line-height:1.45;margin:20px 0 10px;font-weight:650}
.assistant-copy ul,.assistant-copy ol{margin:8px 0 16px;padding-left:24px;list-style-position:outside}
.assistant-copy ul{list-style-type:disc}.assistant-copy ol{list-style-type:decimal}
.assistant-copy li{margin:6px 0}.assistant-copy li p{margin:0!important}
.assistant-copy blockquote{border-left:3px solid var(--line);margin:12px 0;padding-left:14px;color:var(--muted)}
.assistant-copy pre{overflow:auto;max-width:100%;background:var(--wash,#f2f5f9);padding:12px;border-radius:8px;white-space:pre}
.assistant-copy code{font-size:.9em;background:var(--wash,#f2f5f9);padding:2px 4px;border-radius:3px}.assistant-copy pre code{padding:0;background:none}
.assistant-copy a{text-decoration:underline}.assistant-table{overflow-x:auto;max-width:100%;margin:12px 0}
.assistant-table table{border-collapse:collapse;width:100%}.assistant-table th,.assistant-table td{padding:8px 12px;border:1px solid var(--line);text-align:left}
.assistant-copy>:first-child{margin-top:0}.assistant-copy>:last-child{margin-bottom:0!important}

.agent-proposal{border:1px solid var(--line);border-radius:10px;padding:16px;margin-top:16px;background:var(--wash)}
.agent-proposal h3{text-transform:capitalize;margin:0 0 8px}.agent-proposal dl{margin:12px 0;display:grid;gap:8px}.agent-proposal dt{text-transform:capitalize;font-weight:600}.agent-proposal dd{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.agent-proposal .actions{display:flex;gap:8px}

.chat-exchange,.copilot-exchange{display:flex;flex-direction:column;gap:22px;min-width:0}
.chat-exchange .chat-user-bubble,.copilot-exchange .chat-user-bubble{align-self:flex-end;margin-left:auto;width:fit-content;max-width:82%;padding:12px 18px;border-radius:18px;background:var(--wash,#eaf0f7);text-align:left;overflow-wrap:anywhere;min-width:0;box-sizing:border-box}
.chat-user-bubble p{margin:0!important;white-space:pre-wrap;line-height:1.65}
.chat-exchange .chat-agent-reply,.copilot-exchange .chat-agent-reply{align-self:flex-start;width:100%;max-width:100%;min-width:0;padding:0;background:transparent;text-align:left;line-height:1.7;overflow-wrap:anywhere}
.chat-agent-reply .copilot-pending{color:var(--muted,#64758b);margin:0;font-size:14px}
@media(max-width:600px){.chat-exchange .chat-user-bubble,.copilot-exchange .chat-user-bubble{max-width:90%;padding:10px 14px}.chat-exchange,.copilot-exchange{gap:18px}}
`;
