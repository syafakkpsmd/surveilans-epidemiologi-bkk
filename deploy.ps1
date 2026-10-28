$server = "bkksamarinda@187.127.121.87"
$key = "$env:USERPROFILE\.ssh\id_ed25519_deploy"
$opt = @("-i", $key, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes")

Set-Location $PSScriptRoot

tar --exclude=node_modules --exclude=.next --exclude=.vercel --exclude=.git --exclude=.env* --exclude=*.tar.gz -czf ..\surveilans.tar.gz .

scp @opt ..\surveilans.tar.gz "${server}:/home/bkksamarinda/surveilans.tar.gz"

ssh @opt $server "bash -lc 'cd ~/surveilans && tar -xzf ~/surveilans.tar.gz && npm ci && npm run build && (pm2 delete surveilans || true) && pm2 start ecosystem.config.js && pm2 save'"