import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/** 有 token 则解析 user；无 token 不报错（用于群详情等公开接口） */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return true;
    try {
      const payload = this.jwtService.verify<{ sub: string }>(auth.slice(7));
      (req as Request & { user: { id: bigint } }).user = {
        id: BigInt(payload.sub),
      };
    } catch {
      // token 无效时按未登录处理
    }
    return true;
  }
}
