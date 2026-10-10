<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Offline partitions

**Trigger:** `OfflinePartitionsCount` above zero (KafkaOfflinePartitions).

**Impact:** Affected partitions accept no reads and no writes.

[Open as a flowchart](../../index.html#/operations/runbooks/offline-partitions)

## Triage (2 minutes)

**Which partitions and topics?.** 

```sh
kafka-topics.sh --bootstrap-server $BS --describe --unavailable-partitions
```

**Is the controller quorum healthy?.** 

```sh
kafka-metadata-quorum.sh --bootstrap-server $BS describe --status
```

## Diagnose

| If you see | Then |
|---|---|
| LeaderId -1, or no quorum | [Controller quorum unavailable](../failures/controller-quorum-unavailable.md) |
| Replica brokers down, or log directories offline | [Broker disk full](../failures/disk-full.md), or restart the brokers |
| __consumer_offsets partitions affected | [Coordinator not available](../failures/coordinator-not-available.md) |

## Mitigate

**Bring back a broker that held an in-sync replica.** The controller elects it as leader as soon as it registers.

**Last resort: unclean election.** Only with the topic owner's agreement: whatever was written after that replica fell out of sync is lost.

```sh
kafka-leader-election.sh --bootstrap-server $BS --election-type unclean --topic orders --partition 7
```

## Resolve

**Raise replication.** Move replication factor 1 topics to three replicas in three zones.

## Verify

**No unavailable partitions.** 

```sh
kafka-topics.sh --bootstrap-server $BS --describe --unavailable-partitions | wc -l   # expect 0
```

## Escalate

Page the platform lead immediately for any offline partition of a critical topic.
