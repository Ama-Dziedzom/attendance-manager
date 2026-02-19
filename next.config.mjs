/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript errors MUST fail the build — ignoreBuildErrors was removed intentionally.
  // Fix all type errors; do not re-add this flag.
  images: {
    unoptimized: true,
  },
}

export default nextConfig
