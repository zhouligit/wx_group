import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
    try {
      const token = auth.slice(7);
      const payload = this.jwtService.verify<{ sub: string }>(token);
      (req as Request & { user: { id: bigint } }).user = {
        id: BigInt(payload.sub),
      };
      return true;
    } catch {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }
}
