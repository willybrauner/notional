// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS_BASE_URL } from '../../../src/core/constants';
import { FEATURES } from '../../../src/core/featureRegistry';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
describe('feature docs', () => {
	it.each(FEATURES.map(feature => [feature.id, feature.docsUrl]))(
		'%s links to its page in docs/features',
		(id, docsUrl) => {
			expect(docsUrl).toBe(`${DOCS_BASE_URL}/${id}.md`);
			expect(fs.existsSync(path.join(root, 'docs/features', `${id}.md`))).toBe(true);
		},
	);

	it('every image a page shows exists', () => {
		for (const page of fs.readdirSync(path.join(root, 'docs/features'))) {
			const content = fs.readFileSync(path.join(root, 'docs/features', page), 'utf8');
			for (const [, image] of content.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
				expect(fs.existsSync(path.join(root, 'docs/features', image!)), `${page}: ${image}`).toBe(true);
			}
		}
	});
});
