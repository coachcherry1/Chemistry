#!/usr/bin/env bash
# Package src/ as a SCORM 1.2 zip. imsmanifest.xml must sit at the zip root,
# so everything is zipped from inside src/ rather than from the project root.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
name="${1:-ionic-naming-v2}"
out="$here/dist/$name.zip"

command -v zip >/dev/null || { echo "zip is not installed" >&2; exit 1; }

mkdir -p "$here/dist"
rm -f "$out"

( cd "$here/src" && zip -rq "$out" . -x '.*' -x '*/.*' -x '*.DS_Store' )

echo "built $out"
unzip -l "$out" | tail -n +4 | head -n -2
