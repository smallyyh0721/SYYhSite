#!/usr/bin/env python3
"""Certbot manual hooks for the existing Docker edge, without stopping HTTP."""
import os
import re
import subprocess
import sys
import urllib.request
import shutil
from pathlib import Path

ROOT = Path('/opt/website/syyh/tls/acme/.well-known/acme-challenge')


def edge():
    result = subprocess.run(
        ['docker', 'ps', '--filter', 'label=com.docker.compose.project=syyh-draft',
         '--filter', 'label=com.docker.compose.service=web', '--format', '{{.ID}}'],
        check=True, capture_output=True, text=True)
    ids = result.stdout.strip().splitlines()
    if len(ids) != 1:
        raise RuntimeError('Expected exactly one production edge container')
    return ids[0]


def main():
    action = sys.argv[1]
    container = edge()
    if action == 'deploy':
        certificates = Path('/opt/website/syyh/tls/edge')
        certificates.mkdir(parents=True, exist_ok=True)
        os.chown(certificates, 0, 11001)
        certificates.chmod(0o750)
        for name in ('fullchain.pem', 'privkey.pem'):
            temporary = certificates / (name + '.new')
            shutil.copyfile(Path('/etc/letsencrypt/live/syyh-ip') / name, temporary)
            os.chown(temporary, 0, 11001)
            temporary.chmod(0o640)
            temporary.replace(certificates / name)
        modern = subprocess.run(['docker', 'exec', container, 'test', '-f', '/etc/nginx/syyh/production.conf']).returncode == 0
        config = ['-c', '/etc/nginx/syyh/production.conf'] if modern else []
        subprocess.run(['docker', 'exec', container, 'nginx', *config, '-t'], check=True)
        subprocess.run(['docker', 'exec', container, 'nginx', *config, '-s', 'reload'], check=True)
        return
    token = os.environ.get('CERTBOT_TOKEN', '')
    if not re.fullmatch(r'[A-Za-z0-9_-]{10,200}', token):
        raise ValueError('Invalid challenge token')
    target = ROOT / token
    modern = subprocess.run(['docker', 'exec', container, 'test', '-d', '/srv/acme']).returncode == 0
    destination = ('/srv/acme' if modern else '/usr/share/nginx/html') + '/.well-known/acme-challenge/' + token
    if action == 'auth':
        validation = os.environ['CERTBOT_VALIDATION']
        if not re.fullmatch(r'[A-Za-z0-9_.-]{10,500}', validation):
            raise ValueError('Invalid challenge value')
        ROOT.mkdir(parents=True, exist_ok=True)
        target.write_text(validation, encoding='ascii')
        target.chmod(0o644)
        # V3 binds ROOT read-only. V2 needs this temporary copy into its static root.
        present = subprocess.run(['docker', 'exec', container, 'test', '-f', destination]).returncode == 0
        if not present:
            subprocess.run(['docker', 'exec', container, 'mkdir', '-p', str(Path(destination).parent)], check=True)
            subprocess.run(['docker', 'cp', str(target), container + ':' + destination], check=True)
        with urllib.request.urlopen('http://127.0.0.1/.well-known/acme-challenge/' + token, timeout=5) as response:
            if response.read().decode('ascii') != validation:
                raise RuntimeError('Challenge is not served correctly')
    elif action == 'cleanup':
        target.unlink(missing_ok=True)
        if subprocess.run(['docker', 'exec', container, 'test', '-f', destination]).returncode == 0:
            subprocess.run(['docker', 'exec', container, 'rm', '-f', destination], check=True)
    else:
        raise ValueError('Unknown hook action')


if __name__ == '__main__':
    main()
