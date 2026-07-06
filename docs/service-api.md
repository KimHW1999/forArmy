# 서비스 API

병무청 원 API를 프론트에서 바로 쓰기 어려우므로, 백엔드에서 앱 전용 응답 형태로 정규화한다.

## 특기 목록

`GET /api/specialties?pageNo=1&numOfRows=20`

- 원천: 군사특기 마스터
- 응답: `MmaApiPage<MilitarySpecialty>`

## 특기 상세

`GET /api/specialties/:code`

- 원천: 군사특기 마스터, 구비서류, 배점기준, 접수현황
- 응답: `SpecialtyDetail`
- 옵션:
  - `maxPages`: 특기 마스터 스캔 페이지 수
  - `documentMaxPages`: 구비서류 스캔 페이지 수
  - `scoreMaxPages`: 배점기준 스캔 페이지 수
  - `recruitmentMaxPages`: 접수현황 스캔 페이지 수

## 구비서류

`GET /api/specialties/:code/documents?maxPages=5`

- 원천: 구비서류 API
- 응답: `{ items: RequiredDocument[], totalCount: number }`

## 배점기준

`GET /api/specialties/:code/scores?maxPages=5`

- 원천: 배점기준 API
- 응답: `{ items: SelectionScoreRule[], totalCount: number }`
- 배점기준 원천 데이터는 전체 건수가 커서 `maxPages`로 조회 범위를 조절한다.

## 접수현황

`GET /api/recruitment/status?pageNo=1&numOfRows=20`

- 원천: 군지원 접수현황 API
- 응답: `MmaApiPage<RecruitmentStatus>`

## 특기 검색

`GET /api/specialties/search?q=신호정보&maxPages=12&limit=100`

- 원천: 군사특기 마스터
- 병무청 API가 검색 파라미터를 제공하지 않으므로 서버가 여러 페이지를 스캔한 뒤 특기코드 기준으로 중복을 줄인다.
- 응답: `{ items: MilitarySpecialty[], totalCount: number }`

## 추천

`POST /api/recommendations`

- 원천: 특기 검색 결과
- 입력: `RecommendationInput`
- 응답: `{ items: RecommendationResult[], totalCount: number }`
