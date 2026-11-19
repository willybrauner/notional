import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'manifest.json'
					]
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json']
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		plugins: { obsidianmd },
		rules: {
			'obsidianmd/ui/sentence-case': ['error', { enforceCamelCaseLower: true, ignoreRegex: ['WebP', 'HEIC', 'HEIF', 'Google', 'macOS'] }],
			// The declarative settings API needs Obsidian 1.13 (minAppVersion is 1.10.2),
			// and the tab renders per-feature toggles, dependents and sub-settings by hand
			'obsidianmd/settings-tab/prefer-setting-definitions': 'off',
		},
	},
	// Build and check scripts run in Node, outside Obsidian
	{
		files: ['scripts/**/*.ts'],
		rules: {
			'import/no-nodejs-modules': 'off',
			'no-console': 'off',
		},
	},
	// Tests run in Node against fake vault objects, not inside Obsidian
	{
		files: ['test/**/*.ts', 'vitest.config.ts', 'vitest.e2e.config.ts'],
		rules: {
			'import/no-nodejs-modules': 'off',
			'no-restricted-imports': 'off',
			'@typescript-eslint/no-restricted-imports': 'off',
			'obsidianmd/no-tfile-tfolder-cast': 'off',
		},
	},
	// e2e specs evaluate code in the Obsidian window, where `app` is a global typed loosely on purpose
	{
		files: ['test/e2e/**/*.ts'],
		rules: {
			'no-undef': 'off',
			'no-restricted-globals': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'obsidianmd/hardcoded-config-path': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
		},
	},
	// moment is a test-only dependency (Obsidian bundles its own at runtime)
	{
		files: ['package.json'],
		rules: { 'depend/ban-dependencies': ['error', { allowed: ['moment'] }] },
	},
	globalIgnores([
		"node_modules",
		".cache",
		"dist",
		"test/e2e/.run",
		"test/e2e/.cache",
		"version-bump.mjs",
		"eslint.config.mts",
		"versions.json",
		"main.js",
	]),
);
