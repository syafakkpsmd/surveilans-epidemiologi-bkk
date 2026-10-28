$server = "bkksamarinda@187.127.121.87"
$key = "$env:USERPROFILE\.ssh\id_ed25519_deploy"
$opt = @("-i", $key, "-o", "IdentitiesOnly=yes", "-o", "BatchMode=yes")
$repo = "/home/bkksamarinda/repo-surveilans.git"

$hook = @'
#!/bin/bash -l
set -e
APP=/home/bkksamarinda/surveilans
GITDIR=/home/bkksamarinda/repo-surveilans.git
while read oldrev newrev ref; do
  case "$ref" in
    refs/heads/main|refs/heads/master)
      BRANCH=${ref#refs/heads/}
      echo ">> Deploy cabang $BRANCH"
      git --work-tree="$APP" --git-dir="$GITDIR" checkout -f "$BRANCH"
      cd "$APP"
      npm ci
      npm run build
      pm2 delete surveilans || true
      pm2 start npm --name surveilans -- start -- -p 3107
      pm2 save
      echo ">> Selesai"
      ;;
  esac
done
'@
[IO.File]::WriteAllText("$env:TEMP\post-receive", ($hook -replace "`r`n", "`n"))

ssh @opt $server "git --version && git init --bare $repo"
scp @opt "$env:TEMP\post-receive" "${server}:$repo/hooks/post-receive"
ssh @opt $server "chmod +x $repo/hooks/post-receive"

Add-Content -Encoding ascii "$env:USERPROFILE\.ssh\config" @'

Host kantor
  HostName 187.127.121.87
  User bkksamarinda
  IdentityFile ~/.ssh/id_ed25519_deploy
  IdentitiesOnly yes
'@