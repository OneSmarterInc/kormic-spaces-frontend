export const employerContactStyles = `
.employer-contacts {
  color: #263d55;
  font-size: 13px;
  min-width: 0;
}
.employer-contacts p {
  line-height: 1.5;
}
.ec-policy {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: #eef3f8;
  border: 1px solid #d6e0eb;
  padding: 14px 16px;
  margin-bottom: 18px;
  border-radius: 6px;
}
.ec-policy p {
  margin: 4px 0 0;
  color: #52647a;
}
.ec-toolbar,
.ec-toolbar form,
.ec-pagination,
.ec-fetch {
  display: flex;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}
.ec-toolbar {
  margin-bottom: 12px;
  justify-content: space-between;
}
.employer-contacts label {
  display: flex;
  gap: 6px;
  flex-direction: column;
  font-size: 13px;
}
.ec-toolbar input[type="checkbox"] { width:16px; height:16px; padding:0; flex:0 0 auto; }
.ec-toolbar > label {
  flex-direction: row;
  align-items: center;
  padding-bottom: 10px;
}
.employer-contacts input:not([type="checkbox"]),
.employer-contacts select,
.employer-contacts textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #bbcbdc;
  border-radius: 4px;
  background: white;
  padding: 9px 10px;
  color: #263d55;
  font: inherit;
}
.employer-contacts button {
  white-space: nowrap;
  border: 1px solid #bbcbdc;
  border-radius: 4px;
  padding: 9px 12px;
  background: #fff;
  color: #244c76;
  font: inherit;
  cursor: pointer;
}
.employer-contacts button:hover:not(:disabled) {
  background: #edf3f8;
}
.employer-contacts button:disabled {
  opacity: 0.6;
  cursor: default;
}
.employer-contacts :focus-visible {
  outline: 2px solid #255a90;
  outline-offset: 3px;
}
.ec-table-scroll {
  position: relative;
  overflow: auto;
  background: #fff;
  border: 1px solid #d6e0eb;
  border-radius: 6px;
}
.employer-contacts table {
  width: 100%;
  min-width: 1000px;
  table-layout: fixed;
  border-collapse: collapse;
}
.employer-contacts caption {
  text-align: left;
  padding: 12px 14px;
  font-size: 13px;
  color: #52647a;
}
.employer-contacts th {
  background: #f4f7fa;
  text-align: left;
  font-size: 12px;
}
.employer-contacts td,
.employer-contacts th {
  padding: 10px 12px;
  border-bottom: 1px solid #e3eaf1;
  vertical-align: top;
  overflow-wrap: anywhere;
}
.employer-contacts th button {
  border: 0;
  background: none;
  padding: 0;
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
}
.employer-contacts td span,
.employer-contacts td small {
  display: block;
  margin-top: 4px;
}
.employer-contacts small,
.ec-muted {
  color: #52647a;
  font-size: 12px;
}
.ec-contact + .ec-contact {
  margin-top: 12px;
}
.ec-status {
  text-transform: capitalize;
}
.ec-pagination {
  justify-content: flex-end;
  align-items: center;
  padding: 12px 0;
}
.ec-pagination span {
  margin-right: auto;
  font-size: 13px;
}
.ec-review {
  margin: auto;
  width: min(960px, calc(100% - 32px));
  max-height: calc(100dvh - 48px);
  overflow-y: auto;
  overscroll-behavior: contain;
  color: inherit;
  background: #fff;
  border: 1px solid #d6e0eb;
  padding: 20px;
  border-radius: 6px;
}
.ec-review::backdrop { background: rgba(20, 34, 51, .48); }
.ec-review header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}
.ec-review h2 {
  font-size: 20px;
  margin: 0;
}
.ec-review h3 {
  font-size: 16px;
  margin-top: 24px;
}
.ec-review h4 {
  margin: 0;
  overflow-wrap: anywhere;
}
.ec-review summary {
  padding: 16px 0;
  font-weight: 600;
  cursor: pointer;
}
.ec-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.ec-wide {
  grid-column: 1/-1;
}
.ec-form button {
  justify-self: start;
}
.ec-form textarea {
  min-height: 76px;
  resize: vertical;
}
.ec-evidence {
  padding: 20px 0;
  border-top: 1px solid #d6e0eb;
}
.ec-evidence blockquote {
  margin: 12px 0;
  background: #f4f7fa;
  padding: 12px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  max-height: 220px;
  overflow: auto;
}
.ec-evidence .ec-form {
  margin-top: 16px;
}
.ec-fetch {
  margin: 20px 0;
}
.ec-fetch label {
  flex: 1;
}
.ec-error {
  color: #a32626;
}
.ec-empty {
  padding: 24px;
}
.ec-sr {
  left: 0;
  top: 0;
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@media (max-width: 640px) {
  .ec-form {
    grid-template-columns: 1fr;
  }
  .ec-policy,
  .ec-review header {
    align-items: start;
    flex-direction: column;
  }
  .ec-toolbar form,
  .ec-toolbar form label {
    width: 100%;
  }
  .ec-review {
    padding: 14px;
  }
  .ec-pagination {
    gap: 8px;
  }
}


.ec-overview {display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:12px 0 18px;color:#52647a;font-size:12px}
.ec-overview strong{color:#263d55;font-variant-numeric:tabular-nums}
.ec-email-off{margin-left:auto;color:#52647a}
.ec-tabs{display:flex;border-bottom:1px solid #d6e0eb;margin-bottom:14px;gap:20px}
.ec-tabs button{background:none;border:0;border-radius:0;padding:10px 0;border-bottom:2px solid transparent;color:#52647a}
.ec-tabs button[aria-selected=true]{border-bottom-color:#294f7c;color:#294f7c;font-weight:600}
.ec-toolbar .ec-search{min-width:260px}
.ec-toolbar .ec-check{display:flex;flex-direction:row;align-items:center;margin-left:auto;font-weight:400}
.ec-discovery-note{display:flex;align-items:center;gap:16px;flex-wrap:wrap;font-size:12px;color:#52647a;margin:0 0 12px}
.ec-discovery-note>span:first-child{font-weight:600;color:#354e68}
.ec-discovery-note details{position:relative;margin-left:auto}
.ec-discovery-note summary{cursor:pointer;color:#294f7c}
.ec-discovery-note p{max-width:70ch;background:#fff;border:1px solid #d6e0eb;padding:12px;margin-top:8px}
.employer-contacts caption span{float:right;font-size:12px}
.ec-status{font-size:12px}
.ec-table-scroll td>button{font-size:12px;padding:6px 9px}
.ec-table-scroll td>span{margin-top:2px}
.ec-notice{margin-bottom:10px;color:#354e68;font-size:12px}
.ec-context{margin:16px 0}
.ec-review{font-size:13px}
.ec-review p{font-size:12px;color:#52647a}
.ec-review header{padding-bottom:14px;border-bottom:1px solid #d6e0eb;margin-bottom:12px}
.ec-review header h2{font-size:18px}
@media(max-width:640px){.ec-overview{gap:8px 16px;padding:4px 0 14px}.ec-email-off{margin-left:0}.ec-toolbar .ec-search{min-width:0}.ec-toolbar .ec-check{margin-left:0}.ec-discovery-note{gap:8px}.ec-discovery-note details{margin-left:0}.ec-review{width:calc(100% - 20px);max-height:calc(100dvh - 24px)}.employer-contacts caption span{float:none;display:block;margin-top:4px}}

.employer-contacts>.ec-overview{margin:0;flex-shrink:0;padding:12px 16px}
.employer-contacts>.ec-tabs{margin:0;flex-shrink:0}
.employer-contacts>.ec-toolbar{margin:0;gap:12px;flex-shrink:0}
.employer-contacts .ec-data-panel{flex:1;min-height:0;display:flex;flex-direction:column;background:white;border:1px solid #dce3eb;border-radius:7px;overflow:hidden}
.employer-contacts .ec-data-panel>.ec-table-scroll{flex:1;min-height:0;max-height:none;border:0;border-radius:0;scrollbar-gutter:stable}
.employer-contacts .ec-data-panel>.ec-pagination{flex-shrink:0;margin:0;padding:10px 14px;border-top:1px solid #dce3eb}
.employer-contacts .ec-data-panel table{table-layout:fixed;width:100%;min-width:900px}
.employer-contacts .ec-data-panel th,.employer-contacts .ec-data-panel td{padding:10px 12px;overflow-wrap:anywhere}
.employer-contacts .ec-data-panel th{position:sticky;top:0;z-index:1;background:#f5f7fa}
.employer-contacts .ec-data-panel th:last-child{width:90px}
.employer-contacts>.ec-discovery-note{display:block;margin:0;padding:20px;background:white;border:1px solid #dce3eb;border-radius:7px;overflow:auto;min-height:0}
.employer-contacts>.ec-discovery-note>span{display:block;margin-bottom:8px}
.employer-contacts>.ec-discovery-note h2{font-size:14px;margin:20px 0 8px}
.employer-contacts>.ec-discovery-note p{max-width:78ch;margin-bottom:20px}
@media(max-width:700px){.employer-contacts .ec-data-panel{height:65dvh;min-height:360px;flex:auto}.employer-contacts>.ec-tabs{flex-wrap:wrap}.employer-contacts .ec-tabs button{padding:10px 8px}.employer-contacts>.ec-toolbar form{width:100%}}
@media(max-width:700px){.employer-contacts>.ec-toolbar form{flex-wrap:nowrap;align-items:center}.employer-contacts>.ec-toolbar form .ec-search{flex:1;min-width:0}}

/* Compact operational controls with clear, persistent labels. */
.employer-contacts>.ec-overview{display:flex;justify-content:flex-start;align-items:stretch;gap:10px;padding:0;margin:0}
.ec-overview>span{display:flex;flex-direction:column;gap:3px;min-width:180px;padding:10px 14px;border:1px solid #d6e0eb;border-radius:8px;background:#fff;font-size:13px;color:#455b72;line-height:1.4}
.ec-overview strong{font-size:21px;line-height:1.2;color:#253244}
.employer-contacts>.ec-toolbar{justify-content:flex-start;align-items:flex-end;gap:12px}
.ec-toolbar>.ec-contact-filter{flex-direction:column;align-items:stretch;padding:0;font-size:12px}
.ec-toolbar form{align-items:flex-end}.ec-toolbar button{min-height:38px}
.ec-toolbar .ec-search{min-width:250px}.ec-tabs button{padding-top:10px;padding-bottom:10px}
@media(max-width:700px){.ec-overview>span{flex:1;min-width:145px}.ec-overview strong{font-size:19px}.ec-toolbar>.ec-contact-filter{flex:1}.ec-toolbar>button{white-space:normal}}

.employer-contacts{gap:8px}.ec-overview>span{padding:8px 12px;min-width:180px;gap:2px}.ec-overview strong{font-size:19px}.employer-contacts>.ec-tabs{margin:0}.ec-toolbar .ec-search{min-width:300px}.ec-toolbar .ec-contact-filter select{min-height:38px}.employer-contacts>.ec-toolbar{gap:10px}.portal-shell main:has(.employer-contacts) .portal-title{margin-bottom:12px}.employer-contacts caption{padding:10px 14px}
@media(max-width:700px){.ec-toolbar .ec-search{min-width:0}.ec-overview>span{min-width:140px}}
`;
