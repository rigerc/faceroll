package faceroll

import (
	"fmt"
	"strings"
)

// Character is a complete agent face: its parts and one animation per state.
type Character struct {
	Name     string
	NameMode NameMode
	// Seed is nil when the character was created without a seed.
	Seed       *string
	Parts      Parts
	Animations Animations
}

// CreateOptions controls New.
type CreateOptions struct {
	// Name is an optional custom name. Blank or whitespace-only names fall back
	// to the automatic name.
	Name *string
	// NameMode forces automatic naming when set to NameAuto.
	NameMode NameMode
	// Seed is recorded on the character when non-nil.
	Seed *string
}

// New builds a character from exact parts.
//
// A body with a required mouth (the bear) uses that mouth for rendering, but
// the supplied mouth preference stays in Character.Parts. Switching away from
// the bear restores the original selection.
func New(parts Parts, options CreateOptions) (*Character, error) {
	if _, err := GetBody(string(parts.Body)); err != nil {
		return nil, err
	}
	if _, err := GetEyes(string(parts.Eyes)); err != nil {
		return nil, err
	}
	if _, err := GetMouth(string(parts.Mouth)); err != nil {
		return nil, err
	}
	animations, err := BuildAnimations(parts)
	if err != nil {
		return nil, err
	}

	custom := ""
	if options.Name != nil {
		custom = strings.TrimSpace(*options.Name)
	}
	mode := NameAuto
	if options.NameMode != NameAuto && custom != "" {
		mode = NameCustom
	}
	name := custom
	if mode == NameAuto {
		name, err = NameForParts(parts)
		if err != nil {
			return nil, err
		}
	}

	var seed *string
	if options.Seed != nil {
		value := *options.Seed
		seed = &value
	}
	return &Character{
		Name:       name,
		NameMode:   mode,
		Seed:       seed,
		Parts:      parts,
		Animations: animations,
	}, nil
}

// PartLocks pins individual parts during a roll. Nil fields are rolled.
type PartLocks struct {
	Body  *BodyID
	Eyes  *EyesID
	Mouth *MouthID
}

// RollOptions controls Roll.
type RollOptions struct {
	// Seed makes the roll deterministic. Nil picks and records a random seed.
	Seed *string
	// RNG replaces Seed when non-nil. A custom RNG records no seed.
	RNG RNG
	// Vibe restricts the part pools. The zero value means VibeAny.
	Vibe Vibe
	// Lock keeps individual parts fixed.
	Lock PartLocks
	// Name sets a custom name; nil or blank uses the automatic name.
	Name *string
	// NameMode forces automatic naming when set to NameAuto.
	NameMode NameMode
}

// Roll creates a random character. Locked parts stay fixed.
func Roll(options RollOptions) (*Character, error) {
	vibe := options.Vibe
	if vibe == "" {
		vibe = VibeAny
	}
	if !ValidVibe(vibe) {
		return nil, &UnknownIDError{
			Kind:    "vibe",
			ID:      string(vibe),
			Allowed: []string{string(VibeAny), string(VibeCute), string(VibeCool), string(VibeWeird)},
		}
	}

	rng := options.RNG
	var seed *string
	if rng == nil {
		var value string
		if options.Seed != nil {
			value = *options.Seed
		} else {
			generated, err := RandomSeed()
			if err != nil {
				return nil, err
			}
			value = generated
		}
		seed = &value
		rng = SeededRNG(value)
	}

	pickFor := func(kind PartKind) (string, error) {
		pool, err := PartPool(kind, vibe)
		if err != nil {
			return "", err
		}
		return Pick(pool, rng)
	}

	parts := Parts{}
	var err error
	if options.Lock.Body != nil {
		parts.Body = *options.Lock.Body
	} else if parts.Body, err = pickBody(pickFor, PartBody); err != nil {
		return nil, err
	}
	if options.Lock.Eyes != nil {
		parts.Eyes = *options.Lock.Eyes
	} else if parts.Eyes, err = pickEyes(pickFor, PartEyes); err != nil {
		return nil, err
	}
	if options.Lock.Mouth != nil {
		parts.Mouth = *options.Lock.Mouth
	} else if parts.Mouth, err = pickMouth(pickFor, PartMouth); err != nil {
		return nil, err
	}

	return New(parts, CreateOptions{Name: options.Name, NameMode: options.NameMode, Seed: seed})
}

func pickBody(pickFor func(PartKind) (string, error), kind PartKind) (BodyID, error) {
	id, err := pickFor(kind)
	return BodyID(id), err
}

func pickEyes(pickFor func(PartKind) (string, error), kind PartKind) (EyesID, error) {
	id, err := pickFor(kind)
	return EyesID(id), err
}

func pickMouth(pickFor func(PartKind) (string, error), kind PartKind) (MouthID, error) {
	id, err := pickFor(kind)
	return MouthID(id), err
}

// RerollOptions controls RerollPart.
type RerollOptions struct {
	Seed *string
	RNG  RNG
	Vibe Vibe
}

// RerollPart rolls a new value for one part and keeps the rest. It avoids
// repeating the current part when the vibe allows another.
func RerollPart(character *Character, kind PartKind, options RerollOptions) (*Character, error) {
	if character == nil {
		return nil, fmt.Errorf("faceroll: nil character")
	}
	vibe := options.Vibe
	if vibe == "" {
		vibe = VibeAny
	}
	rng := options.RNG
	var seed *string
	if rng == nil {
		var value string
		if options.Seed != nil {
			value = *options.Seed
		} else {
			generated, err := RandomSeed()
			if err != nil {
				return nil, err
			}
			value = generated
		}
		seed = &value
		rng = SeededRNG(value)
	}
	pool, err := PartPool(kind, vibe)
	if err != nil {
		return nil, err
	}
	current := ""
	switch kind {
	case PartBody:
		current = string(character.Parts.Body)
	case PartEyes:
		current = string(character.Parts.Eyes)
	case PartMouth:
		current = string(character.Parts.Mouth)
	default:
		return nil, &UnknownIDError{Kind: "part kind", ID: string(kind)}
	}
	alternatives := make([]string, 0, len(pool))
	for _, id := range pool {
		if id != current {
			alternatives = append(alternatives, id)
		}
	}
	if len(alternatives) == 0 {
		alternatives = pool
	}
	next, err := Pick(alternatives, rng)
	if err != nil {
		return nil, err
	}

	parts := character.Parts
	switch kind {
	case PartBody:
		parts.Body = BodyID(next)
	case PartEyes:
		parts.Eyes = EyesID(next)
	case PartMouth:
		parts.Mouth = MouthID(next)
	}
	name := character.Name
	mode := character.NameMode
	if mode == "" {
		mode = NameCustom
	}
	return New(parts, CreateOptions{Name: &name, NameMode: mode, Seed: seed})
}
