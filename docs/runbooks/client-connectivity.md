<!-- Generated from data/runbooks.js by `node scripts/atlas.mjs docs`. Edit the data, then regenerate. -->

# Runbook: Clients cannot connect

**Trigger:** Clients report connection, TLS or authentication errors (KafkaAuthenticationFailures, or a service report).

**Impact:** The affected services cannot produce or consume.

[Open as a flowchart](../../index.html#/operations/runbooks/client-connectivity)

## Triage (5 minutes)

**One client or everyone?.** Everyone points at the cluster or the network; one service points at its own configuration or permissions.

**Read the client's error.** 

```sh
grep -E 'could not be established|SSL handshake|SaslAuthentication|AuthorizationException' app.log | tail -5
```

## Diagnose

| If you see | Then |
|---|---|
| Connection to node ... (localhost/127.0.0.1) | [Unreachable advertised listeners](../failures/advertised-listeners.md) |
| Timeouts to ...amazonaws.com:9098 | [MSK brokers unreachable](../failures/broker-unreachable.md) |
| SSL handshake failed | [TLS handshake failed](../failures/tls-handshake-failed.md) |
| SaslAuthenticationException | [SASL authentication failed](../failures/authentication-failed.md) |
| Topic or group AuthorizationException | [Not authorized](../failures/authorization-failed.md) |

## Mitigate

**Roll back the client change.** Most connectivity incidents follow a client deploy, a rotated secret or a security group change.

## Resolve

Fix the listener, network rule, truststore, credential or permission that the error names.

## Verify

**Every broker answers.** 

```sh
kafka-broker-api-versions.sh --bootstrap-server $BS --command-config client.properties | grep -c '(id:'
```

## Escalate

If every client fails and the brokers look healthy, page the network owner.
