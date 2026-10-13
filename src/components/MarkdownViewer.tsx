import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface MarkdownViewerProps {
  content: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parser leve e seguro para blocos de Markdown essenciais (Títulos, Listas, Citações e Código)
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = '';
    let codeIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Bloco de código (```)
      if (line.trim().startsWith('```')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLanguage = line.trim().replace('```', '') || 'code';
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          const currentCode = codeBuffer.join('\n');
          const currentIndex = codeIndex++;
          elements.push(
            <div key={`code-${currentIndex}`} className="my-4 rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1.5">
                  <Terminal size={14} className="text-indigo-400" />
                  {codeLanguage}
                </span>
                <button
                  onClick={() => handleCopy(currentCode, currentIndex)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs cursor-pointer"
                >
                  {copiedIndex === currentIndex ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar código</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 text-sm text-slate-200 overflow-x-auto leading-relaxed">
                <code>{currentCode}</code>
              </pre>
            </div>
          );
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Títulos #, ##, ###
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-2xl font-bold text-white mt-6 mb-3 border-b border-slate-800 pb-2">
            {line.replace('# ', '')}
          </h1>
        );
      } else if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-xl font-bold text-slate-100 mt-5 mb-2">
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-lg font-semibold text-indigo-300 mt-4 mb-2">
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('> ')) {
        // Citações / Dicas
        elements.push(
          <blockquote key={`quote-${i}`} className="my-3 pl-4 border-l-4 border-indigo-500 bg-indigo-950/20 py-2 pr-3 rounded-r-lg text-slate-300 text-sm italic">
            {line.replace('> ', '')}
          </blockquote>
        );
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        // Listas
        elements.push(
          <li key={`li-${i}`} className="ml-5 list-disc text-slate-300 text-sm my-1">
            {line.trim().substring(2)}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
      } else {
        // Parágrafo regular
        elements.push(
          <p key={`p-${i}`} className="text-slate-300 text-sm leading-relaxed my-1">
            {line}
          </p>
        );
      }
    }

    return elements;
  };

  return (
    <div className="markdown-body text-slate-200 space-y-1">
      {renderMarkdown(content)}
    </div>
  );
};
