import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		// The real `obsidian` package only ships types: tests run against a minimal stand-in
		alias: { obsidian: fileURLToPath(new URL('./test/mocks/obsidian.ts', import.meta.url)) },
	},
	test: {
		include: ['test/unit/**/*.test.ts'],
		environment: 'node',
	},
});
