import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Render untrusted assistant Markdown without executable HTML or remote images. */
export function AssistantText({ text }: { text: string }) {
  return (
    <div className="assistant-copy">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        disallowedElements={['img']}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="assistant-table">
              <table>{children}</table>
            </div>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
