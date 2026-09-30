// Minimal ambient shape of the Bun globals this codebase uses.
//
// Composer boots the built service with Bun (see node-control.mjs: "Compute
// boots the bundle with Bun"), and Bun.s3 is the storage client we picked for
// the bucket — but the project type-checks with @types/node, which knows
// nothing about Bun. Rather than pulling @types/bun into every file (it
// redefines several DOM/node globals), declare exactly the constructor and
// three methods storage.ts calls.
declare const Bun: {
  S3Client: new (options: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  }) => {
    write(key: string, data: Buffer, options: { type: string }): Promise<unknown>;
    delete(key: string): Promise<unknown>;
    presign(key: string): Promise<string>;
  };
} | undefined;
