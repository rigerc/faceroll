package faceroll

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"math"
	"os"
	"strconv"
	"strings"
	"testing"
)

type parityFixtures struct {
	RNG []struct {
		Seed   string    `json:"seed"`
		Hash   uint32    `json:"hash"`
		Values []float64 `json:"values"`
	} `json:"rng"`
	Rolls []struct {
		Seed     string            `json:"seed"`
		Vibe     string            `json:"vibe"`
		Lock     map[string]string `json:"lock"`
		Name     *string           `json:"name"`
		Expected expectedCharacter `json:"expected"`
	} `json:"rolls"`
	Rerolls []struct {
		Base     Parts             `json:"base"`
		Kind     string            `json:"kind"`
		Seed     string            `json:"seed"`
		Expected expectedCharacter `json:"expected"`
	} `json:"rerolls"`
	Names      []string `json:"names"`
	Characters []string `json:"characters"`
	Presets    []struct {
		ID        string `json:"id"`
		Character struct {
			Parts Parts `json:"parts"`
		} `json:"character"`
		JSON string `json:"json"`
	} `json:"presets"`
	Exports []struct {
		Label       string  `json:"label"`
		Parts       Parts   `json:"parts"`
		CustomName  *string `json:"customName"`
		Seed        *string `json:"seed"`
		Name        string  `json:"name"`
		Fingerprint string  `json:"fingerprint"`
		Prompt      string  `json:"prompt"`
		Markdown    string  `json:"markdown"`
		JSON        string  `json:"json"`
		Node        string  `json:"node"`
	} `json:"exports"`
	Children []struct {
		Parts    Parts `json:"parts"`
		Capacity int   `json:"capacity"`
		Seeds    []struct {
			Seed        *string `json:"seed"`
			Fingerprint string  `json:"fingerprint"`
			First       []struct {
				Still string `json:"still"`
				Name  string `json:"name"`
				Parts Parts  `json:"parts"`
			} `json:"first"`
		} `json:"seeds"`
	} `json:"children"`
}

type expectedCharacter struct {
	Parts    Parts    `json:"parts"`
	Name     string   `json:"name"`
	NameMode NameMode `json:"nameMode"`
	Seed     *string  `json:"seed"`
}

func loadFixtures(t *testing.T) parityFixtures {
	t.Helper()
	data, err := os.ReadFile("testdata/parity.json")
	if err != nil {
		t.Fatalf("read fixtures: %v", err)
	}
	var fixtures parityFixtures
	if err := json.Unmarshal(data, &fixtures); err != nil {
		t.Fatalf("parse fixtures: %v", err)
	}
	return fixtures
}

func fingerprint(character *Character) string {
	chunks := []string{
		character.Name,
		string(character.NameMode),
		seedValue(character.Seed),
		string(character.Parts.Body),
		string(character.Parts.Eyes),
		string(character.Parts.Mouth),
	}
	for _, state := range States {
		animation := character.Animations[state.ID]
		chunks = append(chunks, string(state.ID), animation.Still, strconv.Itoa(len(animation.Frames)))
		for _, frame := range animation.Frames {
			chunks = append(chunks, strconv.Itoa(frame.MS), frame.Text)
		}
	}
	sum := sha256.Sum256([]byte(strings.Join(chunks, "\x1f")))
	return hex.EncodeToString(sum[:])
}

func seedValue(seed *string) string {
	if seed == nil {
		return ""
	}
	return *seed
}

func TestRNGParity(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, vector := range fixtures.RNG {
		if got := HashSeed(vector.Seed); got != vector.Hash {
			t.Errorf("HashSeed(%q) = %d, want %d", vector.Seed, got, vector.Hash)
		}
		rng := SeededRNG(vector.Seed)
		for i, want := range vector.Values {
			got := rng()
			if math.Float64bits(got) != math.Float64bits(want) {
				t.Fatalf("SeededRNG(%q)[%d] = %v, want %v", vector.Seed, i, got, want)
			}
		}
	}
}

func TestNameParity(t *testing.T) {
	fixtures := loadFixtures(t)
	index := 0
	for _, body := range Bodies {
		for _, eyes := range Eyes {
			for _, mouth := range Mouths {
				parts := Parts{Body: body.ID, Eyes: eyes.ID, Mouth: mouth.ID}
				got, err := NameForParts(parts)
				if err != nil {
					t.Fatalf("NameForParts(%v): %v", parts, err)
				}
				if got != fixtures.Names[index] {
					t.Fatalf("name for %v = %q, want %q", parts, got, fixtures.Names[index])
				}
				index++
			}
		}
	}
	if index != len(fixtures.Names) {
		t.Fatalf("checked %d names, want %d", index, len(fixtures.Names))
	}
}

