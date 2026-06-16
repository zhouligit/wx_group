import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { ok } from '../../common/response';
import { GroupService } from './group.service';

type AuthRequest = Request & { user?: { id: bigint } };

@Controller('groups')
export class GroupController {
  constructor(private groupService: GroupService) {}

  @Get()
  async list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '100',
    @Query('regionId') regionId?: string,
    @Query('hot') hot?: string,
    @Query('keyword') keyword?: string,
  ) {
    const data = await this.groupService.list({
      page: Number(page),
      pageSize: Number(pageSize),
      regionId: regionId ? Number(regionId) : undefined,
      hot: hot === 'true',
      keyword,
    });
    return ok(data);
  }

  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const data = await this.groupService.detail(id, req.user?.id);
    return ok(data);
  }

  @Get(':id/qrcode')
  @UseGuards(JwtAuthGuard)
  async qrcode(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const data = await this.groupService.getQrcodeUrl(req.user!.id, id);
    return ok(data);
  }
}
