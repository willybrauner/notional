import { defineConfig } from 'vitest/config';
import { BaseSequencer } from 'vitest/node';
import type { TestSpecification } from 'vitest/node';

// Popout specs last: a popout brings the test window to the front
class PopoutLastSequencer extends BaseSequencer {
	async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
		const sorted = await super.sort(files);
		const isPopout = (file: TestSpecification) => file.moduleId.endsWith('popout.e2e.ts');
		return [...sorted.filter(file => !isPopout(file)), ...sorted.filter(isPopout)];
	}
}

// End-to-end: drives a real, isolated Obsidian (see test/e2e/harness/launchObsidian.ts).
// Requires `pnpm build` first and the Obsidian desktop app installed.
export default defineConfig({
	test: {
		include: ['test/e2e/specs/**/*.e2e.ts'],
		globalSetup: ['test/e2e/globalSetup.ts'],
		// A single app instance: spec files run one after the other
		fileParallelism: false,
		sequence: { sequencer: PopoutLastSequencer },
		testTimeout: 30_000,
		hookTimeout: 120_000,
	},
});
