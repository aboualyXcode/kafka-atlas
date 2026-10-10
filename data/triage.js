// "What are you seeing?" Each symptom fans out to the failures that produce it. `tell` is the
// message or check that tells the causes apart; `label` overrides the failure title when one
// entry covers several distinct causes. Every failure must appear in at least one fan.
KA.define("triage", [
  // ---------------------------------------------------------------- producers
  {
    id: "send-fails", group: "Producers", label: "Producer sends time out",
    see: "send() callbacks fail after a long wait, for some partitions or all of them.",
    check: "kafka-topics.sh --bootstrap-server $BS --describe --topic orders",
    causes: [
      { id: "producer-timeout", label: "Records expire before they are acknowledged", tell: "Expiring N record(s) ... since batch creation" },
      { id: "not-enough-replicas", tell: "NotEnoughReplicasException before the timeout" },
      { id: "offline-partitions", tell: "LEADER_NOT_AVAILABLE for some partitions" },
      { id: "request-handler-saturation", tell: "RequestHandlerAvgIdlePercent near 0" },
      { id: "broker-throughput-cap", tell: "BwOutAllowanceExceeded, volume queue high" },
      { id: "quota-throttling", tell: "produce-throttle-time-avg above 0" },
    ],
  },
  {
    id: "send-rejected", group: "Producers", label: "Sends fail for specific records",
    see: "Most records are written; some are rejected immediately.",
    check: "grep -E 'Exception' app.log | sort | uniq -c | sort -rn | head",
    causes: [
      { id: "record-too-large", tell: "RecordTooLargeException" },
      { id: "schema-incompatible", tell: "incompatible with an earlier schema ... 409" },
      { id: "authorization-failed", tell: "TopicAuthorizationException" },
    ],
  },
  // ---------------------------------------------------------------- consumers
  {
    id: "lag", group: "Consumers", label: "Consumer lag keeps growing",
    see: "kafka-consumer-groups shows LAG rising and downstream data is late.",
    check: "kafka-consumer-groups.sh --bootstrap-server $BS --describe --group billing --state",
    causes: [
      { id: "consumer-lag", label: "Processing is slower than the input", tell: "lag on every partition, group Stable" },
      { id: "rebalance-storm", tell: "group keeps changing state" },
      { id: "deserialization-error", tell: "lag on one partition, stuck at one offset" },
      { id: "quota-throttling", tell: "fetch-throttle-time-avg above 0" },
      { id: "broker-throughput-cap", tell: "catch-up reads slow on one broker" },
      { id: "connect-task-failed", tell: "a connect-<name> group stopped moving" },
    ],
  },
  {
    id: "rebalancing", group: "Consumers", label: "The group keeps rebalancing",
    see: "Members join and leave all the time; commits fail.",
    check: "grep -E 'poll timeout|coordinator' app.log | tail",
    causes: [
      { id: "rebalance-storm", tell: "consumer poll timeout has expired" },
      { id: "coordinator-not-available", tell: "The coordinator is not available" },
    ],
  },
  {
    id: "stuck-record", group: "Consumers", label: "Stuck on one offset",
    see: "One partition stops at the same offset while the others move.",
    check: "kafka-consumer-groups.sh --bootstrap-server $BS --describe --group billing",
    causes: [
      { id: "deserialization-error", tell: "Error deserializing key/value ... at offset" },
      { id: "connect-task-failed", tell: "Task is being killed and will not recover" },
    ],
  },
  {
    id: "missing-data", group: "Consumers", label: "Data was skipped or lost",
    see: "Downstream counts do not match what was produced.",
    check: "grep -E 'out of range|resetting offset' app.log | tail",
    causes: [
      { id: "offset-out-of-range", tell: "is out of range for partition ..., resetting offset" },
      { id: "offline-partitions", tell: "an unclean election after partitions went offline" },
    ],
  },
  // ---------------------------------------------------------------- connectivity and access
  {
    id: "cannot-connect", group: "Connectivity and access", label: "Clients cannot connect",
    see: "Clients time out, disconnect or fail at startup.",
    check: "kafka-broker-api-versions.sh --bootstrap-server $BS --command-config client.properties | grep -c '(id:'",
    causes: [
      { id: "advertised-listeners", tell: "Connection to node 1 (localhost/127.0.0.1:9092)" },
      { id: "broker-unreachable", tell: "timeouts to ...amazonaws.com:9098" },
      { id: "tls-handshake-failed", tell: "SSL handshake failed, PKIX path building failed" },
      { id: "authentication-failed", tell: "SaslAuthenticationException" },
      { id: "file-descriptor-exhaustion", tell: "broker logs Too many open files" },
    ],
  },
  {
    id: "not-authorized", group: "Connectivity and access", label: "Not authorized",
    see: "Connections work, but operations are refused.",
    check: "grep -E 'Authentication|Authorization' app.log | tail -3",
    causes: [
      { id: "authorization-failed", tell: "Not authorized to access topics: [...]" },
      { id: "authentication-failed", tell: "Authentication failed ... invalid credentials" },
    ],
  },
  {
    id: "admin-hangs", group: "Connectivity and access", label: "Admin commands time out",
    see: "Creating topics or changing configs hangs, or fails after a timeout.",
    check: "kafka-metadata-quorum.sh --bootstrap-server $BS describe --status",
    causes: [
      { id: "controller-quorum-unavailable", tell: "LeaderId: -1" },
      { id: "broker-unreachable", tell: "no connection to any broker at all" },
      { id: "advertised-listeners", tell: "bootstrap works, every other broker fails" },
    ],
  },
  // ---------------------------------------------------------------- brokers and the cluster
  {
    id: "urp", group: "Brokers and the cluster", label: "Under-replicated partitions",
    see: "The UnderReplicatedPartitions alert fires.",
    check: "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions",
    causes: [
      { id: "under-replicated-partitions", label: "A follower fell behind", tell: "Shrinking ISR; one broker missing from every Isr" },
      { id: "disk-full", tell: "No space left on device" },
      { id: "broker-throughput-cap", tell: "volume or network allowance exceeded" },
      { id: "request-handler-saturation", tell: "handlers busy on the leader or the follower" },
    ],
  },
  {
    id: "offline", group: "Brokers and the cluster", label: "Partitions offline",
    see: "OfflinePartitionsCount is above zero; some partitions have no leader.",
    check: "kafka-topics.sh --bootstrap-server $BS --describe --unavailable-partitions",
    causes: [
      { id: "offline-partitions", tell: "Leader: none" },
      { id: "controller-quorum-unavailable", tell: "no quorum leader, failovers stalled" },
      { id: "disk-full", tell: "Stopping serving logs in dir" },
    ],
  },
  {
    id: "broker-down", group: "Brokers and the cluster", label: "A broker crashes or will not start",
    see: "A broker process exits, or restarts without rejoining.",
    check: "grep -E 'ERROR|FATAL' /var/log/kafka/server.log | tail -20",
    causes: [
      { id: "disk-full", tell: "No space left on device" },
      { id: "file-descriptor-exhaustion", tell: "Too many open files, Map failed" },
      { id: "controller-quorum-unavailable", tell: "cannot register: no active controller" },
    ],
  },
  {
    id: "topic-grows", group: "Brokers and the cluster", label: "A compacted topic keeps growing",
    see: "A changelog or table topic grows every day although its key count is stable.",
    check: "grep kafka-log-cleaner-thread /var/log/kafka/log-cleaner.log | tail",
    causes: [
      { id: "log-compaction-stuck", tell: "kafka-log-cleaner-thread-0: Error due to" },
      { id: "disk-full", tell: "the disk alarms follow" },
    ],
  },
  // ---------------------------------------------------------------- platform
  {
    id: "connector", group: "Platform", label: "A connector stopped moving data",
    see: "A sink or source falls behind while its workers look healthy.",
    check: "curl -s $CONNECT/connectors/orders-sink/status | jq '.tasks[] | {id, state}'",
    causes: [
      { id: "connect-task-failed", tell: "\"state\": \"FAILED\"" },
      { id: "deserialization-error", tell: "the converter cannot read a record" },
      { id: "authorization-failed", tell: "the connector's principal is not allowed" },
    ],
  },
]);
