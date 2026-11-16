# Madridista — 레알마드리드 팬페이지

한국 팬을 위한 비공식 경기 매거진입니다. 홈, 매치센터, 팬라운지로 구성되어 있으며, 2026–27 선수단과 시즌 평균은 `src/data/real-madrid-2026-27.json`에 입력된 데이터를 사용합니다.

## 시작하기

Node.js 20 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 환경변수 및 Supabase 설정

`.env.example`을 참고해 루트 `.env.local`을 만들고 실제 값을 입력합니다. `.env.local`은 Git에서 제외됩니다.

```env
FOOTBALL_DATA_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행합니다. Auth에서 이메일 가입을 활성화하고, 운영자 계정은 가입 후 SQL 파일 마지막 주석의 예시대로 `site_admins`에 추가하세요. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀키입니다. 브라우저 변수명으로 바꾸거나 저장소에 커밋하지 마세요.

Vercel에서는 **Project Settings → Environment Variables**에 같은 변수를 설정한 뒤 새 배포를 생성합니다.

## 데이터와 기능 범위

- 경기 일정과 결과는 서버 API에서 football-data.org로부터 가져옵니다. 표시 대회는 API 계정 플랜의 제공 범위에 따르며 Copa del Rey는 빠질 수 있습니다.
- 경기 평점은 종료된 경기에서 실제 출전 명단을 API가 제공한 경우에만 활성화합니다. 명단이 없거나 Supabase 서버 설정이 없으면 평점 입력을 열지 않습니다.
- 계정·경기·선수당 평점은 DB unique key로 하나만 저장되며 재평가 시 기존 점수를 수정합니다. 팬 평균은 경기별로 집계되고 시즌 평균과 별도로 표시합니다.
- 게시글과 댓글은 공개 열람, 작성은 로그인 필수이며 수정·삭제는 작성자에게만 허용합니다. 신고와 운영자 숨김은 RLS로 제한합니다.
- 비공개 1:1 쪽지는 첫 배포 범위에 포함하지 않습니다.
- 이 사이트는 레알마드리드 CF와 제휴되지 않은 비공식 팬 프로젝트입니다.

## 경기장 사진 출처

`public/images/bernabeu-hero.jpg`는 Wikimedia Commons의 [Estadio Santiago Bernabéu Madrid](https://commons.wikimedia.org/wiki/File:Estadio_Santiago_Bernab%C3%A9u_Madrid.jpg) 사진을 크롭한 이미지입니다. 저작자 Zoser, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 라이선스. 출처와 크롭 편집 여부를 웹페이지에도 표시합니다.

레알마드리드 엠블럼 SVG(`public/images/real-madrid-crest.svg`)는 [football-data.org crest CDN](https://crests.football-data.org/86.svg)에서 내려받은 이미지입니다. 엠블럼은 구단의 상표이며 사이트는 비공식 팬 프로젝트입니다.
