import type { MmaResource } from "@military-guide/shared";

export type MmaHeader = {
  resultCode: string;
  resultMsg: string;
};

export type MmaFetchOptions = {
  resource: MmaResource;
  pageNo?: number;
  numOfRows?: number;
};
