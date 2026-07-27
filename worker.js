// Relay only: one Durable Object per room, broadcasts every message to the other
// peers with a `from` id attached. Carries WebRTC signaling and key events alike —
// no game state ever touches the server.

export class Room {
  constructor() { this.peers = new Map(); this.next = 0; }

  async fetch() {
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    const id = ++this.next;
    const host = this.peers.size === 0;
    this.peers.set(id, server);
    this.send(server, { t: 'role', host, id });
    if (!host) this.broadcast(id, { t: 'join', from: id });

    server.addEventListener('message', e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      m.from = id;
      this.broadcast(id, m, m.to);
    });

    // close and error can both fire for one socket; only announce the departure once.
    const drop = () => {
      if (!this.peers.delete(id)) return;
      this.broadcast(id, { t: 'leave', from: id });
    };
    server.addEventListener('close', drop);
    server.addEventListener('error', drop);

    return new Response(null, { status: 101, webSocket: client });
  }

  broadcast(from, msg, only) {
    for (const [pid, ws] of this.peers)
      if (pid !== from && (only == null || pid === only)) this.send(ws, msg);
  }
  send(ws, msg) { try { ws.send(JSON.stringify(msg)); } catch {} }
}

// Discord may or may not strip the mapped /api prefix before forwarding, so every
// route answers under both spellings.
const at = (path, ...names) => names.some(n => path === n || path === `/api${n}`);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (at(url.pathname, '/ws', '/room')) {
      const room = url.searchParams.get('room') || 'lobby';
      return env.ROOM.get(env.ROOM.idFromName(room)).fetch(req);
    }

    // Exchanges the Embedded App SDK's authorization code for a token so the client
    // can call setActivity. Needs DISCORD_CLIENT_ID + DISCORD_CLIENT_SECRET secrets.
    if (at(url.pathname, '/auth/discord/token') && req.method === 'POST') {
      if (!env.DISCORD_CLIENT_SECRET) return json({ error: 'secret_not_configured' }, 500);
      const { code } = await req.json().catch(() => ({}));
      if (!code) return json({ error: 'missing_code' }, 400);
      const res = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: env.DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
        }),
      });
      return new Response(await res.text(), { status: res.status,
        headers: { 'content-type': 'application/json; charset=utf-8' } });
    }

    // The client id is public; serving it keeps one source of truth in the secrets
    // store instead of a constant baked into the HTML.
    if (at(url.pathname, '/config')) return json({ client_id: env.DISCORD_CLIENT_ID || '' });

    // Reports only whether the secret is bound, never its value.
    if (at(url.pathname, '/health'))
      return json({ ok: true, secret_bound: !!env.DISCORD_CLIENT_SECRET });
    return new Response('gum-drop-hop relay', { status: 200 });
  },
};

const json = (o, status = 200) => new Response(JSON.stringify(o), { status,
  headers: { 'content-type': 'application/json; charset=utf-8' } });
