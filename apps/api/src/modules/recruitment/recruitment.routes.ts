import { Router } from "express";
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

    res.json({
      items: page.items.map(mapRecruitmentStatus),
      pageNo: page.pageNo,
      numOfRows: page.numOfRows,
      totalCount: page.totalCount
    });
  } catch (error) {
    next(error);
  }
});
