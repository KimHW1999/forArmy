# 파일 구조

```text
.
├─ apps/
│  ├─ api/
│  │  └─ src/
│  │     ├─ config/              # env, 서버 설정
│  │     ├─ modules/
│  │     │  ├─ mma/              # 병무청 API 공통 클라이언트
│  │     │  ├─ specialties/      # 군사특기 조회/상세
│  │     │  ├─ documents/        # 구비서류 조회
│  │     │  ├─ scores/           # 배점기준 조회
│  │     │  └─ recommendations/  # 조건 기반 추천
│  │     └─ server.ts
│  └─ web/
│     └─ src/
│        ├─ app/                 # 라우터, 앱 셸
│        ├─ features/
│        │  ├─ specialties/      # 특기 목록/상세 UI
│        │  ├─ recommendations/  # 조건 입력/추천 결과 UI
│        │  ├─ documents/        # 구비서류 체크리스트 UI
│        │  ├─ scores/           # 배점기준 UI
│        │  └─ recruitment/      # 접수현황 UI
│        └─ shared/              # 공통 API 클라이언트, UI, utils
├─ packages/
│  └─ shared/
│     └─ src/                    # 프론트/백 공용 타입
├─ prisma/
│  └─ schema.prisma              # 캐시 DB 모델
├─ scripts/                      # 데이터 동기화 스크립트
└─ docs/                         # API/데이터/구조 문서
```

## 설계 방향

- 병무청 API 키는 `apps/api`에서만 사용한다.
- 프론트는 자체 API(`/api/...`)만 호출한다.
- 외부 API 응답은 `packages/shared` 타입으로 정규화한 뒤 화면과 DB에서 재사용한다.
- 구비서류와 배점기준은 별도 모듈로 두되, 특기 상세 API에서 함께 조합한다.

## MVP 라우트 초안

- `GET /api/specialties`: 특기 목록
- `GET /api/specialties/:code`: 특기 상세
- `GET /api/specialties/:code/documents`: 구비서류
- `GET /api/specialties/:code/scores`: 배점기준
- `GET /api/recruitment/status`: 접수현황
- `POST /api/recommendations`: 사용자 조건 기반 추천
