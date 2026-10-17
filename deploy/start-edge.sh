#!/bin/sh
set -eu
if [ "${SYYH_TLS:-on}" = off ]; then
  exec nginx -c /etc/nginx/syyh/local.conf -g 'daemon off;'
fi
exec nginx -c /etc/nginx/syyh/production.conf -g 'daemon off;'
