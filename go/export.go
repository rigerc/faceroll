package faceroll

import (
	"fmt"
	"strings"
)

// PromptOptions controls ToSystemPrompt.
type PromptOptions struct {
	// States limits the prompt to these states. Nil includes all states; an
	// empty non-nil slice includes none.
	States []StateName
}

// SerializedAnimation is the data persisted for one state.
type SerializedAnimation struct {
	Still  string
	Frames [][2]any
}

// SerializedCharacter is plain data that survives a JSON round trip.
type SerializedCharacter struct {
	Name       string
	NameMode   NameMode
	Seed       *string
	Parts      Parts
	Animations map[StateName]SerializedAnimation
}

// Serialize converts a character to a persistence snapshot. Frames are
// [text, ms] pairs.
func Serialize(character *Character) SerializedCharacter {
	animations := make(map[StateName]SerializedAnimation, len(States))
	if character != nil {
		for _, state := range States {
			animation := character.Animations[state.ID]
			frames := make([][2]any, len(animation.Frames))
			for i, frame := range animation.Frames {
				frames[i] = [2]any{frame.Text, frame.MS}
			}
			animations[state.ID] = SerializedAnimation{Still: animation.Still, Frames: frames}
		}
	}
	snapshot := SerializedCharacter{
		NameMode:   NameAuto,
		Parts:      Parts{},
		Animations: animations,
	}
	if character != nil {
		snapshot.Name = character.Name
		snapshot.NameMode = character.NameMode
		snapshot.Seed = character.Seed
		snapshot.Parts = character.Parts
	}
	return snapshot
}

// MarshalJSON renders a snapshot like JSON.stringify(value, null, 2).
func (s SerializedCharacter) MarshalJSON() ([]byte, error) {
	return []byte(prettyJSON(s.jsonValue())), nil
}

func (s SerializedCharacter) jsonValue() jsonValue {
	fields := jsonObject{
		{Key: "name", Value: jsonString(s.Name)},
		{Key: "nameMode", Value: jsonString(string(s.NameMode))},
	}
	if s.Seed != nil {
		fields = append(fields, jsonField{Key: "seed", Value: jsonString(*s.Seed)})
	}
	fields = append(fields,
		jsonField{Key: "parts", Value: jsonObject{
			{Key: "body", Value: jsonString(string(s.Parts.Body))},
			{Key: "eyes", Value: jsonString(string(s.Parts.Eyes))},
			{Key: "mouth", Value: jsonString(string(s.Parts.Mouth))},
		}},
		jsonField{Key: "animations", Value: animationsJSON(s.Animations)},
	)
	return fields
}

// MarshalSnapshot returns the canonical pretty-printed snapshot JSON.
func MarshalSnapshot(character *Character) ([]byte, error) {
	if character == nil {
		return nil, fmt.Errorf("faceroll: nil character")
	}
	return []byte(prettyJSON(Serialize(character).jsonValue())), nil
}

// Deserialize rebuilds a character from a snapshot. Animations are regenerated
// from the parts.
func Deserialize(data SerializedCharacter) (*Character, error) {
	return New(data.Parts, CreateOptions{Name: &data.Name, NameMode: data.NameMode, Seed: data.Seed})
}

func animationsJSON(animations map[StateName]SerializedAnimation) jsonValue {
	object := jsonObject{}
	for _, state := range States {
		animation, ok := animations[state.ID]
		if !ok {
			continue
		}
		frames := make(jsonArray, len(animation.Frames))
		for i, frame := range animation.Frames {
			frames[i] = jsonArray{jsonString(frameText(frame[0])), jsonFrameMS(frame[1])}
		}
		object = append(object, jsonField{
			Key: string(state.ID),
			Value: jsonObject{
				{Key: "still", Value: jsonString(animation.Still)},
				{Key: "frames", Value: frames},
			},
		})
	}
	return object
}

