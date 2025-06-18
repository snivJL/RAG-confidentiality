import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qdrant } from "@/lib/vector-store";

async function processRequest(id: string, action: string) {
  try {
    const ar = await prisma.accessRequest.update({
      where: { id },
      data: { status: action, decidedAt: new Date() },
    });

    if (action === "approve") {
      await prisma.document.update({
        where: { id: ar.docId },
        data: { emailsAllowed: { push: ar.requestorEmail } },
      });
      console.log(ar.docId);
      // ← Add with_payload, with_vector, and offset
      const scrollResult = await qdrant.scroll("chunks", {
        filter: {
          must: [{ key: "docId", match: { any: [ar.docId] } }],
        },
        limit: 1000,
        offset: 1,
        with_payload: false,
        with_vector: false,
      });

      const chunkIds = scrollResult.points.map((p) => p.id as string);
      console.log(chunkIds, scrollResult.points);
      if (chunkIds.length) {
        await qdrant.setPayload("chunks", {
          points: chunkIds,
          payload: { emailsAllowed: { add: ar.requestorEmail } },
          wait: true,
        });
      }
      return ar.status;
    }
  } catch (error) {
    JSON.stringify(error);
  }
}

export async function GET(req: NextRequest) {
  // 1. pull id & action from the path
  const parts = req.nextUrl.pathname.split("/");
  // ["", "api", "request-access", "<id>", "<action>"]
  const id = parts[3];
  const action = parts[4];

  if (!["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const status = await processRequest(id, action);
    return NextResponse.json({ status }, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // just forward to GET logic
  return GET(req);
}
