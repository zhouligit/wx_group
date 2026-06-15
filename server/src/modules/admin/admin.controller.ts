import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ok } from '../../common/response';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminAuthGuard } from './admin-auth.guard';

class AdminLoginDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;
}

@Controller('admin')
export class AdminController {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  @Post('auth/login')
  async login(@Body() dto: AdminLoginDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { username: dto.username } });
    if (!admin || admin.status !== 1) {
      return ok(null, 'INVALID_CREDENTIALS');
    }
    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) return ok(null, 'INVALID_CREDENTIALS');

    const token = this.jwt.sign({ sub: admin.id.toString(), role: admin.role, admin: true });
    return ok({ token, role: admin.role });
  }

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  async dashboard() {
    const [userCount, groupCount, orderCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.group.count(),
      this.prisma.order.count({ where: { payStatus: 1 } }),
    ]);
    return ok({ userCount, groupCount, paidOrderCount: orderCount });
  }

  @Get('groups')
  @UseGuards(AdminAuthGuard)
  async groups() {
    const rows = await this.prisma.group.findMany({ orderBy: { id: 'desc' }, take: 50 });
    return ok(
      rows.map((g: { id: bigint; name: string; status: number; isHot: number }) => ({
        id: Number(g.id),
        name: g.name,
        status: g.status,
        isHot: g.isHot,
      })),
    );
  }
}
