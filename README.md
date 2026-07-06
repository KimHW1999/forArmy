# 병역 지원 가이드 웹서비스

병무청 공공데이터 API를 모아 사용자의 전공, 자격, 신체조건, 희망 군을 기준으로 지원 가능한 모집병 특기와 준비 정보를 안내하는 웹서비스입니다.

## 현재 정리한 범위

- 모집병 군사특기 마스터
- 군별/특기별 지원가능 정보
- 군지원 접수현황
- 구비서류 목록
- 선발 배점기준
- 특기 전체 검색
- 조건 기반 추천 결과

## 현재 진행 상태

- 완료 단계: 0단계 ~ 6단계
- 다음 단계: 7단계 구비서류 체크리스트

## 개발 시작

```bash
npm install
npm run dev:api
npm run dev:web
```

- API 서버: `http://localhost:4000/api/health`
- 웹 앱: `http://localhost:5173`
- 웹 개발 서버는 `/api` 요청을 API 서버로 프록시합니다.

병무청 API 프록시 확인:

```bash
curl "http://localhost:4000/api/mma/specialties?pageNo=1&numOfRows=1"
```

서비스 API:

- `GET /api/specialties?pageNo=1&numOfRows=20`
- `GET /api/specialties/search?q=신호정보`
- `GET /api/specialties/:code`
- `GET /api/specialties/:code/documents`
- `GET /api/specialties/:code/scores`
- `GET /api/recruitment/status?pageNo=1&numOfRows=20`
- `POST /api/recommendations`

## 문서

- [API 매핑](docs/api-map.md)
- [API 호출 확인 결과](docs/api-check-results.md)
- [서비스 API](docs/service-api.md)
- [파일 구조](docs/file-structure.md)
- [데이터 모델](docs/data-model.md)
- [단계별 개발 계획](docs/development-plan.md)

## 다음 작업

1. 구비서류 체크리스트 저장 기능 구현
2. 특기별 임무 설명 데이터 확보 방식 결정
3. Prisma 스키마 확정 후 캐시 DB 연동
4. API 에러/로딩/빈 상태 UX 보강
