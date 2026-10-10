// Operations, as diagrams: what to watch, how to respond, how to upgrade, how to size, what
// production clients configure, the security layers, and the runbooks drawn as flowcharts.
KA.define("ops", {
  observe: {
    layers: [
      {
        id: "freshness", name: "Data freshness", alert: "page", alertText: "time lag over objective",
        metrics: ["consumer time lag", "end-to-end latency", "producer record-error-rate"],
        logs: ["application logs with topic, partition and offset"],
        query: "max by (consumergroup) (kafka_consumergroup_group_max_lag_seconds)",
        why: "This is what the business feels: data that arrives late, or not at all. Page here.",
      },
      {
        id: "producers", name: "Producers", alert: "ticket", alertText: "errors and retries",
        metrics: ["record-error-rate", "record-retry-rate", "request-latency-avg", "buffer-available-bytes"],
        logs: ["send callback exceptions"],
        query: "sum by (client_id) (rate(kafka_producer_record_error_total[5m]))",
        why: "Producer errors are the first sign of a broker or replication problem.",
      },
      {
        id: "consumers", name: "Consumers", alert: "ticket", alertText: "lag, rebalances",
        metrics: ["records-lag-max", "time-between-poll-max", "rebalance-rate-per-hour", "commit-latency-avg"],
        logs: ["poll timeouts and offset resets"],
        query: "max by (consumergroup, topic) (kafka_consumergroup_lag)",
        why: "Rebalances and slow processing show up here before lag becomes an outage.",
      },
      {
        id: "brokers", name: "Brokers", alert: "ticket", alertText: "handlers busy, latency",
        metrics: ["RequestHandlerAvgIdlePercent", "NetworkProcessorAvgIdlePercent", "TotalTimeMs", "BytesInPerSec"],
        logs: ["server.log"],
        query: "min by (instance) (kafka_server_kafkarequesthandlerpool_requesthandleravgidlepercent)",
        why: "One saturated broker slows every client that touches its partitions.",
      },
      {
        id: "replication", name: "Replication", alert: "page", alertText: "offline or under min ISR",
        metrics: ["UnderReplicatedPartitions", "UnderMinIsrPartitionCount", "OfflinePartitionsCount", "IsrShrinksPerSec"],
        logs: ["Shrinking ISR, Expanding ISR"],
        query: "sum(kafka_controller_kafkacontroller_offlinepartitionscount)",
        why: "Offline or under-minimum partitions stop writes; under-replication is the warning before.",
      },
      {
        id: "controller", name: "Controller quorum", alert: "page", alertText: "no active controller",
        metrics: ["ActiveControllerCount", "metadata high watermark", "voter lag", "fenced brokers"],
        logs: ["controller.log"],
        query: "sum(kafka_controller_kafkacontroller_activecontrollercount) != 1",
        why: "Without a controller, failures are not healed: no new leaders, no topic changes.",
      },
      {
        id: "infrastructure", name: "Infrastructure and AWS", alert: "page", alertText: "disk above 85%",
        metrics: ["KafkaDataLogsDiskUsed", "VolumeQueueLength", "BwOutAllowanceExceeded", "open file descriptors"],
        logs: ["CloudWatch, VPC Flow Logs"],
        query: "# CloudWatch AWS/Kafka per broker: KafkaDataLogsDiskUsed, VolumeQueueLength, BwInAllowanceExceeded",
        why: "Disks, volumes and network allowances are hard limits: they fail without warning unless watched.",
      },
    ],
    dashboards: [
      ["Data freshness", "Time lag per critical group against its objective, producer errors per service"],
      ["Clients", "Producer errors, retries and latency; consumer lag, rebalances and time between polls"],
      ["Brokers", "Handler and network idle, request latency by type, bytes in and out per broker"],
      ["Replication", "Under-replicated, under-minimum and offline partitions; ISR shrinks and expands"],
      ["Controller quorum", "Active controller, metadata high watermark, voter lag, fenced brokers"],
      ["Infrastructure", "Disk use, volume throughput and queue, network allowances, file descriptors"],
    ],
    kinds: [
      ["Symptom", "page", "Data late or not delivered: freshness objective burning", "On-call, immediately"],
      ["Imminent symptom", "page", "Outage soon: disk above 85%, partitions under min ISR", "On-call"],
      ["Cause", "ticket", "A mechanism that may become a symptom: URP, busy handlers, dead cleaner", "Owning team"],
      ["Hygiene", "report", "Replication factor 1 topics, topics without retention.bytes, unbalanced leaders", "Weekly review"],
    ],
    burn: [
      ["14.4×", "1 hour", "5 minutes", "2%", "page"],
      ["6×", "6 hours", "30 minutes", "5%", "page"],
      ["1×", "3 days", "6 hours", "10%", "ticket"],
    ],
  },

  respond: {
    loop: [
      { t: "State the symptom", d: "What, who, since when, how much. 'Billing is six hours behind since 23:00' beats 'Kafka is slow'.", run: "" },
      { t: "Find the first failing hop", d: "Follow the record: producer, leader, followers, consumer group, downstream system.", run: "kafka-topics.sh --bootstrap-server $BS --describe --topic <topic>\nkafka-consumer-groups.sh --bootstrap-server $BS --describe --group <group>" },
      { t: "Read what Kafka reports", d: "Partition state, ISR, group state and the client's own exception. Kafka names most mechanisms precisely.", run: "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions\nkafka-consumer-groups.sh --bootstrap-server $BS --describe --group <group> --state" },
      { t: "Name the mechanism", d: "NotEnoughReplicas, 'poll timeout has expired', 'out of range' and 'Too many open files' name a mechanism; 'lag' and 'timeout' do not.", run: "" },
      { t: "Ask why until you reach a change", d: "Client deploys, topic config changes, reassignments, broker restarts, AWS Health events.", run: "kafka-reassign-partitions.sh --bootstrap-server $BS --list" },
      { t: "Run the cheapest decisive check", d: "Produce one record with acks=all, or connect from the failing client's own network.", run: "echo probe | kafka-console-producer.sh --bootstrap-server $BS --topic <topic> --producer-property acks=all" },
      { t: "Mitigate, fix, verify, record", d: "Restore the flow of data first, then fix the cause, confirm the lag drains, and write down what you learned.", run: "" },
    ],
    first15: [
      { t: "Alert or report arrives" },
      { t: "Acknowledge, open a channel, assign a commander" },
      { t: "State the symptom: what, who, since when, how much" },
      { t: "Blast radius: one topic, one broker, one client, or the whole cluster?" },
      { t: "What changed? Client deploys, topic configs, reassignments, broker restarts, AWS Health" },
      { t: "Obvious recent change?", yes: "Stop or roll it back: pause the reassignment, revert the config or the deploy", no: "Mitigate generically: add consumers, throttle backfills, move leadership away from a sick broker" },
      { t: "Verify that data is flowing and lag is falling" },
      { t: "Investigate the root cause with the loop" },
    ],
    checklist: "# 1. Is the cluster whole?\ntools/snapshot.sh > snapshot-$(date +%H%M).txt\nkafka-metadata-quorum.sh --bootstrap-server $BS describe --status\nkafka-topics.sh --bootstrap-server $BS --describe --unavailable-partitions\nkafka-topics.sh --bootstrap-server $BS --describe --under-min-isr-partitions\n# 2. The affected group or topic\nkafka-consumer-groups.sh --bootstrap-server $BS --describe --group <group> --state\n# 3. Anything moving?\nkafka-reassign-partitions.sh --bootstrap-server $BS --list",
    severity: [
      ["SEV1", "Data lost, or a critical flow stopped for customers", "Page now, commander, status page, all hands"],
      ["SEV2", "A critical flow degraded, or one broker or zone impaired", "Page, commander, status page if prolonged"],
      ["SEV3", "Contained impact: one consumer behind, deploys blocked", "Business hours, ticket"],
    ],
    roles: [
      ["Incident commander", "Sets priorities, assigns work, decides on mitigations, keeps time", "Type commands"],
      ["Operations lead", "Investigates and makes changes, with helpers", "Talk to stakeholders"],
      ["Communications lead", "Status page, stakeholders, regular updates", "Make technical calls"],
      ["Scribe", "Keeps the timeline of observations, decisions and actions", "Filter what seems unimportant"],
    ],
  },

  upgrade: {
    steps: [
      { t: "Read the release and upgrade notes", d: "Note removed configs, protocol versions and defaults that change.", run: "", risks: [] },
      { t: "Check every client, connector and stream app", d: "Very old clients can be refused by new brokers; inventory versions first.", run: "kafka-broker-api-versions.sh --bootstrap-server $BS | head -3", risks: ["authentication-failed"] },
      { t: "Upgrade staging and soak", d: "The same procedure on staging, then a few days of normal traffic and deploys.", run: "", risks: [] },
      { t: "Roll every node, one at a time", d: "Controllers and brokers alike: restart one, wait until it rejoins and under-replicated partitions are back to zero, then the next. MSK does this for you.", run: "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l", risks: ["under-replicated-partitions", "not-enough-replicas", "producer-timeout", "controller-quorum-unavailable"] },
      { t: "Finalize the metadata version", d: "Only once every node runs the new version and you are sure you will not roll back.", run: "kafka-features.sh --bootstrap-server $BS describe", risks: [] },
      { t: "Upgrade clients, Connect and Streams", d: "One service at a time; watch rebalances and error rates.", run: "", risks: ["rebalance-storm"] },
    ],
    facts: [
      ["One node down at a time keeps two in-sync replicas", "Only with replication factor 3 and min.insync.replicas=2"],
      ["A finalized metadata version cannot be lowered", "Finalize after the new version has proven itself"],
      ["Kafka 4.0 removed ZooKeeper mode", "Migrate to KRaft on 3.x before moving to 4.x"],
      ["New broker versions drop very old client protocols", "Inventory client versions before major upgrades"],
      ["MSK rolls brokers one at a time for you", "Still watch under-replicated partitions and client errors"],
    ],
    skew: {
      title: "Versions that can run together during a roll",
      axis: ["much older", "older", "previous", "new", "newer"],
      rows: [
        ["Brokers mid-roll", 2, 3, "sk-node"],
        ["Metadata version", 2, 2, "sk-cp"],
        ["Clients", 1, 4, "sk-cli"],
      ],
    },
  },

  capacity: {
    calc: { ingress: 50, groups: 2, retentionHours: 72, brokers: 3, budget: 150, perPartition: 5 },
    dimensions: [
      ["Broker network", "ingress × (replication factor + consumer groups), per broker", "Latency, ISR shrinks", ["broker-throughput-cap"]],
      ["Disk throughput", "writes × replication factor, plus reads that miss the cache", "Volume queue, slow followers", ["broker-throughput-cap", "under-replicated-partitions"]],
      ["Disk space", "ingress × retention × replication factor, with 30% headroom", "Log directory offline", ["disk-full"]],
      ["Request rate", "requests per second per broker, handler idle percent", "Queueing, timeouts", ["request-handler-saturation"]],
      ["Partitions", "partitions per broker and per cluster", "Slow failover, open files", ["file-descriptor-exhaustion"]],
      ["Consumer parallelism", "partitions against consumers needed at peak", "Lag that more consumers cannot fix", ["consumer-lag"]],
    ],
    rules: [
      "Size for peak ingress times the replication factor, not for the average.",
      "With three zones, keep brokers in multiples of three.",
      "Keep 40% headroom on network and disk throughput for failover and catch-up.",
      "Plan partitions for peak consumer parallelism; adding partitions later changes which partition a key lands in.",
    ],
    query: "# Bytes in per broker against the cluster average: values far above 1 mean imbalance\nsum by (instance) (rate(kafka_server_brokertopicmetrics_bytesin_total[5m]))\n  / ignoring(instance) group_left\navg(sum by (instance) (rate(kafka_server_brokertopicmetrics_bytesin_total[5m])))",
  },

  contract: {
    intro: "Production settings for the orders producer and the billing consumer. Highlighted lines are the contract: select one.",
    source: "reference/clients/",
    manifest: [
      [null, "# producer: orders-service"],
      ["bootstrap", "bootstrap.servers=b-1.orders.example:9098,b-2.orders.example:9098,b-3.orders.example:9098"],
      ["identity", "client.id=orders-service"],
      ["durability", "acks=all"],
      ["durability", "enable.idempotence=true"],
      ["durability", "max.in.flight.requests.per.connection=5"],
      ["timeouts", "delivery.timeout.ms=120000"],
      ["timeouts", "request.timeout.ms=30000"],
      ["batching", "linger.ms=10"],
      ["batching", "batch.size=65536"],
      ["batching", "compression.type=zstd"],
      ["size", "max.request.size=1048576"],
      ["auth", "security.protocol=SASL_SSL"],
      ["auth", "sasl.mechanism=AWS_MSK_IAM"],
      ["auth", "sasl.jaas.config=software.amazon.msk.auth.iam.IAMLoginModule required;"],
      ["auth", "sasl.client.callback.handler.class=software.amazon.msk.auth.iam.IAMClientCallbackHandler"],
      [null, ""],
      [null, "# consumer: billing"],
      ["group", "group.id=billing"],
      ["static", "group.instance.id=billing-0"],
      ["commit", "enable.auto.commit=false"],
      ["reset", "auto.offset.reset=none"],
      ["poll", "max.poll.records=100"],
      ["poll", "max.poll.interval.ms=300000"],
      ["assign", "partition.assignment.strategy=org.apache.kafka.clients.consumer.CooperativeStickyAssignor"],
      ["isolation", "isolation.level=read_committed"],
      ["rack", "client.rack=euw1-az1"],
    ],
    spots: {
      bootstrap: { t: "One bootstrap broker per zone", d: "The client needs only one to answer, then uses the addresses each broker advertises. Listing several survives a broker being down at startup.", prevents: ["advertised-listeners"] },
      identity: { t: "A client ID per service", d: "Quotas, metrics and broker logs become attributable to a service.", prevents: ["quota-throttling"] },
      durability: { t: "acks=all with idempotence", d: "A write is acknowledged only when every in-sync replica has it, and retries never create duplicates. Pair it with min.insync.replicas=2 on the topic.", prevents: [] },
      timeouts: { t: "A delivery timeout longer than a failover", d: "Two minutes covers a leader election and metadata refresh, so a broker restart does not lose records.", prevents: ["producer-timeout"] },
      batching: { t: "Batching and compression", d: "A few milliseconds of linger turns many tiny requests into few large ones, which saves broker threads, network and disk.", prevents: ["request-handler-saturation", "broker-throughput-cap"] },
      size: { t: "An explicit record size limit", d: "Matched with the topic's max.message.bytes, so oversized records fail in tests rather than in production.", prevents: ["record-too-large"] },
      auth: { t: "IAM authentication over TLS", d: "Credentials come from the workload's IAM role; nothing to rotate by hand. Port 9098 must be open to the brokers.", prevents: ["authentication-failed", "tls-handshake-failed"] },
      group: { t: "One group per application", d: "Two applications sharing a group.id split the data between them instead of each receiving all of it.", prevents: [] },
      static: { t: "Static membership", d: "A restarting member keeps its partitions for session.timeout.ms, so rolling deploys do not rebalance the group.", prevents: ["rebalance-storm"] },
      commit: { t: "Commit after processing", d: "Offsets are committed only for records that were processed, so a crash replays instead of skipping.", prevents: [] },
      reset: { t: "No silent offset resets", d: "auto.offset.reset=none turns a missing offset into an error you see, not data you skip.", prevents: ["offset-out-of-range"] },
      poll: { t: "A poll loop that fits its interval", d: "100 records times the slowest realistic processing time must stay well under max.poll.interval.ms.", prevents: ["rebalance-storm", "consumer-lag"] },
      assign: { t: "Cooperative assignment", d: "Rebalances move only the partitions that change owner instead of stopping the whole group.", prevents: ["rebalance-storm"] },
      isolation: { t: "Read only committed data", d: "Consumers never see records from transactions that were aborted.", prevents: [] },
      rack: { t: "Read from the nearest replica", d: "With client.rack set, consumers fetch from a replica in their own zone, cutting cross-zone traffic and its cost.", prevents: ["broker-throughput-cap"] },
    },
  },

  security: {
    rings: [
      { t: "Network", d: "Who can reach the brokers at all.", controls: ["Brokers in private subnets", "Security groups per client service and port", "Multi-VPC connectivity instead of public access"], failures: ["broker-unreachable", "advertised-listeners"] },
      { t: "Transport", d: "Everything encrypted in transit, with verified names.", controls: ["TLS between clients and brokers, and between brokers", "Hostname verification on"], failures: ["tls-handshake-failed"] },
      { t: "Authentication", d: "Every client proves who it is.", controls: ["IAM roles, SASL/SCRAM or client certificates", "One identity per service"], failures: ["authentication-failed"] },
      { t: "Authorization", d: "Each identity may do only what it needs.", controls: ["Per-topic and per-group permissions (IAM or ACLs)", "Prefixed patterns per team"], failures: ["authorization-failed"] },
      { t: "Quotas", d: "No client can starve the others.", controls: ["Produce and fetch quotas per principal", "Separate identities for backfills"], failures: ["quota-throttling"] },
      { t: "Data contracts", d: "Producers cannot break consumers.", controls: ["Schema Registry compatibility rules", "Schemas registered through CI"], failures: ["schema-incompatible", "deserialization-error"] },
      { t: "Data at rest", d: "Stored data is encrypted and kept exactly as long as intended.", controls: ["KMS encryption of volumes and secrets", "Retention set deliberately per topic"], failures: ["offset-out-of-range"] },
    ],
  },
});

