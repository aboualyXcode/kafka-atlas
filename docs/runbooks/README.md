<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbooks

What to do when an alert fires. The atlas draws each one as a flowchart.

- [Under-replicated partitions](under-replicated.md): `UnderReplicatedPartitions` above zero for 5 minutes (KafkaUnderReplicatedPartitions).
- [Offline partitions](offline-partitions.md): `OfflinePartitionsCount` above zero (KafkaOfflinePartitions).
- [Consumer lag](consumer-lag.md): A consumer group's time lag above its objective (KafkaConsumerGroupLagHigh).
- [Broker disk filling up](disk-usage.md): Broker data disk above 85% (KafkaBrokerDiskUsageHigh).
- [Clients cannot connect](client-connectivity.md): Clients report connection, TLS or authentication errors (KafkaAuthenticationFailures, or a service report).
- [Rolling restart or upgrade](rolling-restart.md): Planned: a version upgrade, a configuration change or host patching.
