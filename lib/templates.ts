type Params = { context: string; question: string };
export const TEMPLATES = {
  plain: ({ context, question }: Params) => `
You are a helpful analyst. Use ONLY the knowledge base.
If you don't have enough context to answer the question, tell the user politely that you couldn’t find any documents in his workspace to answer his query",

Knowledge base:
${context}

Q: ${question}
A:`,
  financial: ({ context, question }: Params) => `
Use ONLY the Knowledge base. Use markdown headings.
If you don't have enough context to answer the question, tell the user politely that you couldn’t find any documents in his workspace to answer his query",

<KNOWLEDGE_BASE>
${context}
</KNOWLEDGE_BASE>

QUESTION: ${question}
ANSWER:`,
};
