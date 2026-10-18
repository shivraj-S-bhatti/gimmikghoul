FROM falkordb/falkordb-browser@sha256:4e455296e4935b6711cb9b86fbf193588932371e7d442ce413e3138dc865b7fd
USER root
COPY workbench/native-browser/pokemon-sprites.js /tmp/pokemon-sprites.js
COPY workbench/native-browser/patch-browser.mjs /tmp/patch-browser.mjs
RUN node /tmp/patch-browser.mjs /app /tmp/pokemon-sprites.js && rm /tmp/patch-browser.mjs /tmp/pokemon-sprites.js
USER nextjs
