<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Consumer lag

**Trigger:** A consumer group's time lag above its objective (KafkaConsumerGroupLagHigh).

**Impact:** Downstream data is late. If lag approaches retention, data will be skipped.

[Open as a flowchart](../../index.html#/operations/runbooks/consumer-lag)

## Triage (5 minutes)

**Is the group consuming at all?.** 

```sh
kafka-consumer-groups.sh --bootstrap-server $BS --describe --group $GROUP --state
kafka-consumer-groups.sh --bootstrap-server $BS --describe --group $GROUP
```

**How close is lag to retention?.** Compare the age of the oldest unread record with the topic's retention.ms. Within a few hours: escalate now.

## Diagnose

| If you see | Then |
|---|---|
| No members, or the state keeps changing | [Rebalance storm](../failures/rebalance-storm.md) |
| Lag on one partition, at a fixed offset | [Deserialization error](../failures/deserialization-error.md) |
| Lag everywhere, group Stable | [Consumer lag](../failures/consumer-lag.md) |
| fetch-throttle-time above zero | [Quota throttling](../failures/quota-throttling.md) |

## Mitigate

**Add consumers up to the partition count.** Members beyond the partition count stay idle.

**Pause less important readers of the same topic.** Frees broker fetch capacity for the critical group.

## Resolve

**Fix throughput.** Batch downstream calls, fix a hot key, or add partitions with a migration plan.

## Verify

Lag falls steadily and the group stays Stable for 30 minutes.

## Escalate

If lag age reaches half of retention, page the topic owner: skipped data is the next failure.
