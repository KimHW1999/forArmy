import type { MmaApiPage, MmaRawItem } from "@military-guide/shared";
import { env } from "../../config/env";
import { MMA_BASE_URL, MMA_ENDPOINTS } from "./endpoints";
import { parseMmaPage } from "./mma.parser";
import type { MmaFetchOptions, MmaHeader } from "./mma.types";

export class MmaClient {
  async fetchPage(
    options: MmaFetchOptions
  ): Promise<MmaApiPage<MmaRawItem> & { header: MmaHeader }> {
    const pageNo = options.pageNo ?? 1;
    const numOfRows = options.numOfRows ?? 10;
    const endpoint = MMA_ENDPOINTS[options.resource];
    const url = new URL(`${MMA_BASE_URL}${endpoint}`);

    if (!env.mmaServiceKey) {
      throw new Error("MMA_SERVICE_KEY is required for live MMA API requests");
    }

    url.searchParams.set("serviceKey", env.mmaServiceKey);
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("numOfRows", String(numOfRows));

    const response = await fetch(url);
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`MMA API request failed: ${response.status} ${body.slice(0, 120)}`);
    }

    const page = parseMmaPage(body);

    if (page.header.resultCode !== "00") {
      throw new Error(`MMA API error: ${page.header.resultCode} ${page.header.resultMsg}`);
    }

    return page;
  }
}
