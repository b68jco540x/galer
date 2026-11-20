import { doc, paragraph, bold, italic, code, pre, thinking, blockquote, escapeText, fmtRich } from "tg-rich-messages";

function stripThinkingParts(text: string): { thinkingText?: string; cleanText: string } {
  let thinkingText: string | undefined;
  const cleanText = text
    .replace(/<think>([\s\S]*?)<\/think>/gi, (_, match) => {
      if (!thinkingText) thinkingText = match.trim();
      return "";
    })
    .replace(/<thinking>([\s\S]*?)<\/thinking>/gi, (_, match) => {
      if (!thinkingText) thinkingText = match.trim();
      return "";
    })
    .trim();

  return { thinkingText, cleanText };
}

/**
  * Converts markdown-like text or AI response into a tg-rich-messages RichDocument
  * handling code blocks, thinking blocks, and paragraphs.
  */
export function aiResponseToRichDoc(text: string) {
  const { thinkingText, cleanText } = stripThinkingParts(text);
  const blocks = [];

  if (thinkingText) {
    blocks.push(thinking(thinkingText));
  }

  // Simple parser for code blocks or regular paragraphs
  const parts = cleanText.split(/(```[\s\S]*?```)/g);
  for (const part of parts) {
    if (!part.trim()) continue;
    if (part.startsWith("```") && part.endsWith("```")) {
      const firstNewline = part.indexOf("\n");
      let lang = "";
      let codeContent = part.slice(3, -3);
      if (firstNewline !== -1) {
        lang = part.slice(3, firstNewline).trim();
        codeContent = part.slice(firstNewline + 1, -3);
      }
      blocks.push(pre(codeContent, lang || undefined));
    } else {
      // Split paragraphs by double newline
      const paragraphs = part.split(/\n\s*\n/);
      for (const p of paragraphs) {
        if (!p.trim()) continue;
        blocks.push(paragraph(p.trim()));
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push(paragraph("(empty response)"));
  }

  return doc(...blocks);
}
