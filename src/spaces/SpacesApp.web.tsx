import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { LiveSpaces } from './LiveSpaces.web';

export default function SpacesApp() {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!element) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' });
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/spaces-assets/styles.css';
    shadow.append(link);
    setRoot(shadow);
    return () => {
      document.body.style.overflow = previous;
      link.remove();
    };
  }, [element]);
  return (
    <div ref={setElement} style={{ width: '100%', minHeight: '100vh' }}>
      {root && createPortal(<LiveSpaces host={element!} />, root)}
    </div>
  );
}
