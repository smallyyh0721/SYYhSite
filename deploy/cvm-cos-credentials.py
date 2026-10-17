#!/usr/bin/env python3
"""Refresh COSfs STS credentials from this CVM's bound role; never print secrets."""
import argparse
import datetime
import json
import os
from pathlib import Path
import re
import stat
import tempfile
import time
import urllib.request

ROLE_ENDPOINT = 'http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials/'


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def metadata_credentials(role=None):
    # Metadata must go directly to the CVM service, never through HTTP(S)_PROXY.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

    def get(url):
        with opener.open(url, timeout=5) as response:
            data = response.read(65537)
        if len(data) > 65536:
            raise ValueError('Metadata response too large')
        return data.decode('utf-8')

    if not role:
        roles = [line.strip() for line in get(ROLE_ENDPOINT).splitlines() if line.strip()]
        if len(roles) != 1:
            raise ValueError('Exactly one bound CVM role is required')
        role = roles[0]
    if not re.fullmatch(r'[A-Za-z0-9_+=,.@-]{1,128}', role):
        raise ValueError('Invalid CVM role name')
    return json.loads(get(ROLE_ENDPOINT + role))


def credential_text(data, now=None):
    now = int(time.time()) if now is None else now
    if data.get('Code') != 'Success':
        raise ValueError('CVM role did not return successful temporary credentials')
    values = []
    for key in ('TmpSecretId', 'TmpSecretKey', 'Token'):
        value = data.get(key)
        if not isinstance(value, str) or not value or len(value) > 16384 or any(c in value for c in '\r\n\x00'):
            raise ValueError('Invalid temporary credential fields')
        values.append(value)
    expires = data.get('ExpiredTime')
    if isinstance(expires, bool) or not isinstance(expires, int) or expires <= now + 300:
        raise ValueError('Temporary credentials expire too soon')
    stamp = datetime.datetime.fromtimestamp(expires, datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S')
    return (f'COSAccessKeyId={values[0]}\nCOSSecretKey={values[1]}\nCOSAccessToken={values[2]}\nCOSAccessTokenExpire={stamp}\n', stamp)


def save_private(path, text):
    path = Path(path)
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    parent = path.parent.lstat()
    if not stat.S_ISDIR(parent.st_mode) or parent.st_uid != os.geteuid() or stat.S_IMODE(parent.st_mode) & 0o077:
        raise ValueError('Credential directory must be private and owned by the service user')
    if path.is_symlink():
        raise ValueError('Credential destination cannot be a symlink')
    fd, temporary = tempfile.mkstemp(prefix='.sts-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as stream:
            os.fchmod(stream.fileno(), 0o600)
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--role', default=None)
    parser.add_argument('--output', default='/run/syyh-cos/credentials')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise ValueError('Run as root on the CVM')
    text, expires = credential_text(metadata_credentials(args.role))
    save_private(args.output, text)
    print('COSfs temporary credential file refreshed; expires UTC ' + expires)


if __name__ == '__main__':
    try:
        main()
    except Exception:
        # No HTTP response, credential payload or traceback is logged.
        print('COS credential refresh failed; check bound CVM role and metadata access.', file=__import__('sys').stderr)
        raise SystemExit(1)
