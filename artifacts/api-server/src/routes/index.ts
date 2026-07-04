import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import blockchainRouter from "./blockchain.js";
import abhayaRouter from "./abhaya.js";
import stripeRouter from "./stripe.js";
import shriRouter from "./shri.js";
import subscriptionRouter from "./subscription.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/blockchain", blockchainRouter);
router.use("/abhaya", abhayaRouter);
router.use("/stripe", stripeRouter);
router.use("/shri", shriRouter);
router.use("/subscription", subscriptionRouter);

export default router;
