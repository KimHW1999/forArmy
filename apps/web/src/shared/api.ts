import type {
  MilitarySpecialty,
  MmaApiPage,
  RecruitmentStatus,
  RequiredDocument,
  SelectionScoreRule,
  SpecialtyDetail
} from "@military-guide/shared";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export async function fetchSpecialties(
  pageNo = 1,
  numOfRows = 20
): Promise<MmaApiPage<MilitarySpecialty>> {
  return getJson(`/specialties?pageNo=${pageNo}&numOfRows=${numOfRows}`);
}

export async function fetchSpecialtyDetail(
  specialtyCode: string
): Promise<SpecialtyDetail> {
  const params = new URLSearchParams({
    maxPages: "2",
    documentMaxPages: "5",
    scoreMaxPages: "2",
    recruitmentMaxPages: "10"
  });

  return getJson(`/specialties/${encodeURIComponent(specialtyCode)}?${params.toString()}`);
}

export async function fetchRecruitmentStatus(): Promise<MmaApiPage<RecruitmentStatus>> {
  return getJson("/recruitment/status?pageNo=1&numOfRows=8");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type SpecialtySections = {
  documents: RequiredDocument[];
  scores: SelectionScoreRule[];
  recruitmentStatuses: RecruitmentStatus[];
};
