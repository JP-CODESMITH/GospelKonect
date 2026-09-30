import { extractMentions } from './mentions.js';

describe('extractMentions', () => {
  it('finds handles and lowercases them', () => {
    expect(extractMentions('hey @Mary and @john, listen up')).toEqual(['mary', 'john']);
  });

  it('de-duplicates repeats in the same text', () => {
    expect(extractMentions('@Mary @mary @MARY')).toEqual(['mary']);
  });

  it('does not treat an email address as a mention', () => {
    // The @ is preceded by a word character, so the lookbehind rejects it.
    expect(extractMentions('write to john@example.com please')).toEqual([]);
  });

  it('does not match the second @ of a doubled one', () => {
    expect(extractMentions('email me @@name')).toEqual([]);
  });

  it('ignores handles that are too short to be usernames', () => {
    // Registration requires 3+ characters.
    expect(extractMentions('a @hi @abc')).toEqual(['abc']);
  });

  it('ignores handles that are too long to be usernames', () => {
    const tooLong = 'a'.repeat(51);
    expect(extractMentions(`@${tooLong} @${'a'.repeat(50)}`)).toEqual(['a'.repeat(50)]);
  });

  it('finds a handle at the very start of the text', () => {
    expect(extractMentions('@first thing')).toEqual(['first']);
  });

  it('keeps first-seen order', () => {
    expect(extractMentions('@zed @amy @zed')).toEqual(['zed', 'amy']);
  });

  it('returns nothing for text without mentions', () => {
    expect(extractMentions('plain post with no handles')).toEqual([]);
  });
});
