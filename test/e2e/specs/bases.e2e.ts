import { describe, expect, it } from 'vitest';
import type { ObsidianPage } from '../harness/ObsidianPage';
import { useObsidian } from '../harness/useObsidian';
import { createFile, frontmatter, openBase, readFile } from '../harness/workspace';

const BASE = 'Tasks/Tasks.base';

// Hour zoom base on its own properties, so their "Date & time" conversion stays out of the other specs
const HOURS_BASE = 'Hours/Hours.base';
const HOURS_BASE_CONTENT = `filters:
  and:
    - file.inFolder("Hours")
    - file.ext == "md"
views:
  - type: notional-timeline
    name: Timeline
    startProperty: note.when
    endProperty: note.until
    zoom: hour
`;
// HOUR_WIDTH of the timeline (px)
const HOUR = 56;

// Local YYYY-MM-DD of today, the hour zoom opens on it
function today(): string {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Center of `selector` inside the timeline bar of a note (the bar itself when empty), scrolled into view
function inBar(page: ObsidianPage, title: string, selector = '') {
	return page.waitFor((t: string, sel: string) => {
		const bar = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .notional-timeline-bar'))
			.find(b => b.textContent?.includes(t));
		const el = sel ? bar?.querySelector(sel) : bar;
		if (!el) return null;
		el.scrollIntoView({ block: 'center', inline: 'center' });
		const rect = el.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	}, title, selector);
}

// Center of the element matching `selector` inside the table row of a note
function inRow(page: ObsidianPage, title: string, selector: string) {
	return page.waitFor((t: string, sel: string) => {
		const row = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .bases-tr'))
			.find(r => r.querySelector('.internal-link')?.textContent?.trim() === t);
		const el = row?.querySelector(sel);
		if (!el) return null;
		const rect = el.getBoundingClientRect();
		return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
	}, title, selector);
}

describe('bases', () => {
	const { page } = useObsidian();

	it('database-header: shows the base name as an editable title', async () => {
		await openBase(page(), BASE, 'Table');
		const title = await page().waitFor(() => document.querySelector('.workspace-leaf.mod-active .notional-db-title')?.textContent);
		expect(title).toBe('Tasks');
	});

	it('auto-base-filter: a new base only lists its folder', async () => {
		await createFile(page(), 'Books/Books.base');
		const content = await page().waitFor(async () => {
			const text = await app.vault.adapter.read('Books/Books.base') as string;
			return text.includes('file.inFolder') ? text : null;
		});
		expect(content).toContain('file.inFolder("Books")');
	});

	it('select-property: picks a value from the chip dropdown', async () => {
		await createFile(page(), 'Tasks/Select me.md', '---\nstatus: Not started\n---\n');
		await openBase(page(), BASE, 'Table');
		await page().click(await inRow(page(), 'Select me', '.notional-select-cell'));
		// Positioned (is-visible) after a double rAF: a rect read before moves under the click
		await page().waitFor(() => !!document.querySelector('.notional-select-dropdown.is-visible'));
		await page().click(await page().waitFor(() => {
			const option = Array.from(document.querySelectorAll('.notional-select-dropdown .notional-select-option'))
				.find(o => o.textContent?.includes('Done'));
			const rect = option?.getBoundingClientRect();
			return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
		}));
		await page().waitFor(() => app.metadataCache.getCache('Tasks/Select me.md')?.frontmatter?.status === 'Done');
	});

	it('inline-note-rename: double-click on a name cell renames the note', async () => {
		await createFile(page(), 'Tasks/Rename me.md', '---\nstatus: Done\n---\n');
		await openBase(page(), BASE, 'Table');
		// Double-click in the cell, right of the link (the link itself opens the note)
		const cell = await page().waitFor(() => {
			const row = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .bases-tr'))
				.find(r => r.querySelector('.internal-link')?.textContent?.trim() === 'Rename me');
			const link = row?.querySelector('.internal-link')?.getBoundingClientRect();
			const cell = row?.querySelector('.internal-link')?.closest('.bases-td')?.getBoundingClientRect();
			return link && cell && cell.right - link.right > 16 ? { x: link.right + 12, y: cell.y + cell.height / 2 } : null;
		});
		await page().dblclick(cell);
		await page().waitFor(() => {
			const input = document.querySelector<HTMLInputElement>('.inline-rename-input');
			input?.select();
			return document.activeElement === input;
		});
		await page().type('Renamed');
		await page().press('Enter');
		await page().waitFor(() => !!app.vault.getAbstractFileByPath('Tasks/Renamed.md'));
	});

	it('side-peek: a click on a note in a base opens it in the side panel, Escape closes it', async () => {
		await openBase(page(), BASE, 'Table');
		await page().click(await inRow(page(), 'Task B', '.internal-link'));
		await page().waitFor(() => {
			const panel = document.querySelector('.notional-side-peek');
			return !!panel && app.workspace.getActiveFile()?.path === 'Tasks/Task B.md';
		});
		await page().press('Escape');
		await page().waitFor(() => !document.querySelector('.notional-side-peek'));
	});

	it('board: shows one column per status and moves a card to another column', async () => {
		await createFile(page(), 'Tasks/Move me.md', '---\nstatus: Not started\n---\n');
		await openBase(page(), BASE, 'Board');
		const labels = await page().waitFor(() => {
			const headers = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .notional-board-column-header'));
			return headers.length ? headers.map(h => h.querySelector('.notional-board-column-chip')?.textContent?.trim()) : null;
		});
		expect(labels).toEqual(expect.arrayContaining(['Not started', 'In progress', 'Done']));

		const card = await page().waitFor(() => {
			const el = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .notional-board-card'))
				.find(c => c.querySelector('.notional-board-card-title')?.textContent?.includes('Move me'));
			const rect = el?.getBoundingClientRect();
			return rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
		});
		const target = await page().waitFor(() => {
			const column = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .notional-board-column'))
				.find(c => c.querySelector('.notional-board-column-chip')?.textContent?.trim() === 'In progress');
			const rect = column?.querySelector('.notional-board-column-cards')?.getBoundingClientRect();
			return rect ? { x: rect.x + rect.width / 2, y: rect.y + 10 } : null;
		});
		await page().drag(card, target, 20);
		await page().waitFor(() => app.metadataCache.getCache('Tasks/Move me.md')?.frontmatter?.status === 'In progress');
	});

	it('timeline: draws a bar per dated note and moves dates when a bar is dragged', async () => {
		await createFile(page(), 'Tasks/Drag me.md', '---\nstatus: Done\nstart: 2026-11-02\nend: 2026-11-04\n---\n');
		await openBase(page(), BASE, 'Timeline');
		const bar = await page().waitFor(() => {
			const el = Array.from(document.querySelectorAll('.workspace-leaf.mod-active .notional-timeline-bar'))
				.find(b => b.textContent?.includes('Drag me'));
			if (!el) return null;
			el.scrollIntoView({ block: 'center', inline: 'center' });
			const rect = el.getBoundingClientRect();
			return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width };
		});
		// 3 days wide: move by about two days
		const day = bar.width / 3;
		await page().drag(bar, { x: bar.x + day * 2, y: bar.y }, 20);
		const fm = await page().waitFor(async () => {
			const data = app.metadataCache.getCache('Tasks/Drag me.md')?.frontmatter;
			return data && data.start !== '2026-11-02' ? data : null;
		});
		const shift = (a: unknown, b: string) => (Date.parse(String(a)) - Date.parse(b)) / 86_400_000;
		expect(shift(fm.start, '2026-11-02')).toBeGreaterThan(0);
		expect(shift(fm.end, '2026-11-04')).toBe(shift(fm.start, '2026-11-02'));
		expect(await frontmatter(page(), 'Tasks/Drag me.md')).toMatchObject({ status: 'Done' });
		expect(await readFile(page(), 'Tasks/Drag me.md')).toContain('status: Done');
	});

	it('timeline: in the hour zoom, dragging a bar end gives a date-only note its times', async () => {
		const day = today();
		await createFile(page(), HOURS_BASE, HOURS_BASE_CONTENT);
		await createFile(page(), 'Hours/All day.md', `---\nwhen: ${day}\nuntil: ${day}\n---\n`);
		await openBase(page(), HOURS_BASE, 'Timeline');
		const handle = await inBar(page(), 'All day', '.notional-timeline-handle--end');
		// The bar ends at midnight: four hours earlier is 20:00
		await page().drag(handle, { x: handle.x - 4 * HOUR, y: handle.y }, 20);
		const fm = await page().waitFor(() => {
			const data = app.metadataCache.getCache('Hours/All day.md')?.frontmatter;
			return String(data?.until).includes('T') ? data : null;
		});
		expect(fm).toMatchObject({ when: `${day}T00:00`, until: `${day}T20:00` });
		const types = await page().evaluate(() => {
			const manager = (app as unknown as { metadataTypeManager: { getPropertyInfo(n: string): { widget?: string } } }).metadataTypeManager;
			return [manager.getPropertyInfo('when').widget, manager.getPropertyInfo('until').widget];
		});
		expect(types).toEqual(['datetime', 'datetime']);
	});

	it('timeline: in the hour zoom, a timed bar moves by 15 minutes steps', async () => {
		const day = today();
		await createFile(page(), 'Hours/Meeting.md', `---\nwhen: ${day}T10:00\nuntil: ${day}T12:00\n---\n`);
		await openBase(page(), HOURS_BASE, 'Timeline');
		const bar = await inBar(page(), 'Meeting');
		await page().drag(bar, { x: bar.x + HOUR * 1.25, y: bar.y }, 20);
		const fm = await page().waitFor(() => {
			const data = app.metadataCache.getCache('Hours/Meeting.md')?.frontmatter;
			return data && !String(data.when).endsWith('T10:00') ? data : null;
		});
		expect(fm).toMatchObject({ when: `${day}T11:15`, until: `${day}T13:15` });
	});

	it('timeline: in the hour zoom, a click on the new row creates a one-hour slot', async () => {
		await openBase(page(), HOURS_BASE, 'Timeline');
		const point = await page().waitFor(() => {
			const track = document.querySelector('.workspace-leaf.mod-active .notional-timeline-row-new .notional-timeline-track');
			const scroller = track?.closest('.notional-timeline-scroller');
			if (!track || !scroller) return null;
			const rect = track.getBoundingClientRect();
			return { x: scroller.getBoundingClientRect().right - 100, y: rect.y + rect.height / 2 };
		});
		const before = await page().evaluate(() => app.vault.getMarkdownFiles().map((f: { path: string }) => f.path));
		await page().click(point);
		const fm = await page().waitFor((known: string[]) => {
			const file = app.vault.getMarkdownFiles().find((f: { path: string }) => !known.includes(f.path));
			const data = file && app.metadataCache.getFileCache(file)?.frontmatter;
			return data?.when && data.until ? data : null;
		}, before);
		expect(String(fm.when)).toMatch(/T\d{2}:(00|15|30|45)$/);
		expect(Date.parse(String(fm.until)) - Date.parse(String(fm.when))).toBe(60 * 60 * 1000);
	});

	it('timeline: a new view saves its guessed start and end properties', async () => {
		await createFile(page(), 'Guess/Guess.base', 'filters:\n  and:\n    - file.inFolder("Guess")\nviews:\n  - type: notional-timeline\n    name: Timeline\n');
		await createFile(page(), 'Guess/One.md', '---\nDate: 2026-11-16\nDue date: 2026-11-18\n---\n');
		await openBase(page(), 'Guess/Guess.base', 'Timeline');
		const content = await page().waitFor(async () => {
			const text = await app.vault.adapter.read('Guess/Guess.base') as string;
			return text.includes('endProperty') ? text : null;
		});
		expect(content).toContain('startProperty: note.Date');
		expect(content).toContain('endProperty: note.Due date');
	});
});

