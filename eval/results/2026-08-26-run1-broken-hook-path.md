# Eval — model sonnet, 6 runs

| prompt | arm | @kestrel tag (nested CLAUDE.md) | rule conventions | tools used | CC nested_memory | hook fired | turns | cost |
|---|---|---|---|---|---|---|---|---|
| bash | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | PowerShell×2 Edit×2 | false | false | 5 | $0.164 |
| bash | hook | missing ❌ | CHANGES.md ❌ no console.log ✅ | PowerShell×2 Edit×2 | false | false | 5 | $0.065 |
| free | control | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×3 | true | false | 7 | $0.191 |
| free | hook | @kestrel ✅ | CHANGES.md ✅ no console.log ✅ | Read×3 Edit×5 | true | false | 9 | $0.225 |
| grep | control | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×4 Edit×2 | false | false | 7 | $0.158 |
| grep | hook | missing ❌ | CHANGES.md ❌ no console.log ✅ | Grep×4 Edit×2 | false | false | 7 | $0.074 |