func TestCharacterParity(t *testing.T) {
	fixtures := loadFixtures(t)
	index := 0
	for _, body := range Bodies {
		for _, eyes := range Eyes {
			for _, mouth := range Mouths {
				parts := Parts{Body: body.ID, Eyes: eyes.ID, Mouth: mouth.ID}
				character, err := New(parts, CreateOptions{})
				if err != nil {
					t.Fatalf("New(%v): %v", parts, err)
				}
				if got := fingerprint(character); got != fixtures.Characters[index] {
					t.Fatalf("fingerprint for %v = %s, want %s", parts, got, fixtures.Characters[index])
				}
				index++
			}
		}
	}
	if index != len(fixtures.Characters) {
		t.Fatalf("checked %d characters, want %d", index, len(fixtures.Characters))
	}
}

func TestRollParity(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, testCase := range fixtures.Rolls {
		options := RollOptions{Seed: &testCase.Seed, Vibe: Vibe(testCase.Vibe), Name: testCase.Name}
		if body, ok := testCase.Lock["body"]; ok {
			id := BodyID(body)
			options.Lock.Body = &id
		}
		if eyes, ok := testCase.Lock["eyes"]; ok {
			id := EyesID(eyes)
			options.Lock.Eyes = &id
		}
		if mouth, ok := testCase.Lock["mouth"]; ok {
			id := MouthID(mouth)
			options.Lock.Mouth = &id
		}
		character, err := Roll(options)
		if err != nil {
			t.Fatalf("Roll(%s): %v", testCase.Seed, err)
		}
		assertExpected(t, testCase.Seed, character, testCase.Expected)
	}
}

func TestRerollParity(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, testCase := range fixtures.Rerolls {
		base, err := New(testCase.Base, CreateOptions{})
		if err != nil {
			t.Fatalf("New base: %v", err)
		}
		seed := testCase.Seed
		character, err := RerollPart(base, PartKind(testCase.Kind), RerollOptions{Seed: &seed})
		if err != nil {
			t.Fatalf("RerollPart(%s, %s): %v", testCase.Kind, testCase.Seed, err)
		}
		assertExpected(t, testCase.Kind+"/"+testCase.Seed, character, testCase.Expected)
	}
}

func assertExpected(t *testing.T, label string, character *Character, expected expectedCharacter) {
	t.Helper()
	if character.Parts != expected.Parts {
		t.Errorf("%s: parts = %v, want %v", label, character.Parts, expected.Parts)
	}
	if character.Name != expected.Name {
		t.Errorf("%s: name = %q, want %q", label, character.Name, expected.Name)
	}
	if character.NameMode != expected.NameMode {
		t.Errorf("%s: nameMode = %q, want %q", label, character.NameMode, expected.NameMode)
	}
	if seedValue(character.Seed) != seedValue(expected.Seed) {
		t.Errorf("%s: seed = %q, want %q", label, seedValue(character.Seed), seedValue(expected.Seed))
	}
}

func TestPresetParity(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, preset := range fixtures.Presets {
		character, err := CreatePresetCharacter(preset.ID, CreateOptions{})
		if err != nil {
			t.Fatalf("CreatePresetCharacter(%s): %v", preset.ID, err)
		}
		data, err := MarshalSnapshot(character)
		if err != nil {
			t.Fatalf("MarshalSnapshot(%s): %v", preset.ID, err)
		}
		if string(data) != preset.JSON {
			t.Errorf("preset %s snapshot differs:\n got: %s\nwant: %s", preset.ID, data, preset.JSON)
		}
	}
}

func TestExportParity(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, fixture := range fixtures.Exports {
		character, err := New(fixture.Parts, CreateOptions{Name: fixture.CustomName, Seed: fixture.Seed})
		if err != nil {
			t.Fatalf("%s: New: %v", fixture.Label, err)
		}
		if got := fingerprint(character); got != fixture.Fingerprint {
			t.Errorf("%s: fingerprint = %s, want %s", fixture.Label, got, fixture.Fingerprint)
		}
		if character.Name != fixture.Name {
			t.Errorf("%s: name = %q, want %q", fixture.Label, character.Name, fixture.Name)
		}
		if got := ToSystemPrompt(character, PromptOptions{}); got != fixture.Prompt {
			t.Errorf("%s: prompt differs:\n got: %q\nwant: %q", fixture.Label, got, fixture.Prompt)
		}
		if got := ToMarkdown(character); got != fixture.Markdown {
			t.Errorf("%s: markdown differs:\n got: %q\nwant: %q", fixture.Label, got, fixture.Markdown)
		}
		data, err := MarshalSnapshot(character)
		if err != nil {
			t.Fatalf("%s: MarshalSnapshot: %v", fixture.Label, err)
		}
		if string(data) != fixture.JSON {
			t.Errorf("%s: json differs:\n got: %s\nwant: %s", fixture.Label, data, fixture.JSON)
		}
		if got := ToNodeSource(character); got != fixture.Node {
			t.Errorf("%s: node source differs:\n got: %q\nwant: %q", fixture.Label, got, fixture.Node)
		}
	}
}

