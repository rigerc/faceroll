package faceroll

import (
	"fmt"
	"strings"
)

// BodyID identifies a body.
type BodyID string

// EyesID identifies an eye style.
type EyesID string

// MouthID identifies a mouth style.
type MouthID string

// PresetID identifies a named face.
type PresetID string

// Parts are the three choices that make up a character.
type Parts struct {
	Body  BodyID  `json:"body"`
	Eyes  EyesID  `json:"eyes"`
	Mouth MouthID `json:"mouth"`
}

// PartKind is one of "body", "eyes" or "mouth".
type PartKind string

const (
	PartBody  PartKind = "body"
	PartEyes  PartKind = "eyes"
	PartMouth PartKind = "mouth"
)

// PartKinds lists the parts in roll order.
var PartKinds = []PartKind{PartBody, PartEyes, PartMouth}

// PartIDs lists every valid id for each kind, in declaration order.
type PartIDs struct {
	Body  []BodyID
	Eyes  []EyesID
	Mouth []MouthID
}

// UnknownIDError reports an id that is not in a table.
type UnknownIDError struct {
	Kind    string
	ID      string
	Allowed []string
}

func (e *UnknownIDError) Error() string {
	return fmt.Sprintf("Unknown %s %q. Use one of: %s", e.Kind, e.ID, strings.Join(e.Allowed, ", "))
}

// GetBody returns a body definition or an *UnknownIDError.
func GetBody(id string) (BodyDef, error) {
	for _, body := range Bodies {
		if string(body.ID) == id {
			return body, nil
		}
	}
	allowed := make([]string, len(Bodies))
	for i, body := range Bodies {
		allowed[i] = string(body.ID)
	}
	return BodyDef{}, &UnknownIDError{Kind: "body", ID: id, Allowed: allowed}
}

// GetEyes returns an eye definition or an *UnknownIDError.
func GetEyes(id string) (EyeDef, error) {
	for _, eyes := range Eyes {
		if string(eyes.ID) == id {
			return eyes, nil
		}
	}
	allowed := make([]string, len(Eyes))
	for i, eyes := range Eyes {
		allowed[i] = string(eyes.ID)
	}
	return EyeDef{}, &UnknownIDError{Kind: "eyes", ID: id, Allowed: allowed}
}

// GetMouth returns a mouth definition or an *UnknownIDError.
func GetMouth(id string) (MouthDef, error) {
	for _, mouth := range Mouths {
		if string(mouth.ID) == id {
			return mouth, nil
		}
	}
	allowed := make([]string, len(Mouths))
	for i, mouth := range Mouths {
		allowed[i] = string(mouth.ID)
	}
	return MouthDef{}, &UnknownIDError{Kind: "mouth", ID: id, Allowed: allowed}
}

// ValidVibe reports whether v is a supported vibe.
func ValidVibe(v Vibe) bool {
	switch v {
	case VibeAny, VibeCute, VibeCool, VibeWeird:
		return true
	default:
		return false
	}
}

// PartPool returns the ids of one kind that fit a vibe.
func PartPool(kind PartKind, vibe Vibe) ([]string, error) {
	if !ValidVibe(vibe) {
		return nil, &UnknownIDError{
			Kind:    "vibe",
			ID:      string(vibe),
			Allowed: []string{string(VibeAny), string(VibeCute), string(VibeCool), string(VibeWeird)},
		}
	}
	matches := func(tags []VibeTag) bool {
		if vibe == VibeAny {
			return true
		}
		for _, tag := range tags {
			if string(tag) == string(vibe) {
				return true
			}
		}
		return false
	}
	var out []string
	switch kind {
	case PartBody:
		for _, body := range Bodies {
			if matches(body.Vibes) {
				out = append(out, string(body.ID))
			}
		}
	case PartEyes:
		for _, eyes := range Eyes {
			if matches(eyes.Vibes) {
				out = append(out, string(eyes.ID))
			}
		}
	case PartMouth:
		for _, mouth := range Mouths {
			if matches(mouth.Vibes) {
				out = append(out, string(mouth.ID))
			}
		}
	default:
		return nil, &UnknownIDError{Kind: "part kind", ID: string(kind)}
	}
	return out, nil
}

// ListParts returns every valid part id in declaration order.
func ListParts() PartIDs {
	parts := PartIDs{Body: make([]BodyID, len(Bodies)), Eyes: make([]EyesID, len(Eyes)), Mouth: make([]MouthID, len(Mouths))}
	for i, body := range Bodies {
		parts.Body[i] = body.ID
	}
	for i, eyes := range Eyes {
		parts.Eyes[i] = eyes.ID
	}
	for i, mouth := range Mouths {
		parts.Mouth[i] = mouth.ID
	}
	return parts
}
