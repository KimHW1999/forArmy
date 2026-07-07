import type {
  MilitarySpecialty,
  MmaApiPage,
  RecommendationInput,
  RecommendationResult,
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

export async function searchSpecialties(query = ""): Promise<{
  items: MilitarySpecialty[];
  totalCount: number;
}> {
  const params = new URLSearchParams({
    q: query,
    maxPages: "12",
    limit: "100"
  });

  return getJson(`/specialties/search?${params.toString()}`);
}

export async function fetchSpecialtyDetail(
  specialtyCode: string
): Promise<SpecialtyDetail> {
  const params = new URLSearchParams({
    maxPages: "12",
    documentMaxPages: "5",
    scoreMaxPages: "5",
    recruitmentMaxPages: "10"
  });

  return getJson(`/specialties/${encodeURIComponent(specialtyCode)}?${params.toString()}`);
}

export async function fetchRecommendations(input: RecommendationInput): Promise<{
  items: RecommendationResult[];
  totalCount: number;
}> {
  return postJson("/recommendations", input);
}

export async function fetchSpecialtyExplanation(specialtyCode: string): Promise<{
  explanation: string;
}> {
  return postJson(`/specialties/${encodeURIComponent(specialtyCode)}/explanation`, {});
}

export async function fetchRecruitmentStatus(): Promise<MmaApiPage<RecruitmentStatus>> {
  return getJson("/recruitment/status?pageNo=1&numOfRows=8");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    const message = await readErrorResponse(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const message = await readErrorResponse(response);
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function readErrorResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return "";
  }

  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === "object" && body !== null && "message" in body) {
      const message = (body as { message?: unknown }).message;
      return typeof message === "string" ? message : text;
    }
  } catch {
    return text;
  }

  return text;
}

export type SpecialtySections = {
  documents: RequiredDocument[];
  scores: SelectionScoreRule[];
  recruitmentStatuses: RecruitmentStatus[];
};
