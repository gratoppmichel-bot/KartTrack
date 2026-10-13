import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/datenschutz"], disallow: ["/sessions", "/friends", "/rewards", "/leaderboard", "/compare", "/profile"] },
  };
}
