#!/usr/bin/env bash

# Usage: ./bundle-size.sh bundle/fx.ts
# Example: ./bundle-size.sh bundle/fx.ts

function print_size() {
  local label="${1}"
  local size="${2}"

  local units=("B" "KB" "MB" "GB" "TB")
  local i=0
  local size_f="$size"
  while [ $(echo "$size_f >= 1024" | bc) -eq 1 ] && [ $i -lt 4 ]; do
    size_f=$(echo "scale=2; $size_f/1024" | bc)
    i=$((i + 1))
  done

  if [ -z "$label" ]; then
    echo "${size_f} ${units[$i]}"
  else
    echo "${label}: ${size_f} ${units[$i]}"
  fi
}

function compute_bundle_size() {
  local filename="${1}"
  local output=$(pnpm rollup -c rollup.config.js "${filename}" 2>&1)

  local raw_size=$(echo -n "$output" | wc -c)
  local gzipped_size=$(echo -n "$output" | gzip -9 -c | wc -c)
  local brotli_size=$(echo -n "$output" | brotli -c -q 11 | wc -c)
  
  echo ""
  echo "Sizes:"
  echo "------"
  print_size "Raw" "$raw_size"
  print_size "Gzipped" "$gzipped_size"
  print_size "Brotli" "$brotli_size"

  local gzip_ratio=$(echo "scale=2; (1 - $gzipped_size / $raw_size) * 100" | bc)
  local brotli_ratio=$(echo "scale=2; (1 - $brotli_size / $raw_size) * 100" | bc)
  local brotli_vs_gzip=$(echo "scale=2; (1 - $brotli_size / $gzipped_size) * 100" | bc)
  local gzip_savings=$(echo "scale=2; $raw_size - $gzipped_size" | bc)
  local brotli_savings=$(echo "scale=2; $raw_size - $brotli_size" | bc)
  local gzip_savings_print=$(print_size "" "$gzip_savings")
  local brotli_savings_print=$(print_size "" "$brotli_savings")

  echo ""
  echo "Compression ratios:"
  echo "-------------------"
  echo "Gzip compression ratio: ${gzip_ratio}%"
  echo "Brotli compression ratio: ${brotli_ratio}%"
  echo "Brotli vs Gzip improvement: ${brotli_vs_gzip}%"
  echo "Gzip space saved: ${gzip_savings_print}"
  echo "Brotli space saved: ${brotli_savings_print}"
}

function find_input_file() {
  local filename="${1}"
  local prefixes=("bundle/")
  local suffixes=("" ".ts" ".mjs" ".cjs" ".js")
  for prefix in "${prefixes[@]}"; do
    for suffix in "${suffixes[@]}"; do
      local path="${prefix}${filename}${suffix}"
      if [ -f "$path" ]; then
        echo "$path"
        return 0
      fi
    done
  done
  return 1
}

if [ $# -ne 1 ]; then
  echo "Usage: $0 <bundle-file>"
  exit 1
fi

BUNDLE=$(find_input_file "$1")

if [ ! -f "$BUNDLE" ]; then
  echo "File not found: $BUNDLE"
  exit 1
fi

printf '%0.s-' {1..40}; echo
echo "Bundle: $BUNDLE"
printf '%0.s-' {1..40}; echo
compute_bundle_size "$BUNDLE"
printf '%0.s-' {1..40}; echo
