export type TextSize = 'title' | 'heading' | 'body';

export type NoteBlock =
  | { id: string; kind: 'text'; size: TextSize; text: string }
  | { id: string; kind: 'bullet'; text: string }
  | { id: string; kind: 'number'; text: string }
  | { id: string; kind: 'check'; text: string; done: boolean };

export type NoteFormat = TextSize | 'bullet' | 'number' | 'check';

export function emptyBlock(id = '1'): NoteBlock {
  return { id, kind: 'text', size: 'body', text: '' };
}

export function readBlocks(title: string, body: string): NoteBlock[] {
  if (body.startsWith('{"v":1')) {
    try {
      const parsed = JSON.parse(body) as { v?: number; blocks?: unknown[] };
      const blocks = parsed.v === 1 ? parsed.blocks?.filter(isBlock) : undefined;
      if (blocks && blocks.length > 0) return blocks;
    } catch {
      // Older notes stored plain text in the body.
    }
  }
  const blocks: NoteBlock[] = [];
  if (title.trim()) blocks.push({ id: 'title', kind: 'text', size: 'title', text: title });
  if (body.trim()) blocks.push({ id: 'body', kind: 'text', size: 'body', text: body });
  return blocks.length > 0 ? blocks : [emptyBlock()];
}

export function packNote(blocks: NoteBlock[], untitled: string) {
  const first = blocks.find((block) => block.text.trim());
  return {
    title: first ? first.text.trim().slice(0, 80) : untitled,
    body: JSON.stringify({ v: 1, blocks }),
    empty: blocks.every((block) => block.text.trim().length === 0),
  };
}

export function noteSummary(title: string, body: string) {
  const blocks = readBlocks(title, body);
  const visible = blocks.filter((block) => block.text.trim());
  const checks = blocks.filter((block): block is Extract<NoteBlock, { kind: 'check' }> => block.kind === 'check' && block.text.trim().length > 0);
  return {
    title: visible[0]?.text.trim() || title,
    preview: visible
      .slice(1, 4)
      .map((block) => `${marker(blocks, block)}${block.text.trim()}`)
      .join('\n'),
    checks: checks.length > 0 ? { done: checks.filter((block) => block.done).length, total: checks.length } : null,
  };
}

export function blockNumber(blocks: NoteBlock[], index: number) {
  let count = 1;
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (blocks[cursor]?.kind !== 'number') break;
    count += 1;
  }
  return count;
}

export function withFormat(block: NoteBlock, format: NoteFormat): NoteBlock {
  if (format === 'check') {
    return { id: block.id, kind: 'check', text: block.text, done: block.kind === 'check' ? block.done : false };
  }
  if (format === 'bullet') return { id: block.id, kind: 'bullet', text: block.text };
  if (format === 'number') return { id: block.id, kind: 'number', text: block.text };
  return { id: block.id, kind: 'text', size: format, text: block.text };
}

export function blankLike(block: NoteBlock, id: string): NoteBlock {
  if (block.kind === 'check') return { id, kind: 'check', text: '', done: false };
  if (block.kind === 'bullet') return { id, kind: 'bullet', text: '' };
  if (block.kind === 'number') return { id, kind: 'number', text: '' };
  return { id, kind: 'text', size: block.size, text: '' };
}

export function formatOf(block: NoteBlock | undefined): NoteFormat {
  if (!block || block.kind === 'text') return block?.size ?? 'body';
  return block.kind;
}

function marker(blocks: NoteBlock[], block: NoteBlock) {
  if (block.kind === 'bullet') return '• ';
  if (block.kind === 'check') return block.done ? '✓ ' : '○ ';
  if (block.kind === 'number') return `${blockNumber(blocks, blocks.indexOf(block))}. `;
  return '';
}

function isBlock(value: unknown): value is NoteBlock {
  if (!value || typeof value !== 'object') return false;
  const block = value as NoteBlock;
  if (typeof block.id !== 'string' || typeof block.text !== 'string') return false;
  if (block.kind === 'text') return block.size === 'title' || block.size === 'heading' || block.size === 'body';
  if (block.kind === 'bullet' || block.kind === 'number') return true;
  if (block.kind === 'check') return typeof block.done === 'boolean';
  return false;
}
