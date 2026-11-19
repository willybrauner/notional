import { DOCS_BASE_URL } from './constants';
import type { FeatureDefinition } from './types';

type FeatureInput = Omit<FeatureDefinition, 'docsUrl' | 'defaultEnabled' | 'desktopOnly' | 'requires'>
	& Partial<Pick<FeatureDefinition, 'defaultEnabled' | 'desktopOnly' | 'requires'>>;

// Registry entry with the defaults: on, every platform, no requirement, docs page from the id
export function defineFeature(input: FeatureInput): FeatureDefinition {
	return {
		defaultEnabled: true,
		desktopOnly: false,
		requires: [],
		docsUrl: `${DOCS_BASE_URL}/${input.id}.md`,
		...input,
	};
}
