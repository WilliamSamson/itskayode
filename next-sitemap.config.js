/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://itskayode.web.app",
  generateRobotsTxt: true,
  exclude: ["/p/*"],
  changefreq: "weekly",
  sitemapSize: 7000,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"]
      }
    ]
  },
  transform: async (config, path) => {
    let priority = 0.7;
    let changefreq = "weekly";

    if (path === "/" || path === "") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path === "/about/" || path === "/projects/" || path === "/contact/" || path === "/writing/") {
      priority = 0.9;
      changefreq = "weekly";
    } else if (path.startsWith("/projects/") || path.startsWith("/writing/")) {
      priority = 0.8;
      changefreq = "monthly";
    } else if (path === "/cv/") {
      priority = 0.5;
      changefreq = "monthly";
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
      alternateRefs: config.alternateRefs ?? []
    };
  }
};
