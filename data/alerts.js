// Generated from reference/observability/alerts.yaml by `node scripts/atlas.mjs alerts`.
// Do not edit by hand: change the YAML and regenerate (npm test fails when this is stale).
KA.define("alerts", [
  {"alert":"KafkaOfflinePartitions","group":"replication","severity":"page","summary":"{{ $value }} partitions have no leader","for":"1m","leadsTo":"runbook:offline-partitions"},
  {"alert":"KafkaUnderMinIsrPartitions","group":"replication","severity":"page","summary":"Partitions led by {{ $labels.instance }} reject acks=all writes","for":"2m","leadsTo":"failure:not-enough-replicas"},
  {"alert":"KafkaUnderReplicatedPartitions","group":"replication","severity":"ticket","summary":"{{ $labels.instance }} leads under-replicated partitions","for":"5m","leadsTo":"runbook:under-replicated"},
  {"alert":"KafkaNoActiveController","group":"controller","severity":"page","summary":"The cluster reports {{ $value }} active controllers","for":"2m","leadsTo":"failure:controller-quorum-unavailable"},
  {"alert":"KafkaBrokerDiskUsageHigh","group":"brokers","severity":"page","summary":"Kafka data disk on {{ $labels.instance }} is above 85%","for":"10m","leadsTo":"runbook:disk-usage"},
  {"alert":"KafkaRequestHandlersBusy","group":"brokers","severity":"ticket","summary":"Request handlers on {{ $labels.instance }} are more than 70% busy","for":"15m","leadsTo":"failure:request-handler-saturation"},
  {"alert":"KafkaLogCleanerDead","group":"brokers","severity":"ticket","summary":"A log cleaner thread died on {{ $labels.instance }}","for":"5m","leadsTo":"failure:log-compaction-stuck"},
  {"alert":"KafkaOpenFileDescriptorsHigh","group":"brokers","severity":"ticket","summary":"{{ $labels.instance }} uses more than 70% of its file descriptors","for":"15m","leadsTo":"failure:file-descriptor-exhaustion"},
  {"alert":"KafkaConsumerGroupLagHigh","group":"clients","severity":"ticket","summary":"Consumer group {{ $labels.group }} is more than 15 minutes behind","for":"10m","leadsTo":"runbook:consumer-lag"},
  {"alert":"KafkaAuthenticationFailures","group":"clients","severity":"ticket","summary":"Clients keep failing to authenticate on {{ $labels.instance }}","for":"10m","leadsTo":"runbook:client-connectivity"},
  {"alert":"KafkaConnectTaskFailed","group":"clients","severity":"ticket","summary":"Connector {{ $labels.connector }} has failed tasks","for":"5m","leadsTo":"failure:connect-task-failed"}
]);
