import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WechatOAuthService } from '../../wechat/wechat-oauth.service';
import { WechatPayService } from '../../wechat/wechat-pay.service';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private wechatPay: WechatPayService,
    private wechatOAuth: WechatOAuthService,
  ) {}

  useMockPay(): boolean {
    if (process.env.PAYMENT_USE_MOCK === 'true') return true;
    return !this.wechatPay.isConfigured();
  }

  async createPrepay(
    userId: bigint,
    orderNo: string,
    scene: string,
    clientIp: string,
    returnUrl?: string,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { orderNo, userId },
      include: { product: true },
    });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (order.payStatus !== 0) throw new BadRequestException('ORDER_NOT_PAYABLE');

    if (scene === 'mock' || this.useMockPay()) {
      return {
        mock: true,
        orderNo,
        hint: '请调用 POST /payments/wechat/mock-pay 或配置微信支付',
      };
    }

    const amountYuan = Number(order.amount);
    const description = order.product.name;

    if (scene === 'jsapi') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user?.openid) {
        if (!this.wechatOAuth.isConfigured()) {
          throw new BadRequestException('WECHAT_OAUTH_NOT_CONFIGURED');
        }
        const oauthUrl = await this.wechatOAuth.createOAuthUrl(
          returnUrl || '/',
          userId,
        );
        return { orderNo, needOAuth: true, oauthUrl };
      }
      const params = await this.wechatPay.createJsapiPrepay({
        orderNo,
        description,
        amountYuan,
        openid: user.openid,
      });
      return { orderNo, scene: 'jsapi', ...params };
    }

    if (scene === 'h5') {
      const { h5Url } = await this.wechatPay.createH5Prepay({
        orderNo,
        description,
        amountYuan,
        clientIp,
      });
      return { orderNo, scene: 'h5', h5Url };
    }

    throw new BadRequestException('INVALID_SCENE');
  }

  async handleWechatNotify(body: {
    resource?: { ciphertext: string; associated_data?: string; nonce: string };
  }) {
    if (!body.resource) {
      throw new BadRequestException('INVALID_NOTIFY');
    }
    let decrypted: { out_trade_no: string; transaction_id: string; trade_state: string };
    try {
      decrypted = this.wechatPay.decryptNotifyResource(body.resource);
    } catch {
      throw new InternalServerErrorException('NOTIFY_DECRYPT_FAILED');
    }
    if (decrypted.trade_state !== 'SUCCESS') {
      return { handled: false, tradeState: decrypted.trade_state };
    }
    return {
      handled: true,
      orderNo: decrypted.out_trade_no,
      transactionId: decrypted.transaction_id,
    };
  }

  async createCommission(orderId: bigint) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { product: true },
    });
    if (!order?.distId || order.payStatus !== 1) return;

    const rate =
      order.product.skuCode === 'UNLOCK' ||
      ['MONTH', 'QUARTER', 'YEAR'].includes(order.product.skuCode)
        ? 0.3
        : 0.15;
    const amount = Number(order.amount) * rate;
    const settleAt = new Date(Date.now() + 7 * 86400000);

    await this.prisma.commission.create({
      data: {
        distId: order.distId,
        orderId: order.id,
        amount,
        rate,
        settleAt,
      },
    });
  }
}
