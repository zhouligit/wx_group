import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional } from 'class-validator';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { OrderService } from './order.service';

type AuthRequest = Request & { user: { id: bigint } };

class CreateOrderDto {
  @IsInt()
  productId!: number;

  @IsOptional()
  @IsInt()
  groupId?: number;
}

@Controller('orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
    const data = await this.orderService.create(req.user.id, dto);
    return ok(data);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async detail(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const data = await this.orderService.detail(req.user.id, id);
    return ok(data);
  }
}
