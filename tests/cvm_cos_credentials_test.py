import importlib.util
import os
from pathlib import Path
import stat
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('credentials', Path(__file__).parents[1] / 'deploy/cvm-cos-credentials.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CredentialsTest(unittest.TestCase):
    def fixture(self):
        return {'Code': 'Success', 'TmpSecretId': 'test-id', 'TmpSecretKey': 'test-key', 'Token': 'test-token', 'ExpiredTime': 1700003600}

    def test_cosfs_format_and_expiration(self):
        text, expires = module.credential_text(self.fixture(), now=1700000000)
        self.assertEqual(expires, '2023-11-14T23:13:20')
        self.assertEqual(text, 'COSAccessKeyId=test-id\nCOSSecretKey=test-key\nCOSAccessToken=test-token\nCOSAccessTokenExpire=2023-11-14T23:13:20\n')

    def test_failed_expired_and_injected_values_rejected(self):
        for changes in ({'Code': 'Denied'}, {'ExpiredTime': 1700000010}, {'TmpSecretKey': 'value\nCOSAccessToken=injected'}, {'Token': ''}, {'ExpiredTime': True}):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                module.credential_text({**self.fixture(), **changes}, now=1700000000)

    @unittest.skipUnless(hasattr(os, 'geteuid'), 'POSIX permission checks require Linux')
    def test_private_atomic_write_and_symlink_refusal(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / 'credentials'
            module.save_private(target, 'first')
            self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)
            module.save_private(target, 'second')
            self.assertEqual(target.read_text(), 'second')
            target.unlink()
            outside = Path(directory) / 'outside'
            outside.write_text('unchanged')
            target.symlink_to(outside)
            with self.assertRaises(ValueError):
                module.save_private(target, 'unsafe')
            self.assertEqual(outside.read_text(), 'unchanged')


if __name__ == '__main__':
    unittest.main()
