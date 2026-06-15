import { Module } from '@nestjs/common';
import { MembershipModule } from '../membership/membership.module';
import { OrderModule } from '../order/order.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [OrderModule, MembershipModule],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}
