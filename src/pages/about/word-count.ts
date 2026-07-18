/** word count of a plain string — used to chain stagger delays across parts */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
