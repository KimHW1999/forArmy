import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  MilitarySpecialty,
  RecruitmentStatus,
  RequiredDocument,
  SelectionScoreRule
} from "@military-guide/shared";

const DAY_MS = 24 * 60 * 60 * 1000;
export const STATIC_CACHE_TTL_MS = 7 * DAY_MS;
export const RECRUITMENT_CACHE_TTL_MS = 30 * 60 * 1000;

const SPECIALTY_HEADERS = [
  "specialtyCode",
  "specialtyName",
  "branchCode",
  "branchName",
  "categoryCode",
  "categoryName",
  "requirementItemName",
  "minValue",
  "maxValue",
  "recruitYear",
  "recruitRound",
  "scheduleId",
  "applicationStartAt",
  "applicationEndAt"
] as const;

const DOCUMENT_HEADERS = [
  "specialtyCode",
  "specialtyName",
  "branchCode",
  "branchName",
  "documentCode",
  "documentName",
  "categoryCode",
  "categoryName",
  "isRequired"
] as const;

const SCORE_HEADERS = [
  "specialtyCode",
  "specialtyName",
  "branchCode",
  "branchName",
  "scoreGroupCode",
  "scoreGroupName",
  "scoreGradeCode",
  "scoreGradeName",
  "scoreDetailCode",
  "scoreDetailName",
  "minValue",
  "maxValue",
  "directScore",
  "indirectScore",
  "scheduleId",
  "recruitYear",
  "recruitRound"
] as const;

const RECRUITMENT_HEADERS = [
  "specialtyCode",
  "specialtyName",
  "branchName",
  "recruitTypeName",
  "recruitYear",
  "recruitRound",
  "selectionQuota",
  "applicantCount",
  "shortageCount",
  "competitionRate",
  "applicationStartAt",
  "applicationEndAt",
  "enlistStartMonth",
  "enlistEndMonth",
  "enlistDate"
] as const;

const REFRESH_HEADERS = ["resource", "cacheKey", "refreshedAt"] as const;

type CsvRecord = Record<string, string | undefined>;
type CacheRefresh = {
  resource: string;
  cacheKey: string;
  refreshedAt: string;
};
type CsvFileCache = {
  mtimeMs: number;
  rows: CsvRecord[];
};

const csvFileCache = new Map<string, CsvFileCache>();

export async function readCachedSpecialties(options: {
  query?: string;
  limit: number;
}): Promise<MilitarySpecialty[] | null> {
  const rows = await readCsv("specialties.csv");

  if (!rows.length) {
    return null;
  }

  const query = normalize(options.query ?? "");
  const items = dedupeSpecialtyList(rows.map(toMilitarySpecialty)).filter((specialty) => {
    if (!query) {
      return true;
    }

    return [
      specialty.specialtyCode,
      specialty.specialtyName,
      specialty.branchName,
      specialty.categoryName,
      specialty.requirementItemName
    ].some((value) => normalize(value ?? "").includes(query));
  });

  return items.slice(0, options.limit);
}

export async function readCachedSpecialty(
  specialtyCode: string
): Promise<MilitarySpecialty | null> {
  const rows = await readCsv("specialties.csv");
  const match = rows.find((row) => row.specialtyCode === specialtyCode);

  return match ? toMilitarySpecialty(match) : null;
}

export async function readCachedDocuments(
  specialtyCode: string
): Promise<RequiredDocument[] | null> {
  return readFreshCollection("documents", specialtyCode, STATIC_CACHE_TTL_MS, async () => {
    const rows = await readCsv("documents.csv");
    return rows.filter((row) => row.specialtyCode === specialtyCode).map(toRequiredDocument);
  });
}

export async function readCachedScores(
  specialtyCode: string,
  scheduleId?: string
): Promise<SelectionScoreRule[] | null> {
  return readFreshCollection("scores", specialtyCode, STATIC_CACHE_TTL_MS, async () => {
    const rows = await readCsv("scores.csv");
    return rows
      .filter((row) => {
        return (
          row.specialtyCode === specialtyCode &&
          (!scheduleId || row.scheduleId === scheduleId)
        );
      })
      .map(toSelectionScoreRule);
  });
}

export async function readCachedRecruitmentStatuses(
  specialtyCode: string
): Promise<RecruitmentStatus[] | null> {
  return readFreshCollection(
    "recruitmentStatus",
    specialtyCode,
    RECRUITMENT_CACHE_TTL_MS,
    async () => {
      const rows = await readCsv("recruitment-statuses.csv");
      return rows.filter((row) => row.specialtyCode === specialtyCode).map(toRecruitmentStatus);
    }
  );
}

