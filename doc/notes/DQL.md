2. Real-Time Programmable Blockchain Event Processor — Subdot DQL Summary

✨ Motivation

    Traditional blockchain monitoring is slow, limited, or fragmented.

    We need real-time, programmable event processing like a modern observability pipeline.

    Inspired by KQL (Azure Data Explorer), jq, Flink, k9s, htop, Kafka Streams.

✅ Goal: Bring programmatic stream manipulation to blockchain operators and devs.
🧠 DQL (Dot Query Language) — The Language of subdot

Core structure:

    when [filter]
    select [projection/transform]
    action [side-effect]
    (join, group, aggregate are additional capabilities)

📋 Grammar
Section	Purpose
when	Event filtering: only react to interesting events
select	Project, rename, or enrich fields
action	Side-effect: notify, publish, log, write, output
join	(Optional) join two event streams by key within a time window
group by	(Optional) group events by field or time
aggregate	(Optional) compute aggregates like count(), sum(field), avg(field)
📜 Example DQL Queries
🔹 Filter and project

when pallet == 'balances' and method == 'Transfer'
select from, to, amount
action log, output

🔹 Joins (joining two event streams)

when method == 'Transfer'
join staking_rewards on account window 60
select from, to, amount, reward_amount
action publish

🔹 Grouping and Aggregation

when pallet == 'balances'
group by from interval 60
aggregate { count(), sum(amount), avg(amount) }
action write

🚀 Features List

    Real-time event processing

    Streaming DQL execution

    Temporal joins

    Time-based aggregation (binning)

    Multiple outputs (console, file, NATS)

    Configurable sources

    Interactive TUI

    Kubernetes-ready

    Future: live-editable rules, multi-stream event replay


# Summary of subdot's Uniqueness

subdot is:

    a Swiss army knife for blockchain events,

    a real-time stream processor,

    a programmable, operator-grade toolkit,

    a lightweight TUI dashboard,

    and a modern queryable event router for Polkadot and beyond.
    
It is designed to be fast, efficient, and easy to use, with a focus on real-time event processing and programmability.