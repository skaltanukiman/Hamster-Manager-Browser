const RECORD_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parseRecordTimeInput(value: string) {
  if (!RECORD_TIME_PATTERN.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatRecordTime(minutes: number | null | undefined) {
  if (minutes === null || minutes === undefined || !Number.isInteger(minutes) || minutes < 0 || minutes > 1439) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
