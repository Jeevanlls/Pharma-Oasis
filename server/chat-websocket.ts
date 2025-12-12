import { WebSocketServer, WebSocket } from "ws";
import { Server, IncomingMessage } from "http";
import { storage } from "./storage";
import { parse as parseCookie } from "cookie";
import { sessionStore } from "./session-store";

interface ChatClient {
  ws: WebSocket;
  sessionId: string;
  isAdmin: boolean;
  adminId?: number;
  authenticatedAsAdmin: boolean;
}

const clients: Map<WebSocket, ChatClient> = new Map();
const sessionAdmins: Map<string, Set<number>> = new Map();

let wss: WebSocketServer;

async function getAuthenticatedAdmin(req: IncomingMessage): Promise<{ id: number; role: string } | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  
  const cookies = parseCookie(cookieHeader);
  const sessionCookie = cookies["connect.sid"];
  if (!sessionCookie) return null;
  
  const sessionId = sessionCookie.replace(/^s:/, "").split(".")[0];
  
  return new Promise((resolve) => {
    sessionStore.get(sessionId, (err, session) => {
      if (err || !session || !session.userId) {
        resolve(null);
        return;
      }
      storage.getUser(session.userId).then(user => {
        if (user && user.role === "admin") {
          resolve({ id: user.id, role: user.role });
        } else {
          resolve(null);
        }
      }).catch(() => resolve(null));
    });
  });
}

export function setupChatWebSocket(server: Server) {
  wss = new WebSocketServer({ server, path: "/ws/chat" });

  wss.on("connection", async (ws, req) => {
    const adminAuth = await getAuthenticatedAdmin(req);
    
    (ws as any).__adminAuth = adminAuth;
    
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleMessage(ws, message);
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      if (client?.isAdmin && client.sessionId) {
        const admins = sessionAdmins.get(client.sessionId);
        if (admins && client.adminId) {
          admins.delete(client.adminId);
          broadcastToSession(client.sessionId, {
            type: "admin_left",
            adminId: client.adminId,
          });
        }
      }
      clients.delete(ws);
    });
  });

  console.log("Chat WebSocket server initialized");
}

async function handleMessage(ws: WebSocket, message: any) {
  const { type, sessionId, content } = message;
  const adminAuth = (ws as any).__adminAuth as { id: number; role: string } | null;

  switch (type) {
    case "join_session":
      const isAdmin = !!adminAuth;
      clients.set(ws, {
        ws,
        sessionId,
        isAdmin,
        adminId: adminAuth?.id,
        authenticatedAsAdmin: isAdmin,
      });

      if (isAdmin && adminAuth) {
        if (!sessionAdmins.has(sessionId)) {
          sessionAdmins.set(sessionId, new Set());
        }
        sessionAdmins.get(sessionId)!.add(adminAuth.id);
        
        broadcastToSession(sessionId, {
          type: "admin_joined",
          adminId: adminAuth.id,
        });
      }

      const history = await storage.getChatMessages(sessionId);
      ws.send(JSON.stringify({ type: "history", messages: history }));
      break;

    case "admin_message":
      if (!adminAuth) {
        ws.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
        return;
      }
      if (!sessionId || !content) return;

      await storage.createChatMessage({
        sessionId,
        role: "admin",
        content,
      });

      broadcastToSession(sessionId, {
        type: "new_message",
        message: {
          role: "admin",
          content,
          adminId: adminAuth.id,
          createdAt: new Date().toISOString(),
        },
      });
      break;

    case "visitor_message":
      if (!sessionId || !content) return;

      await storage.createChatMessage({
        sessionId,
        role: "user",
        content,
      });

      broadcastToSession(sessionId, {
        type: "new_message",
        message: {
          role: "user",
          content,
          createdAt: new Date().toISOString(),
        },
      });

      const adminsInSession = sessionAdmins.get(sessionId);
      if (!adminsInSession || adminsInSession.size === 0) {
        const history = await storage.getChatMessages(sessionId);
        const messages = history.map(m => ({ 
          role: m.role as "user" | "assistant", 
          content: m.content 
        }));
        
        const { generateChatResponse } = await import("./ai-chat");
        const response = await generateChatResponse(messages, sessionId);
        
        await storage.createChatMessage({
          sessionId,
          role: "assistant",
          content: response,
        });

        broadcastToSession(sessionId, {
          type: "new_message",
          message: {
            role: "assistant",
            content: response,
            createdAt: new Date().toISOString(),
          },
        });
      }
      break;

    case "leave_session":
      const client = clients.get(ws);
      if (client?.isAdmin && client.adminId) {
        const admins = sessionAdmins.get(sessionId);
        if (admins) {
          admins.delete(client.adminId);
        }
        broadcastToSession(sessionId, {
          type: "admin_left",
          adminId: client.adminId,
        });
      }
      clients.delete(ws);
      break;
  }
}

function broadcastToSession(sessionId: string, message: any) {
  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}

export function getActiveSessionIds(): string[] {
  const activeSessionIds = new Set<string>();
  clients.forEach((client) => {
    if (!client.isAdmin) {
      activeSessionIds.add(client.sessionId);
    }
  });
  return Array.from(activeSessionIds);
}

export function hasAdminInSession(sessionId: string): boolean {
  const admins = sessionAdmins.get(sessionId);
  return !!(admins && admins.size > 0);
}
