import { WEBP_MIME } from './constants';
import { decodeHeicToPng } from './decodeHeicToPng';
import { isHeic } from './isHeic';

/**
 * Some WebViews ignore the requested MIME type and silently fall back to
 * PNG — checking the resulting blob's type
 * lets callers fall back to writing the original file instead of a PNG
 * mislabeled as .webp.
 */
export async function convertImageToWebp(file: File, quality: number): Promise<Blob> {
	const source = isHeic(file.name) ? await decodeHeicToPng(file) : file;

	const bitmap = await createImageBitmap(source);
	const canvas = createEl('canvas');
	canvas.width = bitmap.width;
	canvas.height = bitmap.height;
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
	bitmap.close();

	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, WEBP_MIME, quality));
	if (!blob || blob.type !== WEBP_MIME) throw new Error('WebP encoding failed');
	return blob;
}
