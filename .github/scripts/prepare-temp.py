"""Prepare a Pages artifact; refuse any change outside /temp/."""

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def outside_temp(root):
    files = {}
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if relative.parts[0] == 'temp':
            continue
        if path.is_symlink():
            raise RuntimeError(f'Symlink outside temp: {relative}')
        if path.is_file():
            files[relative.as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    return files


def verify_unchanged(baseline, output):
    before, after = outside_temp(baseline), outside_temp(output)
    if not before or before != after:
        raise RuntimeError('Main-site files differ; deployment blocked.')
    return before


def prepare(baseline, viewer, output):
    if not (baseline / 'index.html').is_file():
        raise RuntimeError('Missing deployed-site baseline; deployment blocked.')
    for required in ('index.html', 'app.js', 'style.css', 'model.json', 'original-model.json'):
        if not (viewer / required).is_file():
            raise RuntimeError(f'Missing viewer file: {required}')
    if any(path.is_symlink() for path in viewer.rglob('*')):
        raise RuntimeError('Viewer symlinks are not allowed.')
    shutil.copytree(baseline, output)
    if (output / 'temp').exists():
        shutil.rmtree(output / 'temp')
    shutil.copytree(viewer, output / 'temp', ignore=shutil.ignore_patterns('.gitignore'))
    return verify_unchanged(baseline, output)


if __name__ == '__main__':
    baseline, viewer, output = map(Path, sys.argv[1:4])
    changed = subprocess.check_output(
        ['git', 'diff', '--name-only', '--no-renames', sys.argv[4], 'HEAD'], text=True
    ).splitlines()
    deployment_files = {
        '.github/workflows/deploy-pages.yml',
        '.github/workflows/deploy-temp.yml',
        '.github/scripts/prepare-temp.py',
    }
    if any(not name.startswith('public/temp/') and name not in deployment_files for name in changed):
        raise RuntimeError('Unpublished main-site changes found; use the main deployment workflow.')
    files = prepare(baseline, viewer, output)
    digest = hashlib.sha256(json.dumps(files, sort_keys=True).encode()).hexdigest()
    report = f'Preserved all {len(files)} main-site files byte for byte.\nManifest SHA-256: {digest}\n'
    print(report)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as summary:
            summary.write(f'Baseline run: {os.environ["BASE_RUN"]}\n\n{report}')
