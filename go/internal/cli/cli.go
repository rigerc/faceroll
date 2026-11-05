// Package cli implements the faceroll command line interface.
package cli

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	faceroll "github.com/rigerc/faceroll/go"
)

const helpText = `faceroll: random animated ASCII faces for AI agents

Usage
  faceroll roll [options]            Print a rolled character
  faceroll play <state> [options]    Animate one state in the terminal
  faceroll children [options]        Derive thread faces from one parent
  faceroll states                    List the states and emotions
  faceroll parts                     List body, eyes and mouth ids
  faceroll presets                   Browse 24 named faces

Options
  --seed <text>      Same seed, same character
  --preset <id>      Choose a named face (see "faceroll presets")
  --vibe <any|cute|cool|weird>
  --name <text>      Custom name (default: automatic face name)
  --body <id>        Lock the body
  --eyes <id>        Lock the eyes
  --mouth <id>       Lock the mouth
  --format <format>  roll: text|prompt|markdown|json|node (default text)
                     children: text|json (default text)
  --duration <ms>    play only (default 4000)
  --count <n>        children only: how many slots (default 5)
  --index <n>        children only: one stable zero-based slot
  -h, --help
`

type usageError struct{ message string }

func (e usageError) Error() string { return e.message }

// Run executes the CLI and returns a process exit code. Usage errors exit 2;
// runtime errors exit 1.
func Run(args []string, stdout, stderr io.Writer) int {
	flags, positional, err := parseArgs(args)
	if err != nil {
		return writeUsage(stderr, err.Error())
	}
	if _, ok := flags["help"]; ok || len(positional) == 0 {
		_, _ = io.WriteString(stdout, helpText)
		return 0
	}

	command := positional[0]
	switch command {
	case "roll", "play", "children", "states", "parts", "presets":
	default:
		return writeUsage(stderr, fmt.Sprintf("Unknown command %q", command))
	}
	if err := validateFlags(command, flags); err != nil {
		return writeUsage(stderr, err.Error())
	}

	var err2 error
	switch command {
	case "roll":
		err2 = runRoll(flags, stdout)
	case "children":
		err2 = runChildren(flags, positional[1:], stdout)
	case "play":
		err2 = runPlay(flags, positional[1:], stdout)
	case "states":
		runStates(stdout)
	case "parts":
		runParts(stdout)
	case "presets":
		err2 = runPresets(stdout)
	}
	if err2 == nil {
		return 0
	}
	if message, ok := asUsage(err2); ok {
		return writeUsage(stderr, message)
	}
	_, _ = fmt.Fprintf(stderr, "faceroll: %s\n", err2)
	return 1
}

func parseArgs(args []string) (map[string]string, []string, error) {
	flags := make(map[string]string)
	positional := make([]string, 0, len(args))
	endOfFlags := false
	for i := 0; i < len(args); i++ {
		arg := args[i]
		if endOfFlags {
			positional = append(positional, arg)
			continue
		}
		if arg == "--" {
			endOfFlags = true
			continue
		}
		if arg == "-h" {
			flags["help"] = "true"
			continue
		}
		if strings.HasPrefix(arg, "--") {
			body := arg[2:]
			if body == "" {
				return nil, nil, usageError{"unknown flag --"}
			}
			key := body
			value := ""
			hasValue := false
			if eq := strings.IndexByte(body, '='); eq >= 0 {
				key = body[:eq]
				value = body[eq+1:]
				hasValue = true
			}
			if key == "" {
				return nil, nil, usageError{"unknown flag --"}
			}
			if key == "help" {
				flags["help"] = "true"
				continue
			}
			if !hasValue {
				if i+1 >= len(args) {
					return nil, nil, usageError{fmt.Sprintf("Missing value for --%s", key)}
				}
				i++
				value = args[i]
			}
			flags[key] = value
			continue
		}
		if strings.HasPrefix(arg, "-") && arg != "-" {
			return nil, nil, usageError{fmt.Sprintf("unknown flag %q", arg)}
		}
		positional = append(positional, arg)
	}
	return flags, positional, nil
}

var allowedFlags = map[string]map[string]bool{
	"roll": {
		"seed": true, "preset": true, "vibe": true, "name": true,
		"body": true, "eyes": true, "mouth": true, "format": true,
	},
	"play": {
		"seed": true, "preset": true, "vibe": true, "name": true,
		"body": true, "eyes": true, "mouth": true, "duration": true,
	},
	"children": {
		"seed": true, "preset": true, "vibe": true, "name": true,
		"body": true, "eyes": true, "mouth": true, "format": true,
		"count": true, "index": true,
	},
	"states":  {},
	"parts":   {},
	"presets": {},
}

func validateFlags(command string, flags map[string]string) error {
	allowed := allowedFlags[command]
	for key := range flags {
		if key == "help" {
			continue
		}
		if !allowed[key] {
			return usageError{fmt.Sprintf("unknown flag --%s", key)}
		}
	}
	return nil
}

func writeUsage(stderr io.Writer, message string) int {
	_, _ = fmt.Fprintf(stderr, "faceroll: %s\n\n%s", message, helpText)
	return 2
}

