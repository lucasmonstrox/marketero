/**
 * CORS para o painel (apps/web). `credentials: true` exige `origin` explícito.
 * Em PROD: pinado no `WEB_ORIGIN`. Em DEV (sem `WEB_ORIGIN`): libera qualquer
 * porta de localhost — o Next escolhe 3000/3001/… conforme o que estiver livre.
 */
import { cors } from "@elysiajs/cors"
import { Elysia } from "elysia"

export const corsPlugin = new Elysia({ name: "plugin.cors" }).use(
  cors({
    origin: process.env.WEB_ORIGIN ?? /^http:\/\/localhost:\d+$/,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)
