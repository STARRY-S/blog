#!/usr/bin/env bash

git status -s
git add .
git commit -m "Update site"
git push origin main