// ToSystemPrompt returns a prompt snippet that tells an agent which face to
// show when.
func ToSystemPrompt(character *Character, options PromptOptions) string {
	wanted := map[StateName]bool(nil)
	if options.States != nil {
		wanted = make(map[StateName]bool, len(options.States))
		for _, state := range options.States {
			wanted[state] = true
		}
	}
	line := func(state StateInfo) string {
		return "- " + state.Label + " (" + state.Use + "): " + character.Animations[state.ID].Still
	}
	var states, emotions []StateInfo
	for _, state := range States {
		if wanted != nil && !wanted[state.ID] {
			continue
		}
		if state.Kind == KindState {
			states = append(states, state)
		} else {
			emotions = append(emotions, state)
		}
	}
	var sections []string
	if len(states) > 0 {
		lines := make([]string, len(states))
		for i, state := range states {
			lines[i] = line(state)
		}
		sections = append(sections, "States\n"+strings.Join(lines, "\n"))
	}
	if len(emotions) > 0 {
		lines := make([]string, len(emotions))
		for i, state := range emotions {
			lines[i] = line(state)
		}
		sections = append(sections, "Emotions\n"+strings.Join(lines, "\n"))
	}
	return "You are " + character.Name + ". Show your state with one of these ASCII faces. " +
		"Use at most one per message, at the start or the end, and only when the situation matches.\n\n" +
		strings.Join(sections, "\n\n") +
		"\n\nNever put a face inside code, file contents, or commit messages."
}

// ToMarkdown returns a Markdown table of states, faces and when to use them.
func ToMarkdown(character *Character) string {
	rows := make([]string, len(States))
	for i, state := range States {
		rows[i] = "| " + state.Label + " | `" + character.Animations[state.ID].Still + "` | " + state.Use + " |"
	}
	return "### " + character.Name + "\n\n| State | Face | Use when |\n|---|---|---|\n" + strings.Join(rows, "\n")
}

// ToNodeSource returns standalone Node.js source for the character's
// animations. The generated source is dependency-free and uses [face, ms]
// tuples.
func ToNodeSource(character *Character) string {
	animations := make(map[StateName]SerializedAnimation, len(States))
	for _, state := range States {
		animation := character.Animations[state.ID]
		frames := make([][2]any, len(animation.Frames))
		for i, frame := range animation.Frames {
			frames[i] = [2]any{frame.Text, frame.MS}
		}
		animations[state.ID] = SerializedAnimation{Still: animation.Still, Frames: frames}
	}
	lines := []string{
		"// Faceroll animations for " + sanitizeComment(character.Name),
		"const animations = " + prettyJSON(animationsJSON(animations)) + ";",
		"",
		"// Animate one state on one terminal line; returns a stop function.",
		"function play(state, stream = process.stdout) {",
		"  if (!Object.prototype.hasOwnProperty.call(animations, state)) {",
		`    throw new RangeError("Unknown animation: " + String(state));`,
		"  }",
		"  const animation = animations[state];",
		"  let index = 0;",
		"  let timer;",
		"  function next() {",
		"    const [face, ms] = animation.frames[index++ % animation.frames.length];",
		`    stream.write("\r\x1b[K" + face);`,
		"    if (animation.frames.length > 1) timer = setTimeout(next, ms);",
		"  }",
		"  next();",
		"  return () => {",
		"    clearTimeout(timer);",
		`    stream.write("\r\x1b[K");`,
		"  };",
		"}",
		"",
		`// Example: const stop = play("working");`,
	}
	return strings.Join(lines, "\n")
}

func frameText(value any) string {
	switch typed := value.(type) {
	case string:
		return typed
	case []byte:
		return string(typed)
	default:
		return fmt.Sprint(value)
	}
}

func jsonFrameMS(value any) jsonValue {
	switch typed := value.(type) {
	case int:
		return jsonNumber(typed)
	case int64:
		return jsonNumber(typed)
	case float64:
		return jsonNumber(int64(typed))
	default:
		return jsonNumber(0)
	}
}

func sanitizeComment(name string) string {
	return strings.NewReplacer("\r", " ", "\n", " ", "\u2028", " ", "\u2029", " ").Replace(name)
}
