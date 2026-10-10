// Categories used everywhere: planes colour the stations, layers group failures, and lenses
// filter the AWS map down to one concern at a time.
KA.define("planes", {
  control: { name: "Controller quorum", hint: "Owns the cluster metadata" },
  node: { name: "Broker", hint: "Stores and serves partitions" },
  addon: { name: "Platform service", hint: "Runs beside the brokers" },
  workload: { name: "Your applications", hint: "Producers, consumers and stream processors" },
  client: { name: "Operators", hint: "People and pipelines" },
  aws: { name: "Infrastructure and AWS", hint: "Disks, networks and managed services" },
});

KA.define("layers", [
  { id: "producer", name: "Producers", hint: "Writing records" },
  { id: "consumer", name: "Consumers", hint: "Reading records, groups and offsets" },
  { id: "replication", name: "Replication", hint: "Leaders, followers and the ISR" },
  { id: "broker", name: "Brokers", hint: "Threads, disks, files and logs" },
  { id: "controller", name: "Controller", hint: "The KRaft metadata quorum" },
  { id: "connectivity", name: "Connectivity", hint: "Listeners, networks and TLS" },
  { id: "security", name: "Security", hint: "Who you are and what you may do" },
  { id: "platform", name: "Platform", hint: "Schema Registry and Kafka Connect" },
  { id: "aws", name: "AWS", hint: "Limits of the infrastructure underneath" },
]);

KA.define("lenses", [
  {
    id: "networking",
    name: "Networking",
    summary: "Brokers live in your subnets, one set per Availability Zone. Clients must reach every broker individually, on the port that matches their authentication method.",
    stations: ["vpc", "security-groups", "dns", "privatelink", "broker", "producer", "consumer"],
    flows: ["aws-iam-connect"],
    layers: ["connectivity"],
    decide: {
      title: "MSK client ports",
      cols: ["Port", "Authentication", "Use it for"],
      rows: [
        ["9092", "None (plaintext)", "Development only"],
        ["9094", "TLS, optionally mutual TLS", "Clients with certificates from a private CA"],
        ["9096", "SASL/SCRAM over TLS", "Username and password from Secrets Manager"],
        ["9098", "IAM over TLS", "AWS workloads with IAM roles"],
        ["9194 to 9198", "The same, over public access", "Clients outside AWS, when public access is on"],
      ],
    },
  },
  {
    id: "security",
    name: "Security",
    summary: "Authentication decides who a client is, authorization what it may do with each topic, group and transactional ID. On MSK, IAM can do both.",
    stations: ["iam", "secrets", "kms", "broker", "producer", "consumer", "security-groups"],
    flows: ["aws-iam-connect"],
    layers: ["security"],
    decide: {
      title: "How clients authenticate",
      cols: ["", "IAM", "SASL/SCRAM", "Mutual TLS"],
      rows: [
        ["Identity", "IAM role or user", "Username and password", "Client certificate"],
        ["Authorization", "IAM policies (kafka-cluster actions)", "Kafka ACLs", "Kafka ACLs"],
        ["Credentials live in", "IAM, rotated automatically", "Secrets Manager (AmazonMSK_ prefix)", "Your private CA"],
        ["Clients need", "The aws-msk-iam-auth library or an OAUTHBEARER signer", "Any Kafka client", "Any Kafka client, plus a keystore"],
      ],
    },
  },
  {
    id: "storage",
    name: "Storage",
    summary: "Standard brokers keep partitions on EBS volumes whose size and throughput you choose. Tiered storage moves older segments to S3; Express brokers remove storage from your hands.",
    stations: ["broker", "ebs", "tiered-storage", "cloudwatch", "kms"],
    flows: ["aws-storage"],
    layers: ["broker", "replication", "aws"],
    decide: {
      title: "Where the data lives",
      cols: ["Option", "How it works", "Watch out for"],
      rows: [
        ["Standard brokers on EBS", "One volume per broker; storage auto scaling can grow it", "Volume throughput limits; volumes never shrink"],
        ["Tiered storage", "Closed segments copied to S3, kept locally only for local.retention.ms", "Old reads go through the broker and its network"],
        ["Express brokers", "No volumes to size; storage is billed per GB", "Fewer settings you can change"],
      ],
    },
    widget: "capacity",
  },
  {
    id: "deployment",
    name: "Deployment",
    summary: "The same Kafka protocol, run five ways on AWS. The choice decides who patches brokers, how you scale, and which settings you control.",
    stations: ["broker", "controller", "connect", "schema-registry", "vpc"],
    flows: [],
    layers: ["controller", "platform"],
    decide: {
      title: "Ways to run Kafka on AWS",
      cols: ["Option", "You manage", "Choose it when"],
      rows: [
        ["MSK Provisioned, Standard brokers", "Broker size and count, storage, configuration", "You need full control of Kafka settings"],
        ["MSK Provisioned, Express brokers", "Broker size and count", "You want more throughput per broker and fast scaling"],
        ["MSK Serverless", "Topics and clients only", "Variable traffic, IAM authentication, modest partition counts"],
        ["Strimzi on EKS", "Everything, through Kubernetes resources", "You already run Kubernetes and want GitOps for Kafka"],
        ["Self-managed on EC2", "Everything", "You need versions or features MSK does not offer"],
      ],
    },
  },
  {
    id: "observability",
    name: "Observability",
    summary: "MSK publishes metrics to CloudWatch at the level you choose, and can expose JMX and node metrics to Prometheus. Consumer lag is published per group.",
    stations: ["cloudwatch", "broker", "controller", "consumer", "producer"],
    flows: ["aws-storage"],
    layers: ["consumer", "producer"],
    decide: {
      title: "Monitoring levels",
      cols: ["Level", "Adds", "Use it for"],
      rows: [
        ["DEFAULT", "Cluster-wide basics and consumer lag", "Development clusters"],
        ["PER_BROKER", "Per-broker throughput, latency, disk and network", "Every production cluster"],
        ["PER_TOPIC_PER_BROKER", "Per-topic traffic on each broker", "Finding the topic behind a hot broker"],
        ["PER_TOPIC_PER_PARTITION", "Per-partition consumer lag", "Hot partitions and stuck consumers"],
        ["Open monitoring", "JMX and node exporters for Prometheus", "Detailed dashboards and alert rules"],
      ],
    },
  },
]);
