<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Broker disk filling up

**Trigger:** Broker data disk above 85% (KafkaBrokerDiskUsageHigh).

**Impact:** At 100% the broker takes its log directory offline and partitions go under-replicated or offline.

[Open as a flowchart](../../index.html#/operations/runbooks/disk-usage)

## Triage (5 minutes)

**Which broker, and how fast is it growing?.** 

```sh
df -h /var/lib/kafka/data   # self-managed
# MSK: KafkaDataLogsDiskUsed per broker in CloudWatch
```

## Diagnose

**Which topics use the space?.** 

```sh
kafka-log-dirs.sh --bootstrap-server $BS --describe --broker-list 3 | tail -1 | jq -r '.brokers[].logDirs[].partitions[] | [.size, .partition] | @tsv' | sort -rn | head
```

| If you see | Then |
|---|---|
| A compacted topic keeps growing | [Log compaction stuck](../failures/log-compaction-stuck.md) |
| A new or changed topic dominates | Check its retention settings with its owner |

## Mitigate

**Lower retention on the largest topic.** Deletion follows at the next retention check, within minutes.

```sh
kafka-configs.sh --bootstrap-server $BS --alter --entity-type topics --entity-name events --add-config retention.ms=86400000
```

**Grow the volume.** 

```sh
aws kafka update-broker-storage --cluster-arn $CLUSTER_ARN --current-version $VERSION \
  --target-broker-ebs-volume-info '[{"KafkaBrokerNodeId": "All", "VolumeSizeGB": 2000}]'
```

## Resolve

Set retention.bytes ceilings, enable storage auto scaling or tiered storage, and balance partitions across brokers.

## Verify

Use below 70% and falling; no log directory offline.

## Escalate

Above 95% with nothing left to free: page immediately.
