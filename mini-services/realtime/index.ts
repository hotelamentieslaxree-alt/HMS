// ARIA HMS — Real-time event bus (socket.io)
// Port: 3003 (hardcoded)
// Exposes:
//   GET  /health
//   POST /broadcast  { event, propertyId?, payload }
// Clients connect via io("/?XTransformPort=3003") through the Caddy gateway.

import { createServer } from "http";
import { Server } from "socket.io";

const PORT = 3003;

const httpServer = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "hms-realtime",
        port: PORT,
        connections: io.engine.clientsCount,
      })
    );
    return;
  }

  if (req.url === "/broadcast" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const { event, propertyId, payload } = data;
        if (!event) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: "event required" }));
          return;
        }
        if (propertyId) {
          io.to(`property:${propertyId}`).emit(event, payload ?? {});
        } else {
          io.emit(event, payload ?? {});
        }
        console.log(
          `[broadcast] event=${event} property=${propertyId ?? "global"} clients=${io.engine.clientsCount}`
        );
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, event, delivered: true }));
      } catch (e: any) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const io = new Server(httpServer, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`);
  socket.on("subscribe", ({ propertyId }: { propertyId?: string }) => {
    if (propertyId) {
      socket.join(`property:${propertyId}`);
      console.log(`[realtime] ${socket.id} joined property:${propertyId}`);
    }
  });
  socket.on("disconnect", () => {
    console.log(`[realtime] client disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[hms-realtime] listening on :${PORT}`);
});
