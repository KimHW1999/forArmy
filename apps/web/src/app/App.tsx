import { useEffect, useMemo, useState } from "react";
import type { MilitarySpecialty, SpecialtyDetail } from "@military-guide/shared";
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  FileText,
  Loader2,
  Search
} from "lucide-react";
import { fetchSpecialties, fetchSpecialtyDetail } from "../shared/api";

export function App() {
  const [specialties, setSpecialties] = useState<MilitarySpecialty[]>([]);
  const [selectedCode, setSelectedCode] = useState<string>("");
  const [detail, setDetail] = useState<SpecialtyDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchSpecialties(1, 30)
      .then((page) => {
        setSpecialties(page.items);
        setSelectedCode(page.items[0]?.specialtyCode ?? "");
      })
      .catch((requestError: unknown) => {
        setError(readErrorMessage(requestError));
      })
      .finally(() => {
        setIsListLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selectedCode) {
      return;
    }

    setIsDetailLoading(true);
    fetchSpecialtyDetail(selectedCode)
      .then(setDetail)
      .catch((requestError: unknown) => {
        setError(readErrorMessage(requestError));
        setDetail(null);
      })
      .finally(() => {
        setIsDetailLoading(false);
      });
  }, [selectedCode]);

  const filteredSpecialties = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return specialties;
    }

    return specialties.filter((specialty) => {
      return [
        specialty.specialtyCode,
        specialty.specialtyName,
        specialty.branchName,
        specialty.categoryName
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query));
    });
  }, [searchTerm, specialties]);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">모집병 특기 탐색</p>
          <h1>병역 지원 가이드</h1>
          <p>특기 목록을 선택하면 구비서류, 배점기준, 접수현황을 함께 확인할 수 있습니다.</p>
        </div>
        <label className="search-box">
          <Search aria-hidden="true" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="특기명, 코드, 군별 검색"
          />
        </label>
      </header>

      {error ? (
        <div className="notice" role="alert">
          <AlertCircle aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="workspace">
        <aside className="specialty-list" aria-label="군사특기 목록">
          <div className="panel-title">
            <h2>특기 목록</h2>
            <span>{filteredSpecialties.length}건</span>
          </div>

          {isListLoading ? <Loading label="특기 목록을 불러오는 중" /> : null}

          <div className="list-items">
            {filteredSpecialties.map((specialty) => (
              <button
                className={specialty.specialtyCode === selectedCode ? "selected" : ""}
                key={`${specialty.specialtyCode}-${specialty.requirementItemName}`}
                onClick={() => setSelectedCode(specialty.specialtyCode)}
                type="button"
              >
                <strong>{specialty.specialtyName ?? "이름 없음"}</strong>
                <span>
                  {specialty.branchName ?? "군별 미상"} · {specialty.categoryName ?? "분류 미상"}
                </span>
                <small>{specialty.specialtyCode}</small>
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

function SpecialtyDetailView({ detail }: { detail: SpecialtyDetail }) {
  const { specialty, documents, scores, recruitmentStatuses } = detail;
  const scorePreview = scores.slice(0, 8);

  return (
    <>
      <div className="detail-heading">
        <div>
          <span className="tag">{specialty.branchName ?? "군별 미상"}</span>
          <h2>{specialty.specialtyName ?? "이름 없음"}</h2>
          <p>
            {specialty.categoryName ?? "분류 미상"} · 특기코드 {specialty.specialtyCode}
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

function formatPeriod(start?: string, end?: string) {
  if (!start && !end) {
    return "접수기간 미상";
  }

  return `${start ?? "시작일 미상"} ~ ${end ?? "종료일 미상"}`;
}

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "요청 중 오류가 발생했습니다.";
}
