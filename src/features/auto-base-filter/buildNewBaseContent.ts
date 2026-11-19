import { buildBaseInitialContent } from '../../constants/base-filter';
import { withNewItemFolder } from '../../utils/withNewItemFolder';

// Full content of a new, empty `.base` in `folderPath`: folder filter, table view, newItemFolder.
export function buildNewBaseContent(folderPath: string): string {
	return withNewItemFolder(buildBaseInitialContent(folderPath), folderPath);
}
