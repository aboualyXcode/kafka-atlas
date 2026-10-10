# Reference configuration

Configuration for Larder's Kafka platform (`larder-prod` on Amazon MSK in `eu-west-1`), to read and adapt. It is a reference, not an installer: account IDs, ARNs, addresses and versions are examples.

| Path | What it is | Where the atlas explains it |
|---|---|---|
| `clients/producer.properties` | Production producer settings, with IAM authentication | Operations: client contract |
| `clients/consumer.properties` | Production consumer settings | Operations: client contract |
| `broker/server.properties` | A self-managed KRaft broker | Architecture: listeners, leader, controller |
| `msk/cluster-configuration.properties` | MSK custom configuration | On AWS: deployment lens |
| `msk/client-iam-policy.json` | IAM policy for a producer and a consumer group | On AWS: security lens |
| `strimzi/kafka.yaml` | The same cluster on EKS with Strimzi | On AWS: deployment lens |
| `observability/alerts.yaml` | Prometheus alert rules, each linking to a failure page or runbook | Operations: observe |