export async function cacheSpecialties(items: MilitarySpecialty[]) {
  if (!items.length) {
    return;
  }

  const existing = await readCsv("specialties.csv");
  const byKey = new Map(existing.map((row) => [specialtyKey(row), row]));

  for (const item of items) {
    byKey.set(specialtyKey(item), fromMilitarySpecialty(item));
  }

  await writeCsv("specialties.csv", SPECIALTY_HEADERS, [...byKey.values()]);
}

export async function replaceSpecialties(items: MilitarySpecialty[]) {
  await writeCsv("specialties.csv", SPECIALTY_HEADERS, items.map(fromMilitarySpecialty));
}

export function dedupeSpecialtyList(items: MilitarySpecialty[]): MilitarySpecialty[] {
  const byCode = new Map<string, MilitarySpecialty>();

  for (const item of items) {
    const key = [item.branchCode, item.specialtyCode].join(":");

    if (!byCode.has(key)) {
      byCode.set(key, item);
    }
  }

  return [...byCode.values()];
}

export async function cacheDocuments(specialtyCode: string, items: RequiredDocument[]) {
  const existing = await readCsv("documents.csv");
  const next = [
    ...existing.filter((row) => row.specialtyCode !== specialtyCode),
    ...items.map(fromRequiredDocument)
  ];

  await writeCsv("documents.csv", DOCUMENT_HEADERS, next);
  await markCacheFresh("documents", specialtyCode);
}

export async function replaceDocuments(items: RequiredDocument[]) {
  await writeCsv("documents.csv", DOCUMENT_HEADERS, items.map(fromRequiredDocument));
  await markCacheFreshForSpecialties("documents", items.map((item) => item.specialtyCode));
}

export async function cacheScores(specialtyCode: string, items: SelectionScoreRule[]) {
  const existing = await readCsv("scores.csv");
  const next = [
    ...existing.filter((row) => row.specialtyCode !== specialtyCode),
    ...items.map(fromSelectionScoreRule)
  ];

  await writeCsv("scores.csv", SCORE_HEADERS, next);
  await markCacheFresh("scores", specialtyCode);
}

export async function replaceScores(items: SelectionScoreRule[]) {
  await writeCsv("scores.csv", SCORE_HEADERS, items.map(fromSelectionScoreRule));
  await markCacheFreshForSpecialties("scores", items.map((item) => item.specialtyCode));
}

export async function cacheRecruitmentStatuses(
  specialtyCode: string,
  items: RecruitmentStatus[]
) {
  const existing = await readCsv("recruitment-statuses.csv");
  const next = [
    ...existing.filter((row) => row.specialtyCode !== specialtyCode),
    ...items.map(fromRecruitmentStatus)
  ];

  await writeCsv("recruitment-statuses.csv", RECRUITMENT_HEADERS, next);
  await markCacheFresh("recruitmentStatus", specialtyCode);
}

export async function replaceRecruitmentStatuses(items: RecruitmentStatus[]) {
  await writeCsv(
    "recruitment-statuses.csv",
    RECRUITMENT_HEADERS,
    items.map(fromRecruitmentStatus)
  );
  await markCacheFreshForSpecialties(
    "recruitmentStatus",
    items.map((item) => item.specialtyCode)
  );
}

export async function warmCsvCache() {
  await Promise.all([
    readCsv("specialties.csv"),
    readCsv("documents.csv"),
    readCsv("scores.csv"),
    readCsv("recruitment-statuses.csv"),
    readCsv("cache-refresh.csv")
  ]);
}

async function readFreshCollection<T>(
  resource: string,
  cacheKey: string,
  ttlMs: number,
  readItems: () => Promise<T[]>
): Promise<T[] | null> {
  const isFresh = await isCacheFresh(resource, cacheKey, ttlMs);
  return isFresh ? readItems() : null;
}

async function isCacheFresh(resource: string, cacheKey: string, ttlMs: number) {
  const rows = (await readCsv("cache-refresh.csv")) as CacheRefresh[];
  const row = rows.find((item) => item.resource === resource && item.cacheKey === cacheKey);
  const refreshedAt = row ? Date.parse(row.refreshedAt) : Number.NaN;

  return Number.isFinite(refreshedAt) && Date.now() - refreshedAt <= ttlMs;
}

