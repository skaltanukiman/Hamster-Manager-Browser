import { isValidDateInput, parseDateInput, todayInputJst } from "@/lib/date";
import { isWeightInTenths, MAX_WEIGHT_CSV_ROWS, MAX_WEIGHT_G } from "@/lib/weight-rules";

export type WeightCsvImportIssue = {
  lineNumber: number;
  message: string;
};

export type ParsedWeightCsvImportRow = {
  lineNumber: number;
  hamsterName: string;
  recordDate: Date;
  recordDateInput: string;
  weightG: number;
};

type CsvRecord = {
  lineNumber: number;
  cells: string[];
};

const REQUIRED_COLUMNS = ["date", "hamster", "weight"] as const;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isEmptyRecord(cells: string[]) {
  return cells.every((cell) => cell.trim().length === 0);
}

function parseCsvRecords(text: string) {
  const source = text.replace(/^\uFEFF/, "");
  const records: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let lineNumber = 1;
  let recordLineNumber = 1;

  function pushRecord() {
    const nextCells = [...cells, cell];

    if (!isEmptyRecord(nextCells)) {
      records.push({ lineNumber: recordLineNumber, cells: nextCells });
    }

    cells = [];
    cell = "";
    recordLineNumber = lineNumber;
  }

  for (let index = 0; index < source.length; index++) {
    const char = source[index];

    if (inQuotes) {
      if (char === '"' && source[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        inQuotes = false;
      } else if (char === "\r") {
        cell += "\n";

        if (source[index + 1] === "\n") {
          index++;
        }

        lineNumber++;
      } else if (char === "\n") {
        cell += "\n";
        lineNumber++;
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else if (char === "\r") {
      pushRecord();

      if (source[index + 1] === "\n") {
        index++;
      }

      lineNumber++;
      recordLineNumber = lineNumber;
    } else if (char === "\n") {
      pushRecord();
      lineNumber++;
      recordLineNumber = lineNumber;
    } else {
      cell += char;
    }
  }

  if (inQuotes) {
    return {
      records: [],
      errors: [{ lineNumber: recordLineNumber, message: "CSVのダブルクォートが閉じられていません。" }]
    };
  }

  if (cell.length > 0 || cells.length > 0) {
    pushRecord();
  }

  return { records, errors: [] };
}

function parseCsvDate(value: string) {
  const match = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const input = `${year}-${pad(month)}-${pad(day)}`;

  if (!isValidDateInput(input)) {
    return null;
  }

  return {
    date: parseDateInput(input),
    input
  };
}

export function parseWeightCsvImport(text: string, todayInput = todayInputJst()) {
  const { records, errors: parseErrors } = parseCsvRecords(text);
  const rows: ParsedWeightCsvImportRow[] = [];
  const errors: WeightCsvImportIssue[] = [...parseErrors];

  if (parseErrors.length > 0) {
    return { rows, errors };
  }

  if (records.length === 0) {
    return {
      rows,
      errors: [{ lineNumber: 1, message: "CSVにヘッダー行がありません。" }]
    };
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

  for (const record of records.slice(1)) {
    const dateValue = record.cells[columnIndexes.get("date") ?? -1]?.trim() ?? "";
    const hamsterName = record.cells[columnIndexes.get("hamster") ?? -1]?.trim() ?? "";
    const weightValue = record.cells[columnIndexes.get("weight") ?? -1]?.trim() ?? "";
    const unitValue = record.cells[columnIndexes.get("unit") ?? -1]?.trim() ?? "";
    const rowErrors: string[] = [];
    const parsedDate = parseCsvDate(dateValue);
    const weightG = Number(weightValue);

    if (!parsedDate) {
      rowErrors.push("dateはYYYY/MM/DD形式の日付で入力してください。");
    } else if (parsedDate.date.getTime() > parseDateInput(todayInput).getTime()) {
      rowErrors.push("未来日には記録できません。");
    }

    if (hamsterName.length === 0) {
      rowErrors.push("hamsterが空です。");
    }

    if (weightValue.length === 0 || !Number.isFinite(weightG)) {
      rowErrors.push("weightは数値で入力してください。");
    } else if (weightG <= 0) {
      rowErrors.push("weightは0より大きい数値で入力してください。");
    } else if (weightG > MAX_WEIGHT_G) {
      rowErrors.push(`weightは${MAX_WEIGHT_G}g以下で入力してください。`);
    } else if (!isWeightInTenths(weightG)) {
      rowErrors.push("weightは0.1g単位で入力してください。");
    }

    if (unitValue.length > 0 && unitValue !== "g") {
      rowErrors.push("unitはgのみ対応しています。");
    }

    if (rowErrors.length > 0 || !parsedDate) {
      errors.push({ lineNumber: record.lineNumber, message: rowErrors.join(" ") });
      continue;
    }

    rows.push({
      lineNumber: record.lineNumber,
      hamsterName,
      recordDate: parsedDate.date,
      recordDateInput: parsedDate.input,
      weightG
    });
  }

  return { rows, errors };
}
