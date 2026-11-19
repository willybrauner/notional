import { describe, expect, it } from 'vitest';
import { buildFilterExpression, buildFilterRule } from '../../../src/constants/base-filter';
import { replaceFolderFilter } from '../../../src/features/auto-base-filter/replaceFolderFilter';

const base = (rule: string) => `filters:\n  and:\n    - ${rule}\nviews:\n  - type: table\n    name: Table\n`;

describe('replaceFolderFilter', () => {
	it('points the rule at the new folder', () => {
		expect(replaceFolderFilter(base(buildFilterRule('Projects')), 'Side projects')).toBe(base(buildFilterRule('Side projects')));
	});

	it('writes back quoted a rule written unquoted by an older Notionalize', () => {
		expect(replaceFolderFilter(base(buildFilterExpression('Projects')), 'Side projects')).toBe(base(buildFilterRule('Side projects')));
	});

	it("doubles a single quote of the folder name", () => {
		expect(replaceFolderFilter(base(buildFilterRule('Projects')), "Willy's projects"))
			.toContain(`file.inFolder("Willy''s projects")`);
	});

	it('leaves a base without folder rule as it is', () => {
		const content = base('file.hasTag("book")');
		expect(replaceFolderFilter(content, 'Books')).toBe(content);
	});
});
