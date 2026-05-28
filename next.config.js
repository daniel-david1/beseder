/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["israeli-bank-scrapers", "playwright", "puppeteer"],
};

module.exports = nextConfig;
