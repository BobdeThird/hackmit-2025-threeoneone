import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  publicRoutes: ["/", "/api/trpc/public.*"],
});

export const config = { matcher: ["/((?!_next|.*\\..*).*)"] };