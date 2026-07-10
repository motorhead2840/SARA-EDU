import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import blockchainRouter from "./blockchain.js";
import abhayaRouter from "./abhaya.js";
import stripeRouter from "./stripe.js";
import shriRouter from "./shri.js";
import subscriptionRouter from "./subscription.js";
import mentorRouter from "./mentor.js";
import secopRouter from "./secops.js";
import scholarshipRouter from "./scholarship.js";
import academicRouter from "./academic.js";
import forumRouter from "./forum.js";
import gamesRouter from "./games.js";
import mythologyRouter from "./mythology.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/blockchain", blockchainRouter);
router.use("/abhaya", abhayaRouter);
router.use("/stripe", stripeRouter);
router.use("/shri", shriRouter);
router.use("/subscription", subscriptionRouter);
router.use("/mentor", mentorRouter);
router.use("/secops", secopRouter);
router.use("/scholarship", scholarshipRouter);
router.use("/academic", academicRouter);
router.use("/forum", forumRouter);
router.use("/games", gamesRouter);
router.use("/mythology", mythologyRouter);

export default router;
