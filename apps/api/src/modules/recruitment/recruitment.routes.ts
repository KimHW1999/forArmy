import { Router } from "express";
import { cacheRecruitmentStatuses } from "../cache/cache.repository";
import { MmaClient } from "../mma/mma.client";
import { readPositiveNumber } from "../mma/page-query";
import { mapRecruitmentStatus } from "./recruitment.mapper";

const mmaClient = new MmaClient();

export const recruitmentRouter = Router();

recruitmentRouter.get("/status", async (req, res, next) => {
  try {
    const page = await mmaClient.fetchPage({
      resource: "recruitmentStatus",
      pageNo: readPositiveNumber(req.query.pageNo, 1),
      numOfRows: readPositiveNumber(req.query.numOfRows, 20)
    });
    const items = page.items.map(mapRecruitmentStatus);

    await Promise.all(
      [...new Set(items.map((item) => item.specialtyCode))].map((specialtyCode) =>
        cacheRecruitmentStatuses(
          specialtyCode,
          items.filter((item) => item.specialtyCode === specialtyCode)
        )
      )
    );

    res.json({
      items,
      pageNo: page.pageNo,
      numOfRows: page.numOfRows,
      totalCount: page.totalCount
    });
  } catch (error) {
    next(error);
  }
});
