import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { openai } from "@/lib/openai";
import { searchChunks } from "@/lib/vector-search";
import { prisma } from "@/lib/prisma";
import { TEMPLATES } from "@/lib/templates";

export async function POST(req: NextRequest) {
  try {
    /* 1. auth */
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* 2. body + embed */
    const { question, template = "plain" } = (await req.json()) as {
      question: string;
      template?: keyof typeof TEMPLATES;
    };
    const embed = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });
    const queryVec = embed.data[0].embedding;
    console.log(session.user.roles, session.user.projects);
    /* 3. vector search */
    const hits = await searchChunks(
      queryVec,
      session.user.roles,
      session.user.projects,
      8
    );

    console.log("hits", hits);

    if (!hits.length) return NextResponse.json({ answer: "No results." });

    /* 4. build context */
    const docIds = new Set<string>();
    const context = hits
      .map((h, idx) => {
        const p = h.payload as any;
        docIds.add(p.docId as string);
        return `[[${idx + 1}]] ${p.content}`;
      })
      .join("\n---\n");

    /* 5. LLM */
    const prompt = TEMPLATES[template]({ context, question });
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    /* 6. citations */
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
  } catch (err: any) {
    /* ------ Better error output ------ */
    console.error("[/api/chat] Uncaught error:", err);
    console.error("HEEEERE", JSON.stringify(err?.data));
    const msg =
      err?.data?.status?.error ??
      err?.message ??
      "Unexpected error during chat";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
