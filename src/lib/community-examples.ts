export const communityBoards = [
  { id: "match_discussion", label: "경기 토론", hint: "경기 전·후 생각을 나눠요" },
  { id: "tactics_players", label: "전술·선수", hint: "포메이션과 선수 이야기를 해요" },
  { id: "free_chat", label: "자유·잡담", hint: "유니폼·직관·일상 이야기도 환영" },
] as const;

export type CommunityBoardId = (typeof communityBoards)[number]["id"];

export const communityExamples = [
  {
    id: "example-match-1",
    board: "match_discussion",
    title: "경기 흐름을 함께 되짚어보는 예시 토론",
    summary: "전반과 후반의 리듬, 어떤 장면이 기억에 남나요?",
    body: "이 글은 팬라운지 화면을 미리 보는 예시 게시글입니다.\n\n특정 실제 경기를 가리키지 않습니다. 경기 중 인상 깊었던 장면이나 응원하면서 느낀 점을 자유롭게 나눠보는 공간이에요.",
  },
  {
    id: "example-match-2",
    board: "match_discussion",
    title: "다음 경기에서 기대하는 포인트 — 예시 게시글",
    summary: "경기 전 생각을 나누는 게시판 예시입니다.",
    body: "이 글은 게시판 구성을 위한 예시 게시글입니다.\n\n다음 경기를 앞두고 기대하는 플레이나 응원 메시지를 적어보는 모습을 보여줍니다. 실제 경기 일정이나 선수 출전 정보는 포함하지 않습니다.",
  },
  {
    id: "example-tactics-1",
    board: "tactics_players",
    title: "4-3-3 중원 간격을 살펴보는 예시 전술 글",
    summary: "포메이션과 움직임을 이야기하는 게시판 예시입니다.",
    body: "이 글은 전술·선수 게시판의 예시 게시글입니다.\n\n4-3-3 포메이션에서 중원 간격과 전환 움직임을 어떻게 볼 수 있을지 이야기하는 형식을 보여줍니다. 실제 경기 분석이나 선수 평가가 아닙니다.",
  },
  {
    id: "example-tactics-2",
    board: "tactics_players",
    title: "선수의 장점을 이야기해봐요 — 예시 게시글",
    summary: "선수 이야기를 나누는 글의 예시입니다.",
    body: "이 글은 화면 확인용 예시 게시글입니다.\n\n선수의 장점이나 플레이 스타일에 대해 팬들이 이야기할 수 있는 게시판 형태를 보여줍니다. 실제 팬이 작성한 의견은 아닙니다.",
  },
  {
    id: "example-chat-1",
    board: "free_chat",
    title: "이번 시즌 유니폼, 어떤 디자인이 취향인가요?",
    summary: "유니폼 이야기를 나누는 자유·잡담 예시입니다.",
    body: "이 글은 자유·잡담 게시판을 소개하는 예시 게시글입니다.\n\n좋아하는 유니폼 디자인이나 소장한 굿즈에 대해 편하게 이야기하는 모습을 보여줍니다. 실제 팬 활동 기록은 아닙니다.",
  },
  {
    id: "example-chat-2",
    board: "free_chat",
    title: "직관 갈 때 꼭 챙기는 것 — 예시 게시글",
    summary: "직관 후기와 일상 이야기를 위한 게시판 예시입니다.",
    body: "이 글은 둘러보기용 예시 게시글입니다.\n\n직관 준비물이나 경기장에 가는 날의 소소한 일상을 나누는 공간을 보여줍니다. 실제 관람 후기나 작성자가 있는 글이 아닙니다.",
  },
] satisfies Array<{
  id: string;
  board: CommunityBoardId;
  title: string;
  summary: string;
  body: string;
}>;
