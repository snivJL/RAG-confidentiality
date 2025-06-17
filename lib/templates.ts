type Params = { context: string; question: string };
export const TEMPLATES = {
  plain: ({ context, question }: Params) => `
You are a helpful analyst. Use ONLY the context.

Context:
${context}

Q: ${question}
A:`,
  financial: ({ context, question }: Params) => `
Write a short financial memo. Use markdown headings.

<CONTEXT>
${context}
</CONTEXT>

QUESTION: ${question}
ANSWER (memo style):`,
};
