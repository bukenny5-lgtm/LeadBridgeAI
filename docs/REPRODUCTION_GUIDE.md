# Reproduction Guide

## Current state

This guide is an initial skeleton only.

Phase 2 now uses a deterministic baseline and evaluation engine, and the authoritative frozen baseline is 20.00% on the 20-case synthetic set.

## Known prerequisites

- Node.js 20 or newer
- npm

## Exact commands

- `npm install`
- `npm run typecheck`
- `npm test`
- `npm run evaluate:baseline`
- `npm run check`

The earlier `npm install --strict-ssl=false` retry was an environment-specific workaround for a certificate verification failure and is not part of normal reproduction.

## What will be documented later

- environment setup
- dependency installation
- test commands
- evaluation execution
- trace capture steps
- troubleshooting notes

## Status note

Clean-environment reproduction has not been demonstrated yet.
