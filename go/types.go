// Package faceroll builds animated ASCII faces ("asciimoji") for agents.
//
// It is a native Go port of the faceroll TypeScript library. Characters are
// immutable values: a set of body/eyes/mouth parts plus one animation per state
// and emotion. Seeded rolls, automatic names, presets and child slots are
// stable across processes and match the TypeScript implementation.
package faceroll

// VibeTag marks which styles a part belongs to.
type VibeTag string

const (
	TagCute  VibeTag = "cute"
	TagCool  VibeTag = "cool"
	TagWeird VibeTag = "weird"
)

// Vibe restricts which parts a roll can pick. VibeAny allows every part.
type Vibe string

const (
	VibeAny   Vibe = "any"
	VibeCute  Vibe = "cute"
	VibeCool  Vibe = "cool"
	VibeWeird Vibe = "weird"
)

// Look is the direction a face glances.
type Look string

const (
	LookCenter Look = "c"
	LookLeft   Look = "l"
	LookRight  Look = "r"
)

// Pair is a left and right glyph, for example {"•", "•"}.
type Pair struct {
	Left  string
	Right string
}

// NameMode says whether a character follows its parts' automatic name or keeps
// a user-supplied name.
type NameMode string

const (
	NameAuto   NameMode = "auto"
	NameCustom NameMode = "custom"
)

// StateName identifies one expression.
type StateName string

// StateKind separates ongoing states from reactions.
type StateKind string

const (
	KindState   StateKind = "state"
	KindEmotion StateKind = "emotion"
)

// StateInfo describes a state or emotion and when an agent should show it.
type StateInfo struct {
	ID    StateName
	Label string
	Kind  StateKind
	Use   string
	Say   string
}

// Frame is one step of an animation: show Text for MS milliseconds.
type Frame struct {
	Text string
	MS   int
}

// Animation is a named loop of frames plus a still frame for static use.
type Animation struct {
	Name     StateName
	Still    string
	Frames   []Frame
	Duration int
	Width    int
}

// BodyDef is one face outline.
type BodyDef struct {
	ID    BodyID
	Left  string
	Right string
	Vibes []VibeTag
	// Mouth, when set, is always used for rendering by this body.
	Mouth MouthID
}

// EyeDef is one pair of eye glyphs per expression.
type EyeDef struct {
	ID    EyesID
	Vibes []VibeTag
	Open  Pair
	Blink Pair
	Happy Pair
	Wide  Pair
	Sad   Pair
	Angry Pair
	Sleep Pair
}

// MouthDef is one mouth glyph per expression.
type MouthDef struct {
	ID     MouthID
	Vibes  []VibeTag
	Calm   string
	Smile  string
	Big    string
	Open   string
	Sad    string
	Flat   string
	Unsure string
	Angry  string
	Sleep  string
}

// FacePreset is a named starting face.
type FacePreset struct {
	ID    PresetID
	Label string
	Vibe  VibeTag
	Parts Parts
}
