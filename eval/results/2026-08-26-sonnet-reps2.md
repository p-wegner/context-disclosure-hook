# Eval — model sonnet, 12 runs

| prompt | arm | @kestrel tag (nested CLAUDE.md) | rule conventions | tools used | CC nested_memory | hook fired | turns | cost |
|---|---|---|---|---|---|---|---|---|
| bash | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | PowerShell×7 | false | false | 8 | $0.218 |
| bash | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | PowerShell×3 Edit×4 | false | false | 8 | $0.105 |
| bash | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | PowerShell×3 Edit×5 | false | true | 9 | $0.127 |
| bash | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | PowerShell×3 Edit×3 | false | true | 7 | $0.097 |
| free | control | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Glob×1 Edit×5 | true | false | 10 | $0.210 |
| free | control | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×6 | true | false | 10 | $0.133 |
| free | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×3 | true | false | 7 | $0.097 |
| free | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×5 Glob×1 | true | false | 10 | $0.136 |
| grep | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×4 Edit×2 | false | false | 7 | $0.148 |
| grep | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×2 Edit×2 | false | false | 5 | $0.066 |
| grep | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Grep×5 Edit×4 Read×1 | true | true | 11 | $0.140 |
| grep | hook | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×2 Edit×2 | false | true | 5 | $0.079 |
