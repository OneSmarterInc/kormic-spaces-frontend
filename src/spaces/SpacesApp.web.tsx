import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { workspaceStyles } from "./workspaceStyles";
import { spacesPagePath, spacesPageSegment } from "./deployment";

const PortalConsole = lazy(() =>
  import("./PortalConsole.web").then((m) => ({ default: m.PortalConsole })),
);
const LiveSpaces = lazy(() =>
  import("./LiveSpaces.web").then((m) => ({ default: m.LiveSpaces })),
);

class WorkspaceLoadBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <section role="alert" style={{ padding: 24 }}>
          <h1>Spaces could not load</h1>
          <p>Check your connection and reload to try again.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload Spaces
          </button>
        </section>
      );
    return this.props.children;
  }
}

export default function SpacesApp() {
  const segment = spacesPageSegment(window.location.pathname);
  const legacyAdmin = ["collection", "planner", "users", "overview"].includes(
    segment,
  );
  const admin = legacyAdmin || /^admin(?:\/|$)/.test(segment);
  useEffect(() => {
    if (legacyAdmin)
      history.replaceState(
        {},
        "",
        spacesPagePath(`admin/${segment}`) + location.search,
      );
  }, [legacyAdmin, segment]);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => {
    if (!element) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "auto";
    const shadow = element.shadowRoot ?? element.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = admin ? ":host{display:block}" : workspaceStyles;
    shadow.append(style);
    setRoot(shadow);
    return () => {
      document.body.style.overflow = previous;
      style.remove();
    };
  }, [element, admin]);
  return (
    <div ref={setElement} style={{ width: "100%", minHeight: "100vh" }}>
      {root &&
        createPortal(
          <WorkspaceLoadBoundary>
            <Suspense
              fallback={
                <p role="status" style={{ padding: 24 }}>
                  Loading Spaces…
                </p>
              }
            >
              {admin ? <PortalConsole /> : <LiveSpaces host={element!} />}
            </Suspense>
          </WorkspaceLoadBoundary>,
          root,
        )}
    </div>
  );
}
