import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { openai } from "@/lib/openai";
import { semanticSearch } from "@/lib/vector-search";
import { prisma } from "@/lib/prisma";
import { TEMPLATES } from "@/lib/templates";

export async function POST(req: NextRequest) {
  try {
    /* 1. auth */
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 2. parse body */
    const { question, template = "plain" } = (await req.json()) as {
      question: string;
      template?: keyof typeof TEMPLATES;
    };

    /* 3. semantic search */
    const hits = await semanticSearch(
      question,
      session.user.roles[0],
      session.user.projects
    );

    if (!hits.points) {
      return NextResponse.json({ answer: "No results." });
    }

    /* 4. build context from payload */
    const docIds = new Set<string>();
    const context = hits.points
      .map((h, idx) => {
        const p = h.payload;
        if (!p) {
          throw new Error("Payload can't be retrieved");
        }
        docIds.add(p.docId as string);
        return `[[${idx + 1}]] ${p.content}`;
      })
      .join("\n---\n");
    /* 5. chat completion */
    const prompt = TEMPLATES[template]({ context, question });
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    /* 6. load citation metadata */
    const docs = await prisma.document.findMany({
      where: { id: { in: Array.from(docIds) } },
      select: { id: true, title: true },
    });

    return NextResponse.json({
      answer: chat.choices[0].message.content ?? "",
      citations: docs.map((d, i) => ({
        n: i + 1,
        title: d.title,
        url: `/api/doc/${d.id}`,
      })),
    });
  } catch (err: unknown) {
    console.error("[/api/chat] Uncaught error:", err);

    let message = "Unexpected error during chat";

    if (isOpenAIError(err)) {
      // now safe to access the nested property
      message = err.data.status.error;
    } else if (err instanceof Error) {
      // built-in Error type
      message = err.message;
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface OpenAIError {
  data: {
    status: {
      error: string;
    };
  };
}

function isOpenAIError(e: unknown): e is OpenAIError {
  if (typeof e !== "object" || e === null) return false;
  const d = (e as Record<string, unknown>).data;
  if (typeof d !== "object" || d === null) return false;
  const s = (d as Record<string, unknown>).status;
  if (typeof s !== "object" || s === null) return false;
  const err = (s as Record<string, unknown>).error;
  return typeof err === "string";
}
