/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/',
        permanent: false,
      },
      {
        source: '/login.html',
        destination: '/',
        permanent: false,
      },
      {
        source: '/internal/admin/dashboard',
        destination: '/internal/admin/dashboard.html',
        permanent: false,
      },
      {
        source: '/internal/staff/dashboard',
        destination: '/internal/staff/dashboard.html',
        permanent: false,
      },
      {
        source: '/student/dashboard',
        destination: '/student/dashboard.html',
        permanent: false,
      },
      {
        source: '/parent/dashboard',
        destination: '/parent/dashboard.html',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/register.html',
        permanent: false,
      },
      {
        source: '/migrate-data',
        destination: '/migrate-data.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
