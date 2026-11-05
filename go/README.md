# faceroll for Go

A native Go port of [faceroll](../README.md): animated ASCII faces
("asciimoji") for agents, plus the `faceroll` command line tool.

- No Node.js runtime, no cgo, no third-party dependencies.
- A reusable library for characters, presets, families, exports and terminal playback.
- Seeded rolls, automatic names, preset parts, child slots and snapshots match the
  TypeScript implementation, so saved identities keep working across languages.

## Install the CLI

```sh
go install github.com/rigerc/faceroll/go/cmd/faceroll@latest
```

Or build from this repository:

```sh
cd go
go build -o faceroll ./cmd/faceroll
```

```sh
faceroll roll --seed pixel
faceroll roll --preset kitty --format prompt
faceroll play working --seed pixel --duration 3000
faceroll children --preset kitty --seed my-project --count 5
faceroll states
faceroll parts
faceroll presets
```

## Library

```go
package main

import (
	"fmt"

	faceroll "github.com/rigerc/faceroll/go"
)

func main() {
	seed := "my-agent"
	agent, err := faceroll.Roll(faceroll.RollOptions{
		Seed: &seed,
		Vibe: faceroll.VibeCute,
	})
	if err != nil {
		panic(err)
	}

	fmt.Println(agent.Name)                                    // automatic face name
	fmt.Println(agent.Animations[faceroll.StateIdle].Still)    // one-line idle face
	fmt.Println(agent.Animations[faceroll.StateWorking].Frames) // [{Text, MS}, ...]
}
```

Build a character from exact parts, or restore one from a saved snapshot:

```go
character, err := faceroll.New(
	faceroll.Parts{
		Body:  faceroll.BodyBear,
		Eyes:  faceroll.EyesDot,
		Mouth: faceroll.MouthW,
	},
	faceroll.CreateOptions{Name: &name, Seed: &seed},
)

snapshot := faceroll.Serialize(character)
data, _ := faceroll.MarshalSnapshot(character) // canonical JSON
restored, _ := faceroll.Deserialize(snapshot)
```

Presets, exports and families:

```go
kitty, _ := faceroll.CreatePresetCharacter("kitty", faceroll.CreateOptions{})
prompt := faceroll.ToSystemPrompt(kitty, faceroll.PromptOptions{})
markdown := faceroll.ToMarkdown(kitty)
nodeSource := faceroll.ToNodeSource(kitty)

threads, _ := faceroll.DeriveChildren(kitty, faceroll.ChildrenOptions{
	Seed:  &familySeed,
	Count: 5,
})
slot, _ := faceroll.DeriveChild(kitty, faceroll.ChildOptions{
	Seed:  &familySeed,
	Index: 2, // store this zero-based slot with the thread
})
```

Terminal playback:

```go
player := faceroll.NewTerminalPlayer(faceroll.TerminalOptions{
	Prefix: "pixel ",
	Suffix: " is working",
})
player.Play(character.Animations[faceroll.StateWorking])
// ... later
player.Stop(false)
```

On a non-TTY stream the player prints the still face once instead of animating.

## API

| Area | Functions |
|---|---|
| Roll / create | `Roll`, `New`, `RerollPart`, `ListParts` |
| Parts | `Bodies`, `Eyes`, `Mouths`, `GetBody`, `GetEyes`, `GetMouth`, `PartPool` |
| States | `States`, `StateNames`, `GetState` |
| Presets | `FacePresets`, `GetFacePreset`, `CreatePresetCharacter` |
| Animations | `BuildAnimations`, `FrameAt`, `FrameIndexAt` |
| Families | `DeriveChild`, `DeriveChildren`, `ChildCapacity` |
| Exports | `Serialize`, `Deserialize`, `MarshalSnapshot`, `ToSystemPrompt`, `ToMarkdown`, `ToNodeSource` |
| Terminal | `NewPlayer`, `NewTerminalPlayer`, `PlayInTerminal` |
| Utilities | `HashSeed`, `SeededRNG`, `RandomSeed`, `Pick`, `CellWidth`, `NameForParts` |

`RollOptions.Seed` is a pointer so `nil` means "pick a random seed" and
`""` is a valid deterministic seed. `CreateOptions.Name` is likewise optional;
blank or whitespace-only names use automatic naming.

Use `MarshalSnapshot` when byte-identical JavaScript JSON matters.
`encoding/json` HTML-escapes `<`, `>`, and `&` by default; `MarshalSnapshot`
uses the same escaping rules as `JSON.stringify`. The exported part, state and
preset slices are read-only tables: do not mutate them at runtime.

The stateful editor (`Faceroll`/`createFaceroll`) and the MCP server are not
part of this module. The core character API is stable and can be used to build
either on top.

## Parity with TypeScript

`go/testdata/parity.json` is generated from the TypeScript library by
`scripts/gen-go-fixtures.mjs`. It pins:

- UTF-16 FNV-1a seed hashing and mulberry32 sequences (including emoji and
  non-ASCII seeds),
- automatic names for all 6,480 part combinations,
- fingerprints for all 6,480 characters and every animation,
- all 24 preset snapshots,
- exporter output (prompt, Markdown, JSON, Node source),
- child ordering, capacity and fingerprints for every body.

The Go tests compare against those fixtures, and
`scripts/go-parity.mjs` compares the Go and TypeScript CLIs byte-for-byte.

### Intentional CLI differences

The Go CLI fixes three rough edges instead of reproducing them:

1. **Preset text output never prints `seed undefined`.** Presets choose fixed
   parts, so `--seed` is not stored on the character; it still controls child
   ordering. The header omits the seed segment instead.
2. **Unknown flags are rejected.** `faceroll roll --nmae Pixel` exits 2 with a
   message and help instead of silently ignoring the typo.
3. **Numeric flags are strict.** `--duration`, `--count` and `--index` accept
   only non-negative decimal integers; values like `1e3`, `3.5` or `abc` exit 2.

Character data, seeded rolls, names, presets, child slots and JSON snapshots
are otherwise identical to the TypeScript implementation.

## Development

The table and fixture generators read the built TypeScript package:

```sh
npm run build                     # from the repository root
node scripts/gen-go-tables.mjs    # regenerate go/tables_gen.go
node scripts/gen-go-fixtures.mjs  # regenerate go/testdata/parity.json

cd go
go test ./...
go test -race ./...
go vet ./...
```

Cross-language check (builds the Go binary itself):

```sh
node scripts/go-parity.mjs
node scripts/gen-go-fixtures.mjs --check
```

The Go module lives in this repository and is released with `go/vX.Y.Z` tags,
independently from the npm package. The data tables are generated; if the
TypeScript parts, states or presets change, regenerate them and rerun the
parity suite.

## License

MIT
