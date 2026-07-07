import type {
  MilitarySpecialty,
  RecommendationInput,
  RecommendationResult,
  SelectionScoreRule
} from "@military-guide/shared";
import { readCachedScores, readCachedScoresForSpecialties } from "../cache/cache.repository";
import {
  certificateMatchesCandidateText,
  findMatchingCertificateProfiles,
  type CertificateProfile
} from "./certificate-profile";

type CertificateScoreResult = {
  score: number;
  reasons: string[];
  unrelatedCertificates: string[];
};

export async function scoreRecommendations(
  input: RecommendationInput,
  candidates: MilitarySpecialty[]
): Promise<RecommendationResult[]> {
  const results: RecommendationResult[] = [];
  const filteredCandidates = candidates.filter((item) => matchesSpecificInput(input, item));
  const scoreRuleMap = await readCachedScoresForSpecialties(
    unique(filteredCandidates.map((candidate) => candidate.specialtyCode))
  );

  for (const candidate of filteredCandidates) {
    results.push(await scoreCandidate(input, candidate, scoreRuleMap));
  }

  return results
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);
}

async function scoreCandidate(
  input: RecommendationInput,
  candidate: MilitarySpecialty,
  scoreRuleMap: Map<string, SelectionScoreRule[]> | null
): Promise<RecommendationResult> {
  const reasons: string[] = [];
  const missingConditions: string[] = [];
  let score = 0;

  if (input.desiredBranch && candidate.branchName === input.desiredBranch) {
    score += 20;
    reasons.push("희망 군 일치");
  } else if (input.desiredBranch) {
    missingConditions.push("희망 군 불일치");
  }

  if (matchesAny(candidate, input.interests)) {
    score += 20;
    reasons.push("관심 분야와 특기 정보 일치");
  } else if (input.interests.length) {
    missingConditions.push("관심 분야 일치 근거 부족");
  }

  if (input.major && matchesText(candidate, input.major)) {
    score += 20;
    reasons.push("전공 키워드 일치");
  } else if (input.major) {
    missingConditions.push("전공 일치 근거 부족");
  }

  const candidateText = getCandidateText(candidate);
  const certificateResult = await scoreCertificateSelectionRules(
    input.certificates,
    candidate,
    candidateText,
    scoreRuleMap
  );

  if (certificateResult.score > 0) {
    score += certificateResult.score;
    reasons.push(
      `선발배점 기준 자격/면허 ${certificateResult.score}점: ${certificateResult.reasons.join(", ")}`
    );
  } else if (input.certificates.length) {
    missingConditions.push("자격/면허 선발배점 0점");
  }

  if (certificateResult.unrelatedCertificates.length) {
    missingConditions.push(
      `보직 관련 없는 자격증 0점: ${certificateResult.unrelatedCertificates.join(", ")}`
    );
  }

  if (input.supportFlags.length) {
    score += Math.min(input.supportFlags.length * 3, 12);
    reasons.push(`해당자/증빙 ${input.supportFlags.length}개 체크`);
  }

  if (input.physicalGrade && input.physicalGrade <= 3) {
    score += 10;
    reasons.push("신체등급 기본 조건 충족 가능");
  } else if (input.physicalGrade) {
    missingConditions.push("신체조건 별도 확인 필요");
  }

  if (candidate.applicationStartAt || candidate.applicationEndAt) {
    score += 10;
    reasons.push("모집 일정 정보 있음");
  } else {
    missingConditions.push("현재 모집 여부 확인 필요");
  }

  return {
    specialtyCode: candidate.specialtyCode,
    specialtyName: candidate.specialtyName ?? "이름 없음",
    branchName: candidate.branchName ?? "군별 미상",
    score,
    status: score >= 70 ? "eligible" : score >= 40 ? "partial" : "ineligible",
    reasons,
    missingConditions
  };
}