func asUsage(err error) (string, bool) {
	var unknown *faceroll.UnknownIDError
	if errors.As(err, &unknown) {
		return unknown.Error(), true
	}
	var capacity *faceroll.CapacityError
	if errors.As(err, &capacity) {
		return capacity.Error(), true
	}
	var empty *faceroll.EmptyListError
	if errors.As(err, &empty) {
		return empty.Error(), true
	}
	var validation *faceroll.ValidationError
	if errors.As(err, &validation) {
		return validation.Error(), true
	}
	var usage usageError
	if errors.As(err, &usage) {
		return usage.Error(), true
	}
	return "", false
}

func runRoll(flags map[string]string, stdout io.Writer) error {
	format := flags["format"]
	if format == "" {
		format = "text"
	}
	switch format {
	case "text", "prompt", "markdown", "json", "node":
	default:
		return usageError{fmt.Sprintf("Unknown format %q. Use one of: text, prompt, markdown, json, node", format)}
	}
	character, err := rollFromFlags(flags)
	if err != nil {
		return err
	}
	var out string
	switch format {
	case "prompt":
		out = faceroll.ToSystemPrompt(character, faceroll.PromptOptions{})
	case "markdown":
		out = faceroll.ToMarkdown(character)
	case "json":
		data, err := faceroll.MarshalSnapshot(character)
		if err != nil {
			return err
		}
		out = string(data)
	case "node":
		out = faceroll.ToNodeSource(character)
	default:
		out = describe(character)
	}
	_, err = io.WriteString(stdout, out+"\n")
	return err
}

func rollFromFlags(flags map[string]string) (*faceroll.Character, error) {
	vibe := faceroll.Vibe(flags["vibe"])
	if vibe == "" {
		vibe = faceroll.VibeAny
	}
	if !faceroll.ValidVibe(vibe) {
		return nil, &faceroll.UnknownIDError{
			Kind:    "vibe",
			ID:      string(vibe),
			Allowed: []string{"any", "cute", "cool", "weird"},
		}
	}

	var lock faceroll.PartLocks
	if value, ok := flags["body"]; ok {
		id := faceroll.BodyID(value)
		lock.Body = &id
	}
	if value, ok := flags["eyes"]; ok {
		id := faceroll.EyesID(value)
		lock.Eyes = &id
	}
	if value, ok := flags["mouth"]; ok {
		id := faceroll.MouthID(value)
		lock.Mouth = &id
	}
	var name *string
	if value, ok := flags["name"]; ok {
		name = &value
	}
	if presetID, ok := flags["preset"]; ok {
		preset, err := faceroll.GetFacePreset(presetID)
		if err != nil {
			return nil, err
		}
		parts := preset.Parts
		if lock.Body != nil {
			parts.Body = *lock.Body
		}
		if lock.Eyes != nil {
			parts.Eyes = *lock.Eyes
		}
		if lock.Mouth != nil {
			parts.Mouth = *lock.Mouth
		}
		// Presets choose fixed parts, so a seed is not stored on the character.
		// It still controls child ordering in the children command.
		return faceroll.New(parts, faceroll.CreateOptions{Name: name})
	}
	var seed *string
	if value, ok := flags["seed"]; ok {
		seed = &value
	}
	return faceroll.Roll(faceroll.RollOptions{
		Seed: seed,
		Vibe: vibe,
		Lock: lock,
		Name: name,
	})
}

func describe(character *faceroll.Character) string {
	width := 0
	for _, state := range faceroll.States {
		if len(state.Label) > width {
			width = len(state.Label)
		}
	}
	rows := make([]string, len(faceroll.States))
	for i, state := range faceroll.States {
		rows[i] = fmt.Sprintf("%-*s  %s", width, state.Label, character.Animations[state.ID].Still)
	}
	header := character.Name + "  ("
	if character.Seed != nil {
		header += "seed " + *character.Seed + ", "
	}
	header += string(character.Parts.Body) + " / " + string(character.Parts.Eyes) + " / " + string(character.Parts.Mouth) + ")"
	return header + "\n\n" + strings.Join(rows, "\n")
}

