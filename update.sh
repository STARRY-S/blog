#!/bin/bash

hikaru clean
hikaru build --debug

git add ./docs/
git commit -m "Updated generated site files"

git push origin main
# git push gitlab main
