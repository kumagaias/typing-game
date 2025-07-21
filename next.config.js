/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    trailingSlash: true,
    basePath: '/typing-game',
    assetPrefix: '/typing-game',
    images: {
        unoptimized: true
    }
}

module.exports = nextConfig