func runChildren(flags map[string]string, _ []string, stdout io.Writer) error {
	format := flags["format"]
	if format == "" {
		format = "text"
	}
	if format != "text" && format != "json" {
		return usageError{"Children support --format text or json"}
	}
	_, hasIndex := flags["index"]
	_, hasCount := flags["count"]
	if hasIndex && hasCount {
		return usageError{"Use either --index or --count, not both"}
	}

	var index int
	var err error
	if hasIndex {
		index, err = parseNonNegativeInt("--index", flags["index"])
		if err != nil {
			return err
		}
	}
	count := 5
	if hasCount {
		count, err = parseNonNegativeInt("--count", flags["count"])
		if err != nil {
			return err
		}
	}

	parent, err := rollFromFlags(flags)
	if err != nil {
		return err
	}
	seed := parent.Seed
	if value, ok := flags["seed"]; ok {
		seed = &value
	}

	if hasIndex {
		child, err := faceroll.DeriveChild(parent, faceroll.ChildOptions{Seed: seed, Index: index})
		if err != nil {
			return err
		}
		if format == "json" {
			return writeChildrenJSON(stdout, parent, []int{index}, []*faceroll.Character{child})
		}
		_, err = fmt.Fprintf(stdout, "Parent  %s  %s\nThread %d  %s  %s\n",
			parent.Animations[faceroll.StateIdle].Still, parent.Name,
			index, child.Animations[faceroll.StateIdle].Still, child.Name)
		return err
	}

	children, err := faceroll.DeriveChildren(parent, faceroll.ChildrenOptions{Seed: seed, Count: count})
	if err != nil {
		return err
	}
	if format == "json" {
		indices := make([]int, len(children))
		for i := range children {
			indices[i] = i
		}
		return writeChildrenJSON(stdout, parent, indices, children)
	}
	lines := []string{fmt.Sprintf("Parent  %s  %s", parent.Animations[faceroll.StateIdle].Still, parent.Name)}
	for i, child := range children {
		lines = append(lines, fmt.Sprintf("Thread %d  %s  %s", i, child.Animations[faceroll.StateIdle].Still, child.Name))
	}
	_, err = io.WriteString(stdout, strings.Join(lines, "\n")+"\n")
	return err
}

type childEntry struct {
	Index     int             `json:"index"`
	Character json.RawMessage `json:"character"`
}

type childrenOutput struct {
	Parent   json.RawMessage `json:"parent"`
	Children []childEntry    `json:"children"`
}

func writeChildrenJSON(stdout io.Writer, parent *faceroll.Character, indices []int, children []*faceroll.Character) error {
	parentJSON, err := faceroll.MarshalSnapshot(parent)
	if err != nil {
		return err
	}
	out := childrenOutput{Parent: parentJSON, Children: make([]childEntry, len(children))}
	for i, child := range children {
		data, err := faceroll.MarshalSnapshot(child)
		if err != nil {
			return err
		}
		out.Children[i] = childEntry{Index: indices[i], Character: data}
	}
	return writeJSON(stdout, out)
}

func writeJSON(writer io.Writer, value any) error {
	encoder := json.NewEncoder(writer)
	encoder.SetEscapeHTML(false)
	encoder.SetIndent("", "  ")
	return encoder.Encode(value)
}

func runPlay(flags map[string]string, positional []string, stdout io.Writer) error {
	if len(positional) == 0 {
		names := make([]string, len(faceroll.States))
		for i, state := range faceroll.States {
			names[i] = string(state.ID)
		}
		return usageError{"Pick a state: " + strings.Join(names, ", ")}
	}
	state, err := faceroll.GetState(positional[0])
	if err != nil {
		return err
	}
	duration := 4000
	if value, ok := flags["duration"]; ok {
		duration, err = parseNonNegativeInt("--duration", value)
		if err != nil {
			return err
		}
	}
	character, err := rollFromFlags(flags)
	if err != nil {
		return err
	}
	suffix := "  " + character.Name + " is " + strings.ToLower(state.Label)
	player := faceroll.NewTerminalPlayer(faceroll.TerminalOptions{Stream: stdout, Suffix: suffix})
	player.Play(character.Animations[state.ID])
	time.Sleep(time.Duration(duration) * time.Millisecond)
	player.Stop(false)
	return nil
}

func runStates(stdout io.Writer) {
	for _, state := range faceroll.States {
		_, _ = fmt.Fprintf(stdout, "%-12s %-8s %s\n", state.Label, state.Kind, state.Use)
	}
}

func runParts(stdout io.Writer) {
	parts := faceroll.ListParts()
	rows := []struct {
		kind string
		ids  []string
	}{
		{"body", enumStrings(parts.Body)},
		{"eyes", enumStrings(parts.Eyes)},
		{"mouth", enumStrings(parts.Mouth)},
	}
	for _, row := range rows {
		_, _ = fmt.Fprintf(stdout, "%-6s %s\n", row.kind, strings.Join(row.ids, ", "))
	}
}

func runPresets(stdout io.Writer) error {
	for _, preset := range faceroll.FacePresets {
		character, err := faceroll.CreatePresetCharacter(string(preset.ID), faceroll.CreateOptions{})
		if err != nil {
			return err
		}
		still := character.Animations[faceroll.StateIdle].Still
		_, _ = fmt.Fprintf(stdout, "%-11s %-6s %-16s %s\n", preset.ID, preset.Vibe, still, preset.Label)
	}
	return nil
}

func enumStrings[T ~string](values []T) []string {
	out := make([]string, len(values))
	for i, value := range values {
		out[i] = string(value)
	}
	return out
}

func parseNonNegativeInt(name, value string) (int, error) {
	if value == "" {
		return 0, usageError{name + " must be a non-negative integer"}
	}
	for _, r := range value {
		if r < '0' || r > '9' {
			return 0, usageError{name + " must be a non-negative integer"}
		}
	}
	n, err := strconv.Atoi(value)
	if err != nil || n < 0 {
		return 0, usageError{name + " must be a non-negative integer"}
	}
	return n, nil
}
