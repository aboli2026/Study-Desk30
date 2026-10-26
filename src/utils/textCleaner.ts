/**
 * Utility to detect and clean raw markdown artifacts when copying and pasting
 * into sticky notes, titles, and note summaries.
 */

export function hasMarkdownArtifacts(text: string): boolean {
  if (!text) return false;
  // Check for common markdown syntax patterns
  return (
    /\*\*([^*]+)\*\*/.test(text) ||
    /__([^_]+)__/.test(text) ||
    /`([^`]+)`/.test(text) ||
    /```[\s\S]*?```/.test(text) ||
    /~~([^~]+)~~/.test(text) ||
    /^#{1,6}\s+/m.test(text) ||
    /\[([^\]]+)\]\(([^)]+)\)/.test(text) ||
    /^\s*[-*+]\s+\[[ xX]\]/m.test(text)
  );
}

export function cleanPastedMarkdown(text: string): string {
  if (!text) return '';

  let cleaned = text;

  // Remove code block wrappers (```lang ... ``` -> content)
  cleaned = cleaned.replace(/```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g, '$1');

  // Remove inline code backticks (`code` -> code)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove bold / italic markdown (**text** or __text__ or *text* or _text_)
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/\*([^*\n]+)\*/g, '$1');
  cleaned = cleaned.replace(/_([^_\n]+)_/g, '$1');

  // Remove strikethrough (~~text~~ -> text)
  cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1');

  // Remove markdown headers (# Header -> Header)
  cleaned = cleaned.replace(/^#{1,6}\s+(.*)$/gm, '$1');

  // Clean markdown links [Label](url) -> Label (url) or Label
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

  // Remove image embeds ![alt](url) -> alt
  cleaned = cleaned.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1');

  // Normalize checklist items (- [ ] / - [x] -> •)
  cleaned = cleaned.replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '• ');

  // Normalize bullet points (* or + at start of line -> •)
  cleaned = cleaned.replace(/^[\t ]*[-*+]\s+/gm, '• ');

  // Clean blockquote markers (> text -> text)
  cleaned = cleaned.replace(/^>\s+/gm, '');

  // Clean excessive empty lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}
