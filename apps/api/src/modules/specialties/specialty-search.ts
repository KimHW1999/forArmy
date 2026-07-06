import type { MilitarySpecialty, MmaRawItem } from "@military-guide/shared";
import { MmaClient } from "../mma/mma.client";
import { mapMilitarySpecialty } from "./specialty.mapper";

type SpecialtySearchOptions = {
  query?: string;
  pageSize?: number;
  maxPages?: number;
  limit?: number;
};

export async function searchSpecialties(
  client: MmaClient,
  options: SpecialtySearchOptions
): Promise<MilitarySpecialty[]> {
  const query = normalize(options.query ?? "");
  const pageSize = options.pageSize ?? 1000;
  const maxPages = options.maxPages ?? 12;
  const limit = options.limit ?? 80;
  const byCode = new Map<string, MilitarySpecialty>();

  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    const page = await client.fetchPage({
      resource: "specialties",
      pageNo,
      numOfRows: pageSize
    });

    for (const row of page.items) {
      if (query && !matchesQuery(row, query)) {
        continue;
      }

      const specialty = mapMilitarySpecialty(row);
      const key = `${specialty.branchCode}:${specialty.specialtyCode}`;

      if (!byCode.has(key)) {
        byCode.set(key, specialty);
      }

      if (byCode.size >= limit) {
        return [...byCode.values()];
      }
    }

    if (pageNo * pageSize >= page.totalCount || page.items.length === 0) {
      break;
    }
  }

  return [...byCode.values()];
}

function matchesQuery(row: MmaRawItem, query: string): boolean {
  return [
    row.gsteukgiCd,
    row.gsteukgiNm,
    row.gunGbnm,
    row.mjgubNm,
    row.mjbgteukgiNm,
    row.gjhangmokNm
  ].some((value) => normalize(value ?? "").includes(query));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
