import { ApiError, BackendApi } from "./api";

const SERVICE_NAME = "nptel-telegram-bot";

export interface Env {
  KV: KVNamespace;
  BACKEND: Fetcher;
  TELEGRAM_BOT_TOKEN: string;
}

interface TelegramUpdate {
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const startTime = Date.now();
    const wideEvent: Record<string, unknown> = {
      service: SERVICE_NAME,
      method: request.method,
    };

    if (request.method !== "POST") {
      wideEvent.outcome = "skipped";
      wideEvent.reason = "method_not_allowed";
      return logAndReturn(wideEvent, startTime, 405, { error: "Method not allowed" });
    }

    const body = await request.json() as TelegramUpdate;
    const message = body.message;

    if (!message?.text || !message?.chat) {
      wideEvent.outcome = "skipped";
      wideEvent.reason = "no_message";
      return logAndReturn(wideEvent, startTime, 200, { ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    wideEvent.chat_id = chatId;
    wideEvent.message_id = message.message_id;

    const command = extractCommand(text);
    wideEvent.command = command;

    const api = new BackendApi(env.BACKEND);

    try {
      switch (command) {
        case "/start":
          await handleStart(env, api, chatId, wideEvent);
          break;
        case "/watch":
          await handleWatch(env, api, chatId, text, wideEvent);
          break;
        case "/unwatch":
          await handleUnwatch(env, api, chatId, text, wideEvent);
          break;
        case "/list":
          await handleList(env, api, chatId, wideEvent);
          break;
        default:
          wideEvent.action = "help";
          await sendMessage(env, chatId, helpText());
          break;
      }

      wideEvent.outcome = "success";
      return logAndReturn(wideEvent, startTime, 200, { ok: true });
    } catch (error) {
      wideEvent.outcome = "error";
      wideEvent.error = {
        message: error instanceof Error ? error.message : "unknown",
        type: error instanceof Error ? error.name : typeof error,
        status: (error as { status?: number }).status,
        cause: error instanceof Error ? String(error.cause ?? "") : "",
      };

      await sendMessage(
        env,
        chatId,
        error instanceof ApiError
          ? error.toDiagnostic()
          : error instanceof Error
            ? error.message
            : "Something went wrong",
      );

      return logAndReturn(wideEvent, startTime, 200, { ok: true });
    }
  },
};

function extractCommand(text: string): string {
  if (text.startsWith("/start")) return "/start";
  if (text.startsWith("/watch")) return "/watch";
  if (text.startsWith("/unwatch")) return "/unwatch";
  if (text.startsWith("/list")) return "/list";
  return text.split(" ")[0];
}

async function handleStart(
  env: Env,
  api: BackendApi,
  chatId: number,
  wideEvent: Record<string, unknown>,
): Promise<void> {
  const existing = await env.KV.get(`chat_${chatId}`);

  if (existing) {
    wideEvent.subscriber_id = existing;
    wideEvent.action = "welcome_back";
    await sendMessage(env, chatId, `Welcome back!${helpText()}`);
    return;
  }

  const subscriberId = await api.createSubscriber(chatId);
  await env.KV.put(`chat_${chatId}`, subscriberId);

  wideEvent.subscriber_id = subscriberId;
  wideEvent.action = "registered";

  await sendMessage(
    env,
    chatId,
    `Registered!${helpText()}`,
  );
}

async function handleWatch(
  env: Env,
  api: BackendApi,
  chatId: number,
  text: string,
  wideEvent: Record<string, unknown>,
): Promise<void> {
  const subscriberId = await getSubscriberId(env, chatId);
  wideEvent.subscriber_id = subscriberId;

  const args = text.replace(/^\/watch\s*/, "").trim();

  if (!args) {
    wideEvent.action = "watch_usage";
    await sendMessage(env, chatId, "Usage: /watch <query1> <query2> ...");
    return;
  }

  const queries = args.split(/\s+/).filter((q) => q.length > 0);
  const added: string[] = [];
  const skipped: string[] = [];

  for (const query of queries) {
    try {
      await api.addCourseQuery(subscriberId, query);
      added.push(query);
    } catch {
      skipped.push(query);
    }
  }

  wideEvent.action = "watch";
  wideEvent.queries_added = added;
  wideEvent.queries_skipped = skipped;
  wideEvent.queries_count = added.length;

  const lines: string[] = [];
  if (added.length > 0) {
    lines.push(`Added: ${added.join(", ")}`);
  }
  if (skipped.length > 0) {
    lines.push(`Skipped: ${skipped.join(", ")}`);
  }
  lines.push(`\n/list — see all your queries`);

  await sendMessage(env, chatId, lines.join("\n"));
}

async function handleUnwatch(
  env: Env,
  api: BackendApi,
  chatId: number,
  text: string,
  wideEvent: Record<string, unknown>,
): Promise<void> {
  const subscriberId = await getSubscriberId(env, chatId);
  wideEvent.subscriber_id = subscriberId;

  const args = text.replace(/^\/unwatch\s*/, "").trim();

  if (!args) {
    wideEvent.action = "unwatch_usage";
    await sendMessage(env, chatId, "Usage: /unwatch <query> or /unwatch all");
    return;
  }

  if (args === "all") {
    const queries = await api.listCourseQueries(subscriberId);
    for (const q of queries) {
      await api.removeCourseQuery(subscriberId, q.id);
    }

    wideEvent.action = "unwatch_all";
    wideEvent.queries_removed_count = queries.length;

    await sendMessage(env, chatId, `Removed all ${queries.length} queries.`);
    return;
  }

  const queries = await api.listCourseQueries(subscriberId);
  const match = queries.find(
    (q) => q.courseQuery.toLowerCase() === args.toLowerCase(),
  );

  if (!match) {
    wideEvent.action = "unwatch_not_found";
    wideEvent.query_text = args;
    await sendMessage(env, chatId, `Query "${args}" not found. /list — see your queries`);
    return;
  }

  await api.removeCourseQuery(subscriberId, match.id);

  wideEvent.action = "unwatch";
  wideEvent.query_removed = match.courseQuery;

  await sendMessage(env, chatId, `Removed: ${match.courseQuery}`);
}

async function handleList(
  env: Env,
  api: BackendApi,
  chatId: number,
  wideEvent: Record<string, unknown>,
): Promise<void> {
  const subscriberId = await getSubscriberId(env, chatId);
  wideEvent.subscriber_id = subscriberId;
  wideEvent.action = "list";

  const queries = await api.listCourseQueries(subscriberId);
  wideEvent.queries_count = queries.length;

  if (queries.length === 0) {
    await sendMessage(
      env,
      chatId,
      `You aren't tracking any courses yet.\n/watch algebra cloud — start tracking`,
    );
    return;
  }

  const list = queries
    .map((q, i) => `${i + 1}. ${q.courseQuery}`)
    .join("\n");

  await sendMessage(
    env,
    chatId,
    `Your course queries:\n\n${list}\n\n/unwatch <query> to remove`,
  );
}

async function getSubscriberId(
  env: Env,
  chatId: number,
): Promise<string> {
  const id = await env.KV.get(`chat_${chatId}`);

  if (!id) {
    throw new Error("Not registered. Send /start first.");
  }

  return id;
}

async function sendMessage(
  env: Env,
  chatId: number,
  text: string,
): Promise<void> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

function helpText(): string {
  return `

/watch algebra cloud — track courses
/list — see your queries
/unwatch algebra — stop tracking
/unwatch all — stop everything`;
}

function logAndReturn(
  wideEvent: Record<string, unknown>,
  startTime: number,
  status: number,
  body: unknown,
): Response {
  wideEvent.duration_ms = Date.now() - startTime;
  console.log(JSON.stringify(wideEvent));
  return Response.json(body, { status });
}
