import { Router } from "express";
import type { MmaRawItem } from "@military-guide/shared";
import { MmaClient } from "../mma/mma.client";
import { readPositiveNumber } from "../mma/page-query";
import { mapEligibilityInfo } from "./eligibility.mapper";

const mmaClient = new MmaClient();

export const eligibilityRouter = Router();

eligibilityRouter.get("/", async (req, res, next) => {
  try {
    const page = await mmaClient.fetchPage({
      resource: "eligibility",
      pageNo: readPositiveNumber(req.query.pageNo, 1),
      numOfRows: readPositiveNumber(req.query.numOfRows, 20)
    });

    res.json({
      items: page.items.map(mapEligibilityInfo),
      pageNo: page.pageNo,
      numOfRows: page.numOfRows,
      totalCount: page.totalCount
    });
  } catch (error) {
    next(error);
  }
});

eligibilityRouter.get("/search", async (req, res, next) => {
  try {
    const query = normalize(readString(req.query.q));
    const maxPages = readPositiveNumber(req.query.maxPages, 10);
    const pageSize = readPositiveNumber(req.query.numOfRows, 1000);
    const limit = readPositiveNumber(req.query.limit, 80);
    const items = [];

    for (let pageNo = 1; pageNo <= maxPages; pageNo += 1) {
      const page = await mmaClient.fetchPage({
        resource: "eligibility",
        pageNo,
        numOfRows: pageSize
      });

      for (const row of page.items) {
        if (!query || matchesEligibility(row, query)) {
          items.push(mapEligibilityInfo(row));
        }

        if (items.length >= limit) {
          res.json({
            items,
            totalCount: items.length
          });
          return;
        }
      }

      if (pageNo * pageSize >= page.totalCount || page.items.length === 0) {
        break;
      }
    }

    res.json({
      items,
      totalCount: items.length
    });
  } catch (error) {
    next(error);
  }
});

function matchesEligibility(row: MmaRawItem, query: string) {
  return [
    row.gsteukgiCd,
    row.gsteukgiNm,
    row.gtcdNm1,
    row.gtcdNm2,
    row.gubun,
    row.jgmyeonheoDg,
    row.jjganjeopGbcd
  ].some((value) => normalize(value ?? "").includes(query));
}

function readString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}
