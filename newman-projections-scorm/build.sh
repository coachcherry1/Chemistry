#!/usr/bin/env bash
# Package src/ as SCORM 1.2 zips. imsmanifest.xml must sit at the zip root,
# so each package is zipped from inside a staged copy of src/.
#
#   ./build.sh                        both packages:
#                                       dist/newman-projections-v1.zip
#                                       dist/newman-projections-qualitative-v1.zip
#   ./build.sh quantitative [name]    just one, optionally renamed
#   ./build.sh qualitative  [name]
#
# The two packages differ only in src/js/variant.js (which checkpoint set
# they use) and in the course title and identifiers in imsmanifest.xml, so
# both can live in one Schoology course with separate gradebook columns.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
command -v zip >/dev/null || { echo "zip is not installed" >&2; exit 1; }
mkdir -p "$here/dist"

build_one() {
  local variant="$1" name="$2"
  local out="$here/dist/$name.zip"
  local stage
  stage="$(mktemp -d)"
  trap 'rm -rf "$stage"' RETURN

  cp -R "$here/src/." "$stage/"
  # sed -i.bak works the same with GNU and macOS sed
  sed -i.bak "s/^var VARIANT = .*/var VARIANT = '$variant';/" "$stage/js/variant.js"
  if [ "$variant" = qualitative ]; then
    sed -i.bak -e 's/NEWMAN_/NEWMAN_QUAL_/g' \
               -e 's#Conformations and Strain</title>#Conformations and Strain (Qualitative)</title>#g' \
               "$stage/imsmanifest.xml"
    sed -i.bak 's#<title>Newman Projections</title>#<title>Newman Projections (Qualitative)</title>#' \
               "$stage/index.html"
  fi
  find "$stage" -name '*.bak' -delete
  grep -q "^var VARIANT = '$variant';" "$stage/js/variant.js" || { echo "could not set variant" >&2; exit 1; }

  rm -f "$out"
  ( cd "$stage" && zip -rq "$out" . -x '.*' -x '*/.*' -x '*.DS_Store' )
  echo "built $out ($variant)"
}

case "${1:-both}" in
  both)
    build_one quantitative newman-projections-v1
    build_one qualitative  newman-projections-qualitative-v1 ;;
  quantitative)
    build_one quantitative "${2:-newman-projections-v1}" ;;
  qualitative)
    build_one qualitative "${2:-newman-projections-qualitative-v1}" ;;
  *)
    echo "usage: ./build.sh [both | quantitative [name] | qualitative [name]]" >&2; exit 1 ;;
esac
