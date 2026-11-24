#!/usr/bin/env python3
"""Offline-only encrypted SQLite backup and restore drill. Never connects to cloud.
Key is read from an owner-only file, never argv or stdout. Uses system OpenSSL.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import stat
import subprocess
import tempfile


def key_file(value):
    path = Path(value)
    mode = stat.S_IMODE(path.stat().st_mode)
    if mode & 0o077:
        raise ValueError('Key file must not be accessible to group or others (chmod 600).')
    if path.stat().st_size < 32:
        raise ValueError('Use at least 32 random bytes in the key file.')
    return path


def verify(db):
    con = sqlite3.connect(f'file:{db}?mode=ro', uri=True)
    try:
        if con.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('SQLite integrity check failed')
        tables = sorted(r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
        return {table: con.execute('SELECT count(*) FROM "' + table.replace('"', '""') + '"').fetchone()[0] for table in tables}
    finally:
        con.close()


def crypt(source, dest, key, decrypt=False):
    # OpenSSL pass:file reads one line; derive printable full-entropy input first.
    derived = Path(dest).parent / 'encryption-passphrase'
    derived.write_text(hashlib.pbkdf2_hmac('sha256', key.read_bytes(), b'cloud-school-backup-enc-v1', 200000).hex())
    args = ['openssl', 'enc', '-aes-256-cbc', '-pbkdf2', '-iter', '200000', '-salt', '-pass', f'file:{derived}', '-in', str(source), '-out', str(dest)]
    if decrypt:
        args.append('-d')
    subprocess.run(args, check=True, capture_output=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['backup', 'restore'])
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--key-file', required=True)
    args = parser.parse_args()
    os.umask(0o077)
    key = key_file(args.key_file)
    source, dest = Path(args.input), Path(args.output)
    if dest.exists():
        raise ValueError('Refusing to overwrite output. Use a new isolated path.')
    with tempfile.TemporaryDirectory() as tmp:
        temp = Path(tmp)
        if args.mode == 'backup':
            snapshot = temp / 'snapshot.sqlite'
            origin = sqlite3.connect(f'file:{source}?mode=ro', uri=True)
            target = sqlite3.connect(snapshot)
            try:
                origin.backup(target)
            finally:
                target.close()
                origin.close()
            counts = verify(snapshot)
            manifest = {'sha256': hashlib.sha256(snapshot.read_bytes()).hexdigest(), 'counts': counts}
            import tarfile
            bundle = temp / 'bundle.tar'
            (temp / 'manifest.json').write_text(json.dumps(manifest))
            with tarfile.open(bundle, 'w') as tar:
                tar.add(snapshot, arcname='snapshot.sqlite')
                tar.add(temp / 'manifest.json', arcname='manifest.json')
            crypt(bundle, temp / 'sealed', key)
            # Encrypt-then-MAC: independent derived authentication key binds all ciphertext.
            import hmac
            mac_key = hashlib.pbkdf2_hmac('sha256', key.read_bytes(), b'cloud-school-backup-mac-v1', 200000)
            ciphertext = (temp / 'sealed').read_bytes()
            with dest.open('xb') as output: output.write(b'CSBK1' + hmac.digest(mac_key, ciphertext, 'sha256') + ciphertext)
            print('Encrypted backup created. Restore drill required before relying on it.')
        else:
            import hmac
            import tarfile
            payload = source.read_bytes()
            if len(payload) < 38 or payload[:5] != b'CSBK1':
                raise ValueError('Unsupported backup format')
            mac_key = hashlib.pbkdf2_hmac('sha256', key.read_bytes(), b'cloud-school-backup-mac-v1', 200000)
            if not hmac.compare_digest(payload[5:37], hmac.digest(mac_key, payload[37:], 'sha256')):
                raise ValueError('Backup authentication failed. Nothing restored.')
            (temp / 'sealed').write_bytes(payload[37:])
            crypt(temp / 'sealed', temp / 'bundle.tar', key, True)
            with tarfile.open(temp / 'bundle.tar') as tar:
                if set(tar.getnames()) != {'snapshot.sqlite', 'manifest.json'}:
                    raise ValueError('Unexpected backup members')
                for name in ['snapshot.sqlite', 'manifest.json']:
                    member = tar.getmember(name)
                    if not member.isfile():
                        raise ValueError('Unsafe member')
                    (temp / name).write_bytes(tar.extractfile(member).read())
            snapshot = temp / 'snapshot.sqlite'
            manifest = json.loads((temp / 'manifest.json').read_text())
            if hashlib.sha256(snapshot.read_bytes()).hexdigest() != manifest['sha256'] or verify(snapshot) != manifest['counts']:
                raise ValueError('Restore verification failed')
            # Restore must not resurrect token versions from an older database.
            con = sqlite3.connect(snapshot)
            try:
                tables = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                if {'users', 'account_security'}.issubset(tables):
                    import secrets
                    for (user_id,) in con.execute('SELECT id FROM users').fetchall():
                        version = secrets.randbelow(2**48 - 1) + 1
                        con.execute("INSERT INTO account_security(user_id,session_version,suspended,updated_at) VALUES (?,?,0,datetime('now')) ON CONFLICT(user_id) DO UPDATE SET session_version=excluded.session_version,updated_at=excluded.updated_at", (user_id, version))
                    con.commit()
            finally:
                con.close()
            verify(snapshot)
            with dest.open('xb') as output: output.write(snapshot.read_bytes())
            print('Restored to isolated new database; integrity and table counts verified.')


if __name__ == '__main__':
    main()
