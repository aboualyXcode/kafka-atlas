<!-- Generated from data/failures/ by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Failure catalog

24 failures across 9 layers. Each has a symptom, the affected component, the root cause, an investigation, a resolution and prevention, and a diagram of how it propagates. The [interactive atlas](../../index.html#/failures) animates each one on the map.

A **symptom** tells you where to look (growing lag, a producer timeout, under-replicated partitions). A **cause** names the mechanism (`NotEnoughReplicas`, `poll timeout has expired`, `No space left on device`).

## Producers

Writing records.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [RecordTooLargeException](record-too-large.md) | cause | any | Producer |
| [Producer timeouts](producer-timeout.md) | symptom | any | Listeners, Request handlers, Follower replicas |
| [Quota throttling](quota-throttling.md) | cause | any | Producer |

## Consumers

Reading records, groups and offsets.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Consumer lag keeps growing](consumer-lag.md) | symptom | any | Consumer group, Group coordinator |
| [Rebalance storm](rebalance-storm.md) | cause | any | Consumer group |
| [Offset out of range](offset-out-of-range.md) | cause | any | Consumer group, Log segments |
| [Deserialization error](deserialization-error.md) | cause | any | Producer, Schema Registry |
| [Group coordinator not available](coordinator-not-available.md) | symptom | any | Group coordinator |

## Replication

Leaders, followers and the ISR.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Under-replicated partitions](under-replicated-partitions.md) | symptom | any | Follower replicas |
| [NotEnoughReplicasException](not-enough-replicas.md) | cause | any | Follower replicas |
| [Offline partitions](offline-partitions.md) | symptom | any | Partition leader, Follower replicas |

## Brokers

Threads, disks, files and logs.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Broker disk full](disk-full.md) | cause | any | Log segments |
| [Request handlers saturated](request-handler-saturation.md) | cause | any | Producer |
| [Too many open files](file-descriptor-exhaustion.md) | cause | any | Log segments |
| [Log compaction stuck](log-compaction-stuck.md) | cause | any | Log segments |

## Controller

The KRaft metadata quorum.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Controller quorum unavailable](controller-quorum-unavailable.md) | cause | any | Controller quorum |

## Connectivity

Listeners, networks and TLS.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Unreachable advertised listeners](advertised-listeners.md) | cause | any | Listeners |
| [MSK brokers unreachable](broker-unreachable.md) | cause | AWS | Security groups, Subnets and routes |
| [TLS handshake failed](tls-handshake-failed.md) | cause | any | Listeners, Producer |

## Security

Who you are and what you may do.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [SASL authentication failed](authentication-failed.md) | cause | AWS | Secrets Manager, IAM |
| [Not authorized](authorization-failed.md) | cause | any | IAM |

## Platform

Schema Registry and Kafka Connect.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Schema incompatible](schema-incompatible.md) | cause | any | Producer |
| [Kafka Connect task failed](connect-task-failed.md) | cause | any | Kafka Connect |

## AWS

Limits of the infrastructure underneath.

| Failure | Kind | Scope | Starts at |
|---|---|---|---|
| [Broker throughput cap](broker-throughput-cap.md) | cause | AWS | EBS volumes |
