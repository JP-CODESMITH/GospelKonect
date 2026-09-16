import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  /**
   * Hashes a plain text password using Argon2id.
   * Configuration options match recommended OWASP guidelines.
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id, // Uses the most secure Argon2 variant
      memoryCost: 65536,     // 64 MB of memory allocation
      timeCost: 3,           // 3 iterations
      parallelism: 4,        // Utilizes 4 parallel threads
    });
  }

  /**
   * Compares a plain text password against a stored Argon2id hash.
   */
  async comparePassword(plain: string, hashed: string): Promise<boolean> {
    try {
      return await argon2.verify(hashed, plain);
    } catch (error) {
      // Handles rare internal verification errors safely
      return false;
    }
  }
}
