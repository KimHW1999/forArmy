import type {
  MilitarySpecialty,
  RecommendationInput,
  RecommendationResult
} from "@military-guide/shared";

export function scoreRecommendations(
  input: RecommendationInput,
  candidates: MilitarySpecialty[]
): RecommendationResult[] {
  return candidates
    .map((candidate) => scoreCandidate(input, candidate))
    .sort((left, right) => right.score - left.score)
    .slice(0, 20);
}

function scoreCandidate(
  input: RecommendationInput,
  candidate: MilitarySpecialty
): RecommendationResult {
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

  if (matchesAny(candidate, input.certificates)) {
    score += 20;
    reasons.push("자격/면허 키워드 일치");
  } else if (input.certificates.length) {
    missingConditions.push("자격/면허 일치 근거 부족");
  }

  if (input.physicalGrade && input.physicalGrade <= 3) {
    score += 10;
    reasons.push("신체등급 기본 조건 충족 가능");
  } else if (input.physicalGrade) {
    missingConditions.push("신체조건 세부 확인 필요");
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

function matchesAny(candidate: MilitarySpecialty, keywords: string[]): boolean {
  return keywords.some((keyword) => matchesText(candidate, keyword));
}

function matchesText(candidate: MilitarySpecialty, keyword: string): boolean {
  const target = [
    candidate.specialtyCode,
    candidate.specialtyName,
    candidate.branchName,
    candidate.categoryName,
    candidate.requirementItemName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return target.includes(keyword.trim().toLowerCase());
}
