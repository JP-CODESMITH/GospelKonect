import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import envConfig from './config/env.config.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
    }),
    // Registers all /auth/* routes (login, register). Without this import,
    // Nest never mounts AuthController and every /auth call returns 404.
    AuthModule,
    // NOTE: importing RedisModule activates its @Global() provider, making
    // RedisService injectable everywhere without re-importing. Order matters:
    // it must be listed here (after ConfigModule, which RedisService reads).
    RedisModule,
  ],
})
export class AppModule {}
