import type { MmaRawItem, SelectionScoreRule } from "@military-guide/shared";

export function mapSelectionScoreRule(row: MmaRawItem): SelectionScoreRule {
  return {
    specialtyCode: required(row.gsteukgiCd, "gsteukgiCd"),
    specialtyName: row.gsteukgiNm,
    branchCode: required(row.gunGbcd, "gunGbcd"),
    branchName: row.gunGbnm,
    scoreGroupCode: required(row.bjgijunGbcd, "bjgijunGbcd"),
    scoreGroupName: row.bjgijunGbnm,
    scoreGradeCode: row.bjgijunDgcd,
    scoreGradeName: row.bjgijunDgnm,
    scoreDetailCode: required(row.bjgjsangseCd, "bjgjsangseCd"),
    scoreDetailName: row.bjgjsangseNm,
    minValue: row.cjgijunVl,
    maxValue: row.cggijunVl,
    directScore: toNumber(row.jjgwanryeonScor),
    indirectScore: toNumber(row.gjgwanryeonScor),
    scheduleId: required(row.mjiljeongNo, "mjiljeongNo"),
    recruitYear: required(row.mojipYy, "mojipYy"),
    recruitRound: required(row.mojipTms, "mojipTms")
  };
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Missing required score field: ${field}`);
  }

  return value;
}

function toNumber(value?: string): number | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
