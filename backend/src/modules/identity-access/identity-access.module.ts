import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Secrets and TTLs are passed per-signature in AuthService because access
    // and refresh tokens use different secrets.
    JwtModule.register({}),
  ],
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService, JwtStrategy],
  exports: [AuthService],
})
export class IdentityAccessModule {}
