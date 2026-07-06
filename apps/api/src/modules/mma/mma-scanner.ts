import type { MmaRawItem, MmaResource } from "@military-guide/shared";
import { MmaClient } from "./mma.client";

type ScanOptions = {
  resource: MmaResource;
  specialtyCode: string;
  pageSize?: number;
  maxPages?: number;
};

export async function scanBySpecialtyCode(
  client: MmaClient,
  options: ScanOptions
): Promise<MmaRawItem[]> {
  const pageSize = options.pageSize ?? 1000;
  const maxPages = options.maxPages ?? 10;
  const matches: MmaRawItem[] = [];

  for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
    const page = await client.fetchPage({
      resource: options.resource,
      pageNo,
      numOfRows: pageSize
    });

    matches.push(...page.items.filter((item) => item.gsteukgiCd === options.specialtyCode));

    const loadedCount = pageNo * pageSize;
    if (loadedCount >= page.totalCount || page.items.length === 0) {
      break;
    }
  }

  return matches;
}