async function markCacheFresh(resource: string, cacheKey: string) {
  const existing = await readCsv("cache-refresh.csv");
  const next = existing.filter(
    (row) => row.resource !== resource || row.cacheKey !== cacheKey
  );

  next.push({
    resource,
    cacheKey,
    refreshedAt: new Date().toISOString()
  });

  await writeCsv("cache-refresh.csv", REFRESH_HEADERS, next);
}

async function markCacheFreshForSpecialties(resource: string, specialtyCodes: string[]) {
  const existing = await readCsv("cache-refresh.csv");
  const uniqueCodes = [...new Set(specialtyCodes.filter(Boolean))];
  const codeSet = new Set(uniqueCodes);
  const next = existing.filter((row) => row.resource !== resource || !codeSet.has(row.cacheKey ?? ""));
  const refreshedAt = new Date().toISOString();

  next.push(...uniqueCodes.map((cacheKey) => ({ resource, cacheKey, refreshedAt })));

  await writeCsv("cache-refresh.csv", REFRESH_HEADERS, next);
}

async function readCsv(fileName: string): Promise<CsvRecord[]> {
  const cachePath = resolveCachePath(fileName);

  try {
    const fileStat = await stat(cachePath);
    const cached = csvFileCache.get(fileName);

    if (cached?.mtimeMs === fileStat.mtimeMs) {
      return cached.rows;
    }

    const content = await readFile(cachePath, "utf8");
    const rows = parseCsv(content);

    if (rows.length < 2) {
      csvFileCache.set(fileName, {
        mtimeMs: fileStat.mtimeMs,
        rows: []
      });
      return [];
    }

    const [headers, ...values] = rows;
    const records = values
      .filter((row) => row.some((value) => value !== ""))
      .map((row) => {
        return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""]));
      });

    csvFileCache.set(fileName, {
      mtimeMs: fileStat.mtimeMs,
      rows: records
    });

    return records;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      csvFileCache.delete(fileName);
      return [];
    }

    throw error;
  }
}

