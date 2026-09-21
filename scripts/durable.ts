// Aufruf: node --env-file=.env scripts/durable.ts 104
import { durableTriageAgent as agent } from '../src/mastra/agents/durable-triage-agent.ts'
import '../src/mastra/index.ts' // registriert den Agent (Storage, PubSub)

const number = process.argv[2] ?? '104'

const { runId, output } = await agent.stream(`Triagiere Issue #${number}`)

// Client "verliert die Verbindung" nach ein paar Chunks
let chunks = 0
for await (const text of output.textStream) {
  process.stdout.write(text)
  if (++chunks === 15) break
}
console.log(`\n\n🔌 Verbindung weg nach ${chunks} Chunks. Run ${runId} läuft weiter …\n`)

// Neuer Client hängt sich an denselben Run und bekommt alles ab Offset 0 nachgeliefert
const { output: replay, cleanup } = await agent.observe(runId, { offset: 0 })
for await (const text of replay.textStream) process.stdout.write(text)
console.log('\n\n✅ Vollständig, ohne einen Chunk zu verlieren.')
cleanup()
process.exit(0) // ponytail: PubSub/Cache-Timer halten den Prozess sonst ~30 s offen
