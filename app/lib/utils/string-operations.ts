interface SplitResult {
  type: "complete" | "incomplete";
  content: string;
}

interface SplitResult {
  type: "complete" | "incomplete";
  content: string;
}

interface SplitResult {
  type: "complete" | "incomplete";
  content: string;
}

export function splitString(
  content: string,
  startDelimiter: string,
  endDelimiter: string,
): SplitResult[] {
  const results: SplitResult[] = [];
  const regex = new RegExp(`${startDelimiter}(.*?)${endDelimiter}`, "gs");
  let match: RegExpExecArray | null;
  let endIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    results.push({
      type: "complete",
      content: content.slice(
        match.index + startDelimiter.length,
        regex.lastIndex - endDelimiter.length,
      ),
    });

    endIndex = regex.lastIndex;
  }

  if (endIndex < content.length) {
    const remaining = content.slice(endIndex);

    if (remaining.includes(startDelimiter)) {
      results.push({
        type: "incomplete",
        content: remaining.substring(
          remaining.indexOf(startDelimiter) + startDelimiter.length,
        ),
      });
    }
  }

  return results;
}
