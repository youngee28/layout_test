# CANVAS AI

CSV 표 데이터를 업로드하면 AI가 데이터 구조를 해석하고, 인포그래픽형 대시보드 시안을 생성해 비교할 수 있는 Next.js 기반 프로토타입입니다.

이 프로젝트의 목적은 "표 데이터를 어떻게 보여줄 것인가"를 빠르게 탐색하는 것입니다. 사용자는 CSV를 올리고, 서비스는 표/메타데이터/주석 영역을 분리한 뒤, 서로 다른 시각화 방향의 대시보드 후보를 SVG 미리보기로 제공합니다.

## Product Summary

### 해결하려는 문제

CSV나 스프레드시트 원본은 데이터 확인에는 적합하지만, 의사결정자에게 바로 보여줄 수 있는 인포그래픽 형태로 정리하려면 기획, 데이터 해석, 차트 선택, 레이아웃 설계가 필요합니다. CANVAS AI는 이 초기 탐색 과정을 자동화해 시각화 방향을 빠르게 비교할 수 있게 합니다.

### 핵심 사용자 가치

- CSV 업로드만으로 데이터 구조와 주요 표 영역을 자동 해석합니다.
- 같은 데이터에 대해 서로 다른 대시보드 디자인 후보를 생성합니다.
- 생성 결과를 SVG 미리보기로 확인해 기획 방향을 빠르게 비교합니다.
- 향후 선택한 후보를 캔버스 편집 단계로 연결할 수 있는 구조를 갖고 있습니다.

### 주요 사용자

- 데이터 기반 리포트 초안을 빠르게 만들고 싶은 서비스 기획자
- 대시보드/인포그래픽 방향을 검토하는 디자이너
- CSV 데이터를 시각화 화면으로 전환하는 내부 운영/분석 담당자
- AI 기반 화면 생성 플로우를 검증하는 개발자

## Current User Flow

1. 사용자가 홈 화면(`/`)에서 CSV 파일을 업로드합니다.
2. 브라우저가 파일을 텍스트로 읽고 `POST /api/dashboard-candidates`에 전달합니다.
3. 서버가 CSV grid를 파싱하고 GPT-compatible API로 표 영역을 해석합니다.
4. 서버가 해석된 표 정보를 기반으로 대시보드 후보 2개를 생성합니다.
5. 클라이언트가 응답을 `sessionStorage`에 저장하고 `/canvas`로 이동합니다.
6. `/canvas`에서 생성된 후보 SVG 미리보기를 카드 형태로 비교합니다.

현재 홈 업로드의 주 흐름은 **CSV 업로드 -> 표 구조 해석 -> 대시보드 후보 생성 -> 후보 미리보기**입니다.

## Feature Scope

### 구현됨

- CSV 파일 업로드
- CSV 텍스트 검증
- GPT-compatible API 연동
- CSV grid 기반 표/메모/메타데이터/제목 영역 해석
- 데이터 기반 대시보드 후보 2개 생성
- 후보별 제목, 요약, 디자인 의도, 사용 필드, SVG 미리보기 표시
- SVG sanitizing 후 렌더링
- 업로드 결과를 `sessionStorage`에 저장해 `/canvas`로 전달
- 서버 요청/응답 로그 저장

### 일부 구현됨

- 캔버스 편집 구조
- `text`, `rect`, `line`, `circle` 요소 기반 scene 렌더링
- 요소 선택, 이동, 크기 조절, 텍스트 편집, 삭제, undo
- 직접 scene을 생성하는 `POST /api/scene` API

### 아직 필요함

- 후보 카드 선택 액션
- 선택한 후보를 편집 가능한 scene으로 변환하는 연결 플로우
- 결과 저장, 내보내기, 공유 기능
- CSV 외 파일 형식 지원
- 생성 실패 시 사용자 친화적인 복구/재시도 UX
- 장기 저장소 또는 프로젝트 단위 관리

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Konva / react-konva
- GPT-compatible Chat Completions API
- pnpm

## Requirements

- Node.js 실행 환경
- pnpm, npm, yarn, 또는 bun
- GPT-compatible API URL/key

## Environment Variables

`.env.local` 또는 `.env`에 아래 값을 설정합니다.

```bash
GPT_API_URL=https://codex.the-viral.co.kr/v1
GPT_API_KEY=your_api_key_here
```

선택 사항:

```bash
GPT_MODEL=gpt-5.5
```

