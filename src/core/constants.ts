// body.notional-feature-<id> while a feature runs. Not `notional-<id>`: some
// features already use that class on their own elements (notional-board…)
export const FEATURE_BODY_CLASS_PREFIX = 'notional-feature-';

// User docs of each feature: docs/features/<id>.md
export const DOCS_BASE_URL = 'https://github.com/willybrauner/notionalize/blob/main/docs/features';

// Shape of data.json, written with it. Starts at 5: the shapes before it only
// existed during development
export const DATA_VERSION = 5;