async function scoreCertificateSelectionRules(
  certificates: string[],
  candidate: MilitarySpecialty,
  candidateText: string,
  scoreRuleMap: Map<string, SelectionScoreRule[]> | null
): Promise<CertificateScoreResult> {
  if (!certificates.length) {
    return {
      score: 0,
      reasons: [],
      unrelatedCertificates: []
    };
  }

  const matchingProfiles = findMatchingCertificateProfiles(certificates, candidateText);
  const matchingNames = new Set(matchingProfiles.map((profile) => profile.original));
  const unrelatedCertificates = certificates.filter((certificate) => !matchingNames.has(certificate));

  if (!matchingProfiles.length) {
    return {
      score: 0,
      reasons: [],
      unrelatedCertificates
    };
  }

  const scoreRules = await readCandidateScoreRules(candidate, scoreRuleMap);
  const certificateRules = scoreRules.filter(isCertificateScoreRule);
  const scoredProfiles = matchingProfiles
    .map((profile) => {
      const rule = findBestCertificateRule(profile, certificateRules);
      const score = readRuleScore(rule);

      return {
        profile,
        rule,
        score
      };
    })
    .filter((item) => item.rule && item.score > 0);

  const scoredNames = new Set(scoredProfiles.map((item) => item.profile.original));
  const noScoreNames = matchingProfiles
    .filter((profile) => !scoredNames.has(profile.original))
    .map((profile) => profile.original);

  if (!scoredProfiles.length) {
    return {
      score: 0,
      reasons: [],
      unrelatedCertificates: unique([...unrelatedCertificates, ...noScoreNames])
    };
  }

  const bestScore = Math.max(...scoredProfiles.map((item) => item.score));
  const reasons = scoredProfiles.map(({ profile, rule, score }) => {
    const gradeName = rule?.scoreDetailName ?? rule?.scoreGradeName ?? profile.grade ?? "자격/면허";
    return `${profile.original}(${gradeName} ${score}점)`;
  });

  return {
    score: bestScore,
    reasons,
    unrelatedCertificates: unique([...unrelatedCertificates, ...noScoreNames])
  };
}

async function readCandidateScoreRules(
  candidate: MilitarySpecialty,
  scoreRuleMap: Map<string, SelectionScoreRule[]> | null
): Promise<SelectionScoreRule[]> {
  const cachedScores = scoreRuleMap?.get(candidate.specialtyCode);

  if (cachedScores?.length) {
    const scheduledScores = cachedScores.filter((rule) => rule.scheduleId === candidate.scheduleId);
    return scheduledScores.length ? scheduledScores : cachedScores;
  }

  if (scoreRuleMap) {
    return [];
  }

  const scheduledScores = await readCachedScores(candidate.specialtyCode, candidate.scheduleId);

  if (scheduledScores?.length) {
    return scheduledScores;
  }

  return (await readCachedScores(candidate.specialtyCode)) ?? [];
}

function isCertificateScoreRule(rule: SelectionScoreRule): boolean {
  const groupName = normalize(rule.scoreGroupName ?? "");

  return (
    groupName.includes("자격") ||
    groupName.includes("면허") ||
    groupName.includes("운전면허")
  );
}

function findBestCertificateRule(
  profile: CertificateProfile,
  rules: SelectionScoreRule[]
): SelectionScoreRule | undefined {
  const grade = profile.grade ? normalize(profile.grade) : "";

  if (grade) {
    const gradeMatches = rules.filter((rule) => {
      return [
        rule.scoreDetailName,
        rule.scoreGradeName
      ].some((value) => normalize(value ?? "").includes(grade));
    });

    return pickHighestScoreRule(gradeMatches);
  }

  return pickHighestScoreRule(
    rules.filter((rule) => {
      const detail = normalize(`${rule.scoreDetailName ?? ""} ${rule.scoreGradeName ?? ""}`);
      return profile.keywords.some((keyword) => keyword && detail.includes(normalize(keyword)));
    })
  );
}

function pickHighestScoreRule(rules: SelectionScoreRule[]): SelectionScoreRule | undefined {
  return rules
    .filter((rule) => readRuleScore(rule) > 0)
    .sort((left, right) => readRuleScore(right) - readRuleScore(left))[0];
}

function readRuleScore(rule: SelectionScoreRule | undefined): number {
  if (!rule) {
    return 0;
  }

  return Math.max(rule.directScore ?? 0, rule.indirectScore ?? 0);
}

function matchesAny(candidate: MilitarySpecialty, keywords: string[]): boolean {
  return keywords.some((keyword) => matchesText(candidate, keyword));
}

function matchesText(candidate: MilitarySpecialty, keyword: string): boolean {
  return normalize(getCandidateText(candidate)).includes(normalize(keyword));
}

function getCandidateText(candidate: MilitarySpecialty): string {
  return [
    candidate.specialtyCode,
    candidate.specialtyName,
    candidate.branchName,
    candidate.categoryName,
    candidate.requirementItemName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesSpecificInput(input: RecommendationInput, candidate: MilitarySpecialty): boolean {
  const hasSpecificInput =
    input.certificates.length > 0 ||
    input.interests.length > 0 ||
    Boolean(input.major);

  if (!hasSpecificInput) {
    return true;
  }

  const candidateText = getCandidateText(candidate);

  return (
    matchesAny(candidate, input.interests) ||
    (input.major ? matchesText(candidate, input.major) : false) ||
    certificateMatchesCandidateText(input.certificates, candidateText)
  );
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}
