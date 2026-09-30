import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePostDto, UpdatePostDto } from './post.dto.js';

// The trim lives in a @Transform, which only runs when the payload is passed
// through plainToInstance — i.e. exactly what the global ValidationPipe does.
// Testing it directly keeps that contract from silently breaking.
const parse = async (input: unknown, Dto = CreatePostDto) =>
  validate(plainToInstance(Dto, input));

describe('CreatePostDto', () => {
  it('trims surrounding whitespace before storing', async () => {
    const dto = plainToInstance(CreatePostDto, { content: '  hello world  ' });

    expect(dto.content).toBe('hello world');
    expect(await parse({ content: '  hello world  ' })).toEqual([]);
  });

  it('rejects an empty body', async () => {
    expect((await parse({ content: '' })).length).toBeGreaterThan(0);
  });

  it('rejects a blank body that only contains whitespace', async () => {
    // Trimmed to '' by @Transform, then caught by @Length(1, …).
    expect((await parse({ content: '   \n  ' })).length).toBeGreaterThan(0);
  });

  it('rejects a body longer than 1000 characters', async () => {
    expect((await parse({ content: 'a'.repeat(1001) })).length).toBeGreaterThan(0);
    expect(await parse({ content: 'a'.repeat(1000) })).toEqual([]);
  });

  it('rejects a non-string body', async () => {
    expect((await parse({ content: 42 })).length).toBeGreaterThan(0);
    expect((await parse({})).length).toBeGreaterThan(0);
  });
});

describe('UpdatePostDto', () => {
  it('applies the same rules as CreatePostDto', async () => {
    expect((await parse({ content: '  edited  ' }, UpdatePostDto)).length).toBe(0);
    expect((await parse({ content: '' }, UpdatePostDto)).length).toBeGreaterThan(0);
    expect((await parse({ content: 'a'.repeat(1001) }, UpdatePostDto)).length).toBeGreaterThan(0);
  });
});
