import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { RegionModule } from './modules/region/region.module';
import { GroupModule } from './modules/group/group.module';
import { BannerModule } from './modules/banner/banner.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';
import { PaymentModule } from './modules/payment/payment.module';
import { MembershipModule } from './modules/membership/membership.module';
import { UserModule } from './modules/user/user.module';
import { AttributionModule } from './modules/attribution/attribution.module';
import { DistributorModule } from './modules/distributor/distributor.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    HealthModule,
    AuthModule,
    RegionModule,
    GroupModule,
    BannerModule,
    ProductModule,
    OrderModule,
    PaymentModule,
    MembershipModule,
    UserModule,
    AttributionModule,
    DistributorModule,
    TicketModule,
    AdminModule,
  ],
})
export class AppModule {}
