package cli_test

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"

	"github.com/rigerc/faceroll/go/internal/cli"
)

func run(args ...string) (int, string, string) {
	var stdout, stderr bytes.Buffer
	code := cli.Run(args, &stdout, &stderr)
	return code, stdout.String(), stderr.String()
}

func TestRollText(t *testing.T) {
	code, stdout, stderr := run("roll", "--seed", "pixel")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	if !strings.Contains(stdout, "Amber  (seed pixel, square / cat / heart)") {
		t.Fatalf("unexpected header:\n%s", stdout)
	}
	if got := strings.Count(stdout, "\n"); got != 12 {
		t.Fatalf("got %d lines, want 12:\n%s", got, stdout)
	}
}

func TestRollFormats(t *testing.T) {
	for _, format := range []string{"prompt", "markdown", "json", "node"} {
		code, stdout, stderr := run("roll", "--seed", "pixel", "--format", format)
		if code != 0 {
			t.Fatalf("%s: exit %d, stderr: %s", format, code, stderr)
		}
		if stdout == "" {
			t.Fatalf("%s: empty output", format)
		}
	}
}

func TestRollJSONShape(t *testing.T) {
	code, stdout, stderr := run("roll", "--seed", "pixel", "--format", "json")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	var snapshot struct {
		Name     string `json:"name"`
		NameMode string `json:"nameMode"`
		Seed     string `json:"seed"`
		Parts    struct {
			Body  string `json:"body"`
			Eyes  string `json:"eyes"`
			Mouth string `json:"mouth"`
		} `json:"parts"`
	}
	if err := json.Unmarshal([]byte(stdout), &snapshot); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if snapshot.Name != "Amber" || snapshot.Seed != "pixel" {
		t.Fatalf("unexpected snapshot: %+v", snapshot)
	}
	if snapshot.Parts.Body != "square" || snapshot.Parts.Eyes != "cat" || snapshot.Parts.Mouth != "heart" {
		t.Fatalf("unexpected parts: %+v", snapshot.Parts)
	}
}

func TestPresetTextOmitsUndefinedSeed(t *testing.T) {
	code, stdout, stderr := run("roll", "--preset", "kitty")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	if strings.Contains(stdout, "undefined") {
		t.Fatalf("preset output leaked undefined:\n%s", stdout)
	}
	if strings.Contains(stdout, "seed ") {
		t.Fatalf("preset output should not contain a seed:\n%s", stdout)
	}
	if !strings.Contains(stdout, "cat / cat / cat") {
		t.Fatalf("unexpected preset parts:\n%s", stdout)
	}
}

func TestUnknownFlagIsRejected(t *testing.T) {
	code, stdout, stderr := run("roll", "--nmae", "Pixel")
	if code != 2 {
		t.Fatalf("exit %d, want 2", code)
	}
	if stdout != "" {
		t.Fatalf("unexpected stdout: %s", stdout)
	}
	if !strings.Contains(stderr, "faceroll: unknown flag --nmae") {
		t.Fatalf("unexpected stderr: %s", stderr)
	}
	if !strings.Contains(stderr, "Usage") {
		t.Fatalf("usage text missing: %s", stderr)
	}
}

func TestStrictNumericFlags(t *testing.T) {
	for _, args := range [][]string{
		{"play", "idle", "--duration", "1e3"},
		{"play", "idle", "--duration", "3.5"},
		{"children", "--count", "2.5"},
		{"children", "--index", "-1"},
	} {
		code, _, stderr := run(args...)
		if code != 2 {
			t.Errorf("%v: exit %d, want 2", args, code)
		}
		if !strings.Contains(stderr, "must be a non-negative integer") {
			t.Errorf("%v: unexpected stderr: %s", args, stderr)
		}
	}
}

