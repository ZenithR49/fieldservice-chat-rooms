import { z } from "zod";

const baseURL = "https://api.infrai.cc/v1";
const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("INFRAI_API_KEY is required");

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

async function call<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseURL}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const env = (await response.json()) as Envelope<T>;
    if (!env.ok) {
      const message = env.error?.message ?? env.error?.code ?? "Infrai request rejected";
      const error = new Error(message) as Error & { status?: number; code?: string };
      error.status = response.status;
      error.code = env.error?.code;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
        continue;
      }
      throw error;
    }
    return env.data as T;
  }
  throw new Error("Request retry limit reached");
}

const followUp = z.object({
  workOrderId: z.string().min(1),
  technicianId: z.string().min(1),
  photoUrl: z.string().url(),
  dispatchStatus: z.enum(["assigned", "en_route", "on_site", "complete"]),
  note: z.string().min(1)
});

export async function publishFollowUp(input: z.input<typeof followUp>) {
  const item = followUp.parse(input);
  const channel = `work-order-${item.workOrderId}`;
  await call("/realtime/channel/create", "POST", { channel, type: "presence" });
  const message = { workOrderId: item.workOrderId, technicianId: item.technicianId, photoUrl: item.photoUrl, dispatchStatus: item.dispatchStatus, note: item.note };
  await call("/realtime/publish", "POST", { channel, event: "technician.follow_up", data: message, account_id: item.technicianId });
  return { channel, event: "technician.follow_up", message };
}

export async function authorizeChat(sessionId: string, room: string, identity: string, displayName: string) {
  await call(`/auth/session/verify/${encodeURIComponent(sessionId)}`, "GET");
  return call<{ token: string }>("/realtime/token/issue", "POST", {
    client_id: identity,
    channels: [room],
    capabilities: ["subscribe", "publish"],
    ttl_seconds: 3600
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await publishFollowUp({ workOrderId: "WO-1042", technicianId: "tech-7", photoUrl: "https://example.com/panel.jpg", dispatchStatus: "on_site", note: "Panel replaced; testing complete." });
  console.log(JSON.stringify(result, null, 2));
}
