# Madridista — 레알마드리드 팬페이지

한국 팬을 위한 비공식 경기 매거진입니다. 홈, 매치센터, 팬라운지로 구성되어 있으며, 2026–27 선수단과 시즌 평균은 `src/data/real-madrid-2026-27.json`에 입력된 데이터를 사용합니다.

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 경기 일정 API (선택)

football-data.org 키가 있으면 루트 `.env.local`에 설정합니다. 키가 없어도 앱과 빌드는 실행되며, 경기 데이터 영역에는 `경기 일정을 불러올 수 없습니다`라고 표시됩니다.

```env
FOOTBALL_DATA_API_KEY=your_api_key_here
```

## 데이터와 기능 범위

- 경기 일정과 결과는 서버 API에서 football-data.org로부터 가져옵니다. 표시 대회는 API 계정 플랜의 제공 범위에 따르며 Copa del Rey는 빠질 수 있습니다.
- 브라우저 평점은 종료된 경기에서 실제 출전 명단이 제공될 때만 입력할 수 있고, `localStorage`에 이 브라우저 전용으로 저장됩니다. 공용 평균으로 집계하지 않습니다.
- 팬라운지 글은 둘러보기용 예시이며 실제 팬 활동이 아닙니다. 로그인, 글쓰기, 댓글, 쪽지는 포함하지 않습니다.
- 이 사이트는 레알마드리드 CF와 제휴되지 않은 비공식 팬 프로젝트입니다.

## Vercel 배포

GitHub에 푸시한 뒤 Vercel에서 이 Next.js 저장소를 가져오면 배포할 수 있습니다. 일정 데이터를 표시하려면 Vercel Project Settings → Environment Variables에 `FOOTBALL_DATA_API_KEY`를 추가하세요. 키가 없어도 빌드와 페이지는 동작합니다.

## 경기장 사진 출처

`public/images/bernabeu-hero.jpg`는 Wikimedia Commons의 [Estadio Santiago Bernabéu Madrid](https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg) 사진을 크롭한 이미지입니다. 저작자 Zoser, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 라이선스. 출처와 크롭 편집 여부를 웹페이지에도 표시합니다.

레알마드리드 엠블럼 SVG(`public/images/real-madrid-crest.svg`)는 [football-data.org crest CDN](https://crests.football-data.org/86.svg)에서 내려받은 이미지입니다. 엠블럼은 구단의 상표이며 사이트는 비공식 팬 프로젝트입니다.
