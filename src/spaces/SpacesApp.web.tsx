import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalConsole } from './PortalConsole.web';
import { LiveSpaces } from './LiveSpaces.web';
import { workspaceStyles } from './workspaceStyles';
import { spacesPagePath, spacesPageSegment } from './deployment';

export default function SpacesApp() {
  const segment = spacesPageSegment(window.location.pathname);
  const legacyAdmin = ['collection', 'planner', 'users', 'overview'].includes(segment);
  const admin = legacyAdmin || /^admin(?:\/|$)/.test(segment);
  useEffect(() => {
    if (legacyAdmin) history.replaceState({}, '', spacesPagePath(`admin/${segment}`) + location.search);
  }, [legacyAdmin, segment]);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!element) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = admin ? ':host{display:block}' : workspaceStyles;
    shadow.append(style);
    setRoot(shadow);
    return () => {
      document.body.style.overflow = previous;
      style.remove();
    };
  }, [element, admin]);
  return (
    <div ref={setElement} style={{ width: '100%', minHeight: '100vh' }}>
      {root && createPortal(admin ? <PortalConsole /> : <LiveSpaces host={element!} />, root)}
    </div>
  );
}
