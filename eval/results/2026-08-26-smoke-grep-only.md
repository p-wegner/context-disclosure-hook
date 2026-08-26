# Eval — model sonnet, 2 runs

| prompt | arm | @kestrel tag (nested CLAUDE.md) | rule conventions | tools used | CC nested_memory | hook fired | turns | cost |
|---|---|---|---|---|---|---|---|---|
| grep | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×5 Edit×2 | false | false | 8 | $0.185 |
| grep | hook | @kestrel ✅ | CHANGES.md ❌ no console.log ✅ | Grep×2 Read×2 Edit×2 | true | true | 7 | $0.080 |