async function writeCsv(
  fileName: string,
  headers: readonly string[],
  rows: CsvRecord[]
) {
  await mkdir(getCacheDir(), { recursive: true });

  const content = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","))
  ].join("\n");

  await writeFile(resolveCachePath(fileName), `${content}\n`, "utf8");
  csvFileCache.delete(fileName);
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function escapeCsvCell(value: unknown) {
  const cell = value == null ? "" : String(value);
  return /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

function toMilitarySpecialty(row: CsvRecord): MilitarySpecialty {
  return {
    specialtyCode: required(row.specialtyCode),
    specialtyName: optional(row.specialtyName),
    branchCode: required(row.branchCode),
    branchName: optional(row.branchName),
    categoryCode: optional(row.categoryCode),
    categoryName: optional(row.categoryName),
    requirementItemName: optional(row.requirementItemName),
    minValue: optional(row.minValue),
    maxValue: optional(row.maxValue),
    recruitYear: required(row.recruitYear),
    recruitRound: required(row.recruitRound),
    scheduleId: required(row.scheduleId),
    applicationStartAt: optional(row.applicationStartAt),
    applicationEndAt: optional(row.applicationEndAt)
  };
}

function fromMilitarySpecialty(item: MilitarySpecialty): CsvRecord {
  return {
    specialtyCode: item.specialtyCode,
    specialtyName: item.specialtyName,
    branchCode: item.branchCode,
    branchName: item.branchName,
    categoryCode: item.categoryCode,
    categoryName: item.categoryName,
    requirementItemName: item.requirementItemName,
    minValue: item.minValue,
    maxValue: item.maxValue,
    recruitYear: item.recruitYear,
    recruitRound: item.recruitRound,
    scheduleId: item.scheduleId,
    applicationStartAt: item.applicationStartAt,
    applicationEndAt: item.applicationEndAt
  };
}

function toRequiredDocument(row: CsvRecord): RequiredDocument {
  return {
    specialtyCode: required(row.specialtyCode),
    specialtyName: optional(row.specialtyName),
    branchCode: required(row.branchCode),
    branchName: optional(row.branchName),
    documentCode: required(row.documentCode),
    documentName: optional(row.documentName),
    categoryCode: optional(row.categoryCode),
    categoryName: optional(row.categoryName),
    isRequired: row.isRequired === "true"
  };
}

function fromRequiredDocument(item: RequiredDocument): CsvRecord {
  return {
    specialtyCode: item.specialtyCode,
    specialtyName: item.specialtyName,
    branchCode: item.branchCode,
    branchName: item.branchName,
    documentCode: item.documentCode,
    documentName: item.documentName,
    categoryCode: item.categoryCode,
    categoryName: item.categoryName,
    isRequired: String(item.isRequired)
  };
}

function toSelectionScoreRule(row: CsvRecord): SelectionScoreRule {
  return {
    specialtyCode: required(row.specialtyCode),
    specialtyName: optional(row.specialtyName),
    branchCode: required(row.branchCode),
    branchName: optional(row.branchName),
    scoreGroupCode: required(row.scoreGroupCode),
    scoreGroupName: optional(row.scoreGroupName),
    scoreGradeCode: optional(row.scoreGradeCode),
    scoreGradeName: optional(row.scoreGradeName),
    scoreDetailCode: required(row.scoreDetailCode),
    scoreDetailName: optional(row.scoreDetailName),
    minValue: optional(row.minValue),
    maxValue: optional(row.maxValue),
    directScore: toNumber(row.directScore),
    indirectScore: toNumber(row.indirectScore),
    scheduleId: required(row.scheduleId),
    recruitYear: required(row.recruitYear),
    recruitRound: required(row.recruitRound)
  };
}

function fromSelectionScoreRule(item: SelectionScoreRule): CsvRecord {
  return {
    specialtyCode: item.specialtyCode,
    specialtyName: item.specialtyName,
    branchCode: item.branchCode,
    branchName: item.branchName,
    scoreGroupCode: item.scoreGroupCode,
    scoreGroupName: item.scoreGroupName,
    scoreGradeCode: item.scoreGradeCode,
    scoreGradeName: item.scoreGradeName,
    scoreDetailCode: item.scoreDetailCode,
    scoreDetailName: item.scoreDetailName,
    minValue: item.minValue,
    maxValue: item.maxValue,
    directScore: stringifyNumber(item.directScore),
    indirectScore: stringifyNumber(item.indirectScore),
    scheduleId: item.scheduleId,
    recruitYear: item.recruitYear,
    recruitRound: item.recruitRound
  };
}

function toRecruitmentStatus(row: CsvRecord): RecruitmentStatus {
  return {
    specialtyCode: required(row.specialtyCode),
    specialtyName: optional(row.specialtyName),
    branchName: optional(row.branchName),
    recruitTypeName: optional(row.recruitTypeName),
    recruitYear: optional(row.recruitYear),
    recruitRound: optional(row.recruitRound),
    selectionQuota: toNumber(row.selectionQuota),
    applicantCount: toNumber(row.applicantCount),
    shortageCount: toNumber(row.shortageCount),
    competitionRate: toNumber(row.competitionRate),
    applicationStartAt: optional(row.applicationStartAt),
    applicationEndAt: optional(row.applicationEndAt),
    enlistStartMonth: optional(row.enlistStartMonth),
    enlistEndMonth: optional(row.enlistEndMonth),
    enlistDate: optional(row.enlistDate)
  };
}

function fromRecruitmentStatus(item: RecruitmentStatus): CsvRecord {
  return {
    specialtyCode: item.specialtyCode,
    specialtyName: item.specialtyName,
    branchName: item.branchName,
    recruitTypeName: item.recruitTypeName,
    recruitYear: item.recruitYear,
    recruitRound: item.recruitRound,
    selectionQuota: stringifyNumber(item.selectionQuota),
    applicantCount: stringifyNumber(item.applicantCount),
    shortageCount: stringifyNumber(item.shortageCount),
    competitionRate: stringifyNumber(item.competitionRate),
    applicationStartAt: item.applicationStartAt,
    applicationEndAt: item.applicationEndAt,
    enlistStartMonth: item.enlistStartMonth,
    enlistEndMonth: item.enlistEndMonth,
    enlistDate: item.enlistDate
  };
}

function specialtyKey(item: {
  branchCode?: string;
  specialtyCode?: string;
  scheduleId?: string;
}) {
  return [item.branchCode ?? "", item.specialtyCode ?? "", item.scheduleId ?? ""].join(":");
}

function getCacheDir() {
  return resolve(getProjectRoot(), "data", "cache");
}

function resolveCachePath(fileName: string) {
  return resolve(getCacheDir(), fileName);
}

function getProjectRoot() {
  const cwd = process.cwd().replaceAll("\\", "/");
  return cwd.endsWith("/apps/api") ? resolve(process.cwd(), "../..") : process.cwd();
}

function required(value: string | undefined): string {
  if (!value) {
    throw new Error("CSV cache row is missing a required field");
  }

  return value;
}

function optional(value: string | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function stringifyNumber(value: number | undefined): string | undefined {
  return value == null ? undefined : String(value);
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
