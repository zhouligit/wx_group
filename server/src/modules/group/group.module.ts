import { Module } from '@nestjs/common';
import { OptionalJwtAuthGuard } from '../../common/optional-jwt-auth.guard';
import { MembershipModule } from '../membership/membership.module';
import { GroupController } from './group.controller';
import { EntitlementService, GroupService } from './group.service';

@Module({
  imports: [MembershipModule],
  controllers: [GroupController],
  providers: [GroupService, EntitlementService, OptionalJwtAuthGuard],
  exports: [EntitlementService],
})
export class GroupModule {}
