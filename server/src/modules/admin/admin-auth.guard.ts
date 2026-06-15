import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const payload = this.jwt.verify(auth.slice(7)) as { admin?: boolean; role?: string };
      if (!payload.admin) throw new UnauthorizedException();
      req.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
