"""Build the approved, checksum-verified static website. No dependencies or network."""
from pathlib import Path
from io import BytesIO
import base64
import hashlib
import zipfile

ROOT = Path(__file__).resolve().parent
EXPECTED_SHA256 = 'a5d64a4ec022ee902279c04f31048ba3f0c0848a8db7a4a544e080f36ffae20e'
parts = [(ROOT / 'payload' / f'{i:02d}.b64').read_text(encoding='ascii').strip() for i in range(6)]
# Restore two documented text-transport transcription errors before verification.
parts[2] = parts[2].replace('FfP745FPr5P+DVXxZxSI/g9dfvPoFr5P+DVXxZxSI/g9dfvPoFrv7nsFe/fPVfo', 'FfP745FPr5P+DVXxZxSI/g9dfvPoFrv7nsFe/fPVfo')
parts[5] = parts[5].replace('EWZ8na1qLX56EVKBL', 'EWZ8na1JcLX56EVKBL')
payload = base64.b64decode(''.join(parts), validate=True)
if len(payload) != 36555 or hashlib.sha256(payload).hexdigest() != EXPECTED_SHA256:
    raise SystemExit('Build stopped: website checksum does not match the approved artifact.')
output = ROOT / 'site'
output.mkdir(exist_ok=True)
with zipfile.ZipFile(BytesIO(payload)) as archive:
    if set(archive.namelist()) != {'index.html', '_headers'} or archive.testzip() is not None:
        raise SystemExit('Build stopped: unexpected archive contents.')
    for filename in ('index.html', '_headers'):
        (output / filename).write_bytes(archive.read(filename))
print('Verified and built Open Limits Modifications: index.html and _headers.')
