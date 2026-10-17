#!/usr/bin/python3
"""Read-only check that SITE_ROOT is the existing fuse.cosfs store. Never writes."""
import argparse
import json
import os
import re
import stat
import subprocess
import sys
import time

MARKER_NAME = '.syyh-store-id'
FUSE_TYPE = 'fuse.cosfs'
MAX_WAIT_SECONDS = 180
MAX_MARKER_BYTES = 4096
STORE_ID_RE = re.compile(r'^[A-Za-z0-9._:-]{4,128}$')
FINDMNT_ARGV = ('findmnt', '--json', '-T')
FINDMNT_COLUMNS = 'TARGET,FSTYPE,SOURCE'


class GuardError(Exception):
    pass


def invoke_findmnt(path):
    try:
        completed = subprocess.run(
            [FINDMNT_ARGV[0], FINDMNT_ARGV[1], FINDMNT_ARGV[2], path, '-o', FINDMNT_COLUMNS],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            timeout=10,
            check=False,
            shell=False,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise GuardError('findmnt failed') from error
    if completed.returncode != 0:
        raise GuardError('findmnt failed')
    return completed.stdout


def parse_findmnt_json(stdout):
    try:
        data = json.loads(stdout)
    except (TypeError, ValueError) as error:
        raise GuardError('findmnt returned invalid JSON') from error
    if not isinstance(data, dict):
        raise GuardError('findmnt returned invalid JSON')
    filesystems = data.get('filesystems')
    if not isinstance(filesystems, list) or len(filesystems) != 1:
        raise GuardError('findmnt returned invalid JSON')
    entry = filesystems[0]
    if not isinstance(entry, dict):
        raise GuardError('findmnt returned invalid JSON')
    target = entry.get('target')
    fstype = entry.get('fstype')
    source = entry.get('source')
    if not all(isinstance(value, str) and value for value in (target, fstype, source)):
        raise GuardError('findmnt returned invalid JSON')
    return {'target': target, 'fstype': fstype, 'source': source}


def mount_for(path, invoke=invoke_findmnt):
    return parse_findmnt_json(invoke(path))


def require_absolute_root(root):
    if not isinstance(root, str) or not root or not os.path.isabs(root):
        raise GuardError('root must be an absolute path')


def require_store_id(store_id):
    if not isinstance(store_id, str) or not STORE_ID_RE.fullmatch(store_id):
        raise GuardError('store-id is invalid')


def require_wait_seconds(wait_seconds):
    if isinstance(wait_seconds, bool) or not isinstance(wait_seconds, int):
        raise GuardError('wait-seconds must be between 0 and 180')
    if wait_seconds < 0 or wait_seconds > MAX_WAIT_SECONDS:
        raise GuardError('wait-seconds must be between 0 and 180')


def require_real_directory(path, label):
    try:
        info = os.lstat(path)
    except OSError as error:
        if getattr(error, 'errno', None) == 2 or getattr(error, 'winerror', None) == 2:
            raise GuardError(f'{label} is not a directory') from error
        raise GuardError(f'cannot stat {label}') from error
    if stat.S_ISLNK(info.st_mode):
        raise GuardError(f'{label} is a symlink')
    if not stat.S_ISDIR(info.st_mode):
        raise GuardError(f'{label} is not a directory')


def read_marker(path, label):
    try:
        info = os.lstat(path)
    except OSError as error:
        if getattr(error, 'errno', None) == 2 or getattr(error, 'winerror', None) == 2:
            raise GuardError(f'{label} store marker missing') from error
        raise GuardError(f'cannot read {label} store marker') from error
    if stat.S_ISLNK(info.st_mode) or not stat.S_ISREG(info.st_mode):
        raise GuardError(f'{label} store marker is not a regular file')
    flags = os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0)
    try:
        fd = os.open(path, flags)
    except OSError as error:
        raise GuardError(f'cannot read {label} store marker') from error
    try:
        chunks = []
        total = 0
        while True:
            piece = os.read(fd, 1024)
            if not piece:
                break
            total += len(piece)
            if total > MAX_MARKER_BYTES:
                raise GuardError(f'cannot read {label} store marker')
            chunks.append(piece)
        data = b''.join(chunks)
    except OSError as error:
        raise GuardError(f'cannot read {label} store marker') from error
    finally:
        os.close(fd)
    try:
        text = data.decode('utf-8')
    except UnicodeDecodeError as error:
        raise GuardError(f'cannot read {label} store marker') from error
    return text.replace('\r\n', '\n').replace('\r', '\n').rstrip('\n')


def mount_covers(path, mount_target):
    try:
        path_abs = os.path.abspath(path)
        mount_abs = os.path.abspath(mount_target)
        return os.path.commonpath([path_abs, mount_abs]) == mount_abs
    except ValueError:
        return False


def require_same_cos_mount(root, derived, root_mount, derived_mount):
    if root_mount['fstype'] != FUSE_TYPE:
        raise GuardError('root is not fuse.cosfs')
    if derived_mount['fstype'] != FUSE_TYPE:
        raise GuardError('derived is not fuse.cosfs')
    if root_mount['target'] != derived_mount['target'] or root_mount['source'] != derived_mount['source']:
        raise GuardError('derived is not on the same COS mount')
    if not mount_covers(root, root_mount['target']) or not mount_covers(derived, derived_mount['target']):
        raise GuardError('derived is not on the same COS mount')


def assess_store(root, store_id, invoke=invoke_findmnt):
    require_real_directory(root, 'root')
    derived = os.path.join(root, 'derived')
    require_real_directory(derived, 'derived')
    root_marker = read_marker(os.path.join(root, MARKER_NAME), 'root')
    if root_marker != store_id:
        raise GuardError('root store marker mismatch')
    derived_marker = read_marker(os.path.join(derived, MARKER_NAME), 'derived')
    if derived_marker != store_id:
        raise GuardError('derived store marker mismatch')
    root_mount = mount_for(root, invoke=invoke)
    derived_mount = mount_for(derived, invoke=invoke)
    require_same_cos_mount(root, derived, root_mount, derived_mount)


def wait_for_store(root, store_id, wait_seconds, invoke=invoke_findmnt, sleep=time.sleep, monotonic=time.monotonic):
    require_absolute_root(root)
    require_store_id(store_id)
    require_wait_seconds(wait_seconds)
    deadline = monotonic() + wait_seconds
    while True:
        try:
            assess_store(root, store_id, invoke=invoke)
            return None
        except GuardError as error:
            reason = str(error)
        if wait_seconds <= 0 or monotonic() >= deadline:
            return reason
        remaining = deadline - monotonic()
        if remaining <= 0:
            return reason
        sleep(min(1.0, remaining))


def parse_args(argv):
    parser = argparse.ArgumentParser(description='Verify the existing fuse.cosfs site store before starting containers.')
    parser.add_argument('--root', required=True)
    parser.add_argument('--store-id', required=True)
    parser.add_argument('--wait-seconds', type=int, default=0)
    return parser.parse_args(argv)


def main(argv=None, invoke=None, sleep=time.sleep, monotonic=time.monotonic):
    args = parse_args(argv)
    try:
        reason = wait_for_store(
            args.root,
            args.store_id,
            args.wait_seconds,
            invoke=invoke or invoke_findmnt,
            sleep=sleep,
            monotonic=monotonic,
        )
    except GuardError as error:
        reason = str(error)
    if reason:
        print(reason, file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
