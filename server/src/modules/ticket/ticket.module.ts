import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { PrismaService } from '../../prisma/prisma.service';
import { Module } from '@nestjs/common';

type AuthRequest = Request & { user: { id: bigint } };

class CreateTicketDto {
  @IsString()
  type!: string;

  @IsString()
  content!: string;

  wechatId?: string;
  images?: string[];
}

@Controller('tickets')
export class TicketController {
  constructor(private prisma: PrismaService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: AuthRequest, @Body() dto: CreateTicketDto) {
    const ticket = await this.prisma.csTicket.create({
      data: {
        userId: req.user.id,
        wechatId: dto.wechatId,
        type: dto.type,
        content: dto.content,
        images: dto.images ?? [],
      },
    });
    return ok({ id: Number(ticket.id), status: ticket.status });
  }
}

@Module({ controllers: [TicketController] })
export class TicketModule {}
