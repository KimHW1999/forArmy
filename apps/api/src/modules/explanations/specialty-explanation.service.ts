import type { SpecialtyDetail } from "@military-guide/shared";
import { env } from "../../config/env";

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

export async function explainSpecialty(detail: SpecialtyDetail): Promise<string> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is required to generate GPT explanations");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.openaiModel,
      max_output_tokens: 700,
      input: [
        {
          role: "system",
          content:
            "너는 한국 병역 모집병 특기를 설명하는 상담 도우미다. 제공된 데이터만 근거로 설명하고, 확실하지 않은 내용은 추정이라고 밝혀라. 과장하지 말고 지원자가 이해하기 쉬운 한국어로 답하라."
        },
        {
          role: "user",
          content: buildExplanationPrompt(detail)
        }
      ]
    })
  });

  const body = (await response.json().catch(() => null)) as OpenAiResponse | null;

  if (!response.ok) {
    throw new Error(readOpenAiError(body) || `OpenAI request failed: ${response.status}`);
  }

  const text = readOpenAiText(body);

  if (!text) {
    throw new Error("OpenAI response did not include explanation text");
  }

  return text;
}

function buildExplanationPrompt(detail: SpecialtyDetail) {
  const { specialty, documents, scores, recruitmentStatuses } = detail;
  const scorePreview = scores.slice(0, 12).map((score) => ({
    group: score.scoreGroupName ?? score.scoreGroupCode,
    detail: score.scoreDetailName ?? score.scoreGradeName ?? "-",
    directScore: score.directScore,
    indirectScore: score.indirectScore
  }));
  const documentPreview = documents.slice(0, 12).map((document) => ({
    name: document.documentName,
    required: document.isRequired
  }));
  const recruitmentPreview = recruitmentStatuses.slice(0, 4).map((status) => ({
    year: status.recruitYear,
    round: status.recruitRound,
    quota: status.selectionQuota,
    applicants: status.applicantCount,
    rate: status.competitionRate,
    period: [status.applicationStartAt, status.applicationEndAt].filter(Boolean).join(" ~ ")
  }));

  return [
    "아래 군사특기가 어떤 보직인지 설명해줘.",
    "",
    `특기명: ${specialty.specialtyName ?? "이름 없음"}`,
    `특기코드: ${specialty.specialtyCode}`,
    `군: ${specialty.branchName ?? "미상"}`,
    `모집분야: ${specialty.categoryName ?? "미상"}`,
    `조건 항목: ${specialty.requirementItemName ?? "제공 없음"}`,
    `접수기간: ${specialty.applicationStartAt ?? "미상"} ~ ${specialty.applicationEndAt ?? "미상"}`,
    "",
    `구비서류 예시: ${JSON.stringify(documentPreview, null, 2)}`,
    `배점기준 예시: ${JSON.stringify(scorePreview, null, 2)}`,
    `접수현황 예시: ${JSON.stringify(recruitmentPreview, null, 2)}`,
    "",
    "응답 형식:",
    "1. 한줄 요약",
    "2. 하는 일",
    "3. 잘 맞는 사람",
    "4. 준비 포인트",
    "5. 주의할 점",
    "",
    "병무청 API에 실제 임무 설명 본문이 없으면, 특기명/모집분야/조건/배점기준으로부터 추정한 설명이라고 밝혀줘."
  ].join("\n");
}

function readOpenAiText(body: OpenAiResponse | null) {
  if (!body) {
    return "";
  }

  if (typeof body.output_text === "string") {
    return body.output_text.trim();
  }

  return (
    body.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

function readOpenAiError(body: unknown) {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return "";
  }

  const error = (body as { error?: { message?: unknown } }).error;
  return typeof error?.message === "string" ? error.message : "";
}
