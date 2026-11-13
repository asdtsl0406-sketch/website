# Madridista — 레알마드리드 팬페이지

화이트를 기본으로 네이비와 골드를 사용한 Next.js 팬페이지 프로토타입입니다. 제공된 2026–27 선수단 JSON 기반 4-3-3 베스트 11과 시즌 평균 평점, 예시 일정, 브라우저별 팬 투표 기능을 포함합니다.

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 데이터 안내

- 선수단과 시즌 평균은 `src/data/real-madrid-2026-27.json`의 입력 데이터입니다. 최근 5경기 평점 필드는 의도적으로 사용하지 않습니다.
- 경기 일정은 UI 확인을 위한 예시 데이터이며 실제 일정과 다를 수 있습니다.
- 선수별 내 팬 평점은 브라우저 `localStorage`에만 저장되며 서버로 전송되지 않습니다.
- 샘플 데이터를 실제 정보로 바꾸려면 `src/lib/data.ts`를 수정하거나 허가된 데이터 제공자를 연결하세요.
- 팬 페이지는 비공식 프로젝트이며 레알마드리드 CF와 제휴되어 있지 않습니다.

## 경기장 사진 출처

`public/images/bernabeu-hero.jpg`는 Wikimedia Commons의 [Estadio Santiago Bernabéu Madrid](https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg) 사진을 크롭한 이미지입니다. 저작자 Zoser, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 라이선스. 출처와 크롭 편집 여부를 웹페이지에도 표시합니다.
