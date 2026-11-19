#!/usr/bin/env node

// Checks the build in your own vault, through the `obsidian` CLI (the app must
// be running): backs up data.json, reloads the plugin, then prints one line.
// Fails when Obsidian logged errors, when a feature doesn't run, or when icons,
// recent icons or colors were lost by the reload (data.json migrations).
// Backups: .cache/vault-backups/ (git-ignored), the last 10 kept.

import { spawnSync } from 'child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backupDir = path.join(projectRoot, '.cache/vault-backups');
const KEPT_BACKUPS = 10;

interface Counts { icons: number; recentIcons: number; colors: number }

// Runs the CLI; its first lines are app warnings, the result is the last line
function obsidian(...args: string[]): string {
	const result = spawnSync('obsidian', args, { encoding: 'utf8' });
	if (result.error) throw new Error(`obsidian CLI not found: ${result.error.message}`);
	return (result.stdout ?? '').trim();
}

// Value returned by an expression evaluated in the app (a string)
function evaluate(expression: string): string {
	const out = obsidian('eval', `code=${expression}`);
	const start = out.indexOf('=> ');
	if (start < 0) throw new Error(`obsidian eval gave no result:\n${out}`);
	return out.slice(start + 3);
}

const DATA_JSON = `app.vault.adapter.read(app.plugins.manifests.notionalize.dir+'/data.json')`;

function readDataJson(): string {
	return evaluate(DATA_JSON);
}

function countsOf(json: string): Counts {
	const data = JSON.parse(json) as Record<string, unknown>;
	const size = (value: unknown) => (Array.isArray(value) ? value.length : Object.keys(value ?? {}).length);
	return { icons: size(data.icons), recentIcons: size(data.recentIcons), colors: size(data.selectColors) };
}

function backup(json: string): string {
	mkdirSync(backupDir, { recursive: true });
	const file = path.join(backupDir, `data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
	writeFileSync(file, json);
	readdirSync(backupDir).sort().slice(0, -KEPT_BACKUPS).forEach(old => {
		spawnSync('trash', [path.join(backupDir, old)]);
	});
	return path.relative(projectRoot, file);
}

function fail(message: string): never {
	console.log(`✗ vault: ${message}`);
	process.exit(1);
}

let before: string;
try {
	before = readDataJson();
} catch (error) {
	fail(`Obsidian unreachable (is the app running?) ${String(error)}`);
}
const backupFile = backup(before);

// Only the errors of this reload count
obsidian('dev:errors', 'clear');
obsidian('dev:console', 'clear');
obsidian('plugin:reload', 'id=notionalize');
// Loaded once the FeatureManager exists
let features = '';
for (let attempt = 0; attempt < 40 && !features.includes('/'); attempt++) {
	features = evaluate(`(()=>{const f=app.plugins.plugins.notionalize?.features;if(!f)return '';const off=f.definitions.filter(d=>f.isEnabled(d.id)&&f.isAvailable(d.id)&&!f.isRunning(d.id)).map(d=>d.id);return f.definitions.filter(d=>f.isRunning(d.id)).length+'/'+f.definitions.length+(off.length?' not running: '+off.join(','):'')})()`);
	if (!features.includes('/')) spawnSync('sleep', ['0.25']);
}
if (!features.includes('/')) fail('the plugin did not load after the reload');

const errors = obsidian('dev:errors');
const after = countsOf(readDataJson());
const previous = countsOf(before);
const summary = `icons ${after.icons}, recent ${after.recentIcons}, colors ${after.colors}, features ${features}`;

if (!/No errors captured/.test(errors)) fail(`errors after reload (${summary})\n${errors.split('\n').slice(-30).join('\n')}`);
if (features.includes('not running')) fail(summary);
const lost = (Object.keys(previous) as (keyof Counts)[]).filter(key => after[key] < previous[key]);
if (lost.length) fail(`${lost.join(', ')} lost by the reload (${JSON.stringify(previous)} → ${JSON.stringify(after)}), backup: ${backupFile}`);

console.log(`✓ vault: ${summary}, no errors (backup ${backupFile})`);
