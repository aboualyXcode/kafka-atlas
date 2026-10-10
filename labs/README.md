# Labs

Break a local three-node cluster the way a failure entry describes, then read what Kafka tells you before you look at the fix. Every lab is also shown on its entry's page in the atlas.

```sh
docker compose -f labs/compose.yaml up -d           # or: make lab-up
k() { docker compose -f labs/compose.yaml exec -T kafka-1 /opt/kafka/bin/"$@"; }
BS=kafka-1:19092
k kafka-metadata-quorum.sh --bootstrap-server $BS describe --status
```

`k` runs the Kafka tools inside the first node; `$BS` is the address the nodes use among themselves. Clients on your machine can use `localhost:9092`, `localhost:9094` and `localhost:9096`.

| Lab | What you will see | Entry |
|---|---|---|
| Stop one broker | `--under-replicated-partitions` lists every partition it held | [Under-replicated partitions](../docs/failures/under-replicated-partitions.md) |
| Require three in-sync replicas, then stop one broker | `NotEnoughReplicasException` from an acks=all producer | [NotEnoughReplicas](../docs/failures/not-enough-replicas.md) |
| A replication factor 1 topic, then stop its broker | `Leader: none` for the partitions on that broker | [Offline partitions](../docs/failures/offline-partitions.md) |
| Produce a 1.5 MB record | `RecordTooLargeException` from the console producer | [RecordTooLargeException](../docs/failures/record-too-large.md) |
| One-minute retention, a slow consumer | The consumer's position is reset | [Offset out of range](../docs/failures/offset-out-of-range.md) |

The exact commands are in each entry's "Reproduce it locally" section. Failures that need AWS (IAM, security groups, EBS limits) cannot be reproduced locally; their entries carry real messages instead.

```sh
docker compose -f labs/compose.yaml down -v          # or: make lab-down
```
