import type { MilitarySpecialty, MmaRawItem } from "@military-guide/shared";

export function mapMilitarySpecialty(row: MmaRawItem): MilitarySpecialty {
  return {
    specialtyCode: required(row.gsteukgiCd, "gsteukgiCd"),
    specialtyName: row.gsteukgiNm,
    branchCode: required(row.gunGbcd, "gunGbcd"),
    branchName: row.gunGbnm,
    categoryCode: row.mjbgteukgiCd ?? row.mjgbCd,
    categoryName: row.mjbgteukgiNm ?? row.mjgubNm,
    requirementItemName: row.gjhangmokNm,
    minValue: row.cjgijunVl,
    maxValue: row.cggijunVl,
    recruitYear: required(row.mojipYy, "mojipYy"),
    recruitRound: required(row.mojipTms, "mojipTms"),
    scheduleId: required(row.mjiljeongNo, "mjiljeongNo"),
    applicationStartAt: row.jeopsuSjdtm,
    applicationEndAt: row.jeopsuJrdtm
  };
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Missing required specialty field: ${field}`);
  }

  return value;
}
