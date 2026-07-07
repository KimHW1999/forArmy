# forArmy

병무청 공공데이터 API 기반 모집병 군사특기 탐색 서비스입니다.

## 주요 기능

- 군사특기 검색 및 상세 조회
- 구비서류 체크리스트
- 선발배점 기준, 접수현황 표시
- 관심 특기, 메모, 별점, 한줄 평 로컬 저장
- GPT 기반 보직 설명 생성
- 병무청 API 응답 CSV 캐시

## 로컬 실행

```powershell
npm install
npm run dev:api
npm run dev:web
```

- API: `http://localhost:4000/api/health`
- Web: `http://localhost:5173`

루트 `.env`에 필요한 키를 넣습니다.

```env
MMA_SERVICE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
API_PORT=4000
VITE_API_PROXY_TARGET=http://localhost:4000
```

## CSV 캐시 갱신

전체 병무청 데이터를 미리 받아 CSV로 저장합니다.

```powershell
npm run sync:csv -w apps/api
```

캐시 위치:

```text
data/cache/specialties.csv
data/cache/documents.csv
data/cache/scores.csv
data/cache/recruitment-statuses.csv
data/cache/cache-refresh.csv
```

## Render 배포

이 저장소는 Render Web Service 하나로 API와 프론트엔드를 같이 배포합니다.

Render 설정:

- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/health`

필수 환경변수:

```env
MMA_SERVICE_KEY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
```

`PORT`는 Render가 자동으로 주입합니다. 프론트엔드는 같은 도메인의 `/api`를 호출하므로 `VITE_API_BASE_URL`을 따로 설정하지 않아도 됩니다.

## API

- `GET /api/health`
- `GET /api/specialties?pageNo=1&numOfRows=20`
- `GET /api/specialties/search?q=검색어`
- `GET /api/specialties/:code`
- `GET /api/specialties/:code/documents`
- `GET /api/specialties/:code/scores`
- `POST /api/specialties/:code/explanation`
- `GET /api/recruitment/status?pageNo=1&numOfRows=20`
- `POST /api/recommendations`
