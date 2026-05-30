/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://itskayode.web.app",
  generateRobotsTxt: true,
  changefreq: "weekly",
  sitemapSize: 7000,
  transform: async (config, path) => {
    let priority = 0.7;
    let changefreq = "weekly";

    // Set precise priority and frequency values depending on the page route
    if (path === "/" || path === "") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path === "/about/" || path === "/projects/" || path === "/contact/") {
      priority = 0.9;
      changefreq = "weekly";
    } else if (path.startsWith("/projects/")) {
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
