import type { ReactNode } from 'react';

/* Minimal Markdown renderer for AI replies: tables, headings, lists, blockquotes, bold and code. */

// Helper to format inline bold, code, highlights
export const formatInlineText = (text: string): ReactNode => {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, partIdx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={partIdx} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={partIdx}
          className="py-px px-[5px] rounded-xs text-[11.5px] bg-[rgba(0,0,0,0.25)] border border-line text-[var(--text-link)] light:bg-[var(--btn-secondary-bg)] light:border-[var(--border-hover)] light:text-[var(--primary)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

// Helper function to render text with Markdown styling (Tables, Headings, Lists, Blockquotes)
export const renderFormattedText = (text: string): ReactNode => {
  if (!text) return null;

  // Defense-in-depth: Strip any thinking / reasoning tags (<think>...</think>) from text
  const cleanText = text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .replace(/<thought>[\s\S]*$/gi, '')
    .replace(/<thinking>[\s\S]*$/gi, '')
    .trim();

  if (!cleanText) return null;

  const rawLines = cleanText.split('\n');
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // Check if this line is part of a markdown table (starts and contains '|')
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (
        i < rawLines.length &&
        rawLines[i].trim().startsWith('|') &&
        rawLines[i].trim().endsWith('|')
      ) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        let bodyStartIndex = 1;
        if (tableLines[1].replace(/[\s|:-]/g, '').length === 0) {
          bodyStartIndex = 2;
        }

        const rows = tableLines.slice(bodyStartIndex).map((rowLine) => {
          return rowLine
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());
        });

        elements.push(
          <div
            key={`table-${i}`}
            className="w-full my-[10px] overflow-x-auto rounded-md border border-line bg-[rgba(0,0,0,0.6)] shadow-[0_4px_16px_rgba(0,0,0,0.25)] light:bg-white light:shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
          >
            <table className="w-full border-collapse text-[12px] text-left">
              <thead className="bg-[var(--bg-widget)] border-b border-line light:bg-[var(--bg-card)]">
                <tr>
                  {headerCells.map((th, thIdx) => (
                    <th
                      key={thIdx}
                      className="py-2 px-3 font-semibold tracking-[0.2px] whitespace-nowrap text-[var(--text-link)] light:text-[var(--primary-hover)]"
                    >
                      {formatInlineText(th)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] light:hover:bg-[color-mix(in_srgb,var(--purple)_8%,transparent)] [&:last-child>td]:border-b-0"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-2 px-3 leading-[1.45] text-[var(--text-main)] border-b border-line light:text-[var(--text-main)]"
                      >
                        {formatInlineText(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="mt-[10px] mb-[6px] text-[14.5px] font-bold text-[var(--text-main)] light:text-[var(--text-main)]"
        >
          {formatInlineText(line.slice(2))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="mt-2 mb-1 text-[13px] font-semibold text-[var(--text-link)] light:text-[var(--primary)]"
        >
          {formatInlineText(line.replace(/^#{2,3}\s+/, ''))}
        </h4>
      );
      i++;
      continue;
    }

    // Bullet lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      elements.push(
        <li key={`li-${i}`} className="ml-[18px] mb-[3px] list-disc leading-[1.5]">
          {formatInlineText(trimmed.slice(2))}
        </li>
      );
      i++;
      continue;
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`bq-${i}`}
          className="my-[6px] py-[6px] px-3 border-l-[3px] border-l-primary bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] rounded-r-sm text-muted italic"
        >
          {formatInlineText(trimmed.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Regular paragraph
    if (line === '') {
      elements.push(<div key={`sp-${i}`} className="h-[6px]" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="mt-0 mb-[6px] leading-[1.55] last:mb-0">
          {formatInlineText(line)}
        </p>
      );
    }
    i++;
  }

  return elements;
};
