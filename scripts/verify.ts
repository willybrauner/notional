#!/usr/bin/env node

// Lint, unit tests, build and e2e in a row, quietly: one line per layer, the
// output of the failing one only. Stops at the first failure (exit code 1).
// `pnpm verify --no-e2e` skips the e2e layer.

import { spawnSync } from 'child_process';
import process from 'process';

const MAX_FAILURE_LINES = 80;

const layers = [
	{ name: 'lint', script: 'lint' },
	{ name: 'unit', script: 'test' },
	{ name: 'build', script: 'build' },
	{ name: 'e2e', script: 'test:e2e' },
].filter(layer => !(layer.name === 'e2e' && process.argv.includes('--no-e2e')));

// Vitest summary ("Tests  21 passed (21)"), when there is one
function summaryOf(output: string): string {
	return /^\s*Tests\s+(.+)$/m.exec(output)?.[1]?.trim() ?? '';
}

// From Vitest's failure report when there is one, else the end of the output
function failureOf(output: string): string {
	const lines = output.split('\n');
	const start = lines.findIndex(line => /Failed Tests|FAIL /.test(line));
	const relevant = start >= 0 ? lines.slice(start) : lines.slice(-MAX_FAILURE_LINES);
	return relevant.slice(0, MAX_FAILURE_LINES).join('\n');
}

for (const { name, script } of layers) {
	const started = Date.now();
	const result = spawnSync('pnpm', ['run', '--silent', script], {
		encoding: 'utf8',
		env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
		maxBuffer: 64 * 1024 * 1024,
	});
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	const seconds = ((Date.now() - started) / 1000).toFixed(1);
	if (result.status !== 0) {
		console.log(`✗ ${name} (${seconds}s)\n${failureOf(output)}`);
		process.exit(1);
	}
	console.log(`✓ ${name} ${summaryOf(output)} (${seconds}s)`.replace(/\s+\(/, ' ('));
}
