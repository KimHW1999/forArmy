import { Router } from "express";
import type {
  MmaApiPage,
  MilitarySpecialty,
  RecruitmentStatus,
  RequiredDocument,
  SelectionScoreRule,
  SpecialtyDetail
} from "@military-guide/shared";
import {
  cacheDocuments,
  cacheRecruitmentStatuses,
  cacheScores,
  cacheSpecialties,
  dedupeSpecialtyList,
  readCachedDocuments,
  readCachedRecruitmentStatuses,
  readCachedScores,
  readCachedSpecialties,
  readCachedSpecialty
} from "../cache/cache.repository";
import { mapRequiredDocument } from "../documents/document.mapper";
import { explainSpecialty } from "../explanations/specialty-explanation.service";
import { MmaClient } from "../mma/mma.client";
import { readPositiveNumber } from "../mma/page-query";
import { scanBySpecialtyCode } from "../mma/mma-scanner";
import { mapRecruitmentStatus } from "../recruitment/recruitment.mapper";
import { mapSelectionScoreRule } from "../scores/score.mapper";
import { mapMilitarySpecialty } from "./specialty.mapper";
import { searchSpecialties } from "./specialty-search";

const mmaClient = new MmaClient();

export const specialtyRouter = Router();

specialtyRouter.get("/", async (req, res, next) => {
  try {
    const pageNo = readPositiveNumber(req.query.pageNo, 1);
    const numOfRows = readPositiveNumber(req.query.numOfRows, 20);
    const cached = await readCachedSpecialties({ limit: Number.MAX_SAFE_INTEGER });

    if (cached?.length) {
      const start = (pageNo - 1) * numOfRows;
      const items = cached.slice(start, start + numOfRows);

      res.json({
        items,
        pageNo,
        numOfRows,
        totalCount: cached.length
      });
      return;
    }

    const page = await mmaClient.fetchPage({
      resource: "specialties",
      pageNo,
      numOfRows
    });
    const items = dedupeSpecialtyList(page.items.map(mapMilitarySpecialty));

    await cacheSpecialties(items);

    res.json(toPage(page, items));
  } catch (error) {
    next(error);
  }
});

specialtyRouter.get("/search", async (req, res, next) => {
  try {
    const items = await searchSpecialties(mmaClient, {
      query: readString(req.query.q),
      maxPages: readPositiveNumber(req.query.maxPages, 12),
      limit: readPositiveNumber(req.query.limit, 80)
    });

    res.json({
      items,
      totalCount: items.length
    });
  } catch (error) {
    next(error);
  }
});

specialtyRouter.get("/:code", async (req, res, next) => {
  try {
    const detail = await findSpecialtyDetail(req.params.code, {
      maxPages: readPositiveNumber(req.query.maxPages, 20),
      documentMaxPages: readPositiveNumber(req.query.documentMaxPages, 5),
      scoreMaxPages: readPositiveNumber(req.query.scoreMaxPages, 5),
      recruitmentMaxPages: readPositiveNumber(req.query.recruitmentMaxPages, 10)
    });

    res.json(detail);
  } catch (error) {
    next(error);
  }
});

specialtyRouter.post("/:code/explanation", async (req, res, next) => {
  try {
    const detail = await findSpecialtyDetail(req.params.code, {
      maxPages: readPositiveNumber(req.query.maxPages, 20),
      documentMaxPages: readPositiveNumber(req.query.documentMaxPages, 5),
      scoreMaxPages: readPositiveNumber(req.query.scoreMaxPages, 5),
      recruitmentMaxPages: readPositiveNumber(req.query.recruitmentMaxPages, 10)
    });
    const explanation = await explainSpecialty(detail);

    res.json({
      explanation
    });
  } catch (error) {
    next(error);
  }
});

specialtyRouter.get("/:code/documents", async (req, res, next) => {
  try {
    const documents = await findDocuments(
      req.params.code,
      readPositiveNumber(req.query.maxPages, 5)
    );

    res.json({
      items: documents,
      totalCount: documents.length
    });
  } catch (error) {
    next(error);
  }
});

specialtyRouter.get("/:code/scores", async (req, res, next) => {
  try {
    const scores = await findScores(req.params.code, readPositiveNumber(req.query.maxPages, 5));

    res.json({
      items: scores,
      totalCount: scores.length
    });
  } catch (error) {
    next(error);
  }
});

async function findSpecialty(
  specialtyCode: string,
  maxPages: number
): Promise<MilitarySpecialty | undefined> {
  const cached = await readCachedSpecialty(specialtyCode);

  if (cached) {
    return cached;
  }

  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "specialties",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  const items = matches.map(mapMilitarySpecialty);
  await cacheSpecialties(items);

  return items[0];
}

async function findSpecialtyDetail(
  specialtyCode: string,
  options: {
    maxPages: number;
    documentMaxPages: number;
    scoreMaxPages: number;
    recruitmentMaxPages: number;
  }
): Promise<SpecialtyDetail> {
  const specialty = await findSpecialty(specialtyCode, options.maxPages);

  if (!specialty) {
    throw new SpecialtyNotFoundError();
  }

  const [documents, scores, recruitmentStatuses] = await Promise.all([
    findDocuments(specialtyCode, options.documentMaxPages),
    findScores(specialtyCode, options.scoreMaxPages, specialty.scheduleId),
    findRecruitmentStatuses(specialtyCode, options.recruitmentMaxPages)
  ]);

  return {
    specialty,
    documents,
    scores,
    recruitmentStatuses
  };
}

class SpecialtyNotFoundError extends Error {
  statusCode = 404;

  constructor() {
    super("Specialty not found");
  }
}

function readString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

async function findDocuments(
  specialtyCode: string,
  maxPages: number
): Promise<RequiredDocument[]> {
  const cached = await readCachedDocuments(specialtyCode);

  if (cached) {
    return cached;
  }

  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "documents",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  const items = matches.map(mapRequiredDocument);
  await cacheDocuments(specialtyCode, items);

  return items;
}

async function findScores(
  specialtyCode: string,
  maxPages: number,
  scheduleId?: string
): Promise<SelectionScoreRule[]> {
  const cached = await readCachedScores(specialtyCode, scheduleId);

  if (cached) {
    return cached;
  }

  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "scores",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  const items = matches.map(mapSelectionScoreRule);
  await cacheScores(specialtyCode, items);

  return items;
}

async function findRecruitmentStatuses(
  specialtyCode: string,
  maxPages: number
): Promise<RecruitmentStatus[]> {
  const cached = await readCachedRecruitmentStatuses(specialtyCode);

  if (cached) {
    return cached;
  }

  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "recruitmentStatus",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  const items = matches.map(mapRecruitmentStatus);
  await cacheRecruitmentStatuses(specialtyCode, items);

  return items;
}

function toPage<T>(
  source: Pick<MmaApiPage<unknown>, "pageNo" | "numOfRows" | "totalCount">,
  items: T[]
): MmaApiPage<T> {
  return {
    items,
    pageNo: source.pageNo,
    numOfRows: source.numOfRows,
    totalCount: source.totalCount
  };
}
