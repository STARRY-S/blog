#!/bin/bash
hikaru clean
hikaru build --debug
git add ./docs/
git commit -m "Update Site."
git push origin main
# git push gitlab main
