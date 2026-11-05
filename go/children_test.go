package faceroll

import (
	"errors"
	"testing"
)

func TestChildLimits(t *testing.T) {
	parent, err := CreatePresetCharacter("kitty", CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	capacity := ChildCapacity(parent)
	if capacity <= 0 {
		t.Fatalf("capacity = %d", capacity)
	}

	if _, err := DeriveChild(parent, ChildOptions{Index: capacity}); err == nil {
		t.Fatal("expected an out-of-capacity error")
	} else {
		var capacityError *CapacityError
		if !errors.As(err, &capacityError) {
			t.Fatalf("error = %T, want *CapacityError", err)
		}
	}
	if _, err := DeriveChild(parent, ChildOptions{Index: -1}); err == nil {
		t.Fatal("expected a validation error")
	} else {
		var validationError *ValidationError
		if !errors.As(err, &validationError) {
			t.Fatalf("error = %T, want *ValidationError", err)
		}
	}
	if _, err := DeriveChildren(parent, ChildrenOptions{Count: capacity + 1}); err == nil {
		t.Fatal("expected an out-of-capacity error")
	}
	if _, err := DeriveChildren(parent, ChildrenOptions{Count: -1}); err == nil {
		t.Fatal("expected a validation error")
	}

	all, err := DeriveChildren(parent, ChildrenOptions{Count: capacity})
	if err != nil {
		t.Fatal(err)
	}
	slot, err := DeriveChild(parent, ChildOptions{Index: capacity - 1})
	if err != nil {
		t.Fatal(err)
	}
	if fingerprint(slot) != fingerprint(all[capacity-1]) {
		t.Fatal("a slot must match the corresponding child in a full family")
	}

	seeded, err := DeriveChildren(parent, ChildrenOptions{Seed: stringPtr("family"), Count: 5})
	if err != nil {
		t.Fatal(err)
	}
	single, err := DeriveChild(parent, ChildOptions{Seed: stringPtr("family"), Index: 0})
	if err != nil {
		t.Fatal(err)
	}
	if fingerprint(seeded[0]) != fingerprint(single) {
		t.Fatal("the first child must be stable with a family seed")
	}
}

func TestChildCapacityBear(t *testing.T) {
	parent, err := New(Parts{Body: BodyBear, Eyes: EyesDot, Mouth: MouthW}, CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	if capacity := ChildCapacity(parent); capacity != 15 {
		t.Fatalf("bear capacity = %d, want 15", capacity)
	}
}

func stringPtr(value string) *string { return &value }
