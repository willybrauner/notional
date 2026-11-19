import fs from 'node:fs';
import { CdpClient } from './CdpClient';
import { TIMEOUTS } from './constants';

interface Point { x: number; y: number }

export interface Rect { x: number; y: number; width: number; height: number }

// A frame painted during record(): PNG data and its time in ms
export interface Frame { data: Buffer; time: number }

interface EvaluateResult {
	result: { value?: unknown };
	exceptionDetails?: { exception?: { description?: string }; text: string };
}

// Keys dispatched by press(): DOM key → CDP key event fields
const KEYS: Record<string, { code: string; keyCode: number; text?: string }> = {
	Enter: { code: 'Enter', keyCode: 13, text: '\r' },
	Escape: { code: 'Escape', keyCode: 27 },
	Backspace: { code: 'Backspace', keyCode: 8 },
	Tab: { code: 'Tab', keyCode: 9 },
	ArrowDown: { code: 'ArrowDown', keyCode: 40 },
	ArrowUp: { code: 'ArrowUp', keyCode: 38 },
	ArrowLeft: { code: 'ArrowLeft', keyCode: 37 },
	ArrowRight: { code: 'ArrowRight', keyCode: 39 },
};

const MODIFIERS = { Alt: 1, Control: 2, Meta: 4, Shift: 8 } as const;
type Modifier = keyof typeof MODIFIERS;
const modifierMask = (modifiers: Modifier[] = []) => modifiers.reduce((mask, m) => mask | MODIFIERS[m], 0);

/**
 * Drives the Obsidian window like a user: real (trusted) mouse and keyboard
 * events through CDP Input, plus `evaluate` to read the app state.
 */
export class ObsidianPage {
	// Uncaught exceptions and console errors since the last takeErrors()
	private errors: string[] = [];

	private constructor(private readonly cdp: CdpClient) {}

