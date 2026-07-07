import { Router } from "express";
import type { MmaResource } from "@military-guide/shared";
import { MMA_ENDPOINTS } from "./endpoints";
import { MmaClient } from "./mma.client";
import { readPositiveNumber } from "./page-query";

const mmaResources = Object.keys(MMA_ENDPOINTS) as MmaResource[];
const mmaClient = new MmaClient();

export const mmaRouter = Router();

mmaRouter.get("/resources", (_req, res) => {
  res.json({
    resources: mmaResources
  });
});

mmaRouter.get("/:resource", async (req, res, next) => {
  try {
    const resource = req.params.resource as MmaResource;

    if (!mmaResources.includes(resource)) {
      res.status(404).json({
        message: "Unknown MMA resource",
        resources: mmaResources
      });
      return;
    }

    const page = await mmaClient.fetchPage({
      resource,
      pageNo: readPositiveNumber(req.query.pageNo, 1),
      numOfRows: readPositiveNumber(req.query.numOfRows, 10)
    });

    res.json(page);
  } catch (error) {
    next(error);
  }
});
