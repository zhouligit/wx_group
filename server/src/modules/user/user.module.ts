import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { UserController } from './user.controller';

@Module({
  imports: [MembershipModule],
  controllers: [UserController],
})
export class UserModule {}
