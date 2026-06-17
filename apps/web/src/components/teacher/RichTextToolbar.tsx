import { useRef, useState } from 'react';
import { cn } from '@/utils/helpers';

const SYMBOLS = [
  '≤','≥','≠','±','×','÷','→','←','↑','↓',
  'μ','α','β','γ','δ','λ','π','σ','Σ','°',
  '∞','∝','∴','∵','√','∫','Δ','Ω','φ','ψ',
];

interface RichTextToolbarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  showAllTools?: boolean;
}

interface ToolGroup {
  label: string;
  tools: Tool[];
}

interface Tool {
  id: string;
  label: string;
  title: string;
  action: () => void;
}

export function RichTextToolbar({
  value,
  onChange,
  placeholder,
  rows = 4,
  showAllTools = false,
}: RichTextToolbarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const applyEdit = (
    edit: (
      text: string,
      start: number,
      end: number
    ) => { text: string; cursor: number }
  ) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const { text, cursor } = edit(value, start, end);
    onChange(text);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const wrap = (left: string, right: string, btn: string) => {
    setActiveBtn(btn);
    applyEdit((text, start, end) => {
      const selected = text.slice(start, end);
      const wrapped = `${left}${selected || 'text'}${right}`;
      const newText = text.slice(0, start) + wrapped + text.slice(end);
      const cursor = start + left.length + (selected ? selected.length : 4);
      return { text: newText, cursor };
    });
    setTimeout(() => setActiveBtn(null), 150);
  };

  const insert = (s: string, btn?: string) => {
    if (btn) setActiveBtn(btn);
    applyEdit((text, start, end) => ({
      text: text.slice(0, start) + s + text.slice(end),
      cursor: start + s.length,
    }));
    if (btn) setTimeout(() => setActiveBtn(null), 150);
  };

  const insertLinePrefix = (prefix: string, btn: string) => {
    setActiveBtn(btn);
    applyEdit((text, start) => {
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const newText = `${text.slice(0, lineStart)}${prefix}${text.slice(lineStart)}`;
      return { text: newText, cursor: start + prefix.length };
    });
    setTimeout(() => setActiveBtn(null), 150);
  };

  const insertTable = (r: number, c: number) => {
    const header = '| ' + Array(c).fill('Header').join(' | ') + ' |';
    const sep = '|' + Array(c).fill('---').map(s => ` ${s} `).join('|') + '|';
    const row = '| ' + Array(c).fill('Cell').join(' | ') + ' |';
    const rows = Array(r).fill(row).join('\n');
    insert(`\n${header}\n${sep}\n${rows}\n`, 'table');
    setTableOpen(false);
  };

  const btn = (id: string) =>
    cn(
      'rounded-lg border border-ui-border bg-white px-2 py-1.5 text-xs font-medium text-brand-black hover:bg-ui-subtle transition-colors',
      activeBtn === id && 'border-brand-green bg-brand-green/10 text-brand-green'
    );

  const sep = (
    <div className="mx-0.5 h-5 w-px bg-ui-border self-center" />
  );

  const toolGroups: ToolGroup[] = [];
  void toolGroups;

  return (
    <div className="rounded-xl border border-ui-border bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ui-border bg-ui-subtle px-2 py-1.5">

        {/* Text formatting */}
        <button type="button" title="Bold" className={btn('bold')}
          onClick={() => wrap('**', '**', 'bold')}>
          <strong>B</strong>
        </button>
        <button type="button" title="Italic" className={btn('italic')}
          onClick={() => wrap('_', '_', 'italic')}>
          <em>I</em>
        </button>
        <button type="button" title="Underline" className={btn('underline')}
          onClick={() => wrap('__', '__', 'underline')}>
          <span style={{textDecoration:'underline'}}>U</span>
        </button>
        <button type="button" title="Strikethrough" className={btn('strike')}
          onClick={() => wrap('~~', '~~', 'strike')}>
          <span style={{textDecoration:'line-through'}}>S</span>
        </button>
        <button type="button" title="Highlight (exam tip)" className={btn('highlight')}
          onClick={() => wrap('==', '==', 'highlight')}>
          <span className="bg-yellow-200 px-0.5 text-yellow-800">H</span>
        </button>

        {sep}

        {/* Headings */}
        <button type="button" title="Heading 1" className={btn('h1')}
          onClick={() => insertLinePrefix('# ', 'h1')}>
          H1
        </button>
        <button type="button" title="Heading 2" className={btn('h2')}
          onClick={() => insertLinePrefix('## ', 'h2')}>
          H2
        </button>
        <button type="button" title="Heading 3" className={btn('h3')}
          onClick={() => insertLinePrefix('### ', 'h3')}>
          H3
        </button>

        {sep}

        {/* Lists */}
        <button type="button" title="Bullet list" className={btn('bullet')}
          onClick={() => insertLinePrefix('- ', 'bullet')}>
          •
        </button>
        <button type="button" title="Numbered list" className={btn('numbered')}
          onClick={() => insertLinePrefix('1. ', 'numbered')}>
          1.
        </button>
        <button type="button" title="Checklist" className={btn('check')}
          onClick={() => insertLinePrefix('- [ ] ', 'check')}>
          ☐
        </button>
        <button type="button" title="Nested indent" className={btn('indent')}
          onClick={() => insertLinePrefix('  ', 'indent')}>
          →|
        </button>

        {sep}

        {/* Science */}
        <button type="button" title="Subscript (H₂O)" className={btn('sub')}
          onClick={() => wrap('~', '~', 'sub')}>
          H<sub style={{fontSize:'8px'}}>2</sub>
        </button>
        <button type="button" title="Superscript (x²)" className={btn('sup')}
          onClick={() => wrap('^', '^', 'sup')}>
          x<sup style={{fontSize:'8px'}}>2</sup>
        </button>
        <button type="button" title="Equation block" className={btn('eq')}
          onClick={() => insert('\n$$equation$$\n', 'eq')}>
          ƒ=
        </button>
        <button type="button" title="Reaction arrow →" className={btn('arrow')}
          onClick={() => insert(' → ', 'arrow')}>
          →
        </button>

        {/* Symbol picker */}
        <div className="relative">
          <button
            type="button"
            title="Symbol picker"
            className={cn(btn('symbol'), symbolOpen && 'border-brand-green bg-brand-green/10')}
            onClick={() => { setSymbolOpen(o => !o); setTableOpen(false); }}
          >
            Ω
          </button>
          {symbolOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 grid w-56 grid-cols-6 gap-1 rounded-xl border border-ui-border bg-white p-2 shadow-lg">
              {SYMBOLS.map(sym => (
                <button key={sym} type="button"
                  className="rounded px-1 py-1 text-sm hover:bg-ui-subtle"
                  onClick={() => { insert(sym); setSymbolOpen(false); }}>
                  {sym}
                </button>
              ))}
            </div>
          )}
        </div>

        {sep}

        {/* Structure */}
        <button type="button" title="Block quote / definition" className={btn('quote')}
          onClick={() => insertLinePrefix('> ', 'quote')}>
          "
        </button>
        <button type="button" title="Divider" className={btn('hr')}
          onClick={() => insert('\n---\n', 'hr')}>
          —
        </button>

        {/* Table */}
        <div className="relative">
          <button
            type="button"
            title="Insert table"
            className={cn(btn('table'), tableOpen && 'border-brand-green bg-brand-green/10')}
            onClick={() => { setTableOpen(o => !o); setSymbolOpen(false); }}
          >
            ⊞
          </button>
          {tableOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-xl border border-ui-border bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs font-medium text-ui-muted">Table size</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-ui-muted">Rows:</span>
                <button type="button" className="rounded border border-ui-border px-1.5"
                  onClick={() => setTableRows(r => Math.max(2, r - 1))}>−</button>
                <span className="w-4 text-center font-medium">{tableRows}</span>
                <button type="button" className="rounded border border-ui-border px-1.5"
                  onClick={() => setTableRows(r => Math.min(10, r + 1))}>+</button>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-ui-muted">Cols:</span>
                <button type="button" className="rounded border border-ui-border px-1.5"
                  onClick={() => setTableCols(c => Math.max(2, c - 1))}>−</button>
                <span className="w-4 text-center font-medium">{tableCols}</span>
                <button type="button" className="rounded border border-ui-border px-1.5"
                  onClick={() => setTableCols(c => Math.min(8, c + 1))}>+</button>
              </div>
              <button type="button"
                className="mt-3 w-full rounded-lg bg-brand-green py-1.5 text-xs font-semibold text-white"
                onClick={() => insertTable(tableRows, tableCols)}>
                Insert {tableRows}×{tableCols} table
              </button>
            </div>
          )}
        </div>

        {sep}

        {/* Annotation blocks (only shown when showAllTools=true) */}
        {showAllTools && (
          <>
            <button type="button" title="Exam tip" className={btn('examtip')}
              onClick={() => insert('\n> ⭐ EXAM TIP: \n', 'examtip')}>
              ⭐
            </button>
            <button type="button" title="Common mistake" className={btn('mistake')}
              onClick={() => insert('\n> ⚠️ COMMON MISTAKE: \n', 'mistake')}>
              ⚠️
            </button>
            <button type="button" title="Definition box" className={btn('defn')}
              onClick={() => insert('\n> 📖 DEFINITION: **term** — meaning\n', 'defn')}>
              📖
            </button>
            <button type="button" title="Worked example" className={btn('example')}
              onClick={() => insert('\n> 💡 WORKED EXAMPLE:\n> Step 1: \n> Step 2: \n', 'example')}>
              💡
            </button>
            <button type="button" title="Spec reference" className={btn('spec')}
              onClick={() => insert('[Spec: ]', 'spec')}>
              §
            </button>
            {sep}
            <button type="button" title="Code / sequence block" className={btn('code')}
              onClick={() => insert('\n```\n\n```\n', 'code')}>
              {'</>'}
            </button>
            <button type="button" title="Two column layout" className={btn('cols')}
              onClick={() => insert('\n::: column-left\n\n:::\n::: column-right\n\n:::\n', 'cols')}>
              ⫾
            </button>
            <button type="button" title="Definition list (term: definition)" className={btn('deflist')}
              onClick={() => insert('\nTerm\n: Definition\n', 'deflist')}>
              T:D
            </button>
          </>
        )}

        {/* Blank (always useful for questions) */}
        <button type="button" title="Fill-in-the-blank" className={btn('blank')}
          onClick={() => insert('_____', 'blank')}>
          [ ]
        </button>

      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        className="w-full resize-y bg-white p-3 text-sm text-brand-black placeholder:text-ui-muted focus:outline-none"
        style={{ minHeight: `${rows * 1.75}rem` }}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />

      {/* Legend for markdown shortcuts */}
      <div className="border-t border-ui-border bg-ui-subtle px-3 py-1.5">
        <p className="text-[10px] text-ui-muted">
          **bold** · _italic_ · ~sub~ · ^sup~ · # H1 · ## H2 · - bullet ·
          {'> quote'} · == highlight == · --- divider
        </p>
      </div>
    </div>
  );
}
