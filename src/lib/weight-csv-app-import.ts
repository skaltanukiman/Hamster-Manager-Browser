import { isValidDateInput, parseDateInput, todayInputJst } from "@/lib/date";
import { WEIGHT_CSV_IDENTITY } from "@/lib/weight-csv-export";
import { parseCsvRecords, type WeightCsvImportIssue } from "@/lib/weight-csv-import";
import { isWeightInTenths, MAX_WEIGHT_CSV_ROWS, MAX_WEIGHT_G } from "@/lib/weight-rules";

const REQUIRED_COLUMNS = [
  "app_id",
  "record_type",
  "schema_version",
  "record_id",
  "date",
  "hamster",
  "weight_g"
] as const;

export type ParsedAppWeightCsvRow = {
  lineNumber: number;
  recordId: string;
  hamsterName: string;
  recordDate: Date;
  recordDateInput: string;
  weightG: number;
};

function parseAppCsvDate(value: string) {
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(value.trim());

  if (!match) return null;

  const input = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  if (!isValidDateInput(input)) return null;

  return { date: parseDateInput(input), input };
}

export function parseAppWeightCsvImport(text: string, todayInput = todayInputJst()) {
  const { records, errors: parseErrors } = parseCsvRecords(text);
  const rows: ParsedAppWeightCsvRow[] = [];
  const errors: WeightCsvImportIssue[] = [...parseErrors];

  if (parseErrors.length > 0) return { rows, errors };

  if (records.length === 0) {
    return { rows, errors: [{ lineNumber: 1, message: "CSVにヘッダー行がありません。" }] };
  }

  if (records.length - 1 > MAX_WEIGHT_CSV_ROWS) {
    return {
      rows,
      errors: [{ lineNumber: 0, message: `CSVは${MAX_WEIGHT_CSV_ROWS.toLocaleString("ja-JP")}件以内にしてください。` }]
    };
  }

  const header = records[0].cells.map((cell) => cell.trim().toLowerCase());
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    return {
      rows,
      errors: [{ lineNumber: records[0].lineNumber, message: `必須列が不足しています: ${missingColumns.join(", ")}` }]
    };
  }

  const columnIndexes = new Map(header.map((column, index) => [column, index]));
  const valueAt = (cells: string[], column: (typeof REQUIRED_COLUMNS)[number]) =>
    cells[columnIndexes.get(column) ?? -1]?.trim() ?? "";

  for (const record of records.slice(1)) {
    const appId = valueAt(record.cells, "app_id");
    const recordType = valueAt(record.cells, "record_type");
    const schemaVersion = valueAt(record.cells, "schema_version");
    const recordId = valueAt(record.cells, "record_id");
    const dateValue = valueAt(record.cells, "date");
    const hamsterName = valueAt(record.cells, "hamster");
    const weightValue = valueAt(record.cells, "weight_g");
    const parsedDate = parseAppCsvDate(dateValue);
    const weightG = Number(weightValue);
    const rowErrors: string[] = [];

    if (appId !== WEIGHT_CSV_IDENTITY.appId || recordType !== WEIGHT_CSV_IDENTITY.recordType) {
      rowErrors.push("このアプリからエクスポートした体重CSVではありません。");
    }
    if (schemaVersion !== WEIGHT_CSV_IDENTITY.schemaVersion) {
      rowErrors.push("対応していないschema_versionです。");
    }
    if (!parsedDate) {
      rowErrors.push("dateはYYYY-MM-DDまたはYYYY/MM/DD形式の日付で入力してください。");
    } else if (parsedDate.date.getTime() > parseDateInput(todayInput).getTime()) {
      rowErrors.push("未来日には記録できません。");
    }
    if (hamsterName.length === 0) rowErrors.push("hamsterが空です。");

    if (weightValue.length === 0 || !Number.isFinite(weightG)) {
      rowErrors.push("weight_gは数値で入力してください。");
    } else if (weightG <= 0) {
      rowErrors.push("weight_gは0より大きい数値で入力してください。");
    } else if (weightG > MAX_WEIGHT_G) {
      rowErrors.push(`weight_gは${MAX_WEIGHT_G}g以下で入力してください。`);
    } else if (!isWeightInTenths(weightG)) {
      rowErrors.push("weight_gは0.1g単位で入力してください。");
    }

    if (rowErrors.length > 0 || !parsedDate) {
      errors.push({ lineNumber: record.lineNumber, message: rowErrors.join(" ") });
      continue;
    }

    rows.push({
      lineNumber: record.lineNumber,
      recordId,
      hamsterName,
      recordDate: parsedDate.date,
      recordDateInput: parsedDate.input,
      weightG
    });
  }

  return { rows, errors };
}
