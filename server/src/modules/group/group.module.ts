import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { EntitlementService, GroupService } from './group.service';

@Module({
  controllers: [GroupController],
  providers: [GroupService, EntitlementService],
  exports: [EntitlementService],
})
export class GroupModule {}
