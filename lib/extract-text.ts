import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import PptxParser from "node-pptx-parser";
import { MSGReader } from "msgreader";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import type { SlideTextContent } from "@/types/files";

export async function extractText(
  fileName: string,
  buf: Buffer
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".pdf")) {
    return (await pdfParse(buf)).text;
  }

  if (lower.endsWith(".docx")) {
    return (await mammoth.extractRawText({ buffer: buf })).value;
  }

  if (lower.endsWith(".pptx")) {
    const tmpPath = join(tmpdir(), `pptx-${Date.now()}.pptx`);
    await writeFile(tmpPath, buf);

    // 2) let node-pptx-parser read it
    const parser = new PptxParser(tmpPath);
    // this returns string[] where each entry is one slide’s text
    const slides: SlideTextContent[] = await parser.extractText();

    // 3) clean up
    await unlink(tmpPath);

    // 4) join slides into one big text
    return slides.map((slide) => slide.text.join("\n")).join("\n\n---\n\n");
  }

  if (lower.endsWith(".msg")) {
    const msg = new MSGReader(buf);
    const { subject, body } = msg.getFileData();
    return [subject, body].filter(Boolean).join("\n\n");
  }

  // default: treat as plain-text
  return buf.toString("utf8");
}
