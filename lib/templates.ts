type Params = { context: string; question: string };
export const TEMPLATES = {
  plain: ({ context, question }: Params) => `
You are a helpful analyst. Use ONLY the context.
If you don't have enough context to answer the question, tell the user politely that you couldn’t find any documents in his workspace to answer his query",

Context:
${context}

Q: ${question}
A:`,
  financial: ({ context, question }: Params) => `
Write a short financial memo. Use markdown headings.
If you don't have enough context to answer the question, tell the user politely that you couldn’t find any documents in his workspace to answer his query",

<CONTEXT>
${context}
</CONTEXT>

QUESTION: ${question}
ANSWER (memo style):`,
};
