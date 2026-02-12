import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    urlImports: ["https://esm.sh/"],
  },
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const minimizer = config.optimization.minimizer?.[0];
      if (minimizer && minimizer.options && minimizer.options.terserOptions) {
        minimizer.options.terserOptions = {
          ...minimizer.options.terserOptions,
          keep_classnames: true,
          keep_fnames: true,
        };
      }
    }
    return config;
  },
};

export default nextConfig;
