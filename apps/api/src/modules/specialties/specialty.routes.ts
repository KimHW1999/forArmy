import { Router } from "express";
import type {
  MmaApiPage,
  MilitarySpecialty,
  RecruitmentStatus,
  RequiredDocument,
  SelectionScoreRule,
  SpecialtyDetail
} from "@military-guide/shared";
import { mapRequiredDocument } from "../documents/document.mapper";
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
    const page = await mmaClient.fetchPage({
      resource: "specialties",
      pageNo: readPositiveNumber(req.query.pageNo, 1),
      numOfRows: readPositiveNumber(req.query.numOfRows, 20)
    });

    res.json(toPage(page, page.items.map(mapMilitarySpecialty)));
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
    const specialty = await findSpecialty(req.params.code, readPositiveNumber(req.query.maxPages, 20));

    if (!specialty) {
      res.status(404).json({
        message: "Specialty not found"
      });
      return;
    }

    const [documents, scores, recruitmentStatuses] = await Promise.all([
      findDocuments(req.params.code, readPositiveNumber(req.query.documentMaxPages, 5)),
      findScores(req.params.code, readPositiveNumber(req.query.scoreMaxPages, 5)),
      findRecruitmentStatuses(req.params.code, readPositiveNumber(req.query.recruitmentMaxPages, 10))
    ]);

    const detail: SpecialtyDetail = {
      specialty,
      documents,
      scores,
      recruitmentStatuses
    };

    res.json(detail);
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
  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "specialties",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  return matches[0] ? mapMilitarySpecialty(matches[0]) : undefined;
}

function readString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

async function findDocuments(
  specialtyCode: string,
  maxPages: number
): Promise<RequiredDocument[]> {
  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "documents",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  return matches.map(mapRequiredDocument);
}

async function findScores(
  specialtyCode: string,
  maxPages: number
): Promise<SelectionScoreRule[]> {
  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "scores",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  return matches.map(mapSelectionScoreRule);
}

async function findRecruitmentStatuses(
  specialtyCode: string,
  maxPages: number
): Promise<RecruitmentStatus[]> {
  const matches = await scanBySpecialtyCode(mmaClient, {
    resource: "recruitmentStatus",
    specialtyCode,
    pageSize: 1000,
    maxPages
  });

  return matches.map(mapRecruitmentStatus);
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