func TestUsageErrors(t *testing.T) {
	cases := []struct {
		args    []string
		message string
	}{
		{[]string{"roll", "--vibe", "nope"}, `Unknown vibe "nope"`},
		{[]string{"roll", "--body", "nope"}, `Unknown body "nope"`},
		{[]string{"play", "nope"}, `Unknown state "nope"`},
		{[]string{"children", "--count", "2", "--index", "0"}, "Use either --index or --count"},
		{[]string{"children", "--format", "prompt"}, "Children support --format text or json"},
		{[]string{"roll", "--format", "nope"}, `Unknown format "nope"`},
		{[]string{"nope"}, `Unknown command "nope"`},
		{[]string{"roll", "--seed"}, "Missing value for --seed"},
		{[]string{"states", "--seed", "x"}, "unknown flag --seed"},
	}
	for _, testCase := range cases {
		code, _, stderr := run(testCase.args...)
		if code != 2 {
			t.Errorf("%v: exit %d, want 2", testCase.args, code)
		}
		if !strings.Contains(stderr, testCase.message) {
			t.Errorf("%v: stderr %q missing %q", testCase.args, stderr, testCase.message)
		}
	}
}

func TestHelp(t *testing.T) {
	for _, args := range [][]string{{}, {"--help"}, {"roll", "--help"}, {"nope", "--help"}} {
		code, stdout, stderr := run(args...)
		if code != 0 {
			t.Fatalf("%v: exit %d", args, code)
		}
		if !strings.Contains(stdout, "Usage") || stderr != "" {
			t.Fatalf("%v: unexpected output %q / %q", args, stdout, stderr)
		}
	}
}

func TestListingCommands(t *testing.T) {
	code, stdout, _ := run("states")
	if code != 0 || strings.Count(stdout, "\n") != 10 || !strings.Contains(stdout, "Idle") || !strings.Contains(stdout, "Dead") {
		t.Fatalf("states output:\n%s", stdout)
	}
	code, stdout, _ = run("parts")
	if code != 0 || strings.Count(stdout, "\n") != 3 || !strings.HasPrefix(stdout, "body  ") {
		t.Fatalf("parts output:\n%s", stdout)
	}
	code, stdout, _ = run("presets")
	if code != 0 || strings.Count(stdout, "\n") != 24 || !strings.Contains(stdout, "kitty") {
		t.Fatalf("presets output:\n%s", stdout)
	}
}

func TestChildrenText(t *testing.T) {
	code, stdout, stderr := run("children", "--preset", "kitty", "--seed", "family", "--count", "3")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	lines := strings.Split(strings.TrimSuffix(stdout, "\n"), "\n")
	if len(lines) != 4 || !strings.HasPrefix(lines[0], "Parent  ") || !strings.HasPrefix(lines[1], "Thread 0  ") {
		t.Fatalf("unexpected output:\n%s", stdout)
	}
}

func TestChildrenJSON(t *testing.T) {
	code, stdout, stderr := run("children", "--seed", "family", "--count", "3", "--format", "json")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	var output struct {
		Parent   json.RawMessage `json:"parent"`
		Children []struct {
			Index int `json:"index"`
		} `json:"children"`
	}
	if err := json.Unmarshal([]byte(stdout), &output); err != nil {
		t.Fatalf("invalid JSON: %v", err)
	}
	if len(output.Children) != 3 || output.Children[2].Index != 2 {
		t.Fatalf("unexpected children: %+v", output.Children)
	}
}

func TestPlayNonTTY(t *testing.T) {
	code, stdout, stderr := run("play", "idle", "--seed", "pixel", "--duration", "0")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	if !strings.Contains(stdout, "Amber is idle") {
		t.Fatalf("unexpected output: %q", stdout)
	}
	if strings.Count(stdout, "\n") != 1 {
		t.Fatalf("non-TTY play should print one line: %q", stdout)
	}
}

func TestJSONDoesNotEscapeHTML(t *testing.T) {
	code, stdout, stderr := run("roll", "--preset", "kitty", "--name", "<A&B>", "--format", "json")
	if code != 0 {
		t.Fatalf("exit %d, stderr: %s", code, stderr)
	}
	if !strings.Contains(stdout, `"<A&B>"`) {
		t.Fatalf("HTML escaping mismatch:\n%s", stdout)
	}
}
