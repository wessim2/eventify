/** @type {import('next').NextStyle}.NextConfig */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/storefront/:orgSlug/events',
        destination: '/:orgSlug/events',
      },
      {
        source: '/storefront/:orgSlug/events/:eventSlug',
        destination: '/:orgSlug/events/:eventSlug',
      },
      {
        source: '/storefront/:orgSlug/checkout/:registrationId',
        destination: '/:orgSlug/checkout/:registrationId',
      },
    ];
  },
};

export default nextConfig;
