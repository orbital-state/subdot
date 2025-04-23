#!/usr/bin/env bash

# This script demonstrates filtering events using subdot with JSONata

cat events.json | subdot filter -q '$.type = "finalized"' | tee filtered_output.json
# The above command filters the events.json file for events where the type is "finalized"
# and outputs the result in JSON format to filtered_output.json.