import { describe, expect, it } from 'vitest';
import type { TFile, Vault } from 'obsidian';
import { buildGlobalSeeds } from '../../../src/services/select-picker/seeds/buildGlobalSeeds';
import { extractProperties } from '../../../src/services/select-picker/seeds/extractProperties';
import { fmKey } from '../../../src/services/select-picker/seeds/fmKey';
import { normalizeKey } from '../../../src/services/select-picker/seeds/normalizeKey';
import { parseSeedsFromFile } from '../../../src/services/select-picker/seeds/parseSeedsFromFile';

// The obsidian mock parses YAML as JSON (JSON is valid YAML)
function fakeVault(files: Record<string, string>): Vault {
	const tfiles = Object.keys(files).map(path => ({ path, extension: path.split('.').pop() }) as TFile);
	return {
		getFiles: () => tfiles,
		read: async (file: TFile) => files[file.path] ?? '',
	} as unknown as Vault;
}

describe('property keys', () => {
	it('normalizeKey drops the note. prefix and lowercases', () => {
		expect(normalizeKey('note.Status')).toBe('status');
		expect(normalizeKey('Note.Priority')).toBe('priority');
		expect(normalizeKey('Status')).toBe('status');
	});

	it('fmKey drops the note. prefix and keeps the casing', () => {
		expect(fmKey('note.Status')).toBe('Status');
		expect(fmKey('NOTE.Status')).toBe('Status');
		expect(fmKey('file.name')).toBe('file.name');
	});
});

describe('extractProperties', () => {
	it('returns the properties map', () => {
		expect(extractProperties({ properties: { a: 1 } })).toEqual({ a: 1 });
	});

	it('returns {} for anything else', () => {
		expect(extractProperties(null)).toEqual({});
		expect(extractProperties('text')).toEqual({});
		expect(extractProperties({ views: [] })).toEqual({});
		expect(extractProperties({ properties: 'text' })).toEqual({});
	});
});

describe('parseSeedsFromFile', () => {
	it('reads select.options keyed by normalized property name', async () => {
		const vault = fakeVault({
			'a.base': JSON.stringify({
				properties: {
					'note.Status': { 'select.options': ['Todo', 'Done'] },
					'note.prio': { 'select.options': 'not a list' },
					'note.name': { displayName: 'Name' },
				},
			}),
		});
		const [file] = vault.getFiles();
		expect(await parseSeedsFromFile(vault, file as TFile)).toEqual({ status: ['Todo', 'Done'], prio: [] });
	});

	it('returns {} on invalid YAML', async () => {
		const vault = fakeVault({ 'a.base': '{ not yaml' });
		const [file] = vault.getFiles();
		expect(await parseSeedsFromFile(vault, file as TFile)).toEqual({});
	});
});

describe('buildGlobalSeeds', () => {
	it('merges the options of every .base file without duplicates', async () => {
		const vault = fakeVault({
			'a.base': JSON.stringify({ properties: { 'note.status': { 'select.options': ['Todo', 'Done'] } } }),
			'b.base': JSON.stringify({ properties: { 'note.Status': { 'select.options': ['Done', 'Waiting'] } } }),
			'c.md': JSON.stringify({ properties: { 'note.status': { 'select.options': ['Ignored'] } } }),
		});
		expect(await buildGlobalSeeds(vault)).toEqual({ status: ['Todo', 'Done', 'Waiting'] });
	});
});
