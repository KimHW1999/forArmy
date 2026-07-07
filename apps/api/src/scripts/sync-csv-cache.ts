import type { MmaRawItem, MmaResource } from "@military-guide/shared";
import { assertEnv } from "../config/env";
import {
  replaceDocuments,
  replaceRecruitmentStatuses,
  replaceScores,
  replaceSpecialties
} from "../modules/cache/cache.repository";
import { mapRequiredDocument } from "../modules/documents/document.mapper";
import { MmaClient } from "../modules/mma/mma.client";
import { mapRecruitmentStatus } from "../modules/recruitment/recruitment.mapper";
import { mapSelectionScoreRule } from "../modules/scores/score.mapper";
import { mapMilitarySpecialty } from "../modules/specialties/specialty.mapper";

const PAGE_SIZE = Number(process.env.MMA_SYNC_PAGE_SIZE ?? 10000);
const RESOURCE_ORDER = ["specialties", "documents", "scores", "recruitmentStatus"] as const;
type SyncResource = (typeof RESOURCE_ORDER)[number];

assertEnv();

const client = new MmaClient();

await syncCsvCache();

async function syncCsvCache() {
  console.log("CSV cache sync started");
  console.log(`Page size: ${PAGE_SIZE}`);

  const selectedResources = readSelectedResources();
  const totals: Record<string, number> = {};

  for (const resource of selectedResources) {
    const rows = await fetchAllRows(resource);
    totals[resource] = rows.length;

    if (resource === "specialties") {
      await replaceSpecialties(rows.map(mapMilitarySpecialty));
    }

    if (resource === "documents") {
      await replaceDocuments(rows.map(mapRequiredDocument));
    }

    if (resource === "scores") {
      await replaceScores(rows.map(mapSelectionScoreRule));
    }

    if (resource === "recruitmentStatus") {
      await replaceRecruitmentStatuses(rows.map(mapRecruitmentStatus));
    }

    console.log(`[${resource}] saved ${rows.length} rows to CSV`);
  }

  console.log("CSV cache sync completed");
  for (const resource of selectedResources) {
    console.log(`- ${resource}: ${totals[resource] ?? 0}`);
  }
}

function readSelectedResources(): SyncResource[] {
  const requested = process.argv.slice(2);

  if (!requested.length || requested.includes("all")) {
    return [...RESOURCE_ORDER];
  }

  return RESOURCE_ORDER.filter((resource) => requested.includes(resource));
}

async function fetchAllRows(resource: SyncResource): Promise<MmaRawItem[]> {
  const rows: MmaRawItem[] = [];

  for (let pageNo = 1; ; pageNo += 1) {
    const page = await client.fetchPage({
      resource,
      pageNo,
      numOfRows: PAGE_SIZE
    });

    rows.push(...page.items);
    console.log(
      `[${resource}] page ${pageNo}: ${rows.length}/${page.totalCount} rows loaded`
    );

    if (page.items.length === 0 || pageNo * PAGE_SIZE >= page.totalCount) {
      break;
    }
  }

  return rows;
}
