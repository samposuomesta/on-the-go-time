/**
 * Send a Slack message via Slack Web API using a Bot Token (xoxb-...).
 * Returns { ok, error? } so callers can log failures without throwing.
 */
export interface SlackSendResult {
  ok: boolean;
  error?: string;
  channel?: string;
}

export async function sendSlackMessage(
  botToken: string,
  channel: string,
  text: string,
): Promise<SlackSendResult> {
  if (!botToken || !channel || !text) {
    return { ok: false, error: "missing-params" };
  }
  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        error: data?.error || `http_${res.status}`,
        channel,
      };
    }
    return { ok: true, channel: data.channel };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
