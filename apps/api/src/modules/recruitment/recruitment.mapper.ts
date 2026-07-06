import type { MmaRawItem, RecruitmentStatus } from "@military-guide/shared";

export function mapRecruitmentStatus(row: MmaRawItem): RecruitmentStatus {
  return {
    specialtyCode: required(row.gsteukgiCd, "gsteukgiCd"),
    specialtyName: row.gsteukgiNm,
    branchName: row.gunGbnm,
    recruitTypeName: row.mojipGbnm,
    recruitYear: row.mojipYy,
    recruitRound: row.mojipTms,
    selectionQuota: toNumber(row.seonbalPcnt),
    applicantCount: toNumber(row.jeopsuPcnt),
    shortageCount: toNumber(row.extremes),
    competitionRate: toNumber(row.rate),
    applicationStartAt: row.jeopsuSjdtm,
    applicationEndAt: row.jeopsuJrdtm,
    enlistStartMonth: row.iyyjsijakYm,
    enlistEndMonth: row.iyyjjongryoYm,
    enlistDate: row.ipyeongDe
  };
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Missing required recruitment field: ${field}`);
  }

  return value;
}

function toNumber(value?: string): number | undefined {
  if (!value || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
