#!/usr/bin/env bash

git status -s
git add .
git commit -m "Update site $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main
