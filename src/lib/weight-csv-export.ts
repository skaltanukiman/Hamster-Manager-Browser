import { toDateInputValue } from "@/lib/date";

export const WEIGHT_CSV_IDENTITY = {
  appId: "hamster-manager-browser",
  recordType: "weight_record",
  schemaVersion: "1"
} as const;

export const WEIGHT_CSV_REQUIRED_COLUMNS = [
  { key: "app_id", label: "出力元アプリケーション", value: WEIGHT_CSV_IDENTITY.appId },
  { key: "record_type", label: "レコード種別", value: WEIGHT_CSV_IDENTITY.recordType },
  { key: "schema_version", label: "スキーマバージョン", value: WEIGHT_CSV_IDENTITY.schemaVersion }
] as const;

export const WEIGHT_CSV_RECORD_ID_COLUMN = { key: "record_id", label: "記録ID" } as const;

export const WEIGHT_CSV_DATA_COLUMNS = [
  { key: "date", label: "測定日" },
  { key: "hamster", label: "ハムスター名" },
  { key: "weight_g", label: "体重" },
  { key: "created_at", label: "登録日時" },
  { key: "updated_at", label: "更新日時" }
] as const;

export type WeightCsvDataColumn = (typeof WEIGHT_CSV_DATA_COLUMNS)[number]["key"];

export const DEFAULT_WEIGHT_CSV_DATA_COLUMNS: readonly WeightCsvDataColumn[] = WEIGHT_CSV_DATA_COLUMNS.map(
  (column) => column.key
);

export const WEIGHT_CSV_TIME_ZONES = [
  { value: "UTC", label: "UTC" },
  { value: "JST", label: "JST（日本標準時・UTC+09:00）" }
] as const;

export type WeightCsvTimeZone = (typeof WEIGHT_CSV_TIME_ZONES)[number]["value"];

export const DEFAULT_WEIGHT_CSV_TIME_ZONE: WeightCsvTimeZone = "UTC";
export const DEFAULT_WEIGHT_CSV_INCLUDE_REQUIRED_COLUMNS = true;

export type WeightCsvRecord = {
  id: string;
  recordDate: Date;
  weightG: number;
  createdAt: Date;
  updatedAt: Date;
  hamster: {
    name: string;
  };
};

export class WeightCsvExportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeightCsvExportValidationError";
  }
}

const ALLOWED_DATA_COLUMNS = new Set<string>(DEFAULT_WEIGHT_CSV_DATA_COLUMNS);
const ALLOWED_TIME_ZONES = new Set<string>(WEIGHT_CSV_TIME_ZONES.map((timeZone) => timeZone.value));
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function validateWeightCsvDataColumns(values?: readonly string[]) {
  if (values === undefined) {
    return [...DEFAULT_WEIGHT_CSV_DATA_COLUMNS];
  }

  if (values.length === 0 || values.every((value) => value === "")) {
    throw new WeightCsvExportValidationError("出力するデータ列を1つ以上指定してください。");
  }

  if (values.some((value) => !ALLOWED_DATA_COLUMNS.has(value))) {
    throw new WeightCsvExportValidationError("出力列の指定が不正です。");
  }

  if (new Set(values).size !== values.length) {
    throw new WeightCsvExportValidationError("同じ出力列を重複して指定できません。");
  }

  // リクエスト内の順序ではなく、画面と共通の定義順へ揃える。
  return DEFAULT_WEIGHT_CSV_DATA_COLUMNS.filter((column) => values.includes(column));
}

export function validateWeightCsvTimeZone(value?: string): WeightCsvTimeZone {
  if (value === undefined) {
    return DEFAULT_WEIGHT_CSV_TIME_ZONE;
  }

  if (!ALLOWED_TIME_ZONES.has(value)) {
    throw new WeightCsvExportValidationError("タイムゾーンの指定が不正です。");
  }

  return value as WeightCsvTimeZone;
}

export function validateWeightCsvIncludeRequiredColumns(value?: string) {
  if (value === undefined) {
    return DEFAULT_WEIGHT_CSV_INCLUDE_REQUIRED_COLUMNS;
  }

  if (value === "true") return true;
  if (value === "false") return false;

  throw new WeightCsvExportValidationError("連携用の必須列の指定が不正です。");
}

export function parseWeightCsvExportOptions(searchParams: URLSearchParams) {
  const requestedColumns = searchParams.has("columns") ? searchParams.getAll("columns") : undefined;
  const requestedTimeZone = searchParams.has("timezone") ? searchParams.get("timezone") ?? "" : undefined;
  const requestedIncludeRequiredColumns = searchParams.has("includeRequiredColumns")
    ? searchParams.get("includeRequiredColumns") ?? ""
    : undefined;

  return {
    columns: validateWeightCsvDataColumns(requestedColumns),
    timeZone: validateWeightCsvTimeZone(requestedTimeZone),
    includeRequiredColumns: validateWeightCsvIncludeRequiredColumns(requestedIncludeRequiredColumns)
  };
}

export function formatWeightCsvTimestamp(date: Date, timeZone: WeightCsvTimeZone) {
  if (timeZone === "UTC") {
    return date.toISOString();
  }

  return new Date(date.getTime() + JST_OFFSET_MS).toISOString().replace(/Z$/, "+09:00");
}

const DATA_COLUMN_VALUE_GETTERS: Record<
  WeightCsvDataColumn,
  (record: WeightCsvRecord, timeZone: WeightCsvTimeZone) => string | number
> = {
  date: (record) => toDateInputValue(record.recordDate),
  hamster: (record) => record.hamster.name,
  weight_g: (record) => record.weightG,
  created_at: (record, timeZone) => formatWeightCsvTimestamp(record.createdAt, timeZone),
  updated_at: (record, timeZone) => formatWeightCsvTimestamp(record.updatedAt, timeZone)
};

export function getWeightCsvHeader(
  columns: readonly WeightCsvDataColumn[],
  includeRequiredColumns = DEFAULT_WEIGHT_CSV_INCLUDE_REQUIRED_COLUMNS
) {
  return [
    ...(includeRequiredColumns
      ? [...WEIGHT_CSV_REQUIRED_COLUMNS.map((column) => column.key), WEIGHT_CSV_RECORD_ID_COLUMN.key]
      : []),
    ...columns
  ];
}

export function weightRecordToCsvRow(
  record: WeightCsvRecord,
  columns: readonly WeightCsvDataColumn[],
  timeZone: WeightCsvTimeZone,
  includeRequiredColumns = DEFAULT_WEIGHT_CSV_INCLUDE_REQUIRED_COLUMNS
) {
  return [
    ...(includeRequiredColumns ? [...WEIGHT_CSV_REQUIRED_COLUMNS.map((column) => column.value), record.id] : []),
    ...columns.map((column) => DATA_COLUMN_VALUE_GETTERS[column](record, timeZone))
  ];
}

export function buildWeightCsvRows(
  records: readonly WeightCsvRecord[],
  columns: readonly WeightCsvDataColumn[] = DEFAULT_WEIGHT_CSV_DATA_COLUMNS,
  timeZone: WeightCsvTimeZone = DEFAULT_WEIGHT_CSV_TIME_ZONE,
  includeRequiredColumns = DEFAULT_WEIGHT_CSV_INCLUDE_REQUIRED_COLUMNS
): Array<Array<string | number>> {
  return [
    getWeightCsvHeader(columns, includeRequiredColumns),
    ...records.map((record) => weightRecordToCsvRow(record, columns, timeZone, includeRequiredColumns))
  ];
}
