import { XMLParser } from "fast-xml-parser";
import type { MmaApiPage, MmaRawItem } from "@military-guide/shared";
import type { MmaHeader } from "./mma.types";

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true
});

type ParsedResponse = {
  response?: {
    header?: Partial<MmaHeader>;
    body?: {
      items?: {
        item?: MmaRawItem | MmaRawItem[];
      };
      pageNo?: string;
      numOfRows?: string;
      totalCount?: string;
    };
  };
};

export function parseMmaPage(xml: string): MmaApiPage<MmaRawItem> & { header: MmaHeader } {
  const parsed = parser.parse(xml) as ParsedResponse;
  const header = parsed.response?.header;
  const body = parsed.response?.body;

  if (!header?.resultCode) {
    throw new Error("Invalid MMA API response: missing resultCode");
  }

  const rawItems = body?.items?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return {
    header: {
      resultCode: header.resultCode,
      resultMsg: header.resultMsg ?? ""
    },
    items,
    pageNo: toNumber(body?.pageNo, 1),
    numOfRows: toNumber(body?.numOfRows, items.length),
    totalCount: toNumber(body?.totalCount, items.length)
  };
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}
