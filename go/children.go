package faceroll

import "fmt"

// ChildOptions controls DeriveChild.
type ChildOptions struct {
	// Seed changes the order of variations, not the parent.
	Seed *string
	// Index is the zero-based slot allocated to a thread.
	Index int
	// Name is an optional custom name; blank uses the automatic name.
	Name *string
}

// ChildrenOptions controls DeriveChildren.
type ChildrenOptions struct {
	Seed *string
	// Count is the number of children, starting at slot zero.
	Count int
}

// CapacityError reports a slot or count outside a family's capacity.
type CapacityError struct {
	Field     string
	Requested int
	Limit     int
}

func (e *CapacityError) Error() string {
	return fmt.Sprintf("%s exceeds child capacity (%d)", e.Field, e.Limit)
}

// ValidationError reports an invalid argument to a library function.
type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string { return e.Message }

// ChildCapacity returns the maximum number of visibly distinct children that
// keep this parent's body.
func ChildCapacity(parent *Character) int {
	parts, _ := childParts(parent, nil)
	return len(parts)
}

// DeriveChild derives a stable thread face from a project parent.
//
// A slot is deterministic and never depends on the number or order of threads.
// Children inherit the body but have their own eyes and/or mouth.
func DeriveChild(parent *Character, options ChildOptions) (*Character, error) {
	if options.Index < 0 {
		return nil, &ValidationError{Message: "index must be a non-negative safe integer"}
	}
	candidates, err := childParts(parent, options.Seed)
	if err != nil {
		return nil, err
	}
	if options.Index >= len(candidates) {
		return nil, &CapacityError{Field: "index", Requested: options.Index, Limit: len(candidates)}
	}
	return New(candidates[options.Index], CreateOptions{Name: options.Name})
}

// DeriveChildren derives the first Count stable thread faces (slots 0 through
// Count-1).
func DeriveChildren(parent *Character, options ChildrenOptions) ([]*Character, error) {
	if options.Count < 0 {
		return nil, &ValidationError{Message: "count must be a non-negative safe integer"}
	}
	candidates, err := childParts(parent, options.Seed)
	if err != nil {
		return nil, err
	}
	if options.Count > len(candidates) {
		return nil, &CapacityError{Field: "count", Requested: options.Count, Limit: len(candidates)}
	}
	out := make([]*Character, options.Count)
	for i := 0; i < options.Count; i++ {
		out[i], err = New(candidates[i], CreateOptions{})
		if err != nil {
			return nil, err
		}
	}
	return out, nil
}

func childParts(parent *Character, seed *string) ([]Parts, error) {
	if parent == nil {
		return nil, fmt.Errorf("faceroll: nil character")
	}
	parts := parent.Parts
	parentStill := parent.Animations[StateIdle].Still

	oneChange := make([]Parts, 0, len(Eyes)+len(Mouths))
	twoChanges := make([]Parts, 0, (len(Eyes)-1)*(len(Mouths)-1))
	for _, eyes := range Eyes {
		if eyes.ID != parts.Eyes {
			candidate := parts
			candidate.Eyes = eyes.ID
			oneChange = append(oneChange, candidate)
		}
	}
	for _, mouth := range Mouths {
		if mouth.ID != parts.Mouth {
			candidate := parts
			candidate.Mouth = mouth.ID
			oneChange = append(oneChange, candidate)
		}
	}
	for _, eyes := range Eyes {
		if eyes.ID == parts.Eyes {
			continue
		}
		for _, mouth := range Mouths {
			if mouth.ID == parts.Mouth {
				continue
			}
			candidate := parts
			candidate.Eyes = eyes.ID
			candidate.Mouth = mouth.ID
			twoChanges = append(twoChanges, candidate)
		}
	}

	familySeed := "default"
	if seed != nil {
		familySeed = *seed
	}
	key := "[" + jsonQuote(string(parts.Body)) + "," + jsonQuote(string(parts.Eyes)) + "," +
		jsonQuote(string(parts.Mouth)) + "," + jsonQuote(familySeed) + "]"
	shuffle(oneChange, SeededRNG("faceroll-child-v1:single:"+key))
	shuffle(twoChanges, SeededRNG("faceroll-child-v1:double:"+key))

	seen := map[string]bool{parentStill: true}
	result := make([]Parts, 0, len(oneChange)+len(twoChanges))
	for _, candidate := range append(oneChange, twoChanges...) {
		character, err := New(candidate, CreateOptions{})
		if err != nil {
			return nil, err
		}
		still := character.Animations[StateIdle].Still
		if seen[still] {
			continue
		}
		seen[still] = true
		result = append(result, candidate)
	}
	return result, nil
}

func shuffle(values []Parts, rng RNG) {
	for i := len(values) - 1; i > 0; i-- {
		j := int(rng() * float64(i+1))
		values[i], values[j] = values[j], values[i]
	}
}
