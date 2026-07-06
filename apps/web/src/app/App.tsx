import { useEffect, useState } from "react";
import type {
  MilitarySpecialty,
  RecommendationInput,
  RecommendationResult,
  SpecialtyDetail
} from "@military-guide/shared";
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  FileText,
  Info,
  Loader2,
  Search,
  SlidersHorizontal
} from "lucide-react";
import {
  fetchRecommendations,
  fetchSpecialtyDetail,
  searchSpecialties
} from "../shared/api";

type UserConditionInput = {
  desiredBranch: string;
  major: string;
  certificatesText: string;
  physicalGrade: string;
  interestsText: string;
  desiredEnlistDate: string;
  serviceType: "any" | "active" | "social";
};

export function App() {
  const [specialties, setSpecialties] = useState<MilitarySpecialty[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [detail, setDetail] = useState<SpecialtyDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [conditionInput, setConditionInput] = useState<UserConditionInput>({
    desiredBranch: "",
    major: "",
    certificatesText: "",
    physicalGrade: "",
    interestsText: "",
    desiredEnlistDate: "",
    serviceType: "any"
  });
  const [submittedInput, setSubmittedInput] = useState<RecommendationInput | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationResult[]>([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsListLoading(true);
      searchSpecialties(searchTerm)
        .then((response) => {
          setError("");
          setSpecialties(response.items);
          setSelectedCode((current) => current || response.items[0]?.specialtyCode || "");
        })
        .catch((requestError: unknown) => setError(readErrorMessage(requestError)))
        .finally(() => setIsListLoading(false));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedCode) {
      return;
    }

    setIsDetailLoading(true);
    fetchSpecialtyDetail(selectedCode)
      .then((response) => {
        setError("");
        setDetail(response);
      })
      .catch((requestError: unknown) => {
        setError(readErrorMessage(requestError));
        setDetail(null);
      })
      .finally(() => setIsDetailLoading(false));
  }, [selectedCode]);

  function handleConditionSubmit(payload: RecommendationInput) {
    setSubmittedInput(payload);
    setIsRecommendationLoading(true);
    fetchRecommendations(payload)
      .then((response) => {
        setError("");
        setRecommendations(response.items);
      })
      .catch((requestError: unknown) => setError(readErrorMessage(requestError)))
      .finally(() => setIsRecommendationLoading(false));
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">모집병 특기 탐색</p>
          <h1>병역 지원 가이드</h1>
          <p>특기명으로 전체 데이터를 검색하고, 같은 이름의 특기도 모집분야와 코드로 구분합니다.</p>
        </div>
        <label className="search-box">
          <Search aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="예: 신호정보, 조리, 통신, 171.101"
          />
        </label>
      </header>

      {error ? (
        <div className="notice" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <ConditionPanel
        input={conditionInput}
        submittedInput={submittedInput}
        recommendations={recommendations}
        isLoading={isRecommendationLoading}
        onChange={setConditionInput}
        onSubmit={handleConditionSubmit}
      />

      <section className="workspace">
        <aside className="specialty-list" aria-label="군사특기 목록">
          <div className="panel-title">
            <h2>특기 목록</h2>
            <span>{specialties.length}건</span>
          </div>

          {isListLoading ? <Loading label="특기 목록을 검색하는 중" /> : null}

          <div className="list-items">
            {specialties.map((specialty) => (
              <button
                className={specialty.specialtyCode === selectedCode ? "selected" : ""}
                key={`${specialty.branchCode}-${specialty.specialtyCode}`}
                onClick={() => setSelectedCode(specialty.specialtyCode)}
                type="button"
              >
                <strong>{specialty.specialtyName ?? "이름 없음"}</strong>
                <div className="specialty-badges">
                  <span className="branch-badge">{specialty.branchName ?? "군별 미상"}</span>
                  <span className="category-badge">{specialty.categoryName ?? "분류 미상"}</span>
                  <code>{specialty.specialtyCode}</code>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="detail-panel" aria-label="군사특기 상세">
          {isDetailLoading ? <Loading label="상세 정보를 불러오는 중" /> : null}
          {!isDetailLoading && detail ? <SpecialtyDetailView detail={detail} /> : null}
          {!isDetailLoading && !detail ? (
            <div className="empty-state">목록에서 특기를 선택하세요.</div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function ConditionPanel({
  input,
  submittedInput,
  recommendations,
  isLoading,
  onChange,
  onSubmit
}: {
  input: UserConditionInput;
  submittedInput: RecommendationInput | null;
  recommendations: RecommendationResult[];
  isLoading: boolean;
  onChange: (input: UserConditionInput) => void;
  onSubmit: (input: RecommendationInput) => void;
}) {
  const payload = toRecommendationInput(input);

  return (
    <section className="condition-panel" aria-label="사용자 조건 입력">
      <div className="condition-heading">
        <div>
          <span className="tag">6단계</span>
          <h2>내 조건 입력</h2>
          <p>입력한 조건을 바탕으로 특기 후보를 점수화합니다.</p>
        </div>
        <SlidersHorizontal aria-hidden="true" />
      </div>

      <div className="condition-grid">
        <label>
          희망 군
          <select
            value={input.desiredBranch}
            onChange={(event) => onChange({ ...input, desiredBranch: event.target.value })}
          >
            <option value="">전체</option>
            <option value="육군">육군</option>
            <option value="해군">해군</option>
            <option value="공군">공군</option>
            <option value="해병대">해병대</option>
          </select>
        </label>

        <label>
          전공
          <input
            value={input.major}
            onChange={(event) => onChange({ ...input, major: event.target.value })}
            placeholder="예: 컴퓨터공학"
          />
        </label>

        <label>
          신체등급
          <select
            value={input.physicalGrade}
            onChange={(event) => onChange({ ...input, physicalGrade: event.target.value })}
          >
            <option value="">미입력</option>
            <option value="1">1급</option>
            <option value="2">2급</option>
            <option value="3">3급</option>
            <option value="4">4급</option>
            <option value="5">5급 이상</option>
          </select>
        </label>

        <label>
          입영 희망 시기
          <input
            type="month"
            value={input.desiredEnlistDate}
            onChange={(event) => onChange({ ...input, desiredEnlistDate: event.target.value })}
          />
        </label>

        <label>
          복무 구분
          <select
            value={input.serviceType}
            onChange={(event) =>
              onChange({
                ...input,
                serviceType: event.target.value as UserConditionInput["serviceType"]
              })
            }
          >
            <option value="any">전체</option>
            <option value="active">현역 모집병</option>
            <option value="social">사회복무요원</option>
          </select>
        </label>

        <label className="wide-field">
          보유 자격증
          <input
            value={input.certificatesText}
            onChange={(event) => onChange({ ...input, certificatesText: event.target.value })}
            placeholder="예: 정보처리기능사, 운전면허"
          />
        </label>

        <label className="wide-field">
          관심 분야
          <input
            value={input.interestsText}
            onChange={(event) => onChange({ ...input, interestsText: event.target.value })}
            placeholder="예: 신호정보, 통신, 조리"
          />
        </label>
      </div>

      <div className="condition-actions">
        <button type="button" onClick={() => onSubmit(payload)}>
          {isLoading ? "추천 계산 중" : "추천 보기"}
        </button>
        <div>
          <strong>{submittedInput ? "조건 저장됨" : "입력 중"}</strong>
          <span>
            자격증 {payload.certificates.length}개 · 관심 분야 {payload.interests.length}개
          </span>
        </div>
      </div>

      {submittedInput ? (
        <div className="recommendation-preview">
          <h3>추천 결과</h3>
          {isLoading ? <Loading label="추천 특기를 계산하는 중" /> : null}
          {!isLoading && recommendations.length ? (
            <div className="recommendation-list">
              {recommendations.slice(0, 5).map((recommendation) => (
                <div key={`${recommendation.branchName}-${recommendation.specialtyCode}`}>
                  <strong>
                    {recommendation.specialtyName} · {recommendation.branchName}
                  </strong>
                  <span>
                    {recommendation.score}점 · {formatRecommendationStatus(recommendation.status)}
                  </span>
                  <small>{recommendation.reasons.join(", ") || "추가 조건 확인 필요"}</small>
                </div>
              ))}
            </div>
          ) : null}
          {!isLoading && !recommendations.length ? (
            <p className="muted">추천 후보가 없습니다. 관심 분야나 전공 키워드를 더 넓게 입력해보세요.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SpecialtyDetailView({ detail }: { detail: SpecialtyDetail }) {
  const { specialty, documents, scores, recruitmentStatuses } = detail;
  const scorePreview = scores.slice(0, 8);

  return (
    <>
      <div className="detail-heading">
        <div>
          <div className="detail-badges">
            <span className="branch-badge">{specialty.branchName ?? "군별 미상"}</span>
            <span className="category-badge">{specialty.categoryName ?? "분류 미상"}</span>
            <code>{specialty.specialtyCode}</code>
          </div>
          <h2>{specialty.specialtyName ?? "이름 없음"}</h2>
          <p>
            같은 특기명이라도 모집분야와 특기코드가 다르면 선발 기준이 다를 수 있습니다.
          </p>
        </div>
        <div className="schedule">
          <CalendarClock aria-hidden="true" />
          <span>{formatPeriod(specialty.applicationStartAt, specialty.applicationEndAt)}</span>
        </div>
      </div>

      <div className="metric-grid">
        <Metric label="구비서류" value={`${documents.length}개`} icon={<FileText />} />
        <Metric label="배점기준" value={`${scores.length}개`} icon={<ClipboardList />} />
        <Metric label="접수현황" value={`${recruitmentStatuses.length}건`} icon={<CalendarClock />} />
      </div>

      <section className="detail-section">
        <h3>임무 설명</h3>
        <div className="duty-note">
          <Info aria-hidden="true" />
          <p>
            현재 연동한 병무청 OpenAPI에는 특기별 실제 임무 설명 본문이 포함되어 있지 않습니다.
            공식 모집안내 페이지나 별도 자료를 확보한 뒤 요약 데이터로 보강해야 합니다.
          </p>
        </div>
      </section>

      <section className="detail-section">
        <h3>구비서류</h3>
        {documents.length ? (
          <ul className="document-list">
            {documents.map((document) => (
              <li key={`${document.documentCode}-${document.documentName}`}>
                <span>{document.documentName ?? "서류명 없음"}</span>
                <strong>{document.isRequired ? "필수" : "선택"}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">조회 범위 안에 구비서류가 없습니다.</p>
        )}
      </section>

      <section className="detail-section">
        <h3>배점기준</h3>
        {scorePreview.length ? (
          <div className="score-table">
            <div className="table-row table-head">
              <span>항목</span>
              <span>상세</span>
              <span>직접</span>
              <span>간접</span>
            </div>
            {scorePreview.map((score) => (
              <div
                className="table-row"
                key={`${score.scoreGroupCode}-${score.scoreDetailCode}-${score.scoreGradeCode}`}
              >
                <span>{score.scoreGroupName ?? score.scoreGroupCode}</span>
                <span>{score.scoreDetailName ?? score.scoreGradeName ?? "-"}</span>
                <span>{score.directScore ?? "-"}</span>
                <span>{score.indirectScore ?? "-"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">조회 범위 안에 배점기준이 없습니다.</p>
        )}
      </section>

      <section className="detail-section">
        <h3>접수현황</h3>
        {recruitmentStatuses.length ? (
          <div className="status-list">
            {recruitmentStatuses.slice(0, 4).map((status) => (
              <div key={`${status.recruitYear}-${status.recruitRound}`}>
                <strong>
                  {status.recruitYear}년 {status.recruitRound}회차
                </strong>
                <span>
                  모집 {status.selectionQuota ?? "-"}명 · 접수 {status.applicantCount ?? "-"}명 ·
                  경쟁률 {status.competitionRate ?? "-"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">조회 범위 안에 접수현황이 없습니다.</p>
        )}
      </section>
    </>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="loading">
      <Loader2 aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function toRecommendationInput(input: UserConditionInput): RecommendationInput {
  return {
    desiredBranch: input.desiredBranch || undefined,
    major: input.major || undefined,
    certificates: splitList(input.certificatesText),
    physicalGrade: input.physicalGrade ? Number(input.physicalGrade) : undefined,
    interests: splitList(input.interestsText),
    desiredEnlistDate: input.desiredEnlistDate || undefined,
    serviceType: input.serviceType
  };
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) {
    return "접수기간 미상";
  }

  return `${start ?? "시작일 미상"} ~ ${end ?? "종료일 미상"}`;
}

function formatRecommendationStatus(status: RecommendationResult["status"]) {
  if (status === "eligible") {
    return "추천 높음";
  }

  if (status === "partial") {
    return "조건 확인";
  }

  return "추천 낮음";
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청 중 오류가 발생했습니다.";
}
