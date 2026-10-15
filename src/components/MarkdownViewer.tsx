import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
}

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 overflow-hidden shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-950 border-b border-slate-700 dark:border-slate-800 text-xs text-slate-300 dark:text-slate-400 font-mono">
        <span className="flex items-center gap-1.5 font-semibold">
          <Terminal size={14} className="text-indigo-400" />
          {language || 'código'}
        </span>
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition-all text-xs cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copiar código</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs sm:text-sm text-slate-100 overflow-x-auto leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div className="text-slate-800 dark:text-slate-200 space-y-3 leading-relaxed text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ ...props }) => (
            <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-5 mb-2.5 pb-1 border-b border-slate-100 dark:border-slate-800/60" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-300 mt-4 mb-2" {...props} />
          ),
          h4: ({ ...props }) => (
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-3 mb-1" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="my-2 leading-relaxed text-slate-700 dark:text-slate-300" {...props} />
          ),
          strong: ({ ...props }) => (
            <strong className="font-bold text-slate-900 dark:text-white" {...props} />
          ),
          em: ({ ...props }) => (
            <em className="italic text-slate-800 dark:text-slate-300" {...props} />
          ),
          blockquote: ({ ...props }) => (
            <blockquote className="my-3 pl-4 border-l-4 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 py-2.5 pr-3 rounded-r-xl text-slate-700 dark:text-slate-300 italic" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="my-2 ml-5 list-disc space-y-1 text-slate-700 dark:text-slate-300" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1 text-slate-700 dark:text-slate-300" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          a: ({ href, children, ...props }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500 font-medium" {...props}>
              {children}
            </a>
          ),
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match && typeof children === 'string' && !children.includes('\n');
            const codeString = String(children).replace(/\n$/, '');

            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-semibold" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : undefined}
                code={codeString}
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
