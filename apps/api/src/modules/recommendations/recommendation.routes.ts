import { Router } from "express";
import type { RecommendationInput } from "@military-guide/shared";
import { MmaClient } from "../mma/mma.client";
import { searchSpecialties } from "../specialties/specialty-search";
import { expandCertificateKeywords } from "./certificate-profile";
import { scoreRecommendations } from "./recommendation.service";

const mmaClient = new MmaClient();

export const recommendationRouter = Router();

recommendationRouter.post("/", async (req, res, next) => {
  try {
    const input = normalizeInput(req.body);
    const candidates = await findRecommendationCandidates(input);
    const items = await scoreRecommendations(input, candidates);

    res.json({
      items,
      totalCount: items.length
    });
  } catch (error) {
    next(error);
  }
});

function normalizeInput(body: unknown): RecommendationInput {
  const source = typeof body === "object" && body ? (body as Record<string, unknown>) : {};

  return {
    desiredBranch: readString(source.desiredBranch),
    major: readString(source.major),
    certificates: readStringArray(source.certificates),
    supportFlags: readStringArray(source.supportFlags),
    physicalGrade: readNumber(source.physicalGrade),
    interests: readStringArray(source.interests),
    desiredEnlistDate: readString(source.desiredEnlistDate),
    serviceType: readServiceType(source.serviceType)
  };
}

async function findRecommendationCandidates(input: RecommendationInput) {
  const certificateKeywords = expandCertificateKeywords(input.certificates);
  const keywords = [
    ...certificateKeywords,
    ...input.certificates,
    ...input.interests,
    input.major
  ].filter(
    (keyword): keyword is string => Boolean(keyword)
  );
  const byKey = new Map<string, Awaited<ReturnType<typeof trySearchSpecialties>>[number]>();

  for (const keyword of keywords) {
    const candidates = await trySearchSpecialties(keyword);

    for (const candidate of candidates) {
      byKey.set(`${candidate.branchCode}:${candidate.specialtyCode}`, candidate);
    }
  }

  if (byKey.size) {
    return [...byKey.values()];
  }

  if (keywords.length) {
    return [];
  }

  return searchSpecialties(mmaClient, {
    maxPages: 3,
    limit: 120
  });
}

async function trySearchSpecialties(keyword: string) {
  try {
    return await searchSpecialties(mmaClient, {
      query: keyword,
      maxPages: 12,
      limit: 120
    });
  } catch {
    return [];
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function readNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readServiceType(value: unknown): RecommendationInput["serviceType"] {
  return value === "active" || value === "social" ? value : "any";
}