func TestChildrenParity(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, family := range fixtures.Children {
		parent, err := New(family.Parts, CreateOptions{})
		if err != nil {
			t.Fatalf("New(%v): %v", family.Parts, err)
		}
		if got := ChildCapacity(parent); got != family.Capacity {
			t.Fatalf("capacity for %v = %d, want %d", family.Parts, got, family.Capacity)
		}
		for _, expected := range family.Seeds {
			children, err := DeriveChildren(parent, ChildrenOptions{Seed: expected.Seed, Count: family.Capacity})
			if err != nil {
				t.Fatalf("DeriveChildren(%v): %v", family.Parts, err)
			}
			parts := make([]string, len(children))
			for i, child := range children {
				parts[i] = fingerprint(child)
			}
			sum := sha256.Sum256([]byte(strings.Join(parts, "\x1f")))
			if got := hex.EncodeToString(sum[:]); got != expected.Fingerprint {
				t.Fatalf("children for %v seed %q = %s, want %s", family.Parts, seedValue(expected.Seed), got, expected.Fingerprint)
			}
			for i, first := range expected.First {
				if children[i].Animations[StateIdle].Still != first.Still {
					t.Errorf("child %d still = %q, want %q", i, children[i].Animations[StateIdle].Still, first.Still)
				}
				if children[i].Name != first.Name {
					t.Errorf("child %d name = %q, want %q", i, children[i].Name, first.Name)
				}
				if children[i].Parts != first.Parts {
					t.Errorf("child %d parts = %v, want %v", i, children[i].Parts, first.Parts)
				}
			}
		}
	}
}

func TestSnapshotRoundTrip(t *testing.T) {
	fixtures := loadFixtures(t)
	for _, preset := range fixtures.Presets {
		var snapshot SerializedCharacter
		if err := json.Unmarshal([]byte(preset.JSON), &snapshot); err != nil {
			t.Fatalf("%s: unmarshal: %v", preset.ID, err)
		}
		character, err := Deserialize(snapshot)
		if err != nil {
			t.Fatalf("%s: Deserialize: %v", preset.ID, err)
		}
		if character.Parts != preset.Character.Parts {
			t.Errorf("%s: round trip parts = %v, want %v", preset.ID, character.Parts, preset.Character.Parts)
		}
	}
}

func TestDeadAnimation(t *testing.T) {
	character, err := New(Parts{Body: BodyRound, Eyes: EyesDot, Mouth: MouthW}, CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	dead := character.Animations[StateDead]
	if dead.Still != "(XωX)" {
		t.Fatalf("dead still = %q, want (XωX)", dead.Still)
	}
	if len(dead.Frames) != 1 || dead.Frames[0].Text != dead.Still || dead.Frames[0].MS != 1000 {
		t.Fatalf("dead frames = %+v", dead.Frames)
	}
	if dead.Duration != 1000 {
		t.Fatalf("dead duration = %d, want 1000", dead.Duration)
	}
}

func TestAnimationInvariants(t *testing.T) {
	for _, preset := range FacePresets {
		character, err := CreatePresetCharacter(string(preset.ID), CreateOptions{})
		if err != nil {
			t.Fatal(err)
		}
		for _, state := range States {
			animation := character.Animations[state.ID]
			if animation.Still == "" || len(animation.Frames) == 0 {
				t.Fatalf("%s/%s: empty animation", preset.ID, state.ID)
			}
			total := 0
			for _, frame := range animation.Frames {
				total += frame.MS
				if CellWidth(frame.Text) > animation.Width {
					t.Fatalf("%s/%s: frame wider than animation", preset.ID, state.ID)
				}
			}
			if total != animation.Duration {
				t.Fatalf("%s/%s: duration = %d, want %d", preset.ID, state.ID, animation.Duration, total)
			}
			if animation.Width < CellWidth(animation.Still) {
				t.Fatalf("%s/%s: still wider than animation", preset.ID, state.ID)
			}
		}
	}
}
