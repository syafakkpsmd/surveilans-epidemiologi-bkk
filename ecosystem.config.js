module.exports = {
  apps: [
    {
      name: 'surveilans',
      script: 'node_modules/next/dist/bin/next',
      // Port 10000 = port yang diteruskan Apache/cPanel untuk surveilans.bkksamarinda.or.id.
      // Jangan diganti tanpa mengubah tujuan proksi di cPanel.
      args: 'start -p 10000',
      cwd: '/home/bkksamarinda/surveilans',
      env: { NODE_ENV: 'production' },
    },
  ],
};
