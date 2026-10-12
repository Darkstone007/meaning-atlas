import { createFileRoute } from "@tanstack/react-router";
import { addEntry, clearCookie, currentProfile, enter, listEntries, listProfiles, sessionCookie, setReveal } from "@/lib/atlas/store";

function json(body: unknown, status = 200, cookie?: string) {
  const headers = new Headers({ "content-type": "application/json" });
  if (cookie) headers.append("set-cookie", cookie);
  return new Response(JSON.stringify(body), { status, headers });
}

async function handle({ request }: { request: Request }) {
  const name = new URL(request.url).pathname.split("/").filter(Boolean).pop() || "";
  try {
    if (request.method === "GET" && name === "entries") {
      const profile = await currentProfile(request);
      return json({ profile, entries: await listEntries(profile?.id || null) });
    }
    if (request.method === "GET" && name === "profiles") {
      const profile = await currentProfile(request);
      return json({ profile, profiles: await listProfiles(profile?.id || null) });
    }
    if (request.method === "POST" && name === "enter") {
      const result = await enter(await request.json());
      return json({ id: result.id }, 200, sessionCookie(result.token));
    }
    if (request.method === "POST" && name === "leave") {
      return json({ ok: true }, 200, clearCookie());
    }
    if (request.method === "POST" && name === "profile") {
      const profile = await currentProfile(request);
      if (!profile) return json({ error: "Come in first." }, 401);
      const body = await request.json();
      await setReveal(profile.id, Boolean(body.reveal));
      return json({ ok: true });
    }
    if (request.method === "POST" && name === "entries") {
      const profile = await currentProfile(request);
      if (!profile) return json({ error: "Come in first." }, 401);
      const id = await addEntry(profile.id, await request.json());
      return json({ id });
    }
    return json({ error: "Not found." }, 404);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Something went wrong." }, 400);
  }
}

export const Route = createFileRoute("/api/atlas/$")({
  server: {
    handlers: { GET: handle, POST: handle },
  },
});
