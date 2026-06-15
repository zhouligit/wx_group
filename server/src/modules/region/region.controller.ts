import { Controller, Get, Query } from '@nestjs/common';
import { ok } from '../../common/response';
import { RegionService } from './region.service';

@Controller('regions')
export class RegionController {
  constructor(private regionService: RegionService) {}

  @Get()
  async list(
    @Query('level') level?: string,
    @Query('parentId') parentId?: string,
  ) {
    const rows = await this.regionService.list(
      level ? Number(level) : undefined,
      parentId ? Number(parentId) : undefined,
    );
    return ok(
      rows.map((r: { id: bigint; name: string; level: number; parentId: bigint | null }) => ({
        id: Number(r.id),
        name: r.name,
        level: r.level,
        parentId: r.parentId ? Number(r.parentId) : null,
      })),
    );
  }
}
