from io import StringIO
import importlib.util
import json
import os
from pathlib import Path
import shutil
import stat
import tempfile
import unittest
from unittest.mock import patch

STORE_ID = 'syyh-site-20261016-01a144bb'
SPEC = importlib.util.spec_from_file_location(
    'existing_store_guard',
    Path(__file__).resolve().parents[1] / 'deploy' / 'existing-store-guard.py',
)
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def write_marker(directory, value=STORE_ID):
    path = os.path.join(directory, '.syyh-store-id')
    with open(path, 'w', encoding='utf-8', newline='\n') as handle:
        handle.write(value + '\n')
    return path


def make_site(base):
    root = os.path.join(base, 'syyh-site')
    derived = os.path.join(root, 'derived')
    os.makedirs(derived)
    write_marker(root)
    write_marker(derived)
    return root, derived


def fuse_payload(target, fstype='fuse.cosfs', source='cosfs'):
    return json.dumps({'filesystems': [{'target': target, 'fstype': fstype, 'source': source}]})


def invoke_map(mapping):
    def invoke(path):
        if path not in mapping:
            raise module.GuardError('findmnt failed')
        value = mapping[path]
        if isinstance(value, Exception):
            raise value
        return value

    return invoke


def pretend_symlink(path):
    original = module.os.lstat
    wanted = os.path.normcase(os.path.abspath(path))

    class LinkInfo:
        st_mode = stat.S_IFLNK | 0o777

    def lstat(candidate):
        if os.path.normcase(os.path.abspath(candidate)) == wanted:
            return LinkInfo()
        return original(candidate)

    return patch.object(module.os, 'lstat', lstat)


class ExistingStoreGuardTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = self.temp.name
        self.mount = os.path.join(self.base, 'datastore')
        os.makedirs(self.mount)
        self.root, self.derived = make_site(self.mount)

    def tearDown(self):
        self.temp.cleanup()

    def same_fuse(self, root=None, derived=None, target=None):
        root = self.root if root is None else root
        derived = self.derived if derived is None else derived
        target = self.mount if target is None else target
        payload = fuse_payload(target)
        return invoke_map({root: payload, derived: payload})

    def assess(self, invoke, root=None, store_id=STORE_ID):
        try:
            module.assess_store(root or self.root, store_id, invoke=invoke)
        except module.GuardError as error:
            return str(error)
        return None

    def test_valid_fuse_accepts_matching_markers(self):
        self.assertIsNone(self.assess(self.same_fuse()))

    def test_ordinary_directory_rejected_even_with_markers(self):
        local = fuse_payload(self.mount, fstype='ext4', source='/dev/sda1')
        reason = self.assess(invoke_map({self.root: local, self.derived: local}))
        self.assertEqual(reason, 'root is not fuse.cosfs')

    def test_root_marker_missing(self):
        os.remove(os.path.join(self.root, '.syyh-store-id'))
        self.assertEqual(self.assess(self.same_fuse()), 'root store marker missing')

    def test_derived_marker_missing(self):
        os.remove(os.path.join(self.derived, '.syyh-store-id'))
        self.assertEqual(self.assess(self.same_fuse()), 'derived store marker missing')

    def test_root_marker_mismatch(self):
        write_marker(self.root, 'other-store-id-0001')
        self.assertEqual(self.assess(self.same_fuse()), 'root store marker mismatch')

    def test_derived_marker_mismatch(self):
        write_marker(self.derived, 'other-store-id-0001')
        self.assertEqual(self.assess(self.same_fuse()), 'derived store marker mismatch')

    def test_root_symlink_rejected(self):
        linked = os.path.join(self.base, 'linked-root')
        try:
            os.symlink(self.root, linked, target_is_directory=True)
            self.assertEqual(self.assess(self.same_fuse(), root=linked), 'root is a symlink')
            return
        except (OSError, NotImplementedError):
            pass
        with pretend_symlink(self.root):
            self.assertEqual(self.assess(self.same_fuse()), 'root is a symlink')

    def test_derived_symlink_rejected(self):
        real_derived = os.path.join(self.mount, 'real-derived')
        os.makedirs(real_derived)
        write_marker(real_derived)
        shutil.rmtree(self.derived)
        try:
            os.symlink(real_derived, self.derived, target_is_directory=True)
            self.assertEqual(self.assess(self.same_fuse()), 'derived is a symlink')
            return
        except (OSError, NotImplementedError):
            os.makedirs(self.derived)
            write_marker(self.derived)
        with pretend_symlink(self.derived):
            self.assertEqual(self.assess(self.same_fuse()), 'derived is a symlink')

    def test_marker_symlink_rejected(self):
        marker = os.path.join(self.root, '.syyh-store-id')
        outside = os.path.join(self.base, 'outside-marker')
        with open(outside, 'w', encoding='utf-8') as handle:
            handle.write(STORE_ID + '\n')
        os.remove(marker)
        try:
            os.symlink(outside, marker)
            self.assertEqual(self.assess(self.same_fuse()), 'root store marker is not a regular file')
            return
        except (OSError, NotImplementedError):
            write_marker(self.root)
        with pretend_symlink(marker):
            self.assertEqual(self.assess(self.same_fuse()), 'root store marker is not a regular file')

    def test_derived_on_different_mount_rejected(self):
        other = os.path.join(self.base, 'other-mount')
        invoke = invoke_map({
            self.root: fuse_payload(self.mount),
            self.derived: fuse_payload(other, source='cosfs'),
        })
        self.assertEqual(self.assess(invoke), 'derived is not on the same COS mount')

    def test_findmnt_failure_rejected(self):
        def invoke(_path):
            raise module.GuardError('findmnt failed')

        self.assertEqual(self.assess(invoke), 'findmnt failed')

    def test_invalid_findmnt_json_rejected(self):
        invoke = invoke_map({self.root: '{not-json', self.derived: '{not-json'})
        self.assertEqual(self.assess(invoke), 'findmnt returned invalid JSON')

    def test_findmnt_json_missing_fields_rejected(self):
        payload = json.dumps({'filesystems': [{'target': self.mount, 'fstype': 'fuse.cosfs'}]})
        invoke = invoke_map({self.root: payload, self.derived: payload})
        self.assertEqual(self.assess(invoke), 'findmnt returned invalid JSON')

    def test_wait_requeries_findmnt_each_attempt(self):
        calls = []
        local = fuse_payload(self.mount, fstype='ext4', source='/dev/sda1')
        ready = fuse_payload(self.mount)

        def invoke(path):
            calls.append(path)
            if len(calls) == 1:
                return local
            return ready

        clock = [0]

        def monotonic():
            return clock[0]

        def sleep(seconds):
            clock[0] += seconds

        reason = module.wait_for_store(
            self.root,
            STORE_ID,
            5,
            invoke=invoke,
            sleep=sleep,
            monotonic=monotonic,
        )
        self.assertIsNone(reason)
        self.assertGreaterEqual(len(calls), 3)
        self.assertEqual(calls[0], self.root)

    def test_wait_zero_does_not_sleep(self):
        slept = []
        reason = module.wait_for_store(
            self.root,
            STORE_ID,
            0,
            invoke=lambda _path: (_ for _ in ()).throw(module.GuardError('findmnt failed')),
            sleep=slept.append,
            monotonic=lambda: 0,
        )
        self.assertEqual(reason, 'findmnt failed')
        self.assertEqual(slept, [])

    def test_relative_root_rejected_without_wait(self):
        with self.assertRaises(module.GuardError) as ctx:
            module.wait_for_store('relative/syyh-site', STORE_ID, 30, invoke=self.same_fuse())
        self.assertEqual(str(ctx.exception), 'root must be an absolute path')

    def test_cli_success_and_failure_exit(self):
        with patch('sys.stderr', StringIO()):
            self.assertEqual(
                module.main(['--root', self.root, '--store-id', STORE_ID], invoke=self.same_fuse()),
                0,
            )
            local = fuse_payload(self.mount, fstype='ext4', source='/dev/sda1')
            self.assertEqual(
                module.main(
                    ['--root', self.root, '--store-id', STORE_ID],
                    invoke=invoke_map({self.root: local, self.derived: local}),
                ),
                1,
            )

    def test_cli_rejects_bad_wait_and_relative_root(self):
        with patch('sys.stderr', StringIO()):
            self.assertEqual(
                module.main(['--root', self.root, '--store-id', STORE_ID, '--wait-seconds', '181']),
                1,
            )
            self.assertEqual(
                module.main(['--root', 'syyh-site', '--store-id', STORE_ID]),
                1,
            )
            with self.assertRaises(SystemExit) as ctx:
                module.main([])
            self.assertNotEqual(ctx.exception.code, 0)


if __name__ == '__main__':
    unittest.main()
