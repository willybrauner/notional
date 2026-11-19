import { describe, expect, it } from 'vitest';
import { ListValue, Value } from '../../mocks/obsidian';
import type { BasesEntry, BasesPropertyId } from 'obsidian';
import { applyCardOrder } from '../../../src/features/board/layout/applyCardOrder';
import { buildColumns } from '../../../src/features/board/layout/buildColumns';
import { isListProperty } from '../../../src/features/board/layout/isListProperty';
import { orderColumns } from '../../../src/features/board/layout/orderColumns';
import { readCardOrder } from '../../../src/features/board/layout/readCardOrder';
import type { Column } from '../../../src/features/board/layout/types';
import { nextCardOrder } from '../../../src/features/board/write/nextCardOrder';
import { renameInCardOrder } from '../../../src/features/board/write/renameInCardOrder';

const STATUS = 'note.status' as BasesPropertyId;

// Entry whose `status` property holds the given value
function entry(path: string, value: Value | null = null): BasesEntry {
	return { file: { path }, getValue: () => value } as unknown as BasesEntry;
}

const column = (key: string, label: string, entries: BasesEntry[] = []): Column => ({ key, label, entries });
const paths = (columns: Column[]) => columns.map(c => [c.key, c.entries.map(e => e.file.path)]);

describe('buildColumns', () => {
	it('groups entries by value case-insensitively, keeping the first spelling and the Bases order', () => {
		const tagged = entry('d.md', new ListValue([new Value('#Tag'), new Value('Done')]));
		const columns = buildColumns([
			entry('a.md', new Value('Todo')),
			entry('b.md', new Value('todo')),
			entry('c.md', null),
			tagged,
		], STATUS);
		expect(columns.map(c => c.label)).toEqual(['Todo', '', 'Tag', 'Done']);
		expect(paths(columns)).toEqual([['todo', ['a.md', 'b.md']], ['', ['c.md']], ['tag', ['d.md']], ['done', ['d.md']]]);
	});

	it('adds a list entry once per column even with duplicated values', () => {
		const columns = buildColumns([entry('a.md', new ListValue([new Value('A'), new Value('a')]))], STATUS);
		expect(paths(columns)).toEqual([['a', ['a.md']]]);
	});
});

describe('isListProperty', () => {
	it('is true for tags and aliases, whatever the values', () => {
		expect(isListProperty([], 'note.tags' as BasesPropertyId)).toBe(true);
		expect(isListProperty([], 'note.aliases' as BasesPropertyId)).toBe(true);
	});

	it('is true when an entry holds a list', () => {
		expect(isListProperty([entry('a.md', new Value('x')), entry('b.md', new ListValue([]))], STATUS)).toBe(true);
		expect(isListProperty([entry('a.md', new Value('x'))], STATUS)).toBe(false);
	});
});

describe('orderColumns', () => {
	it('puts "no value", then the saved order, then the options (even empty), then the rest alphabetically', () => {
		const none = column('', '', [entry('n.md')]);
		const ordered = orderColumns(
			[none, column('b', 'B'), column('z', 'Zeta'), column('a', 'alpha')],
			['Z'],
			['Todo', 'B'],
			'ASC',
		);
		expect(ordered.map(c => c.label)).toEqual(['', 'Zeta', 'Todo', 'B', 'alpha']);
	});

	it('hides an empty "no value" column', () => {
		expect(orderColumns([column('', ''), column('a', 'A')], [], [], 'ASC').map(c => c.key)).toEqual(['a']);
	});

	it('sorts the rest numerically, in the view direction', () => {
		const columns = () => [column('item 10', 'item 10'), column('item 2', 'item 2')];
		expect(orderColumns(columns(), [], [], 'ASC').map(c => c.label)).toEqual(['item 2', 'item 10']);
		expect(orderColumns(columns(), [], [], 'DESC').map(c => c.label)).toEqual(['item 10', 'item 2']);
	});
});

describe('card order', () => {
	it('readCardOrder keeps only lists of paths', () => {
		expect(readCardOrder(null)).toEqual({});
		expect(readCardOrder(['a'])).toEqual({});
		expect(readCardOrder({ todo: ['a.md', 1], bad: 'x' })).toEqual({ todo: ['a.md', '1'] });
	});

	it('applyCardOrder puts saved cards first, others keep the Bases order', () => {
		const columns = [column('todo', 'Todo', [entry('x.md'), entry('y.md'), entry('z.md')])];
		applyCardOrder(columns, { todo: ['z.md', 'x.md'] });
		expect(paths(columns)).toEqual([['todo', ['z.md', 'x.md', 'y.md']]]);
	});

	it('renameInCardOrder replaces the path, or returns null when absent', () => {
		expect(renameInCardOrder({ todo: ['a.md', 'b.md'] }, 'b.md', 'c.md')).toEqual({ todo: ['a.md', 'c.md'] });
		expect(renameInCardOrder({ todo: ['a.md'] }, 'x.md', 'y.md')).toBeNull();
	});
});

describe('nextCardOrder', () => {
	const columns = new Map([['todo', ['a', 'b', 'c']], ['done', ['d']]]);

	it('moves a card to another column, and purges notes no longer in the view', () => {
		const next = nextCardOrder({ todo: ['a', 'b'], old: ['gone'] }, columns, { path: 'c', fromKey: 'todo', toKey: 'done', index: 0, copy: false });
		expect(next).toEqual({ todo: ['a', 'b'], done: ['c', 'd'] });
	});

	it('keeps the card in its column when copied', () => {
		const next = nextCardOrder({}, columns, { path: 'c', fromKey: 'todo', toKey: 'done', index: 1, copy: true });
		expect(next).toEqual({ done: ['d', 'c'] });
	});

	it('reorders inside a column and clamps the index', () => {
		expect(nextCardOrder({}, columns, { path: 'a', fromKey: 'todo', toKey: 'todo', index: 99, copy: false }))
			.toEqual({ todo: ['b', 'c', 'a'] });
	});

	it('drops the source column order when it becomes empty', () => {
		const next = nextCardOrder({ done: ['d'] }, columns, { path: 'd', fromKey: 'done', toKey: 'todo', index: 0, copy: false });
		expect(next).toEqual({ todo: ['d', 'a', 'b', 'c'] });
	});
});
