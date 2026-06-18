import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt-auth.guard';
import { AttributionController } from './attribution.controller';
import { AttributionService } from './attribution.service';

@Module({
  controllers: [AttributionController],
  providers: [AttributionService, OptionalJwtAuthGuard],
})
export class AttributionModule {}
