export type SupabaseNetworkReason =
  | "address"
  | "refused"
  | "timeout"
  | "tls"
  | "header"
  | "reset"
  | "unknown";

export const SUPABASE_NETWORK_MESSAGES: Record<SupabaseNetworkReason, string> = {
  address: "Supabase 주소를 찾을 수 없습니다. SUPABASE_URL의 프로젝트 주소를 확인해주세요.",
  refused: "Supabase가 연결을 거부했습니다. 프로젝트가 Paused 상태인지 확인해주세요.",
  timeout: "Supabase가 응답하지 않습니다. 잠시 후 다시 시도하거나 프로젝트 상태를 확인해주세요.",
  tls: "Supabase와 보안 연결에 실패했습니다. 네트워크 환경을 확인해주세요.",
  header: "SUPABASE_SECRET_KEY 값에 잘못된 문자가 있습니다. Vercel에서 키를 다시 입력해주세요.",
  reset: "Supabase 연결이 중간에 끊겼습니다. 잠시 후 다시 시도해주세요.",
  unknown: "Supabase에 연결하지 못했습니다. SUPABASE_URL과 프로젝트 상태를 확인해주세요.",
};

function getErrorText(error: Error): string {
  const cause = (error as Error & { cause?: unknown }).cause;
  const causeMessage = cause instanceof Error ? cause.message : "";
  const causeCode =
    cause instanceof Error ? (cause as Error & { code?: unknown }).code : undefined;

  return `${error.name} ${error.message} ${causeMessage} ${typeof causeCode === "string" ? causeCode : ""}`;
}

export function classifySupabaseFetchFailure(error: unknown): SupabaseNetworkReason {
  if (!(error instanceof Error)) return "unknown";
  if (error.name === "TimeoutError" || error.name === "AbortError") return "timeout";

  const text = getErrorText(error);

  if (/header|bytestring/i.test(text)) return "header";
  if (/ENOTFOUND|EAI_AGAIN/i.test(text)) return "address";
  if (/ECONNREFUSED/i.test(text)) return "refused";
  if (/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|UND_ERR_BODY_TIMEOUT/i.test(text)) {
    return "timeout";
  }
  if (/CERT_|UNABLE_TO_VERIFY|SELF_SIGNED|ERR_TLS/i.test(text)) return "tls";
  if (/ECONNRESET|UND_ERR_SOCKET|EPIPE/i.test(text)) return "reset";

  return "unknown";
}