// On-call runbooks as phases and steps. The atlas draws each one as a flowchart;
// `when`/`then`/`to` items are decision branches that lead to failure entries or other runbooks.
KA.define("runbooks", [
  {
    id: "under-replicated", title: "Under-replicated partitions",
    trigger: "`UnderReplicatedPartitions` above zero for 5 minutes (KafkaUnderReplicatedPartitions).",
    impact: "Durability is reduced. With acks=all and min.insync.replicas=2, one more failure stops writes on the affected partitions.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [
        { title: "How many, and are any below the minimum?", run: "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l\nkafka-topics.sh --bootstrap-server $BS --describe --under-min-isr-partitions | wc -l" },
        { title: "Below the minimum means producers are failing", text: "Treat it as SEV2 and tell the owners of the affected topics." },
      ] },
      { title: "Diagnose", items: [
        { title: "Find the common broker", text: "Look for one broker ID missing from Isr across the list.", run: "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions" },
        { when: "The broker is down or not registered", then: "[Offline partitions runbook](#/operations/runbooks/offline-partitions)", to: ["runbook:offline-partitions"] },
        { when: "No space left on device", then: "[Broker disk full](#/failures/disk-full)", to: ["disk-full"] },
        { when: "Volume or network at a ceiling", then: "[Broker throughput cap](#/failures/broker-throughput-cap)", to: ["broker-throughput-cap"] },
        { when: "Request handlers busy", then: "[Request handlers saturated](#/failures/request-handler-saturation)", to: ["request-handler-saturation"] },
      ] },
      { title: "Mitigate", items: [
        { title: "Throttle running reassignments", run: "kafka-reassign-partitions.sh --bootstrap-server $BS --list\nkafka-reassign-partitions.sh --bootstrap-server $BS --execute --reassignment-json-file plan.json --additional --throttle 50000000" },
        { title: "Move leadership off the sick broker", text: "Restart it if it is stuck in garbage collection; preferred leaders return afterwards.", run: "kafka-leader-election.sh --bootstrap-server $BS --election-type preferred --all-topic-partitions" },
      ] },
      { title: "Resolve", items: [{ title: "Remove the bottleneck", text: "Grow the volume or its throughput, replace a failing broker, or add brokers and rebalance partitions." }] },
      { title: "Verify", items: [{ title: "The count returns to zero", run: "watch -n10 \"kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l\"" }] },
      { title: "Escalate", items: [{ text: "If several brokers are affected at once, or partitions fall below the minimum, page the Kafka platform lead." }] },
    ],
  },
  {
    id: "offline-partitions", title: "Offline partitions",
    trigger: "`OfflinePartitionsCount` above zero (KafkaOfflinePartitions).",
    impact: "Affected partitions accept no reads and no writes.",
    phases: [
      { title: "Triage", hint: "2 minutes", items: [
        { title: "Which partitions and topics?", run: "kafka-topics.sh --bootstrap-server $BS --describe --unavailable-partitions" },
        { title: "Is the controller quorum healthy?", run: "kafka-metadata-quorum.sh --bootstrap-server $BS describe --status" },
      ] },
      { title: "Diagnose", items: [
        { when: "LeaderId -1, or no quorum", then: "[Controller quorum unavailable](#/failures/controller-quorum-unavailable)", to: ["controller-quorum-unavailable"] },
        { when: "Replica brokers down, or log directories offline", then: "[Broker disk full](#/failures/disk-full), or restart the brokers", to: ["disk-full"] },
        { when: "__consumer_offsets partitions affected", then: "[Coordinator not available](#/failures/coordinator-not-available)", to: ["coordinator-not-available"] },
      ] },
      { title: "Mitigate", items: [
        { title: "Bring back a broker that held an in-sync replica", text: "The controller elects it as leader as soon as it registers." },
        { title: "Last resort: unclean election", text: "Only with the topic owner's agreement: whatever was written after that replica fell out of sync is lost.", run: "kafka-leader-election.sh --bootstrap-server $BS --election-type unclean --topic orders --partition 7" },
      ] },
      { title: "Resolve", items: [{ title: "Raise replication", text: "Move replication factor 1 topics to three replicas in three zones." }] },
      { title: "Verify", items: [{ title: "No unavailable partitions", run: "kafka-topics.sh --bootstrap-server $BS --describe --unavailable-partitions | wc -l   # expect 0" }] },
      { title: "Escalate", items: [{ text: "Page the platform lead immediately for any offline partition of a critical topic." }] },
    ],
  },
  {
    id: "consumer-lag", title: "Consumer lag",
    trigger: "A consumer group's time lag above its objective (KafkaConsumerGroupLagHigh).",
    impact: "Downstream data is late. If lag approaches retention, data will be skipped.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [
        { title: "Is the group consuming at all?", run: "kafka-consumer-groups.sh --bootstrap-server $BS --describe --group $GROUP --state\nkafka-consumer-groups.sh --bootstrap-server $BS --describe --group $GROUP" },
        { title: "How close is lag to retention?", text: "Compare the age of the oldest unread record with the topic's retention.ms. Within a few hours: escalate now." },
      ] },
      { title: "Diagnose", items: [
        { when: "No members, or the state keeps changing", then: "[Rebalance storm](#/failures/rebalance-storm)", to: ["rebalance-storm"] },
        { when: "Lag on one partition, at a fixed offset", then: "[Deserialization error](#/failures/deserialization-error)", to: ["deserialization-error"] },
        { when: "Lag everywhere, group Stable", then: "[Consumer lag](#/failures/consumer-lag)", to: ["consumer-lag"] },
        { when: "fetch-throttle-time above zero", then: "[Quota throttling](#/failures/quota-throttling)", to: ["quota-throttling"] },
      ] },
      { title: "Mitigate", items: [
        { title: "Add consumers up to the partition count", text: "Members beyond the partition count stay idle." },
        { title: "Pause less important readers of the same topic", text: "Frees broker fetch capacity for the critical group." },
      ] },
      { title: "Resolve", items: [{ title: "Fix throughput", text: "Batch downstream calls, fix a hot key, or add partitions with a migration plan." }] },
      { title: "Verify", items: [{ text: "Lag falls steadily and the group stays Stable for 30 minutes." }] },
      { title: "Escalate", items: [{ text: "If lag age reaches half of retention, page the topic owner: skipped data is the next failure." }] },
    ],
  },
  {
    id: "disk-usage", title: "Broker disk filling up",
    trigger: "Broker data disk above 85% (KafkaBrokerDiskUsageHigh).",
    impact: "At 100% the broker takes its log directory offline and partitions go under-replicated or offline.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [
        { title: "Which broker, and how fast is it growing?", run: "df -h /var/lib/kafka/data   # self-managed\n# MSK: KafkaDataLogsDiskUsed per broker in CloudWatch" },
      ] },
      { title: "Diagnose", items: [
        { title: "Which topics use the space?", run: "kafka-log-dirs.sh --bootstrap-server $BS --describe --broker-list 3 | tail -1 | jq -r '.brokers[].logDirs[].partitions[] | [.size, .partition] | @tsv' | sort -rn | head" },
        { when: "A compacted topic keeps growing", then: "[Log compaction stuck](#/failures/log-compaction-stuck)", to: ["log-compaction-stuck"] },
        { when: "A new or changed topic dominates", then: "Check its retention settings with its owner" },
      ] },
      { title: "Mitigate", items: [
        { title: "Lower retention on the largest topic", text: "Deletion follows at the next retention check, within minutes.", run: "kafka-configs.sh --bootstrap-server $BS --alter --entity-type topics --entity-name events --add-config retention.ms=86400000" },
        { title: "Grow the volume", run: "aws kafka update-broker-storage --cluster-arn $CLUSTER_ARN --current-version $VERSION \\\n  --target-broker-ebs-volume-info '[{\"KafkaBrokerNodeId\": \"All\", \"VolumeSizeGB\": 2000}]'" },
      ] },
      { title: "Resolve", items: [{ text: "Set retention.bytes ceilings, enable storage auto scaling or tiered storage, and balance partitions across brokers." }] },
      { title: "Verify", items: [{ text: "Use below 70% and falling; no log directory offline." }] },
      { title: "Escalate", items: [{ text: "Above 95% with nothing left to free: page immediately." }] },
    ],
  },
  {
    id: "client-connectivity", title: "Clients cannot connect",
    trigger: "Clients report connection, TLS or authentication errors (KafkaAuthenticationFailures, or a service report).",
    impact: "The affected services cannot produce or consume.",
    phases: [
      { title: "Triage", hint: "5 minutes", items: [
        { title: "One client or everyone?", text: "Everyone points at the cluster or the network; one service points at its own configuration or permissions." },
        { title: "Read the client's error", run: "grep -E 'could not be established|SSL handshake|SaslAuthentication|AuthorizationException' app.log | tail -5" },
      ] },
      { title: "Diagnose", items: [
        { when: "Connection to node ... (localhost/127.0.0.1)", then: "[Unreachable advertised listeners](#/failures/advertised-listeners)", to: ["advertised-listeners"] },
        { when: "Timeouts to ...amazonaws.com:9098", then: "[MSK brokers unreachable](#/failures/broker-unreachable)", to: ["broker-unreachable"] },
        { when: "SSL handshake failed", then: "[TLS handshake failed](#/failures/tls-handshake-failed)", to: ["tls-handshake-failed"] },
        { when: "SaslAuthenticationException", then: "[SASL authentication failed](#/failures/authentication-failed)", to: ["authentication-failed"] },
        { when: "Topic or group AuthorizationException", then: "[Not authorized](#/failures/authorization-failed)", to: ["authorization-failed"] },
      ] },
      { title: "Mitigate", items: [{ title: "Roll back the client change", text: "Most connectivity incidents follow a client deploy, a rotated secret or a security group change." }] },
      { title: "Resolve", items: [{ text: "Fix the listener, network rule, truststore, credential or permission that the error names." }] },
      { title: "Verify", items: [{ title: "Every broker answers", run: "kafka-broker-api-versions.sh --bootstrap-server $BS --command-config client.properties | grep -c '(id:'" }] },
      { title: "Escalate", items: [{ text: "If every client fails and the brokers look healthy, page the network owner." }] },
    ],
  },
  {
    id: "rolling-restart", title: "Rolling restart or upgrade",
    trigger: "Planned: a version upgrade, a configuration change or host patching.",
    impact: "Done well, none: every partition keeps two in-sync replicas while one node restarts.",
    phases: [
      { title: "Before", items: [
        { title: "Start healthy", text: "No under-replicated or offline partitions, and the controller quorum has a leader.", run: "kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l\nkafka-metadata-quorum.sh --bootstrap-server $BS describe --status" },
        { title: "Check compatibility", text: "Read the upgrade notes for removed protocols and configs, and inventory client versions." },
      ] },
      { title: "During", items: [
        { title: "One node at a time", text: "Restart one, wait until under-replicated partitions are back to zero, then the next.", run: "systemctl restart kafka   # self-managed; MSK rolls brokers itself" },
        { title: "Finalize the metadata version last", text: "Only after every node runs the new version and you will not roll back.", run: "kafka-features.sh --bootstrap-server $BS describe" },
      ] },
      { title: "If something goes wrong", items: [
        { when: "Under-replicated partitions stay above zero", then: "[Under-replicated partitions](#/failures/under-replicated-partitions)", to: ["under-replicated-partitions"] },
        { when: "Clients fail after the upgrade", then: "[Client connectivity runbook](#/operations/runbooks/client-connectivity)", to: ["runbook:client-connectivity"] },
      ] },
      { title: "Verify", items: [{ text: "Every node on the new version, zero under-replicated partitions, client error rates unchanged." }] },
    ],
  },
]);
