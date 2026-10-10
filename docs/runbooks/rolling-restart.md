<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Rolling restart or upgrade

**Trigger:** Planned: a version upgrade, a configuration change or host patching.

**Impact:** Done well, none: every partition keeps two in-sync replicas while one node restarts.

[Open as a flowchart](../../index.html#/operations/runbooks/rolling-restart)

## Before

**Start healthy.** No under-replicated or offline partitions, and the controller quorum has a leader.

```sh
kafka-topics.sh --bootstrap-server $BS --describe --under-replicated-partitions | wc -l
kafka-metadata-quorum.sh --bootstrap-server $BS describe --status
```

**Check compatibility.** Read the upgrade notes for removed protocols and configs, and inventory client versions.

## During

**One node at a time.** Restart one, wait until under-replicated partitions are back to zero, then the next.

```sh
systemctl restart kafka   # self-managed; MSK rolls brokers itself
```

**Finalize the metadata version last.** Only after every node runs the new version and you will not roll back.

```sh
kafka-features.sh --bootstrap-server $BS describe
```

## If something goes wrong

| If you see | Then |
|---|---|
| Under-replicated partitions stay above zero | [Under-replicated partitions](../failures/under-replicated-partitions.md) |
| Clients fail after the upgrade | [Client connectivity runbook](client-connectivity.md) |

## Verify

Every node on the new version, zero under-replicated partitions, client error rates unchanged.
