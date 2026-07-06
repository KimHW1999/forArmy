import type { MmaRawItem, RequiredDocument } from "@military-guide/shared";

export function mapRequiredDocument(row: MmaRawItem): RequiredDocument {
  return {
    specialtyCode: required(row.gsteukgiCd, "gsteukgiCd"),
    specialtyName: row.gsteukgiNm,
    branchCode: required(row.gunGbcd, "gunGbcd"),
    branchName: row.gunGbnm,
    documentCode: required(row.jcseoryuCd, "jcseoryuCd"),
    documentName: row.jcseoryuNm,
    categoryCode: row.mjbgteukgiCd,
    categoryName: row.mjbgteukgiNm ?? row.mjgubun,
    isRequired: row.psjechulYn === "Y"
  };
}

function required(value: string | undefined, field: string): string {
  if (!value) {
    throw new Error(`Missing required document field: ${field}`);
  }

  return value;
}
