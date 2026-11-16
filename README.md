# Madridista — 레알마드리드 팬페이지

화이트를 기본으로 네이비와 골드를 사용한 Next.js 팬페이지입니다. 제공된 2026–27 선수단 JSON 기반 4-3-3 베스트 11, football-data.org 경기 일정, 브라우저별 팬 평점 입력 기능을 포함합니다.

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## API 키

로컬 비밀키는 `.env.local`의 `FOOTBALL_DATA_API_KEY`에 입력하세요. `.env.local`은 Git에서 제외됩니다. `.env.example`에는 실제 키를 넣지 마세요. 키는 서버 코드에서만 읽고, `NEXT_PUBLIC_` 접두사는 붙이지 마세요. 키를 바꾸면 개발 서버를 재시작해야 합니다.

## 데이터 안내

- 선수단과 시즌 평균은 `src/data/real-madrid-2026-27.json`의 입력 데이터입니다. 최근 5경기 평점 필드는 의도적으로 사용하지 않습니다.
- 일정 API는 서버에서 `FOOTBALL_DATA_API_KEY`를 사용합니다. 무료 플랜에서 제공되는 LaLiga와 Champions League의 일정은 표시되며, Copa del Rey는 플랜 커버리지에 따라 표시되지 않을 수 있습니다.
- 팬 평점 입력은 현재 해당 브라우저의 `localStorage`에만 저장됩니다. 방문자 사이의 공용 투표 집계에는 데이터베이스 연결이 필요합니다.
- 샘플 데이터를 실제 정보로 바꾸려면 `src/lib/data.ts`를 수정하거나 허가된 데이터 제공자를 연결하세요.
- 팬 페이지는 비공식 프로젝트이며 레알마드리드 CF와 제휴되어 있지 않습니다.

## 경기장 사진 출처

`public/images/bernabeu-hero.jpg`는 Wikimedia Commons의 [Estadio Santiago Bernabéu Madrid](https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg) 사진을 크롭한 이미지입니다. 저작자 Zoser, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 라이선스. 출처와 크롭 편집 여부를 웹페이지에도 표시합니다.

레알마드리드 엠블럼 SVG(`public/images/real-madrid-crest.svg`)는 [football-data.org crest CDN](https://crests.football-data.org/86.svg)에서 내려받은 이미지입니다. 엠블럼은 구단의 상표이며 사이트는 비공식 팬 프로젝트입니다.
