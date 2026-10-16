import { FrontmatterError } from './frontmatter-error.js';
/** Match the server's explicit-zone, one-minute to thirty-day scheduling window. */
export function resolveSchedule(value, now = Date.now()) {
    const parts = typeof value === 'string'
        ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value)
        : null;
    if (parts) {
        const [, year, month, day, hour, minute, second = 0] = parts.map(Number);
        const time = Date.parse(value);
        if (month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
            && hour <= 23 && minute <= 59 && second <= 59 && Number.isFinite(time)
            && time >= now + 60_000 && time <= now + 30 * 24 * 60 * 60_000) {
            return new Date(time).toISOString();
        }
    }
    throw new FrontmatterError('scheduled_at must be an ISO date with a timezone, between one minute and 30 days from now.', 1);
}
