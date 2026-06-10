/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@erabi/crypto", "@erabi/constants"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
