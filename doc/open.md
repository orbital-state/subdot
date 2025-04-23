##  Requirements

- Relay Chain only or Parachains too? first
- Only finalized events? yes
- Specific events or flexible (custom user)? both
- Log-only notifications or external alerts? 
- Resilience (reconnect, missed events)?
- Local Kubernetes OK? yes
- Terraform: workloads only or full infra? yes
- Smoldot allowed or full node required? yes first
- Event persistence needed? Optional / configurable
- Multiple subscribers with custom filters?
- Event acknowledgment by subscribers?
- Simple logs vs durable event queue (e.g., Redis)?
- Expose health/metrics endpoints? "Who monitors the monitoring.."
- (Optional) Expected load/volume? 
    - low load / low volume 
    - "10-20 per block every 6s" (10-20 parachains)
    - (future): non real-time and data analytics
        * maybe "datafusion ... df frames"
        * Kafka StreamSQL
        * OSS aka databricks, Generic API Filtering "When and Action" or Business Rule Engine.. logical rule "account.balance > 0"
- (Optional) Multi-chain monitoring? no
- (Optional) DR/replay requirements?

## Advanced

- Optimization: wasm support by the k8s when running the payload-filtering
- Smart design: focus on adding meta-data as payload processing outcome when filtering
- Testing: 
- Visualization: 