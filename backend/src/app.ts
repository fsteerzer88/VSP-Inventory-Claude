import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { attachUser } from "./middleware/auth.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

const PgSession = connectPgSimple(session);
const pgPool = new Pool({ connectionString: env.databaseUrl });

export const app = express();

// Required so express-session (with cookie.secure=true) recognizes the request as
// secure based on the X-Forwarded-Proto header set by the reverse-proxy container,
// since TLS is terminated there and the backend itself only ever sees plain HTTP.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json());

app.use(
  session({
    store: new PgSession({ pool: pgPool, createTableIfMissing: true }),
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.use(attachUser);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
