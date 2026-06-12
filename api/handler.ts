import { createApp } from "../app.ts";

const app = createApp();

export default function handler(req: any, res: any) {
  const route = typeof req.query?.route === "string"
    ? req.query.route
    : Array.isArray(req.query?.route)
      ? req.query.route.join("/")
      : "";

  req.url = `/api/${route}`.replace(/\/+$/, "");
  return app(req, res);
}
