# 데이터 모델 초안

## 핵심 엔티티

### `military_specialties`

- `id`
- `specialty_code`: `gsteukgiCd`
- `specialty_name`: `gsteukgiNm`
- `branch_code`: `gunGbcd`
- `branch_name`: `gunGbnm`
- `category_code`: `mjbgteukgiCd`
- `category_name`: `mjbgteukgiNm`
- `requirement_item_name`: `gjhangmokNm`
- `min_value`: `cjgijunVl`
- `max_value`: `cggijunVl`
- `recruit_year`: `mojipYy`
- `recruit_round`: `mojipTms`
- `application_start_at`: `jeopsuSjdtm`
- `application_end_at`: `jeopsuJrdtm`
- `duty_summary`: 별도 확보한 임무 요약
- `duty_source_url`: 임무 설명 출처 URL
- `duty_source_type`: 공식자료/GPT초안/수기입력 등 출처 유형
- `source_updated_at`

현재 연동한 병무청 OpenAPI에는 특기별 실제 임무 설명 본문이 없다. 임무 설명은 공식 모집안내 페이지, 병무청 공지, 수기 정리 자료 등을 별도 데이터로 붙이고, GPT를 사용할 경우 초안 생성 용도로만 두고 출처와 검수 상태를 함께 저장한다.

### `specialty_eligibilities`

- `id`
- `specialty_code`: `gsteukgiCd`
- `specialty_name`: `gsteukgiNm`
- `branch_name`: `gtcdNm1`
- `requirement_name`: `gtcdNm2`
- `requirement_type`: `gubun`
- `license_grade`: `jgmyeonheoDg`
- `relation_type`: `jjganjeopGbcd`

### `required_documents`

- `id`
- `specialty_code`: `gsteukgiCd`
- `specialty_name`: `gsteukgiNm`
- `branch_code`: `gunGbcd`
- `branch_name`: `gunGbnm`
- `category_code`: `mjbgteukgiCd`
- `category_name`: `mjbgteukgiNm`
- `document_code`: `jcseoryuCd`
- `document_name`: `jcseoryuNm`
- `is_required`: `psjechulYn`

### `selection_score_rules`

- `id`
- `specialty_code`: `gsteukgiCd`
- `specialty_name`: `gsteukgiNm`
- `branch_code`: `gunGbcd`
- `branch_name`: `gunGbnm`
- `score_group_code`: `bjgijunGbcd`
- `score_group_name`: `bjgijunGbnm`
- `score_grade_code`: `bjgijunDgcd`
- `score_grade_name`: `bjgijunDgnm`
- `score_detail_code`: `bjgjsangseCd`
- `score_detail_name`: `bjgjsangseNm`
- `min_value`: `cjgijunVl`
- `max_value`: `cggijunVl`
- `direct_score`: `jjgwanryeonScor`
- `indirect_score`: `gjgwanryeonScor`
- `schedule_id`: `mjiljeongNo`
- `recruit_year`: `mojipYy`
- `recruit_round`: `mojipTms`

### `recruitment_statuses`

- `id`
- `specialty_code`: `gsteukgiCd`
- `specialty_name`: `gsteukgiNm`
- `branch_name`: `gunGbnm`
- `recruit_type_name`: `mojipGbnm`
- `selection_quota`: `seonbalPcnt`
- `applicant_count`: `jeopsuPcnt`
- `competition_rate`: `rate`
- `application_start_at`: `jeopsuSjdtm`
- `application_end_at`: `jeopsuJrdtm`
- `enlist_start_month`: `iyyjsijakYm`
- `enlist_end_month`: `iyyjjongryoYm`

## 추천 점수 초안

- 희망 군 일치: 20
- 관심 분야/특기명/병과 매칭: 20
- 전공 조건 일치: 20
- 자격/면허 조건 일치: 20
- 신체 조건 충족: 10
- 현재 모집 중: 10

점수와 별개로 `지원 가능`, `조건 일부 부족`, `지원 불가` 상태를 따로 내려준다.