	static async connect(pageUrl: string): Promise<ObsidianPage> {
		const page = new ObsidianPage(await CdpClient.connect(pageUrl));
		await page.cdp.send('Runtime.enable');
		await page.cdp.send('Page.enable');
		await page.cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true });
		page.cdp.on('Runtime.exceptionThrown', params => {
			const details = params.exceptionDetails as EvaluateResult['exceptionDetails'];
			page.errors.push(details?.exception?.description ?? details?.text ?? 'Unknown exception');
		});
		page.cdp.on('Runtime.consoleAPICalled', params => {
			if (params.type !== 'error') return;
			const args = params.args as { value?: unknown; description?: string }[];
			page.errors.push(args.map(a => (a.value === undefined ? a.description ?? '' : JSON.stringify(a.value))).join(' '));
		});
		return page;
	}

	disconnect(): void {
		this.cdp.close();
	}

	/** Errors logged since the last call. */
	takeErrors(): string[] {
		const errors = this.errors;
		this.errors = [];
		return errors;
	}

	/**
	 * Runs `fn` in the renderer, where `app` is Obsidian's App. Arguments and
	 * result go through JSON; promises are awaited.
	 */
	async evaluate<T, A extends unknown[] = []>(fn: (...args: A) => T | Promise<T>, ...args: A): Promise<T> {
		const expression = `(${fn.toString()})(...${JSON.stringify(args)})`;
		const response = await this.cdp.send<EvaluateResult>('Runtime.evaluate', {
			expression, awaitPromise: true, returnByValue: true, userGesture: true,
		});
		if (response.exceptionDetails) {
			throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
		}
		return response.result.value as T;
	}

	/** Polls `fn` until it returns a truthy value, and returns it. */
	async waitFor<T, A extends unknown[] = []>(fn: (...args: A) => T | Promise<T>, ...args: A): Promise<NonNullable<T>> {
		const end = Date.now() + TIMEOUTS.waitFor;
		let last: T | undefined;
		while (Date.now() < end) {
			last = await this.evaluate(fn, ...args).catch(() => undefined);
			if (last) return last;
			await new Promise(resolve => setTimeout(resolve, 50));
		}
		throw new Error(`waitFor timed out: ${fn.toString()} (last value: ${JSON.stringify(last)})`);
	}

	/** Waits for a visible element and returns its center, scrolled into view. */
	async locate(selector: string): Promise<Point> {
		return this.waitFor((sel: string) => {
			const el = Array.from(document.querySelectorAll(sel)).find(e => (e as HTMLElement).offsetParent !== null || e instanceof SVGElement);
			if (!el) return null;
			el.scrollIntoView({ block: 'center', inline: 'center' });
			const rect = el.getBoundingClientRect();
			return rect.width && rect.height ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : null;
		}, selector);
	}

	async click(target: string | Point, options: { clickCount?: number; modifiers?: Modifier[] } = {}): Promise<void> {
		const point = typeof target === 'string' ? await this.locate(target) : target;
		const modifiers = modifierMask(options.modifiers);
		await this.mouse('mouseMoved', point, modifiers);
		// Let :hover styles apply (buttons revealed on hover take pointer events only then)
		await new Promise(resolve => setTimeout(resolve, 50));
		for (let count = 1; count <= (options.clickCount ?? 1); count++) {
			await this.mouse('mousePressed', point, modifiers, count);
			await this.mouse('mouseReleased', point, modifiers, count);
		}
	}

	/** Moves the mouse over an element (reveals hover-only controls). */
	async hover(target: string | Point): Promise<void> {
		const point = typeof target === 'string' ? await this.locate(target) : target;
		await this.mouse('mouseMoved', point);
		await new Promise(resolve => setTimeout(resolve, 50));
	}

	async dblclick(target: string | Point): Promise<void> {
		await this.click(target, { clickCount: 2 });
	}

	/** Press, move in steps (so drag thresholds are crossed), release. */
	async drag(from: string | Point, to: string | Point, steps = 10): Promise<void> {
		const start = typeof from === 'string' ? await this.locate(from) : from;
		const end = typeof to === 'string' ? await this.locate(to) : to;
		await this.mouse('mouseMoved', start);
		await this.mouse('mousePressed', start, 0, 1);
		for (let i = 1; i <= steps; i++) {
			const point = { x: start.x + ((end.x - start.x) * i) / steps, y: start.y + ((end.y - start.y) * i) / steps };
			await this.mouse('mouseMoved', point, 0, 0, 1);
			await new Promise(resolve => setTimeout(resolve, 16));
		}
		await this.mouse('mouseReleased', end, 0, 1);
	}

	/** Types text at the focus, like an IME commit (one input event). */
	async type(text: string): Promise<void> {
		await this.cdp.send('Input.insertText', { text });
	}

	async press(key: string, modifiers: Modifier[] = []): Promise<void> {
		const def = KEYS[key] ?? { code: `Key${key.toUpperCase()}`, keyCode: key.toUpperCase().charCodeAt(0), text: key };
		const base = { key, code: def.code, windowsVirtualKeyCode: def.keyCode, modifiers: modifierMask(modifiers) };
		const text = modifiers.length ? undefined : def.text;
		await this.cdp.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', ...base, text });
		await this.cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
	}

	/** The window, or the `clip` part of it (CSS pixels): PNG, or WebP for a .webp path. */
	async screenshot(filePath: string, clip?: Rect): Promise<void> {
		const format = filePath.endsWith('.webp') ? 'webp' : 'png';
		const { data } = await this.cdp.send<{ data: string }>('Page.captureScreenshot', {
			format,
			...(format === 'webp' && { quality: 90 }),
			...(clip && { clip: { ...clip, scale: 1 } }),
		});
		fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
	}

	/** Frames of the whole window painted while `action` runs, then for `tail` ms. */
	async record(action: () => Promise<void>, tail = 300): Promise<Frame[]> {
		const frames: Frame[] = [];
		const off = this.cdp.on('Page.screencastFrame', params => {
			const { timestamp } = params.metadata as { timestamp: number };
			frames.push({ data: Buffer.from(params.data as string, 'base64'), time: timestamp * 1000 });
			void this.cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
		});
		await this.cdp.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
		try {
			await action();
			await new Promise(resolve => setTimeout(resolve, tail));
		} finally {
			await this.cdp.send('Page.stopScreencast');
			off();
		}
		return frames;
	}

	private async mouse(type: string, point: Point, modifiers = 0, clickCount = 0, buttons = 0): Promise<void> {
		const pressed = type === 'mousePressed' || type === 'mouseReleased';
		await this.cdp.send('Input.dispatchMouseEvent', {
			type, x: point.x, y: point.y, modifiers,
			button: pressed || buttons ? 'left' : 'none',
			buttons: type === 'mousePressed' ? 1 : buttons,
			clickCount,
		});
	}
}
