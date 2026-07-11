export * from "./generated/api";
export * from "./generated/types";

import {
  CheckoutCryptoResponse as CheckoutCryptoResponseSchema,
  CheckoutFiatResponse as CheckoutFiatResponseSchema,
  GetAcademicCourseDetailParams as GetAcademicCourseDetailParamsSchema,
  GetBlockchainTransactionsParams as GetBlockchainTransactionsParamsSchema
} from "./generated/api";

import type {
  CheckoutCryptoResponse as CheckoutCryptoResponseType,
  CheckoutFiatResponse as CheckoutFiatResponseType,
  GetAcademicCourseDetailParams as GetAcademicCourseDetailParamsType,
  GetBlockchainTransactionsParams as GetBlockchainTransactionsParamsType
} from "./generated/types";

export type CheckoutCryptoResponse = CheckoutCryptoResponseType;
export const CheckoutCryptoResponse = CheckoutCryptoResponseSchema;

export type CheckoutFiatResponse = CheckoutFiatResponseType;
export const CheckoutFiatResponse = CheckoutFiatResponseSchema;

export type GetAcademicCourseDetailParams = GetAcademicCourseDetailParamsType;
export const GetAcademicCourseDetailParams = GetAcademicCourseDetailParamsSchema;

export type GetBlockchainTransactionsParams = GetBlockchainTransactionsParamsType;
export const GetBlockchainTransactionsParams = GetBlockchainTransactionsParamsSchema;



