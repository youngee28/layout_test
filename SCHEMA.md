## 1. RESOLVED_TABLES_SCHEMA

### 1-1. documentContext

| 구분 | 항목 | 타입 | 필수 여부 | 구성 |
|:---:|:---:|:---:|:---:|---|
| 문서 맥락 | `documentContext` | object | O | `title`, `summary`, `tableContexts`, `relationships` |
| 문서 맥락 | `documentContext.title` | string | X | 문서 또는 데이터셋 제목 |
| 문서 맥락 | `documentContext.summary` | string | X | 문서 전체 요약 |
| 표별 맥락 | `documentContext.tableContexts` | object[] | O | `tableId`, `description` |
| 표별 맥락 | `tableContexts[].tableId` | string | O | 연결 대상 표 ID |
| 표별 맥락 | `tableContexts[].description` | string | O | 표의 역할 및 문맥 설명 |
| 표 간 관계 | `documentContext.relationships` | object[] | O | `tableIds`, `type`, `description`, `confidence`, `usableForCombinedDashboard` |
| 표 간 관계 | `relationships[].tableIds` | string[] | O | 관계가 있는 표 ID 목록 |
| 표 간 관계 | `relationships[].type` | string | O | `cross_table`, `supporting_context`, `independent`, `shared_subject`, `breakdown` |
| 표 간 관계 | `relationships[].description` | string | O | 표 간 관계 설명 |
| 표 간 관계 | `relationships[].confidence` | number | O | 관계 판단 신뢰도 |
| 표 간 관계 | `relationships[].usableForCombinedDashboard` | boolean | O | 통합 대시보드 활용 가능 여부 |


### 1-2. tables[]

| 구분 | 항목 | 타입 | 필수 여부 | 구성 |
|:---:|:---:|:---:|:---:|---|
| 표 목록 | `tables` | object[] | O | 원본 데이터에서 감지된 표/메모/메타데이터/제목 영역 목록 |
| 표 정보 | `tables[].id` | string | O | 표 또는 영역의 고유 ID |
| 표 정보 | `tables[].kind` | string | O | `table`, `note`, `metadata`, `titleBlock` |
| 표 정보 | `tables[].title` | string | X | 표 또는 영역 제목 |
| 표 정보 | `tables[].context` | string | X | 표의 내용 및 활용 맥락 |
| 표 범위 | `tables[].range` | object | O | `startRow`, `endRow`, `startCol`, `endCol` |
| 표 범위 | `range.startRow` | number | O | 영역의 시작 행 인덱스 |
| 표 범위 | `range.endRow` | number | O | 영역의 종료 행 인덱스 |
| 표 범위 | `range.startCol` | number | O | 영역의 시작 열 인덱스 |
| 표 범위 | `range.endCol` | number | O | 영역의 종료 열 인덱스 |
| 표 구조 | `tables[].headerRow` | number \| null | X | 헤더로 판단된 행 인덱스 |
| 표 구조 | `tables[].dataStartRow` | number \| null | X | 실제 데이터 시작 행 인덱스 |
| 표 구조 | `tables[].dataEndRow` | number \| null | X | 실제 데이터 종료 행 인덱스 |
| 판단 정보 | `tables[].confidence` | number | O | 표 또는 영역 유형 판단 신뢰도 |
| 판단 정보 | `tables[].reason` | string | X | 해당 영역을 해당 유형으로 판단한 근거 |


## 2. DASHBOARD_CANDIDATES_SCHEMA

### 2-1. candidates[]

| 구분 | 항목 | 타입 | 필수 여부 | 구성 |
|:---:|:---:|:---:|:---:|---|
| 최상위 | `candidates` | object[] | O | 대시보드 후보 목록 |
| 후보 정보 | `candidates[].id` | string | O | 후보 고유 ID |
| 후보 정보 | `candidates[].title` | string | O | 대시보드 후보 제목 |
| 후보 정보 | `candidates[].summary` | string | O | 후보 요약 설명 |
| 후보 정보 | `candidates[].designIntent` | string | O | 디자인 의도 및 표현 방향 |
| 후보 정보 | `candidates[].question` | string | O | 해당 대시보드가 답하고자 하는 핵심 질문 |
| 후보 정보 | `candidates[].viewpoint` | string | O | `main_overview`, `relationship`, `detail_breakdown` |
| 데이터 참조 | `candidates[].sourceTableIds` | array<string> | O | 후보 생성에 사용된 전체 표 ID 목록 |
| 데이터 참조 | `candidates[].mainTableId` | string | O | 중심이 되는 대표 표 ID |
| 데이터 참조 | `candidates[].supportingTableIds` | array<string> | O | 보조적으로 활용되는 표 ID 목록 |
| 문맥 활용 | `candidates[].contextUsage` | string | O | 문서 맥락 및 표 간 관계 활용 방식 |
| 시각화 계획 | `candidates[].visualizationPlan` | array<object> | O | 후보 대시보드를 구성하는 차트 및 시각화 계획 목록 |
| SVG 결과 | `candidates[].svgMarkup` | string | O | 후보 대시보드의 SVG 마크업 |
| 활용 필드 | `candidates[].usedFields` | array<string> | X | 실제 후보 생성에 사용된 데이터 필드 목록 |
| 참고 사항 | `candidates[].notes` | array<string> | X | 생성 과정에서의 참고 사항 또는 주의점 |


### 2-2. visualizationPlan[]

| 구분 | 항목 | 타입 | 필수 여부 | 구성 |
|:---:|:---:|:---:|:---:|---|
| 시각화 계획 | `visualizationPlan[].id` | string | O | 시각화 요소 고유 ID |
| 시각화 계획 | `visualizationPlan[].tableId` | string | O | 해당 시각화에 사용되는 표 ID |
| 시각화 계획 | `visualizationPlan[].chartType` | string | O | `kpi`, `bar`, `verticalBar`, `horizontalBar`, `groupedBar`, `rankingBar`, `line`, `pie`, `donut`, `scatter`, `matrix`, `funnel`, `area`, `tableSummary` |
| 시각화 계획 | `visualizationPlan[].intent` | string | O | `comparison`, `trend`, `composition`, `stage_change`, `relationship`, `ranking`, `summary` |
| 시각화 필드 | `visualizationPlan[].fields` | object | O | `categoryField`, `valueField`, `dateField`, `groupField`, `xField`, `yField` |
| 시각화 필드 | `fields.categoryField` | string | X | 범주 기준 필드 |
| 시각화 필드 | `fields.valueField` | string | X | 수치 값 필드 |
| 시각화 필드 | `fields.dateField` | string | X | 날짜/시간 기준 필드 |
| 시각화 필드 | `fields.groupField` | string | X | 그룹 구분 필드 |
| 시각화 필드 | `fields.xField` | string | X | X축 기준 필드 |
| 시각화 필드 | `fields.yField` | string | X | Y축 기준 필드 |
| 시각화 계획 | `visualizationPlan[].reason` | string | O | 해당 시각화 유형을 선택한 이유 |
| 시각화 계획 | `visualizationPlan[].suitability` | string | X | `high`, `medium`, `low` |