import type { TestProject } from 'vitest/node';
import { launchObsidian } from './harness/launchObsidian';

declare module 'vitest' {
	export interface ProvidedContext {
		pageUrl: string;
		vaultPath: string;
	}
}

// One Obsidian instance for the whole run; specs share it and reset the workspace
export default async function setup(project: TestProject) {
	const obsidian = await launchObsidian();
	project.provide('pageUrl', obsidian.pageUrl);
	project.provide('vaultPath', obsidian.vaultPath);
	return async () => {
		if (process.env.NOTIONAL_E2E_KEEP_OPEN) return;
		await obsidian.close();
	};
}
