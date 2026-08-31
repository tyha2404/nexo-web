module.exports = {
  apps: [
    {
      name: "nexo-web",
      script: "npx",
      args: "serve -s dist -l 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
