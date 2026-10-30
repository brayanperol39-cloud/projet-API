import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { authorize } from "../middleware/permissions";
import { validate } from "../middleware/validate";
import { createUserSchema, createAdminSchema, updateUserSchema } from "../schemas/schemas";
import * as ctrl from "../controllers/users.controller";

const router = Router();
router.use(authenticate);

const staff = ["SUPER_ADMIN", "ADMIN"] as const;

router.post("/admins",       requireRole("SUPER_ADMIN"), validate(createAdminSchema), ctrl.createAdmin);
router.post("/",             authorize([...staff], "user:create:user"), validate(createUserSchema), ctrl.createUser);
router.get("/",              authorize([...staff], "user:read"), ctrl.list);
router.get("/:id",           authorize([...staff], "user:read"), ctrl.getOne);
router.patch("/:id",         authorize([...staff], "user:update"), validate(updateUserSchema), ctrl.update);
router.patch("/:id/disable", authorize([...staff], "user:update"), ctrl.disable);
router.patch("/:id/enable",  authorize([...staff], "user:update"), ctrl.enable);

export default router;
