# MediaDropFeature

**File**: `src/features/media-drop/media-drop.ts`

## Purpose
Handles drag-and-drop and paste of media files onto markdown views. Saves the file into a `_assets/` subfolder next to the current note and inserts a markdown link at the cursor. Convertible images (PNG/JPG/JPEG/HEIC/HEIF) are automatically re-encoded to WebP before being written, if enabled in settings.

## Supported extensions
`png jpg jpeg gif webp svg heic heif mp4 webm mov avi mp3 wav flac ogg pdf doc docx xls xlsx`

## WebP conversion
- Enabled by `NotionalSettings.convertImagesToWebp` (default `true`), quality by `webpQuality` (default 80, 1–100), HEIC/HEIF by `convertHeic` (default `true`, the toggle only shows on macOS; off, HEIC files are written as they are). Settings in `src/settings/sub-settings/renderMediaDropSettings.ts`, shown while the feature is on.
- Converted extensions: `png jpg jpeg heic heif` (see `CONVERTIBLE_EXTENSIONS` in `constants.ts`). GIF (would lose animation), SVG (already vector) and existing WebP files pass through unchanged.
- PNG/JPG/JPEG go through `convertImageToWebp.ts` (`createImageBitmap` → `<canvas>` → `canvas.toBlob('image/webp', quality)`).
- HEIC/HEIF are first decoded to PNG via `decodeHeicToPng.ts`, which shells out to macOS's `sips` (desktop-only, same approach as the `to-webp` CLI script — `sharp`'s libvips build can't decode HEIC either). On any other platform, or if conversion fails for any reason, the original file is written unchanged and a `Notice` is shown — a drop must never be silently lost.
- The output filename is slugified (`slugifyFilename.ts`, ported from `to-webp/src/slugify.mjs`) with a `.webp` extension. A name that slugifies to nothing (non-ASCII only) becomes `image.webp`. Any other dropped file keeps its name, made safe by `safeFilename.ts` (path separators and characters refused in a name or a link replaced by `-`, no leading dot, never empty).

## Behavior
1. File dropped or pasted on a markdown view → saved to `<note-folder>/_assets/<filename>` (name collisions are suffixed `-1`, `-2`, ...).
2. `_assets/` folder created if it doesn't exist.
3. Markdown link inserted at current cursor position.
4. Non-media files are ignored (fall through to Obsidian's default handling).
5. **Daily notes**: only convertible images are intercepted, and they're written via `app.fileManager.getAvailablePathForAttachment()` (Obsidian's own attachment-folder setting + dedup) instead of `_assets/`, since daily notes aren't reorganized into their own folder. Any other dropped/pasted media in a daily note falls through to Obsidian's default handling untouched.

## Implementation
- Extends `Feature`. `drop` and `paste` listeners (capture phase) on the `containerEl` of each markdown view (attached on layout ready and `layout-change`), registered with `registerDomEvent` so turning the feature off removes them. Settings are read on each file from `ctx.settings`.
- `preventDefault()`/`stopPropagation()` are called synchronously, before any `await`, once at least one eligible file is found — calling them after an `await` is a no-op (the event has already been handled by Obsidian) and produces duplicate files.
- `ensureInOwnFolder` moves the current file into its own folder if needed before creating `_assets/` (non-daily notes only).
