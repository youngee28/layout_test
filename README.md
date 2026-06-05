# Layout Test

CSV 표 데이터를 업로드하면 Gemini로 인포그래픽용 씬 JSON을 생성하고, `/canvas`에서 바로 편집해볼 수 있는 Next.js 앱입니다.

## What it does

- 홈 화면(`/`)에서 CSV 파일을 선택합니다.
- 브라우저가 파일을 텍스트로 읽은 뒤 `POST /api/scene`으로 전송합니다.
- 서버가 Gemini에 씬 생성을 요청하고, 응답을 정규화한 뒤 JSON으로 돌려줍니다.
- 클라이언트가 생성된 씬을 `sessionStorage`에 저장하고 `/canvas`로 이동합니다.
- `/canvas`는 업로드 직후 생성된 씬을 먼저 읽고, 없으면 개발용 fallback으로 `GET /api/scene`을 호출합니다.

## Requirements

- Node.js
- pnpm, npm, yarn, 또는 bun
- Gemini API key (`GEMINI_API_KEY` 또는 `GOOGLE_API_KEY`)

## Environment variables

`.env.local` 또는 `.env`에 아래 값을 넣어야 합니다.

```bash
GEMINI_API_KEY=your_api_key_here
```

선택 사항:

```bash
GEMINI_MODEL=gemini-2.5-flash
```

지정하지 않으면 기본 모델은 `gemini-2.5-flash`입니다.

## Getting started

```bash
pnpm install
pnpm dev
```

또는 사용하는 패키지 매니저에 맞춰 `npm install`, `npm run dev` 등을 사용하면 됩니다.

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열면 업로드 화면이 나옵니다.

## App flow

### 1. Upload from the home page

- 업로드 UI는 `src/components/home/upload-card.tsx`에 있습니다.
- 현재 실제 생성 경로는 **CSV만 지원**합니다.
- 파일은 브라우저에서 `file.text()`로 읽으며, 별도의 CSV 파싱 라이브러리는 사용하지 않습니다.

### 2. Generate a scene through `/api/scene`

`POST /api/scene`

- 요청 본문: `{ "csvText": string }`
- 빈 문자열이거나 형식이 맞지 않으면 에러를 반환합니다.
- 서버는 CSV 원문을 프롬프트에 넣어 Gemini에 전달합니다.
- Gemini 응답은 JSON으로 파싱한 뒤 앱이 지원하는 씬 구조로 정규화됩니다.

`GET /api/scene`

- 업로드 없이 `/canvas`를 열었을 때 사용하는 개발용 fallback 경로입니다.
- 서버가 `input/data.csv`를 읽어서 같은 생성 로직을 실행합니다.

## Canvas behavior

`/canvas`는 먼저 브라우저 `sessionStorage`에 저장된 업로드 결과를 읽습니다. 업로드 직후 이동한 경우에는 다시 생성 요청하지 않고 그 결과를 바로 렌더링합니다.

현재 편집 가능한 요소 타입:

- `text`
- `rect`
- `line`
- `circle`

현재 가능한 상호작용:

- 요소 선택
- 드래그로 위치 이동
- Transformer로 크기 조절
- 텍스트 더블클릭/더블탭 후 인라인 편집

## Logging

`/api/scene` 요청은 서버에서 `log/api/<runId>/` 아래에 아티팩트를 남깁니다.

- `request.json`
- `response_raw.json`
- `response.json`

## Development fallback setup

업로드 없이 `/canvas` 경로를 직접 테스트하려면 `input/data.csv` 파일이 필요합니다.

예시:

```text
input/data.csv
```

이 파일이 없으면 `GET /api/scene` fallback 경로는 실패합니다.

## Available scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm generate:jsx
pnpm generate:konva
```

`generate:jsx`와 `generate:konva` 스크립트도 정의되어 있지만, 현재 웹앱의 주 사용자 흐름은 **CSV 업로드 → `/api/scene` 생성 → `/canvas` 편집**입니다.

## Current limitations

- 업로드 생성 경로는 현재 CSV만 지원합니다.
- 로딩 상태는 파일 읽기 시간과 API 생성 시간을 함께 보여줍니다.
- 생성된 씬은 브라우저 `sessionStorage`를 통해 다음 화면으로 넘기며, 별도 저장/내보내기 기능은 구현되어 있지 않습니다.
- 지원하지 않는 요소 타입이 생성되면 정규화 과정에서 제외되며, 지원 요소가 하나도 없으면 에러가 발생합니다.
