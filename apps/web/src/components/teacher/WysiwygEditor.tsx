import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table';
import { TableHeader } from '@tiptap/extension-table';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Component,
  ErrorInfo,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils/helpers';

interface WysiwygEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

const SYMBOLS = [
  '≤','≥','≠','±','×','÷','→','←','↑','↓',
  'μ','α','β','γ','δ','λ','π','σ','Σ','°',
  '∞','∝','∴','∵','√','∫','Δ','Ω','φ','ψ',
];

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        'flex h-7 min-w-[28px] items-center justify-center rounded px-1.5',
        'select-none text-xs font-medium transition-colors',
        'hover:bg-brand-green/10 hover:text-brand-green',
        active ? 'bg-brand-green/15 text-brand-green' : 'text-brand-black',
        disabled && 'cursor-not-allowed opacity-30'
      )}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="mx-1 h-5 w-px self-center bg-ui-border" />;
}

class EditorErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('WysiwygEditor error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">
            Editor failed to load
          </p>
          <p className="mt-1 text-sm text-red-700">
            {this.state.message}
          </p>
          <p className="mt-2 text-xs text-red-600">
            Please refresh the page and try again.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function WysiwygEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  minHeight = 400,
}: WysiwygEditorProps) {
  const [symbolOpen, setSymbolOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const symbolRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Subscript,
      Superscript,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current === value) return;
    editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (symbolRef.current && !symbolRef.current.contains(e.target as Node)) {
        setSymbolOpen(false);
      }
      if (tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setTableOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!editor) {
    return (
      <div
        className="animate-pulse rounded-xl border border-ui-border bg-white"
        style={{ minHeight }}
      />
    );
  }

  return (
    <EditorErrorBoundary>
      <div className="overflow-hidden rounded-xl border border-ui-border bg-white">

        {/* TOOLBAR */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-ui-border bg-[#f8f7f4] px-2 py-1.5">

          <ToolBtn title="Bold (Ctrl+B)"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}>
            <strong>B</strong>
          </ToolBtn>
          <ToolBtn title="Italic (Ctrl+I)"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}>
            <em style={{ fontStyle: 'italic' }}>I</em>
          </ToolBtn>
          <ToolBtn title="Underline (Ctrl+U)"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <span style={{ textDecoration: 'underline' }}>U</span>
          </ToolBtn>
          <ToolBtn title="Strikethrough"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}>
            <span style={{ textDecoration: 'line-through' }}>S</span>
          </ToolBtn>
          <ToolBtn title="Highlight"
            active={editor.isActive('highlight')}
            onClick={() => editor.chain().focus().toggleHighlight().run()}>
            <span className="rounded bg-yellow-200 px-0.5 text-[11px] text-yellow-800">H</span>
          </ToolBtn>

          <Sep />

          <ToolBtn title="Heading 1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
            H1
          </ToolBtn>
          <ToolBtn title="Heading 2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            H2
          </ToolBtn>
          <ToolBtn title="Heading 3"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            H3
          </ToolBtn>

          <Sep />

          <ToolBtn title="Align left"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            ≡
          </ToolBtn>
          <ToolBtn title="Align centre"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            ☰
          </ToolBtn>
          <ToolBtn title="Align right"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            ≣
          </ToolBtn>

          <Sep />

          <ToolBtn title="Bullet list"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}>
            •≡
          </ToolBtn>
          <ToolBtn title="Numbered list"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            1.
          </ToolBtn>
          <ToolBtn title="Indent"
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}>
            →|
          </ToolBtn>
          <ToolBtn title="Outdent"
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}>
            |←
          </ToolBtn>

          <Sep />

          <ToolBtn title="Subscript (H₂O)"
            active={editor.isActive('subscript')}
            onClick={() => editor.chain().focus().toggleSubscript().run()}>
            x<sub style={{ fontSize: '8px' }}>2</sub>
          </ToolBtn>
          <ToolBtn title="Superscript (x²)"
            active={editor.isActive('superscript')}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}>
            x<sup style={{ fontSize: '8px' }}>2</sup>
          </ToolBtn>

          <div className="relative" ref={symbolRef}>
            <ToolBtn title="Symbol picker" active={symbolOpen}
              onClick={() => { setSymbolOpen(o => !o); setTableOpen(false); }}>
              Ω
            </ToolBtn>
            {symbolOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 grid w-56 grid-cols-6 gap-0.5 rounded-xl border border-ui-border bg-white p-2 shadow-xl">
                {SYMBOLS.map(sym => (
                  <button key={sym} type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().insertContent(sym).run();
                      setSymbolOpen(false);
                    }}
                    className="rounded px-1 py-1 text-sm hover:bg-brand-green/10">
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Sep />

          <ToolBtn title="Block quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            ❝
          </ToolBtn>
          <ToolBtn title="Code block"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
            {'</>'}
          </ToolBtn>
          <ToolBtn title="Divider"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            —
          </ToolBtn>

          <div className="relative" ref={tableRef}>
            <ToolBtn title="Insert table" active={tableOpen}
              onClick={() => { setTableOpen(o => !o); setSymbolOpen(false); }}>
              ⊞
            </ToolBtn>
            {tableOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-xl border border-ui-border bg-white p-3 shadow-xl">
                <p className="mb-2 text-xs font-semibold text-ui-muted">Table size</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-ui-muted">Rows:</span>
                  <button type="button"
                    onMouseDown={e => { e.preventDefault(); setTableRows(r => Math.max(2, r-1)); }}
                    className="rounded border border-ui-border px-1.5 py-0.5">−</button>
                  <span className="w-5 text-center font-medium">{tableRows}</span>
                  <button type="button"
                    onMouseDown={e => { e.preventDefault(); setTableRows(r => Math.min(10, r+1)); }}
                    className="rounded border border-ui-border px-1.5 py-0.5">+</button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs">
                  <span className="text-ui-muted">Cols:</span>
                  <button type="button"
                    onMouseDown={e => { e.preventDefault(); setTableCols(c => Math.max(2, c-1)); }}
                    className="rounded border border-ui-border px-1.5 py-0.5">−</button>
                  <span className="w-5 text-center font-medium">{tableCols}</span>
                  <button type="button"
                    onMouseDown={e => { e.preventDefault(); setTableCols(c => Math.min(8, c+1)); }}
                    className="rounded border border-ui-border px-1.5 py-0.5">+</button>
                </div>
                <button type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    editor.chain().focus()
                      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
                      .run();
                    setTableOpen(false);
                  }}
                  className="mt-3 w-full rounded-lg bg-brand-green py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  Insert {tableRows}×{tableCols} table
                </button>
                {editor.isActive('table') && (
                  <div className="mt-2 space-y-1 border-t border-ui-border pt-2">
                    <p className="text-[10px] font-semibold text-ui-muted">Edit table</p>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }}
                      className="w-full rounded px-2 py-1 text-left text-xs hover:bg-ui-subtle">+ Add column</button>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }}
                      className="w-full rounded px-2 py-1 text-left text-xs hover:bg-ui-subtle">+ Add row</button>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); }}
                      className="w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50">Delete column</button>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteRow().run(); }}
                      className="w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50">Delete row</button>
                    <button type="button"
                      onMouseDown={e => { e.preventDefault(); editor.chain().focus().deleteTable().run(); }}
                      className="w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50">Delete table</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Sep />

          <ToolBtn title="Exam tip"
            onClick={() => editor.chain().focus()
              .insertContent('<blockquote><p>⭐ EXAM TIP: </p></blockquote>')
              .run()}>
            ⭐
          </ToolBtn>
          <ToolBtn title="Common mistake"
            onClick={() => editor.chain().focus()
              .insertContent('<blockquote><p>⚠️ COMMON MISTAKE: </p></blockquote>')
              .run()}>
            ⚠️
          </ToolBtn>
          <ToolBtn title="Definition"
            onClick={() => editor.chain().focus()
              .insertContent('<blockquote><p>📖 DEFINITION: <strong>term</strong> — meaning</p></blockquote>')
              .run()}>
            📖
          </ToolBtn>
          <ToolBtn title="Worked example"
            onClick={() => editor.chain().focus()
              .insertContent('<blockquote><p>💡 WORKED EXAMPLE:</p><p>Step 1: </p><p>Step 2: </p></blockquote>')
              .run()}>
            💡
          </ToolBtn>

          <Sep />

          <ToolBtn title="Undo (Ctrl+Z)"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}>
            ↩
          </ToolBtn>
          <ToolBtn title="Redo (Ctrl+Y)"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}>
            ↪
          </ToolBtn>

        </div>

        {/* EDITOR AREA */}
        <div
          className="cursor-text px-6 py-4"
          style={{ minHeight }}
          onClick={() => editor.commands.focus()}
        >
          <EditorContent
            editor={editor}
            className="wysiwyg-content outline-none"
          />
        </div>

      </div>
    </EditorErrorBoundary>
  );
}
