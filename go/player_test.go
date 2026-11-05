package faceroll

import (
	"bytes"
	"strings"
	"testing"
	"time"
)

func TestCellWidth(t *testing.T) {
	cases := map[string]int{
		"":          0,
		"(•ω•)":     5,
		"（•ω•）":     7,
		"a\u0301":   1,
		"\x1b[K":    2,
		"ʕ•ᴥ•ʔ":     5,
		"日本語":       6,
		"ʕ•ᴥ•ʔ ...": 9,
	}
	for input, want := range cases {
		if got := CellWidth(input); got != want {
			t.Errorf("CellWidth(%q) = %d, want %d", input, got, want)
		}
	}
}

func TestFrameIndexAt(t *testing.T) {
	animation := Animation{
		Frames:   []Frame{{Text: "a", MS: 100}, {Text: "b", MS: 50}},
		Duration: 150,
	}
	cases := map[int]int{
		0: 0, 99: 0, 100: 1, 149: 1, 150: 0, 299: 1, -1: 1, -150: 0, -151: 1,
	}
	for elapsed, want := range cases {
		if got := FrameIndexAt(animation, elapsed); got != want {
			t.Errorf("FrameIndexAt(%d) = %d, want %d", elapsed, got, want)
		}
	}
	if got := FrameAt(animation, 100).Text; got != "b" {
		t.Errorf("FrameAt(100) = %q, want b", got)
	}
	if got := FrameIndexAt(Animation{}, 10); got != 0 {
		t.Errorf("empty animation index = %d, want 0", got)
	}
}

func TestPlayerRunsFirstFrame(t *testing.T) {
	frames := make(chan Frame, 4)
	advance := make(chan time.Time)
	player := NewPlayer(func(frame Frame, _ int, _ Animation) {
		frames <- frame
	}, PlayerOptions{After: func(int) <-chan time.Time { return advance }})

	animation := Animation{
		Name:     StateIdle,
		Frames:   []Frame{{Text: "first", MS: 10}, {Text: "second", MS: 10}},
		Duration: 20,
	}
	player.Play(animation)
	if !player.Playing() {
		t.Fatal("player should be playing")
	}
	select {
	case frame := <-frames:
		if frame.Text != "first" {
			t.Fatalf("first frame = %q", frame.Text)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for first frame")
	}
	player.Stop()
	if player.Playing() {
		t.Fatal("player should be stopped")
	}
	if player.Current() != nil {
		t.Fatal("current should be nil after stop")
	}
}

func TestPlayerSingleFrameSchedulesNoTimer(t *testing.T) {
	frames := make(chan Frame, 4)
	scheduled := make(chan struct{}, 4)
	player := NewPlayer(func(frame Frame, _ int, _ Animation) {
		frames <- frame
	}, PlayerOptions{After: func(int) <-chan time.Time {
		scheduled <- struct{}{}
		return make(chan time.Time)
	}})

	player.Play(Animation{
		Name:     StateDead,
		Frames:   []Frame{{Text: "(XωX)", MS: 1000}},
		Duration: 1000,
	})
	defer player.Stop()

	select {
	case frame := <-frames:
		if frame.Text != "(XωX)" {
			t.Fatalf("first frame = %q", frame.Text)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for the dead frame")
	}

	select {
	case <-scheduled:
		t.Fatal("single-frame animation must not schedule a timer")
	case <-time.After(100 * time.Millisecond):
	}
	select {
	case <-frames:
		t.Fatal("single-frame animation must render only once")
	default:
	}
	if !player.Playing() {
		t.Fatal("player should stay active until stopped")
	}
}

func TestTerminalPlayerNonTTY(t *testing.T) {
	var out bytes.Buffer
	falseValue := false
	player := NewTerminalPlayer(TerminalOptions{
		Stream: &out,
		IsTTY:  &falseValue,
		Prefix: "pixel ",
		Suffix: " thinking",
	})
	character, err := New(Parts{Body: BodyRound, Eyes: EyesDot, Mouth: MouthW}, CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	player.Play(character.Animations[StateIdle])
	player.Stop(false)
	want := "pixel " + character.Animations[StateIdle].Still + " thinking\n"
	if out.String() != want {
		t.Fatalf("output = %q, want %q", out.String(), want)
	}
}

func TestTerminalPlayerTTYStop(t *testing.T) {
	var out bytes.Buffer
	trueValue := true
	player := NewTerminalPlayer(TerminalOptions{Stream: &out, IsTTY: &trueValue, HideCursor: &trueValue})
	character, err := New(Parts{Body: BodyRound, Eyes: EyesDot, Mouth: MouthW}, CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	player.Play(character.Animations[StateIdle])
	player.Stop(false)
	output := out.String()
	for _, want := range []string{hideCursor, showCursor, "\n"} {
		if !strings.Contains(output, want) {
			t.Fatalf("output %q missing %q", output, want)
		}
	}
}

func TestPlayInTerminal(t *testing.T) {
	var out bytes.Buffer
	falseValue := false
	character, err := New(Parts{Body: BodyRound, Eyes: EyesDot, Mouth: MouthW}, CreateOptions{})
	if err != nil {
		t.Fatal(err)
	}
	stop := PlayInTerminal(character.Animations[StateIdle], TerminalOptions{Stream: &out, IsTTY: &falseValue})
	stop(false)
	if !strings.Contains(out.String(), character.Animations[StateIdle].Still) {
		t.Fatalf("unexpected output: %q", out.String())
	}
}
