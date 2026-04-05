import { Router, type IRouter } from "express";
import { eq, desc, count, gte } from "drizzle-orm";
import { db, conversationsTable, messagesTable, serverConfigsTable } from "@workspace/db";
import { bidafChat } from "../lib/bidaf.js";
import {
  SendMessageBody,
  CreateConversationBody,
  GetConversationParams,
  DeleteConversationParams,
  GetConversationMessagesParams,
  DeleteServerParams,
  CreateServerBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/chat/stats", async (req, res): Promise<void> => {
  const [totalConvResult] = await db.select({ count: count() }).from(conversationsTable);
  const [totalMsgResult] = await db.select({ count: count() }).from(messagesTable);

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [weekMsgResult] = await db
    .select({ count: count() })
    .from(messagesTable)
    .where(gte(messagesTable.createdAt, oneWeekAgo));

  const [activeServersResult] = await db.select({ count: count() }).from(serverConfigsTable);

  res.json({
    totalConversations: totalConvResult.count,
    totalMessages: totalMsgResult.count,
    messagesThisWeek: weekMsgResult.count,
    activeServers: activeServersResult.count,
  });
});

router.post("/chat/send", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { conversationId, content, serverId } = parsed.data;

  const [conversation] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId));

  if (!conversation) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messagesTable).values({
    conversationId,
    role: "user",
    content,
  });

  let serverConfig = null;
  const effectiveServerId = serverId ?? conversation.serverId;

  if (effectiveServerId) {
    const [srv] = await db
      .select()
      .from(serverConfigsTable)
      .where(eq(serverConfigsTable.id, effectiveServerId));
    serverConfig = srv;
  } else {
    const [defaultSrv] = await db
      .select()
      .from(serverConfigsTable)
      .where(eq(serverConfigsTable.isDefault, true));
    serverConfig = defaultSrv;
  }

  let assistantContent = "";

  if (serverConfig) {
    let chatMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
    try {
      const messages = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(messagesTable.createdAt);

      chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      }));

      if (serverConfig.baseUrl.startsWith("onnx://")) {
        assistantContent = await bidafChat(chatMessages);
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (serverConfig.apiKey) {
          headers["Authorization"] = `Bearer ${serverConfig.apiKey}`;
        }

        const response = await fetch(`${serverConfig.baseUrl}/api/v1/chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: serverConfig.model,
            messages: chatMessages,
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          assistantContent =
            data?.choices?.[0]?.message?.content ?? "No response from model.";
        } else {
          const errorText = await response.text();
          req.log.warn({ status: response.status, error: errorText }, "AI server returned error");
          assistantContent = await bidafChat(chatMessages);
        }
      }
    } catch (err: any) {
      const isConnRefused = err?.cause?.code === "ECONNREFUSED" || err?.message?.includes("ECONNREFUSED") || err?.message?.includes("fetch failed");
      if (isConnRefused) {
        req.log.warn({ server: serverConfig.name }, "AI server unreachable, falling back to local ONNX model");
        try {
          assistantContent = await bidafChat(chatMessages);
        } catch (onnxErr: any) {
          req.log.error({ msg: onnxErr?.message, stack: onnxErr?.stack, raw: String(onnxErr) }, "ONNX fallback also failed");
          assistantContent = "Both the AI server and local model are unavailable. Please check your configuration.";
        }
      } else {
        req.log.error({ err }, "Failed to call AI server");
        assistantContent = "Failed to reach the AI server. Please check your server configuration.";
      }
    }
  } else {
    assistantContent =
      "No AI server configured. Please add a server in the Servers page to get AI responses.";
  }

  const [assistantMessage] = await db
    .insert(messagesTable)
    .values({
      conversationId,
      role: "assistant",
      content: assistantContent,
    })
    .returning();

  await db
    .update(conversationsTable)
    .set({ updatedAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  res.json({
    id: assistantMessage.id,
    conversationId: assistantMessage.conversationId,
    role: assistantMessage.role,
    content: assistantMessage.content,
    createdAt: assistantMessage.createdAt.toISOString(),
  });
});

router.get("/conversations", async (req, res): Promise<void> => {
  const convs = await db
    .select({
      id: conversationsTable.id,
      title: conversationsTable.title,
      serverId: conversationsTable.serverId,
      createdAt: conversationsTable.createdAt,
      updatedAt: conversationsTable.updatedAt,
      messageCount: count(messagesTable.id),
    })
    .from(conversationsTable)
    .leftJoin(messagesTable, eq(messagesTable.conversationId, conversationsTable.id))
    .groupBy(conversationsTable.id)
    .orderBy(desc(conversationsTable.updatedAt));

  res.json(
    convs.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }))
  );
});

router.post("/conversations", async (req, res): Promise<void> => {
  const parsed = CreateConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [conv] = await db
    .insert(conversationsTable)
    .values({
      title: parsed.data.title,
      serverId: parsed.data.serverId ?? null,
    })
    .returning();

  res.status(201).json({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messageCount: 0,
  });
});

router.get("/conversations/:id", async (req, res): Promise<void> => {
  const params = GetConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json({
    ...conv,
    createdAt: conv.createdAt.toISOString(),
    updatedAt: conv.updatedAt.toISOString(),
    messages: messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

router.delete("/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.id, params.data.id));

  res.sendStatus(204);
});

router.get("/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = GetConversationMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, params.data.id))
    .orderBy(messagesTable.createdAt);

  res.json(
    messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }))
  );
});

router.get("/chat/servers", async (req, res): Promise<void> => {
  const servers = await db
    .select()
    .from(serverConfigsTable)
    .orderBy(desc(serverConfigsTable.isDefault), serverConfigsTable.createdAt);

  res.json(
    servers.map((s) => ({
      id: s.id,
      name: s.name,
      baseUrl: s.baseUrl,
      model: s.model,
      isDefault: s.isDefault,
      createdAt: s.createdAt.toISOString(),
    }))
  );
});

router.post("/chat/servers", async (req, res): Promise<void> => {
  const parsed = CreateServerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.isDefault) {
    await db
      .update(serverConfigsTable)
      .set({ isDefault: false });
  }

  const [server] = await db
    .insert(serverConfigsTable)
    .values({
      name: parsed.data.name,
      baseUrl: parsed.data.baseUrl,
      model: parsed.data.model,
      apiKey: parsed.data.apiKey ?? null,
      isDefault: parsed.data.isDefault ?? false,
    })
    .returning();

  res.status(201).json({
    id: server.id,
    name: server.name,
    baseUrl: server.baseUrl,
    model: server.model,
    isDefault: server.isDefault,
    createdAt: server.createdAt.toISOString(),
  });
});

router.put("/chat/servers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, baseUrl, model, apiKey, isDefault } = req.body as {
    name?: string; baseUrl?: string; model?: string; apiKey?: string; isDefault?: boolean;
  };

  try {
    if (isDefault) {
      await db.update(serverConfigsTable).set({ isDefault: false });
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (baseUrl !== undefined) updates.baseUrl = baseUrl;
    if (model !== undefined) updates.model = model;
    if (apiKey !== undefined) updates.apiKey = apiKey || null;
    if (isDefault !== undefined) updates.isDefault = isDefault;

    const [updated] = await db
      .update(serverConfigsTable)
      .set(updates)
      .where(eq(serverConfigsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Server not found" }); return; }

    res.json({
      id: updated.id,
      name: updated.name,
      baseUrl: updated.baseUrl,
      model: updated.model,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/chat/servers/:id", async (req, res): Promise<void> => {
  const params = DeleteServerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(serverConfigsTable)
    .where(eq(serverConfigsTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
