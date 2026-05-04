import { type NextRequest, NextResponse } from "next/server";

function getDjangoOrigin(): string {
  const raw = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  return raw.replace(/\/+$/, "");
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
]);

const EXCLUDE_HEADERS = new Set([...HOP_BY_HOP, "host", "cookie"]);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const origin = getDjangoOrigin();
  if (!origin) {
    return NextResponse.json(
      { detail: "API_URL не настроен на сервере." },
      { status: 502 },
    );
  }

  const rawPath = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");
  const djangoPath = rawPath.endsWith("/") ? rawPath : `${rawPath}/`;
  const upstreamUrl = `${origin}${djangoPath}${req.nextUrl.search}`;

  const forwardHeaders = new Headers();
  for (const [key, value] of req.headers) {
    if (!EXCLUDE_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
  });

  const resHeaders = new Headers();
  for (const [key, value] of upstream.headers) {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  }

  return new NextResponse(upstream.body ?? null, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
