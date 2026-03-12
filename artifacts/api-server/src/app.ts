import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { setupAuth } from "./lib/auth";
import router from "./routes";

const app: Express = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

setupAuth(app);

app.use("/api", router);

export default app;
