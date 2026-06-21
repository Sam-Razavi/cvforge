import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class AdminAuthMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Basic ")) {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString(
        "utf8",
      );
      const colonIdx = decoded.indexOf(":");
      if (colonIdx !== -1) {
        const user = decoded.slice(0, colonIdx);
        const pass = decoded.slice(colonIdx + 1);
        if (
          user === this.config.get<string>("bullBoard.user") &&
          pass === this.config.get<string>("bullBoard.password")
        ) {
          return next();
        }
      }
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="CVForge Admin"');
    res.status(401).send("Unauthorized");
  }
}
