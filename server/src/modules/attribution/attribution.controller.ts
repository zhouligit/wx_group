import { Body, Controller, Post, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Request } from 'express';
import { ok } from '../../common/response';
import { AttributionService } from './attribution.service';

class TrackDto {
  @IsString()
  inviteCode!: string;
}

type AuthRequest = Request & { user?: { id: bigint } };

@Controller('attribution')
export class AttributionController {
  constructor(private attributionService: AttributionService) {}

  @Post('track')
  async track(@Body() dto: TrackDto, @Req() req: AuthRequest) {
    const data = await this.attributionService.track(dto.inviteCode, req.user?.id);
    return ok(data);
  }
}
