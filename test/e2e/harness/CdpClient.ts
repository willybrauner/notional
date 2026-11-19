// Minimal Chrome DevTools Protocol client over Node's WebSocket. Playwright can't
// attach to Obsidian's Electron (no Browser.setDownloadBehavior), and Obsidian
// disables --inspect, so tests talk CDP directly.

interface CdpMessage {
	id?: number;
	method?: string;
	params?: Record<string, unknown>;
	result?: Record<string, unknown>;
	error?: { message: string };
}

type EventListener = (params: Record<string, unknown>) => void;

export class CdpClient {
	private nextId = 0;
	private pending = new Map<number, { resolve: (r: Record<string, unknown>) => void; reject: (e: Error) => void }>();
	private listeners = new Map<string, Set<EventListener>>();

	private constructor(private readonly ws: WebSocket) {
		ws.addEventListener('message', event => this.onMessage(JSON.parse(String(event.data)) as CdpMessage));
	}

	/** Connects to a target's WebSocket debugger URL. */
	static async connect(url: string): Promise<CdpClient> {
		const ws = new WebSocket(url);
		await new Promise<void>((resolve, reject) => {
			ws.addEventListener('open', () => resolve(), { once: true });
			ws.addEventListener('error', () => reject(new Error(`CDP connection failed: ${url}`)), { once: true });
		});
		return new CdpClient(ws);
	}

	send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}): Promise<T> {
		const id = ++this.nextId;
		return new Promise<T>((resolve, reject) => {
			this.pending.set(id, { resolve: resolve as (r: Record<string, unknown>) => void, reject });
			this.ws.send(JSON.stringify({ id, method, params }));
		});
	}

	on(method: string, listener: EventListener): () => void {
		const set = this.listeners.get(method) ?? new Set();
		set.add(listener);
		this.listeners.set(method, set);
		return () => set.delete(listener);
	}

	close(): void {
		this.ws.close();
	}

	private onMessage(message: CdpMessage): void {
		if (message.id !== undefined) {
			const pending = this.pending.get(message.id);
			this.pending.delete(message.id);
			if (message.error) pending?.reject(new Error(message.error.message));
			else pending?.resolve(message.result ?? {});
			return;
		}
		if (message.method) this.listeners.get(message.method)?.forEach(l => l(message.params ?? {}));
	}
}
