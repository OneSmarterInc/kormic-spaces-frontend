import { useId, useRef, useState, type ReactNode } from 'react';

/** Pinned navigation reserves space; hover previews overlay the content. */
export function CollapsibleSidebar({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const [pinned, setPinned] = useState(true);
  const [preview, setPreview] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const open = pinned || preview;
  return (
    <div
      className="navigation-drawer"
      data-pinned={pinned}
      data-open={open}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') setPreview(true);
      }}
      onPointerLeave={() => setPreview(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPreview(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          toggle.current?.focus();
          setPinned(false);
          setPreview(false);
        }
      }}
    >
      <style>{drawerStyles}</style>
      <button
        ref={toggle}
        type="button"
        className="navigation-toggle"
        aria-controls={id}
        aria-expanded={open}
        aria-pressed={pinned}
        aria-label={pinned ? 'Hide navigation' : 'Keep navigation open'}
        data-tooltip={pinned ? 'Hide navigation' : 'Hover to preview · Click to keep open'}
        onFocus={() => setPreview(true)}
        onClick={() => {
          setPinned(!pinned);
          setPreview(false);
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <aside id={id} className={className} inert={!open} aria-hidden={!open}>
        {children}
      </aside>
    </div>
  );
}

const drawerStyles = `
.shell,.portal-shell{--navigation-width:240px;--navigation-rail:52px}
.portal-shell:has(>.navigation-drawer){display:block}
.shell:has(>.navigation-drawer)>.main,.portal-shell:has(>.navigation-drawer)>main{margin-left:var(--navigation-rail);width:calc(100% - var(--navigation-rail));transition:margin-left 180ms ease,width 180ms ease}
.shell:has(>.navigation-drawer[data-pinned="true"])>.main,.portal-shell:has(>.navigation-drawer[data-pinned="true"])>main{margin-left:var(--navigation-width);width:calc(100% - var(--navigation-width))}
.navigation-drawer{position:fixed;inset:0 auto 0 0;width:var(--navigation-rail);z-index:40;pointer-events:none}
.navigation-drawer[data-open="true"]{width:var(--navigation-width)}
.navigation-drawer .navigation-toggle{pointer-events:auto;position:absolute;top:12px;left:10px;z-index:2;width:34px;height:34px;min-height:34px;padding:7px;display:grid;place-items:center;border:1px solid var(--line);border-radius:8px;background:#fff;color:var(--ink,#25394f);cursor:pointer}
.navigation-toggle:focus-visible{outline:2px solid var(--accent,#2b5483);outline-offset:3px}
.navigation-drawer>aside{z-index:1;pointer-events:auto;position:absolute;inset:0;width:var(--navigation-width);height:100dvh;display:flex;flex-direction:column;overflow-y:auto;padding:60px 14px 16px;gap:20px;border-right:1px solid var(--line);transform:translateX(-100%);visibility:hidden;transition:transform 180ms ease,visibility 180ms;box-sizing:border-box}
.navigation-drawer[data-open="true"]>aside{transform:translateX(0);visibility:visible}
.navigation-drawer[data-open="true"][data-pinned="false"]>aside{box-shadow:12px 0 32px #172b4520}
.navigation-drawer aside nav{display:grid;grid-template-columns:1fr;overflow:visible;gap:4px}
.navigation-drawer aside nav button{display:flex;flex-direction:row;justify-content:flex-start;text-align:left;white-space:normal}
.navigation-drawer .sidebar-bottom,.navigation-drawer .portal-account{margin-top:auto;flex-shrink:0}
.navigation-drawer .portal-account{display:grid}
.navigation-drawer .company-footer-identity{display:flex}
.navigation-drawer .company-account-footer{align-self:stretch;width:100%;border-top:1px solid var(--line);padding-top:14px}
.navigation-drawer aside nav button{font-size:13px;gap:10px;padding:10px 12px;min-height:42px}
@media(max-width:640px){.shell,.portal-shell{--navigation-width:min(280px,85vw)}
.shell:has(>.navigation-drawer[data-pinned="true"])>.main,.portal-shell:has(>.navigation-drawer[data-pinned="true"])>main{margin-left:var(--navigation-rail);width:calc(100% - var(--navigation-rail))}}
@media(prefers-reduced-motion:reduce){.navigation-drawer>aside,.shell:has(>.navigation-drawer)>.main,.portal-shell:has(>.navigation-drawer)>main{transition:none}}
`;
