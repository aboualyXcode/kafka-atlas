<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Under-replicated partitions

**Trigger:** `UnderReplicatedPartitions` above zero for 5 minutes (KafkaUnderReplicatedPartitions).

**Impact:** Durability is reduced. With acks=all and min.insync.replicas=2, one more failure stops writes on the affected partitions.

[Open as a flowchart](../../index.html#/operations/runbooks/under-replicated)

## Triage (5 minutes)

**How many, and are any below the minimum?.** 

```sh
kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l
kafka-topics.sh --bootstrap-server $BS --describe --under-min-isr-partitions | wc -l
```

**Below the minimum means producers are failing.** Treat it as SEV2 and tell the owners of the affected topics.

## Diagnose

**Find the common broker.** Look for one broker ID missing from Isr across the list.

```sh
kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions
```

| If you see | Then |
|---|---|
| The broker is down or not registered | [Offline partitions runbook](offline-partitions.md) |
| No space left on device | [Broker disk full](../failures/disk-full.md) |
| Volume or network at a ceiling | [Broker throughput cap](../failures/broker-throughput-cap.md) |
| Request handlers busy | [Request handlers saturated](../failures/request-handler-saturation.md) |

## Mitigate

**Throttle running reassignments.** 

```sh
kafka-reassign-partitions.sh --bootstrap-server $BS --list
kafka-reassign-partitions.sh --bootstrap-server $BS --execute --reassignment-json-file plan.json --additional --throttle 50000000
```

**Move leadership off the sick broker.** Restart it if it is stuck in garbage collection; preferred leaders return afterwards.

```sh
kafka-leader-election.sh --bootstrap-server $BS --election-type preferred --all-topic-partitions
```

## Resolve

**Remove the bottleneck.** Grow the volume or its throughput, replace a failing broker, or add brokers and rebalance partitions.

## Verify

**The count returns to zero.** 

```sh
watch -n10 "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l"
```

## Escalate

If several brokers are affected at once, or partitions fall below the minimum, page the Kafka platform lead.
