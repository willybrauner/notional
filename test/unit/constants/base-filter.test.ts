import { describe, expect, it } from 'vitest';
import { buildBaseFilterSection, buildBaseInitialContent, buildFilterExpression, buildFilterRule } from '../../../src/constants/base-filter';

describe('buildFilterExpression', () => {
	it('keeps the folder notes, its direct folder page notes, and excludes itself and _template', () => {
		expect(buildFilterExpression('Projects/Blog')).toBe([
			'file.inFolder("Projects/Blog")',
			'file.basename != "Blog"',
			'file.basename != "_template"',
			'(file.folder == "Projects/Blog" || (file.basename == file.folder.split("/")[file.folder.split("/").length - 1] && file.folder.split("/").length == 3))',
			'(file.ext == "md" || file.ext == "base")',
		].join(' && '));
	});

	it('uses the folder depth for folder pages of a root folder', () => {
		expect(buildFilterExpression('Notes')).toContain('file.folder.split("/").length == 2');
	});

	it('escapes the double quotes and backslashes of the folder path and of its name', () => {
		const expression = buildFilterExpression('a/b") || true || ("\\');
		expect(expression).toContain('file.inFolder("a/b\\") || true || (\\"\\\\")');
		expect(expression).toContain('file.basename != "b\\") || true || (\\"\\\\"');
		expect(expression).not.toContain('"b") || true');
	});
});

describe('buildFilterRule', () => {
	it('single-quotes the expression for YAML and doubles its single quotes', () => {
		expect(buildFilterRule("Willy's #1: notes")).toBe(`'${buildFilterExpression("Willy's #1: notes").replace(/'/g, "''")}'`);
		expect(buildFilterRule("Willy's #1: notes")).toContain(`file.inFolder("Willy''s #1: notes")`);
	});
});

describe('base content', () => {
	it('wraps the rule in an and-filter', () => {
		expect(buildBaseFilterSection('Notes')).toBe(`filters:\n  and:\n    - ${buildFilterRule('Notes')}`);
	});

	it('adds a default table view', () => {
		expect(buildBaseInitialContent('Notes')).toBe(
			`${buildBaseFilterSection('Notes')}\nviews:\n  - type: table\n    name: Table\n    order:\n      - file.name\n    columnSize:\n      file.name: 320\n`,
		);
	});
});
