module.exports = {
  apps: [
    {
      name: 'surveilans',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3107',
      cwd: '/home/bkksamarinda/surveilans',
      env: { NODE_ENV: 'production' },
    },
  ],
};