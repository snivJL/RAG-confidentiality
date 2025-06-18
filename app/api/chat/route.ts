// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { openai } from "@/lib/openai";
import { semanticSearchWithAcl } from "@/lib/vector-search";
import { prisma } from "@/lib/prisma";
import { TEMPLATES } from "@/lib/templates";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Authenticate
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2️⃣ Parse body
    const { question, template = "plain" } = (await req.json()) as {
      question: string;
      template?: keyof typeof TEMPLATES;
    };

    // 3️⃣ Semantic search (all vs accessible)
    const { all, accessible } = await semanticSearchWithAcl(
      question,
      session.user.roles,
      session.user.projects,
      session.user.email!
    );

    // 3a️⃣ If *no* documents at all match, bail early
    if (all.length === 0) {
      console.log("NO RESULTS");
      return NextResponse.json(
        { answer: "No results from the API." },
        { status: 200 }
      );
    }

    // 4️⃣ Compute hidden **documents** by docId (not points)
    const allDocIds = new Set(all.map((p) => p.payload!.docId as string));
    const accessibleDocIds = new Set(
      accessible.map((p) => p.payload!.docId as string)
    );
    const hiddenDocIds = [...allDocIds].filter(
      (id) => !accessibleDocIds.has(id)
    );

    // 5️⃣ Build RAG context from accessible chunks only
    const context = accessible
      .map((hit, i) => `[[${i + 1}]] ${hit.payload!.content}`)
      .join("\n---\n");
    // 6️⃣ Ask the LLM

    const prompt = TEMPLATES[template]({ context, question });
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });
    let answer = chat.choices[0].message.content ?? "";
    console.log("ANSWER", answer);
    // 7️⃣ If any docs were hidden, look up their owners & append a note
    let hidden: { docId: string; ownerEmail: string }[] = [];
    if (hiddenDocIds.length) {
      const docs = await prisma.document.findMany({
        where: { id: { in: hiddenDocIds } },
        select: { id: true, ownerEmail: true },
      });
      hidden = docs.map((d: { id: string; ownerEmail: string }) => ({
        docId: d.id,
        ownerEmail: d.ownerEmail,
      }));

      const uniqueEmails = Array.from(
        new Set(docs.map((d) => d.ownerEmail))
      ).join(", ");
      answer += `

**Note:** There ${hiddenDocIds.length > 1 ? "are" : "is"} ${
        hiddenDocIds.length
      } additional document${hiddenDocIds.length > 1 ? "s" : ""} relevant to your question that you don’t have access to.  
Please contact **${uniqueEmails}** to request access.`;
    }

    // 8️⃣ Fetch citations for accessible docs
    const visibleDocs = await prisma.document.findMany({
      where: { id: { in: [...accessibleDocIds] } },
      select: { id: true, title: true },
    });

    // 9️⃣ Return structured payload
    return NextResponse.json({
      answer,
      citations: visibleDocs.map((d, i) => ({
        n: i + 1,
        title: d.title,
        url: `/api/doc/${d.id}`,
      })),
      hidden,
    });
  } catch (err: unknown) {
    console.error("[/api/chat] Uncaught error:", err);

    let message = "Unexpected error during chat";
    if (isOpenAIError(err)) {
      message = err.data.status.error;
    } else if (err instanceof Error) {
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
  return typeof (s as Record<string, unknown>).error === "string";
}
