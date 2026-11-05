package faceroll

import (
	"crypto/rand"
	"encoding/binary"
	"strconv"
	"strings"
	"unicode/utf16"
)

// RNG returns a number in [0, 1). It mirrors JavaScript's Math.random contract.
type RNG func() float64

// HashSeed turns a string into a 32-bit unsigned seed.
//
// JavaScript's charCodeAt iterates UTF-16 code units, so the hash does the same
// even though Go strings are UTF-8. This keeps seeds with emoji or other
// supplementary characters compatible with the TypeScript library.
func HashSeed(seed string) uint32 {
	h := uint32(0x811c9dc5)
	for _, unit := range utf16.Encode([]rune(seed)) {
		h ^= uint32(unit)
		h *= 0x01000193
	}
	return h
}

// HashSeedNumber converts a numeric seed the way `seed >>> 0` does in
// JavaScript. It is provided for callers migrating numeric seeds.
func HashSeedNumber(seed int64) uint32 { return uint32(seed) }

// SeededRNG returns a deterministic mulberry32 generator. The same seed
// produces the same sequence as the TypeScript implementation.
func SeededRNG(seed string) RNG {
	a := HashSeed(seed)
	return func() float64 {
		a += 0x6d2b79f5
		t := a
		t = (t ^ (t >> 15)) * (t | 1)
		t ^= t + (t^(t>>7))*(t|61)
		return float64(t^(t>>14)) / 4294967296
	}
}

// RandomSeed returns a six-character base36 seed, matching the format generated
// by the TypeScript library.
func RandomSeed() (string, error) {
	var buf [4]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return "", err
	}
	const space = 36 * 36 * 36 * 36 * 36 * 36
	n := uint64(binary.BigEndian.Uint32(buf[:])) % space
	out := strconv.FormatUint(n, 36)
	if len(out) < 6 {
		out = strings.Repeat("0", 6-len(out)) + out
	}
	return out, nil
}

// Pick returns one item using rng. It returns an error for an empty list.
func Pick[T any](items []T, rng RNG) (T, error) {
	var zero T
	if len(items) == 0 {
		return zero, &EmptyListError{}
	}
	return items[int(rng()*float64(len(items)))], nil
}

// EmptyListError reports that a random pick had no candidates.
type EmptyListError struct{}

func (*EmptyListError) Error() string { return "Cannot pick from an empty list" }
