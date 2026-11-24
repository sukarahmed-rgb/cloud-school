import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('backup.py')

class BackupDrill(unittest.TestCase):
    def test_roundtrip_tamper_and_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); key=root/'synthetic-test.key'; key.write_bytes(os.urandom(48));key.chmod(0o600)
            db=root/'source.sqlite';con=sqlite3.connect(db);con.executescript("CREATE TABLE users(id TEXT); INSERT INTO users VALUES ('student'); CREATE TABLE account_security(user_id TEXT PRIMARY KEY,session_version INTEGER,suspended INTEGER,updated_at TEXT); INSERT INTO account_security VALUES ('student',4,1,'now'); CREATE TABLE synthetic(id TEXT, answer TEXT); INSERT INTO synthetic VALUES ('a','synthetic-only');");con.close()
            sealed=root/'backup.sealed';restored=root/'restored.sqlite'
            def run(mode,source,target):
                return subprocess.run([sys.executable,str(SCRIPT),mode,'--input',str(source),'--output',str(target),'--key-file',str(key)],capture_output=True)
            self.assertEqual(run('backup',db,sealed).returncode,0)
            self.assertNotIn(b'synthetic-only',sealed.read_bytes())
            self.assertEqual(run('restore',sealed,restored).returncode,0)
            con=sqlite3.connect(restored);self.assertEqual(con.execute('SELECT answer FROM synthetic').fetchone()[0],'synthetic-only');self.assertNotEqual(con.execute('SELECT session_version FROM account_security').fetchone()[0],4);self.assertEqual(con.execute('SELECT suspended FROM account_security').fetchone()[0],1);con.close()
            self.assertNotEqual(run('restore',sealed,restored).returncode,0)
            damaged=bytearray(sealed.read_bytes());damaged[-1]^=1;sealed.write_bytes(damaged)
            self.assertNotEqual(run('restore',sealed,root/'bad.sqlite').returncode,0);self.assertFalse((root/'bad.sqlite').exists())
            key.chmod(0o644);self.assertNotEqual(run('backup',db,root/'unsafe.sealed').returncode,0)

if __name__=='__main__':unittest.main()
