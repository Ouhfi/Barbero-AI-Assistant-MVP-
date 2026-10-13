import express from "express";
import { register ,login  , me} from "../controllers/authController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../middleware/authSchemas.js";

const router = express.Router();

 router.post("/register" , validate (registerSchema), register);
 router.post("/login" , validate(loginSchema),login );

 router.get("/me",authenticate, me );

 export default router;

