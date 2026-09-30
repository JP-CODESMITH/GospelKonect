// Mention extraction: turns a post body into the handles it references.
//
// Kept as a pure function with its own spec because the rules are easy to get
// subtly wrong — emails, "a@@b" and handles at the very start of a string all
// have to behave.

// @handle — 3 to 50 word characters, matching the username length accepted at
// registration (CreateUserDtos allows 3..50) and the stricter handle rules
// enforced when a profile is renamed.
//
// The (?<![\w@]) lookbehind is what stops `john@example.com` from counting as
// a mention of `example`, and `@@name` from matching the second @.
const MENTION_PATTERN = /(?<![\w@])@([a-zA-Z0-9_]{3,50})/g;

/**
 * Lowercased, de-duplicated handles found in `text`, in first-seen order.
 * Lowercasing here means `@John` and `@john` in one post notify once, and the
 * lookup that follows is case-insensitive anyway.
 */
export function extractMentions(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(MENTION_PATTERN)) {
    found.add(match[1].toLowerCase());
  }
  return [...found];
}
