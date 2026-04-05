import * as ort from "onnxruntime-node";
import path from "path";

const MODEL_PATH = path.resolve(
  process.cwd(),
  "../../attached_assets/bidaf-11-int8_1775363367963.onnx"
);

const FIXR_KNOWLEDGE = `
FIX-R is an AI chatbot application created by AM Solutions LLC in 2026.
FIX-R connects to configurable AI server endpoints that support the OpenAI API format.
FIX-R uses a terminal monospace aesthetic with a black background and white text.
FIX-R supports session-based authentication and signup using access codes.
FIX-R stores full conversation history for each user session.
FIX-R provides admin panels for managing users, servers, announcements, and storage.
FIX-R supports local AI models through LM Studio integration.
FIX-R allows model file uploads directly to object storage including ONNX models.
FIX-R can be configured with external object storage such as Amazon S3 or compatible providers.
Users can purchase an access key at the AM Solutions website at sea-am-sol.com.
FIX-R supports multiple AI server endpoints and lets users switch between them per conversation.
The BiDAF model is an ONNX reading comprehension model integrated into FIX-R as a local inference engine.
BiDAF stands for Bidirectional Attention Flow and is used for question answering tasks.
BiDAF reads a context passage and extracts the most relevant answer span for a given question.
FIX-R runs the BiDAF model locally using ONNX Runtime without any external API calls.
`.trim();

let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
  if (!session) {
    session = await ort.InferenceSession.create(MODEL_PATH);
  }
  return session;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function wordToChars(word: string, maxLen = 16): string[] {
  const arr = word.split("").slice(0, maxLen);
  while (arr.length < maxLen) arr.push(" ");
  return arr;
}

export async function bidafChat(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const userMessage = messages[messages.length - 1];
  if (!userMessage || userMessage.role !== "user") {
    return "Please ask a question.";
  }

  const question = userMessage.content;

  const conversationContext = messages
    .slice(0, -1)
    .filter((m) => m.role !== "system")
    .map((m) => m.content)
    .join(" ");

  const context = conversationContext
    ? `${FIXR_KNOWLEDGE} ${conversationContext}`
    : FIXR_KNOWLEDGE;

  const sess = await getSession();

  const cWords = tokenize(context);
  const qWords = tokenize(question);

  if (cWords.length === 0 || qWords.length === 0) {
    return "I could not process your question. Please try rephrasing.";
  }

  const c = cWords.length;
  const q = qWords.length;

  const feeds = {
    context_word: new ort.Tensor("string", cWords, [c, 1]),
    context_char: new ort.Tensor(
      "string",
      cWords.flatMap((w) => wordToChars(w)),
      [c, 1, 1, 16]
    ),
    query_word: new ort.Tensor("string", qWords, [q, 1]),
    query_char: new ort.Tensor(
      "string",
      qWords.flatMap((w) => wordToChars(w)),
      [q, 1, 1, 16]
    ),
  };

  const output = await sess.run(feeds);
  const start = Number(output.start_pos.data[0]);
  const end = Number(output.end_pos.data[0]);

  const span = cWords.slice(
    Math.max(0, start),
    Math.min(end + 1, cWords.length)
  );

  if (span.length === 0) {
    return "I could not find a relevant answer in the available context.";
  }

  return span.join(" ");
}
