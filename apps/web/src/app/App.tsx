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
  Heart,
  Info,
  Loader2,
  NotebookPen,
  Search,
  SlidersHorizontal
} from "lucide-react";
import {
  fetchSpecialtyExplanation,
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

type SavedSpecialty = {
  specialtyCode: string;
  specialtyName: string;
  branchCode: string;
  branchName: string;
  categoryName?: string;
};

type SpecialtyReview = {
  rating: number;
  review: string;
};

export function App() {
  const [specialties, setSpecialties] = useState<MilitarySpecialty[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [detail, setDetail] = useState<SpecialtyDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [conditionInput, setConditionInput] = useState<UserConditionInput>(() =>
    readSavedConditionInput()
  );
  const [savedSpecialties, setSavedSpecialties] = useState<SavedSpecialty[]>(() =>
    readSavedSpecialties()
  );
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
          setSelectedCode((current) => {
            if (response.items.some((item) => item.specialtyCode === current)) {
              return current;
            }

            return response.items[0]?.specialtyCode || "";
          });

          if (!response.items.length) {
            setDetail(null);
          }
        })
        .catch((requestError: unknown) => setError(readErrorMessage(requestError)))
        .finally(() => setIsListLoading(false));
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!selectedCode) {
      setDetail(null);
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
    writeJson("military-guide:condition-input", conditionInput);
    setIsRecommendationLoading(true);
    fetchRecommendations(payload)
      .then((response) => {
        setError("");
        setRecommendations(response.items);
      })
      .catch((requestError: unknown) => setError(readErrorMessage(requestError)))
      .finally(() => setIsRecommendationLoading(false));
  }

  function handleConditionChange(input: UserConditionInput) {
    setConditionInput(input);
    writeJson("military-guide:condition-input", input);
  }

  function handleSavedSpecialtyToggle(specialty: MilitarySpecialty) {
    setSavedSpecialties((current) => {
      const saved = toSavedSpecialty(specialty);
      const exists = current.some((item) => item.specialtyCode === specialty.specialtyCode);
      const next = exists
        ? current.filter((item) => item.specialtyCode !== specialty.specialtyCode)
        : [saved, ...current];

      writeJson("military-guide:saved-specialties", next);
      return next;
    });
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
        onChange={handleConditionChange}
        onSubmit={handleConditionSubmit}
      />

      <MyPagePanel
        conditionInput={conditionInput}
        savedSpecialties={savedSpecialties}
        selectedCode={selectedCode}
        onSelectSpecialty={setSelectedCode}
      />

      <section className="workspace">
        <aside className="specialty-list" aria-label="군사특기 목록">
          <div className="panel-title">
            <h2>특기 목록</h2>
            <span>{specialties.length}건</span>
          </div>

          {isListLoading ? <Loading label="특기 목록을 검색하는 중" /> : null}
          {!isListLoading && !specialties.length ? (
            <div className="list-empty">검색 결과가 없습니다.</div>
          ) : null}

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
          {!isDetailLoading && detail ? (
            <SpecialtyDetailView
              detail={detail}
              isSaved={savedSpecialties.some(
                (item) => item.specialtyCode === detail.specialty.specialtyCode
              )}
              onSavedToggle={handleSavedSpecialtyToggle}
            />
          ) : null}
          {!isDetailLoading && !detail ? (
            <div className="empty-state">목록에서 특기를 선택하세요.</div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function MyPagePanel({
  conditionInput,
  savedSpecialties,
  selectedCode,
  onSelectSpecialty
}: {
  conditionInput: UserConditionInput;
  savedSpecialties: SavedSpecialty[];
  selectedCode: string;
  onSelectSpecialty: (specialtyCode: string) => void;
}) {
  const conditionSummary = [
    conditionInput.desiredBranch || "군 전체",
    conditionInput.major || "전공 미입력",
    conditionInput.certificatesText
      ? `자격증 ${splitList(conditionInput.certificatesText).length}개`
      : "자격증 미입력",
    conditionInput.interestsText
      ? `관심 ${splitList(conditionInput.interestsText).length}개`
      : "관심분야 미입력"
  ];

  return (
    <section className="mypage-panel" aria-label="마이페이지">
      <div className="mypage-heading">
        <div>
          <span className="tag">9단계</span>
          <h2>마이페이지</h2>
        </div>
        <NotebookPen aria-hidden="true" />
      </div>

      <div className="mypage-grid">
        <div className="mypage-block">
          <h3>저장된 조건</h3>
          <div className="saved-condition-list">
            {conditionSummary.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="mypage-block">
          <h3>관심 특기</h3>
          {savedSpecialties.length ? (
            <div className="saved-specialty-list">
              {savedSpecialties.slice(0, 6).map((specialty) => (
                <SavedSpecialtyButton
                  isSelected={specialty.specialtyCode === selectedCode}
                  key={`${specialty.branchCode}-${specialty.specialtyCode}`}
                  specialty={specialty}
                  onSelectSpecialty={onSelectSpecialty}
                />
              ))}
            </div>
          ) : (
            <p className="muted">관심 특기로 저장한 항목이 없습니다.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function SavedSpecialtyButton({
  isSelected,
  specialty,
  onSelectSpecialty
}: {
  isSelected: boolean;
  specialty: SavedSpecialty;
  onSelectSpecialty: (specialtyCode: string) => void;
}) {
  const review = readSpecialtyReviewByParts(specialty.branchCode, specialty.specialtyCode);

  return (
    <button
      className={isSelected ? "selected" : ""}
      onClick={() => onSelectSpecialty(specialty.specialtyCode)}
      type="button"
    >
      <strong>{specialty.specialtyName}</strong>
      <span>
        {specialty.branchName} · {specialty.specialtyCode}
      </span>
      {review.rating || review.review ? (
        <small>
          {review.rating ? `별점 ${review.rating}/5` : "별점 미입력"}
          {review.review ? ` · ${review.review}` : ""}
        </small>
      ) : null}
    </button>
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
        <button type="button" disabled={isLoading} onClick={() => onSubmit(payload)}>
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

function SpecialtyDetailView({
  detail,
  isSaved,
  onSavedToggle
}: {
  detail: SpecialtyDetail;
  isSaved: boolean;
  onSavedToggle: (specialty: MilitarySpecialty) => void;
}) {
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

      <div className="detail-actions">
        <button
          className={isSaved ? "saved" : ""}
          onClick={() => onSavedToggle(specialty)}
          type="button"
        >
          <Heart aria-hidden="true" />
          <span>{isSaved ? "관심 해제" : "관심 저장"}</span>
        </button>
      </div>

      <div className="metric-grid">
        <Metric label="구비서류" value={`${documents.length}개`} icon={<FileText />} />
        <Metric label="배점기준" value={`${scores.length}개`} icon={<ClipboardList />} />
        <Metric label="접수현황" value={`${recruitmentStatuses.length}건`} icon={<CalendarClock />} />
      </div>

      <section className="detail-section">
        <h3>임무 설명</h3>
        <SpecialtyExplanation specialty={specialty} />
      </section>

      <section className="detail-section">
        <h3>구비서류</h3>
        <DocumentChecklist specialty={specialty} documents={documents} />
      </section>

      <section className="detail-section">
        <h3>메모</h3>
        <SpecialtyMemo specialty={specialty} />
      </section>

      <section className="detail-section">
        <h3>별점과 한줄 평</h3>
        <SpecialtyReviewForm specialty={specialty} />
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

function SpecialtyExplanation({ specialty }: { specialty: MilitarySpecialty }) {
  const storageKey = getSpecialtyExplanationStorageKey(specialty);
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setExplanation(window.localStorage.getItem(storageKey) ?? "");
    setError("");
  }, [storageKey]);

  function handleGenerate() {
    setIsLoading(true);
    setError("");

    fetchSpecialtyExplanation(specialty.specialtyCode)
      .then((response) => {
        setExplanation(response.explanation);
        window.localStorage.setItem(storageKey, response.explanation);
      })
      .catch((requestError: unknown) => setError(readErrorMessage(requestError)))
      .finally(() => setIsLoading(false));
  }

  return (
    <div className="explanation-box">
      <div className="duty-note">
        <Info aria-hidden="true" />
        <p>
          병무청 OpenAPI에는 특기별 실제 임무 설명 본문이 없어, GPT가 특기명과 선발 데이터를 바탕으로 설명을 생성합니다.
        </p>
      </div>
      <div className="explanation-actions">
        <button disabled={isLoading} onClick={handleGenerate} type="button">
          {isLoading ? "설명 생성 중" : explanation ? "GPT 설명 다시 생성" : "GPT 설명 생성"}
        </button>
      </div>
      {error ? (
        <div className="explanation-error" role="alert">
          {error}
        </div>
      ) : null}
      {explanation ? <pre className="explanation-result">{explanation}</pre> : null}
    </div>
  );
}

function SpecialtyReviewForm({ specialty }: { specialty: MilitarySpecialty }) {
  const storageKey = getSpecialtyReviewStorageKey(specialty);
  const [review, setReview] = useState<SpecialtyReview>({ rating: 0, review: "" });

  useEffect(() => {
    setReview(readSpecialtyReview(storageKey));
  }, [storageKey]);

  function handleReviewChange(next: SpecialtyReview) {
    setReview(next);
    writeJson(storageKey, next);
  }

  return (
    <div className="review-box">
      <div className="star-rating" aria-label="특기 별점">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            aria-label={`${score}점`}
            className={score <= review.rating ? "active" : ""}
            key={score}
            onClick={() => handleReviewChange({ ...review, rating: score })}
            type="button"
          >
            ★
          </button>
        ))}
        <span>{review.rating ? `${review.rating}/5` : "별점 미입력"}</span>
      </div>
      <input
        className="review-input"
        maxLength={80}
        onChange={(event) =>
          handleReviewChange({
            ...review,
            review: event.target.value
          })
        }
        placeholder="예: 자격증 맞으면 지원해볼 만함"
        value={review.review}
      />
    </div>
  );
}

function SpecialtyMemo({ specialty }: { specialty: MilitarySpecialty }) {
  const storageKey = getSpecialtyMemoStorageKey(specialty);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    setMemo(window.localStorage.getItem(storageKey) ?? "");
  }, [storageKey]);

  function handleMemoChange(value: string) {
    setMemo(value);
    window.localStorage.setItem(storageKey, value);
  }

  return (
    <textarea
      className="memo-field"
      onChange={(event) => handleMemoChange(event.target.value)}
      placeholder="지원 일정, 확인할 조건, 준비할 서류 메모"
      value={memo}
    />
  );
}

function DocumentChecklist({
  specialty,
  documents
}: {
  specialty: MilitarySpecialty;
  documents: SpecialtyDetail["documents"];
}) {
  const storageKey = getDocumentChecklistStorageKey(specialty);
  const [checkedDocuments, setCheckedDocuments] = useState<Record<string, boolean>>({});
  const submissionDocuments = documents.filter((document) => document.isRequired);
  const optionalDocuments = documents.filter((document) => !document.isRequired);
  const checkedCount = documents.filter((document) => {
    return checkedDocuments[getDocumentChecklistItemKey(document)];
  }).length;

  useEffect(() => {
    setCheckedDocuments(readDocumentChecklist(storageKey));
  }, [storageKey]);

  if (!documents.length) {
    return <p className="muted">조회 범위 안에 구비서류가 없습니다.</p>;
  }

  function handleDocumentToggle(documentKey: string) {
    setCheckedDocuments((current) => {
      const next = {
        ...current,
        [documentKey]: !current[documentKey]
      };

      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="document-checklist">
      <div className="checklist-summary">
        <div>
          <strong>
            {checkedCount}/{documents.length}개 준비 완료
          </strong>
          <span>
            제출대상 {submissionDocuments.length}개 · 참고 {optionalDocuments.length}개
          </span>
        </div>
        <progress value={checkedCount} max={documents.length} aria-label="서류 준비 진행률" />
      </div>

      <p className="document-note">
        병무청 API의 `필수제출여부` 값은 해당 특기에서 제출 대상으로 안내되는 서류입니다.
        다자녀, 국가유공자, 헌혈, 봉사활동처럼 본인에게 해당될 때만 준비하는 증빙이 섞일 수 있습니다.
      </p>

      <DocumentGroup
        checkedDocuments={checkedDocuments}
        documents={submissionDocuments}
        emptyLabel="제출대상 서류가 없습니다."
        title="제출대상 서류"
        onToggle={handleDocumentToggle}
      />
      <DocumentGroup
        checkedDocuments={checkedDocuments}
        documents={optionalDocuments}
        emptyLabel="참고 서류가 없습니다."
        title="참고 서류"
        onToggle={handleDocumentToggle}
      />
    </div>
  );
}

function DocumentGroup({
  checkedDocuments,
  documents,
  emptyLabel,
  title,
  onToggle
}: {
  checkedDocuments: Record<string, boolean>;
  documents: SpecialtyDetail["documents"];
  emptyLabel: string;
  title: string;
  onToggle: (documentKey: string) => void;
}) {
  return (
    <div className="document-group">
      <h4>{title}</h4>
      {documents.length ? (
        <ul className="document-list">
          {documents.map((document) => {
            const documentKey = getDocumentChecklistItemKey(document);

            return (
              <li key={documentKey}>
                <label>
                  <input
                    checked={Boolean(checkedDocuments[documentKey])}
                    onChange={() => onToggle(documentKey)}
                    type="checkbox"
                  />
                  <span>{document.documentName ?? "서류명 없음"}</span>
                </label>
                <strong>{document.isRequired ? "제출대상" : "참고"}</strong>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">{emptyLabel}</p>
      )}
    </div>
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

function getDocumentChecklistStorageKey(specialty: MilitarySpecialty) {
  return [
    "military-guide",
    "document-checklist",
    specialty.branchCode,
    specialty.specialtyCode
  ].join(":");
}

function getSpecialtyMemoStorageKey(specialty: MilitarySpecialty) {
  return [
    "military-guide",
    "specialty-memo",
    specialty.branchCode,
    specialty.specialtyCode
  ].join(":");
}

function getSpecialtyExplanationStorageKey(specialty: MilitarySpecialty) {
  return [
    "military-guide",
    "specialty-explanation",
    specialty.branchCode,
    specialty.specialtyCode
  ].join(":");
}

function getSpecialtyReviewStorageKey(specialty: MilitarySpecialty) {
  return getSpecialtyReviewStorageKeyByParts(specialty.branchCode, specialty.specialtyCode);
}

function getSpecialtyReviewStorageKeyByParts(branchCode: string, specialtyCode: string) {
  return ["military-guide", "specialty-review", branchCode, specialtyCode].join(":");
}

function getDocumentChecklistItemKey(document: SpecialtyDetail["documents"][number]) {
  return [
    document.branchCode,
    document.specialtyCode,
    document.documentCode || "document",
    document.documentName ?? "unnamed"
  ].join(":");
}

function readDocumentChecklist(storageKey: string): Record<string, boolean> {
  const storedValue = window.localStorage.getItem(storageKey);

  if (!storedValue) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue);
    return typeof parsedValue === "object" && parsedValue !== null
      ? (parsedValue as Record<string, boolean>)
      : {};
  } catch {
    return {};
  }
}

function readSavedConditionInput(): UserConditionInput {
  return (
    readJson<UserConditionInput>("military-guide:condition-input") ?? {
      desiredBranch: "",
      major: "",
      certificatesText: "",
      physicalGrade: "",
      interestsText: "",
      desiredEnlistDate: "",
      serviceType: "any"
    }
  );
}

function readSavedSpecialties(): SavedSpecialty[] {
  return readJson<SavedSpecialty[]>("military-guide:saved-specialties") ?? [];
}

function readSpecialtyReview(storageKey: string): SpecialtyReview {
  const storedReview = readJson<Partial<SpecialtyReview>>(storageKey);

  return {
    rating: normalizeRating(storedReview?.rating),
    review: typeof storedReview?.review === "string" ? storedReview.review : ""
  };
}

function readSpecialtyReviewByParts(branchCode: string, specialtyCode: string): SpecialtyReview {
  return readSpecialtyReview(getSpecialtyReviewStorageKeyByParts(branchCode, specialtyCode));
}

function normalizeRating(value: unknown) {
  const rating = Number(value);
  return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
}

function toSavedSpecialty(specialty: MilitarySpecialty): SavedSpecialty {
  return {
    specialtyCode: specialty.specialtyCode,
    specialtyName: specialty.specialtyName ?? "이름 없음",
    branchCode: specialty.branchCode,
    branchName: specialty.branchName ?? "군별 미상",
    categoryName: specialty.categoryName
  };
}

function readJson<T>(storageKey: string): T | null {
  const storedValue = window.localStorage.getItem(storageKey);

  if (!storedValue) {
    return null;
  }

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    return null;
  }
}

function writeJson(storageKey: string, value: unknown) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}
