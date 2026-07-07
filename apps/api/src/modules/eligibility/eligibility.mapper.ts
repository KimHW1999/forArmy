import type { EligibilityInfo, MmaRawItem } from "@military-guide/shared";

export function mapEligibilityInfo(row: MmaRawItem): EligibilityInfo {
  return {
    specialtyCode: required(row.gsteukgiCd, "gsteukgiCd"),
    specialtyName: row.gsteukgiNm,
    branchName: row.gtcdNm1,
    requirementName: row.gtcdNm2,
    requirementType: row.gubun,
    licenseGrade: row.jgmyeonheoDg,
    relationType: row.jjganjeopGbcd,
    createdAt: row.ccdatabalsaengDtm,
    updatedAt: row.cjdatabyeongyeongDtm
  };
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Missing required eligibility field: ${field}`);
  }

  return value;
}
