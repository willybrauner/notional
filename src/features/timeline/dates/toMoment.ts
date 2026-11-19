import { moment } from 'obsidian';

export type Moment = moment.Moment;

type MomentFn = (inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean) => moment.Moment;

// Obsidian re-exports moment as a namespace type, not callable without esModuleInterop
const callable = moment as unknown as MomentFn;

/** Calls Obsidian's bundled moment (local time, current app locale). */
export function toMoment(inp?: moment.MomentInput, format?: moment.MomentFormatSpecification, strict?: boolean): moment.Moment {
	return callable(inp, format, strict);
}
