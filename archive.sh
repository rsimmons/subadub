#!/bin/bash
set -e

rm subadub.zip || true
cd dist
zip -r ../subadub.zip .
