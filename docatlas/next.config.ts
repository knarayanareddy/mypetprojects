import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "exceljs", "jszip", "unpdf", "turndown"],
};

export default nextConfig;
