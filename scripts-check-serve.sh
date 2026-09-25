#!/usr/bin/env bash
# Temporary manual check for TKT-7: serve the static export and request a known
# path, an unknown tool slug and an unknown path.
set -u
PORT=4173
npx serve out -l "$PORT" >/tmp/serve.log 2>&1 &
SERVER=$!
for _ in $(seq 1 40); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 0.5
done
for p in "/" "/tools/weight-converter" "/tools/does-not-exist" "/nope/at/all"; do
  code=$(curl -s -o /tmp/body.html -w "%{http_code}" "http://127.0.0.1:$PORT$p")
  title=$(grep -o "<title>[^<]*" /tmp/body.html | head -1)
  echo "$p -> $code  $title"
done
kill "$SERVER" 2>/dev/null
wait "$SERVER" 2>/dev/null
