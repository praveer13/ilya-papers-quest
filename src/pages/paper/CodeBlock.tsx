import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

/**
 * CodeBlock — terminal chrome (3 dots + filename tab), JetBrains Mono,
 * Prism one-dark palette, copy button (design.md §12). Used for the
 * ELI-engineer code analogies.
 */
export default function CodeBlock({
  code,
  lang,
  file,
}: {
  code: string;
  lang: string;
  file: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-[#0A0A14]">
      {/* terminal chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <span className="size-2.5 rounded-full bg-danger/70" />
        <span className="size-2.5 rounded-full bg-xp/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-2 font-mono text-[12px] tracking-wide text-txt-dim">{file}</span>
        <button
          type="button"
          onClick={copy}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-txt-faint transition-colors hover:border-focus hover:text-txt"
          aria-label="copy code"
        >
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={lang === 'diff' ? 'diff' : lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '14px 16px',
          background: 'transparent',
          fontSize: 13.5,
          lineHeight: 1.65,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        }}
        codeTagProps={{ style: { fontFamily: '"JetBrains Mono", ui-monospace, monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
