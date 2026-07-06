# API 호출 확인 결과

확인일: 2026-07-06

`.env`의 `MMA_SERVICE_KEY`를 사용해 각 API를 `pageNo=1`, `numOfRows=1`로 호출했다. 키 값은 출력하지 않았다.

## 결과 요약

| API | URL 경로 | 결과 | totalCount |
| --- | --- | --- | ---: |
| 군사특기 마스터 | `/gsTgMastr/list/gsTgMastr/list` | 정상 | 11138 |
| 구비서류 | `/gbSeoryu/list/gbSeoryu/list` | 정상 | 3468 |
| 배점기준 | `/bjGiJun/list` | 정상 | 373285 |
| 지원가능 정보 | `/mjbJiWon/list` | 정상 | 1357654 |
| 군지원 접수현황 | `/MJBGJWJeopSuHH4/list` | 정상 | 8841 |
| 맞춤형 특기병 | `/MachumTG/list` | 정상 | 242 |
| 사회복무 공석 | `/bistGongseok/list/bistGongseok/list` | 정상 | 221426 |

## 특이사항

- 배점기준 API는 문서의 Callback URL 예시인 `/bjGiJun/list/bjGiJun/list`, `/bjGiJun/list//bjGiJun/list` 계열이 모두 404를 반환했다.
- 실제 정상 응답 경로는 `/bjGiJun/list`였다.
- 구비서류 API의 실제 첫 행 필드에는 문서에 있는 `mjbgteukgiCd`, `mjbgteukgiNm` 대신 `mjgubun`이 보였다. 추가 샘플을 확보하면서 매퍼를 보완해야 한다.

## 로컬 프록시 확인

백엔드 공통 클라이언트 구현 후 다음 로컬 API가 정상 응답하는 것을 확인했다.

| 로컬 API | 결과 |
| --- | --- |
| `/api/mma/resources` | 정상 |
| `/api/mma/specialties?pageNo=1&numOfRows=1` | 정상 |
| `/api/mma/documents?pageNo=1&numOfRows=1` | 정상 |
| `/api/mma/scores?pageNo=1&numOfRows=1` | 정상 |

## 첫 행 주요 필드

### 군사특기 마스터

- `cjgijunVl`
- `gjhangmokNm`
- `gsteukgiCd`
- `gsteukgiNm`
- `gunGbcd`
- `gunGbnm`
- `iyyjjongryoYm`
- `iyyjsijakYm`

### 구비서류

- `gsteukgiCd`
- `gsteukgiNm`
- `gunGbcd`
- `gunGbnm`
- `jcseoryuCd`
- `jcseoryuNm`
- `mjgubun`
- `psjechulYn`

### 배점기준

- `bjgijunDgcd`
- `bjgijunDgnm`
- `bjgijunGbcd`
- `bjgijunGbnm`
- `bjgjsangseCd`
- `bjgjsangseNm`
- `gjgwanryeonScor`
- `gsteukgiCd`
- `gsteukgiNm`
- `gunGbcd`
