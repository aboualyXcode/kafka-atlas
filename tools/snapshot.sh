#!/usr/bin/env bash
# A read-only snapshot of a Kafka cluster for an incident channel. It changes nothing.
# Usage: BS=b-1.orders.example:9098 CONFIG=client.properties tools/snapshot.sh [group ...]
set -uo pipefail
BS=${BS:?set BS to a bootstrap address}
CFG=()
[ -n "${CONFIG:-}" ] && CFG=(--command-config "$CONFIG")
section() { printf '\n===== %s (%s)\n' "$1" "$(date -u +%H:%M:%SZ)"; }

section "controller quorum";  kafka-metadata-quorum.sh --bootstrap-server "$BS" "${CFG[@]}" describe --status
section "brokers";            kafka-broker-api-versions.sh --bootstrap-server "$BS" "${CFG[@]}" | grep '(id:'
section "offline partitions"; kafka-topics.sh --bootstrap-server "$BS" "${CFG[@]}" --describe --unavailable-partitions
section "under min ISR";      kafka-topics.sh --bootstrap-server "$BS" "${CFG[@]}" --describe --under-min-isr-partitions
section "under-replicated";   kafka-topics.sh --bootstrap-server "$BS" "${CFG[@]}" --describe --under-replicated-partitions | head -50
section "reassignments";      kafka-reassign-partitions.sh --bootstrap-server "$BS" "${CFG[@]}" --list
for g in "$@"; do
  section "group $g"
  kafka-consumer-groups.sh --bootstrap-server "$BS" "${CFG[@]}" --describe --group "$g" --state
  kafka-consumer-groups.sh --bootstrap-server "$BS" "${CFG[@]}" --describe --group "$g"
done
