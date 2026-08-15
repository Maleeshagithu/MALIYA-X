#!/usr/bin/env bash
set -e
npm install
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp
chmod +x /tmp/yt-dlp
mkdir -p .bin
cp /tmp/yt-dlp .bin/yt-dlp
