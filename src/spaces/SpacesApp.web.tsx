import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PortalConsole } from './PortalConsole.web';

export default function SpacesApp() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!element) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{display:block}';
    shadow.append(style);
    setRoot(shadow);
    return () => {
      document.body.style.overflow = previous;
      style.remove();
    };
  }, [element]);
  return (
    <div ref={setElement} style={{ width: '100%', minHeight: '100vh' }}>
      {root && createPortal(<PortalConsole />, root)}
    </div>
  );
}
