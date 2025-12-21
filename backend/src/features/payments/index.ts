// Payments feature barrel file
export { PaymentService, default as paymentService } from './payment.service';
export { PaymentController, paymentController, default as paymentControllerDefault } from './payment.controller';
export { default as paymentRoutes, stripeWebhookRouter } from './payment.routes';

// Re-export schemas
export {
  CreateStripeAccountSchema,
  CreatePaymentIntentSchema,
  SplitRentSchema,
  RefundSchema,
  GetPaymentHistorySchema,
  CreatePaymentSchema,
} from './payment.schemas';

// Re-export types
export type {
  CreateStripeAccountRequest,
  CreatePaymentIntentRequest,
  SplitRentRequest,
  RefundRequest,
  GetPaymentHistoryRequest,
  CreatePaymentRequest,
} from './payment.schemas';

export type {
  CreatePaymentIntentParams,
  SplitRentParams,
  RefundParams,
  PaymentHistory,
} from './payment.service';