`GPT_API_URL`은 OpenAI-compatible `/v1` base URL 또는 전체 `/chat/completions` URL을 사용할 수 있습니다.

예시:

```bash
GPT_API_URL=https://api.openai.com/v1
GPT_API_KEY=your_openai_api_key
```

주의: `https://codex.the-viral.co.kr/chat/completions`처럼 `/v1`이 빠진 경로는 `POST` 요청에서 `Method Not Allowed`가 발생할 수 있습니다.

## Getting Started

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

다른 패키지 매니저를 사용하는 경우 `npm install`, `npm run dev` 등 동일한 스크립트를 사용하면 됩니다.

## API

### `POST /api/dashboard-candidates`

홈 업로드에서 사용하는 현재 주 API입니다.

요청:

```json
{
  "csvText": "name,value\nA,10\nB,20"
}
```

처리 단계:

- CSV 문자열을 grid로 파싱합니다.
- AI가 grid 안의 표/메모/메타데이터/제목 영역을 분리합니다.
- 해석된 표 데이터를 정규화합니다.
- AI가 인포그래픽형 대시보드 후보 2개를 SVG로 생성합니다.
- 응답을 앱 내부 schema로 정규화합니다.

응답 개요:

```json
{
  "resolvedTables": [],
  "dashboardCandidates": [],
  "generationStage": "candidates"
}
```

### `POST /api/scene`

CSV에서 바로 편집 가능한 scene을 생성하는 API입니다. 현재 홈 업로드의 기본 경로는 아니지만, 캔버스 편집 구조와 연결된 실험용/확장용 API로 남아 있습니다.

요청:

```json
{
  "csvText": "name,value\nA,10\nB,20"
}
```

응답 개요:

```json
{
  "scene": {
    "width": 960,
    "height": 560,
    "background": "--surface-panel",
    "elements": []
  },
  "resolvedTables": [],
  "chartRecommendations": []
}
```

## Data And Rendering Model

### CSV parsing

CSV는 브라우저에서 `file.text()`로 읽은 뒤 서버로 전달됩니다. 서버는 내부 CSV parser로 grid를 만들고, AI에게 row/column 좌표 기반의 표 영역 해석을 요청합니다.

### Candidate model

대시보드 후보는 다음 정보를 포함합니다.

- `title`: 후보 이름
- `summary`: 후보 요약
- `designIntent`: 디자인 의도
- `svgPreview`: 미리보기 SVG
- `usedFields`: 후보 생성에 사용된 컬럼
- `notes`: 생성 관련 보조 설명

### Scene model

편집 가능한 scene은 아래 요소 타입을 지원합니다.

- `text`
- `rect`
- `line`
- `circle`

scene은 `width`, `height`, `background`, `elements`로 구성되며, 요소별 위치와 스타일은 앱 내부 schema로 검증됩니다.

## Logging

API 요청은 서버에서 `log/api/<runId>/` 아래에 아티팩트를 남깁니다.

- `request.json`
- `response_raw.json`
- `response.json`

로그는 프롬프트/응답 디버깅, 생성 품질 분석, 실패 케이스 재현에 사용됩니다.

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

## Current Limitations

- 업로드 생성 경로는 CSV만 지원합니다.
- 후보 미리보기는 가능하지만 후보 선택 후 최종 편집 scene으로 전환하는 UI는 아직 연결되지 않았습니다.
- 생성 결과는 브라우저 `sessionStorage`에 저장되며, 새 세션/브라우저 간 공유되지 않습니다.
- 결과 저장, 이미지/PDF 내보내기, 링크 공유는 구현되어 있지 않습니다.
- AI 응답이 schema와 맞지 않거나 안전하지 않은 SVG를 반환하면 정규화/필터링 과정에서 제외될 수 있습니다.
- GPT-compatible API 키와 모델 권한이 올바르지 않으면 생성 단계가 실패합니다.

## Product Roadmap Ideas

- 후보 선택 후 편집 가능한 캔버스 scene 자동 생성
- 후보별 "왜 이 구성이 적합한지" 설명 강화
- 생성 실패 시 재시도, 모델 변경, 프롬프트 조정 옵션 제공
- CSV 외 XLSX, Google Sheets, 붙여넣기 입력 지원
- 프로젝트 저장, 버전 히스토리, 공유 링크
- SVG/PNG/PDF 내보내기
- 브랜드 컬러, 톤앤매너, 템플릿 프리셋 적용
- 데이터 필드 매핑과 차트 타입 수동 조정
