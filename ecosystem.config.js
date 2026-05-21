module.exports = {
  apps: [
    {
      name: 'agentic-os-dashboard',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: '/root/agentic-os-dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        API_BASE_URL: 'http://31.97.227.135:5000/api'
      }
    }
  ]
};
