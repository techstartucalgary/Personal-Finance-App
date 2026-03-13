export function toLocalISOString(date: Date): string {
    const tzOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - tzOffset);
    return local.toISOString().split("T")[0];
}

export function parseLocalDate(dateStr?: string | null): Date {
    if (!dateStr) return new Date();
    // Parse YYYY-MM-DD as local time to avoid UTC midnight timezone shift
    const parts = dateStr.split(/[-T]/); // handle both YYYY-MM-DD and YYYY-MM-DDTHH:mm:ss
    if (parts.length >= 3) {
        const [y, m, d] = parts.map(Number);
        const local = new Date(y, m - 1, d);
        if (!Number.isNaN(local.getTime())) {
            return local;
        }
    }
    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return new Date();
}
