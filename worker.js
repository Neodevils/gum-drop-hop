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

    const drop = () => { this.peers.delete(id); this.broadcast(id, { t: 'leave', from: id }); };
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

export default {
  fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.endsWith('/ws')) {
      const room = url.searchParams.get('room') || 'lobby';
      return env.ROOM.get(env.ROOM.idFromName(room)).fetch(req);
    }
    return new Response('gum-drop-hop relay', {status: 200});
  },
};
