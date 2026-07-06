# API 매핑

로컬 문서 `API 설명.txt`, `MMA_OPENAPI_0005_구비서류_v1.1.docx`, `MMA_OPENAPI_0006_배점기준_v1.1.docx`, `MMA_OPENAPI_0004_군사특기마스타_v1.1.docx` 기준으로 정리했다. `데이터 설명.txt`는 현재 작업 폴더에 없음.

## 공통 호출 방식

- 인증: `serviceKey`
- 공통 요청 파라미터: `pageNo`, `numOfRows`
- 응답: XML/JSON 지원 문서로 보이나, 예제는 XML 중심
- 주의: 공개 문서에 callback URL의 슬래시가 중복된 항목이 있다. 서버에서는 endpoint를 상수화하고 실제 응답 테스트로 확정한다.

## 군사특기 마스터

- 서비스 ID: `MMA_OPENAPI_0004`
- 서비스명: 군사특기마스타목록조회서비스
- 기본 URL: `http://apis.data.go.kr/1300000/gsTgMastr/list`
- Callback URL 예시: `/gsTgMastr/list/gsTgMastr/list`
- 용도: 특기별 기준항목, 군 구분, 모집병과특기, 모집 일정 기본값 조회
- 주요 필드: `gsteukgiCd`, `gsteukgiNm`, `gunGbcd`, `gunGbnm`, `gjhangmokNm`, `cjgijunVl`, `cggijunVl`, `mjbgteukgiCd`, `mjbgteukgiNm`, `mjiljeongNo`, `mojipYy`, `mojipTms`, `jeopsuSjdtm`, `jeopsuJrdtm`

## 구비서류

- 서비스 ID: `MMA_OPENAPI_0005`
- 서비스명: 구비서류목록조회서비스
- 기본 URL: `http://apis.data.go.kr/1300000/gbSeoryu/list`
- Callback URL: `/gbSeoryu/list/gbSeoryu/list`
- 설명: 군사특기별 필수 제출서류 안내
- 주요 필드: `gsteukgiCd`, `gsteukgiNm`, `gunGbcd`, `gunGbnm`, `jcseoryuCd`, `jcseoryuNm`, `mjbgteukgiCd`, `mjbgteukgiNm`, `psjechulYn`, `rnum`
- 정규화 기준:
  - `gsteukgiCd` + `gunGbcd` + `mjbgteukgiCd`를 우선 매칭키로 사용
  - `psjechulYn === "Y"`이면 필수 서류
  - 같은 특기에 서류가 여러 건 나오므로 `required_documents`는 1:N 테이블

## 선발 배점기준

- 서비스 ID: `MMA_OPENAPI_0006`
- 서비스명: 모병합격배점기준목록조회서비스
- 기본 URL: `http://apis.data.go.kr/1300000/bjGiJun/list`
- 실제 확인 URL: `/bjGiJun/list`
- 문서 Callback URL 예시: `/bjGiJun/list//bjGiJun/list`
- 확인 결과: 문서 Callback URL은 404가 발생했고, 기본 URL인 `/bjGiJun/list`가 정상 응답한다.
- 설명: 군 지원 분야 및 특기별 배점 기준 정보 제공
- 주요 필드: `gsteukgiCd`, `gsteukgiNm`, `gunGbcd`, `gunGbnm`, `bjgijunGbcd`, `bjgijunGbnm`, `bjgijunDgcd`, `bjgijunDgnm`, `bjgjsangseCd`, `bjgjsangseNm`, `cjgijunVl`, `cggijunVl`, `jjgwanryeonScor`, `gjgwanryeonScor`, `mjiljeongNo`, `mbteukgiNo`, `mojipYy`, `mojipTms`
- 정규화 기준:
  - 한 특기 안에 자격, 전공, 출결 등 여러 배점 항목이 행 단위로 내려온다.
  - `bjgijunGbnm`을 사람이 보는 평가 항목명으로 사용한다.
  - `jjgwanryeonScor`, `gjgwanryeonScor`는 직접/간접 관련 자격 또는 전공 점수로 분리 보관한다.
  - `cjgijunVl`, `cggijunVl`은 범위 기준값으로 보관한다.

## 지원가능 정보

- URL: `http://apis.data.go.kr/1300000/mjbJiWon/list`
- 용도: 자격/면허/전공명 기준으로 지원 가능한 특기 연결
- 주요 필드: `gsteukgiCd`, `gsteukgiNm`, `gtcdNm1`, `gtcdNm2`, `gubun`, `jgmyeonheoDg`, `jjganjeopGbcd`

## 접수현황

- Base URL: `apis.data.go.kr/1300000/MJBGJWJeopSuHH4`
- Operation: `/list`
- 용도: 현재 모집, 지원율, 접수 기간 확인
- 주요 필드: `gunGbnm`, `mojipGbnm`, `gsteukgiCd`, `gsteukgiNm`, `seonbalPcnt`, `jeopsuPcnt`, `rate`, `jeopsuSjdtm`, `jeopsuJrdtm`, `iyyjsijakYm`, `iyyjjongryoYm`

## 화면 결합 방식

- 특기 목록: 군사특기 마스터 + 접수현황 요약
- 특기 상세: 군사특기 마스터 + 지원가능 정보 + 구비서류 + 배점기준 + 접수현황
- 추천 결과: 지원가능 정보로 1차 후보를 만들고, 마스터/접수현황/배점기준으로 점수와 준비 항목을 보강
