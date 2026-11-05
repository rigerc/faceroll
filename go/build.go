package faceroll

// Animations maps every state to its animation.
type Animations map[StateName]Animation

// BuildAnimations builds every animation for one set of parts.
//
// Every frame is the same body, eyes and mouth in a different pose, so a
// character stays recognizable as it changes state. Glances move the face
// inside its body with a space, and tails such as "..." or "?" are appended so
// the body never moves.
func BuildAnimations(parts Parts) (Animations, error) {
	body, err := GetBody(string(parts.Body))
	if err != nil {
		return nil, err
	}
	eyes, err := GetEyes(string(parts.Eyes))
	if err != nil {
		return nil, err
	}
	mouthID := parts.Mouth
	if body.Mouth != "" {
		mouthID = body.Mouth
	}
	mouth, err := GetMouth(string(mouthID))
	if err != nil {
		return nil, err
	}

	face := func(e, m string, look Look, tail string) string {
		pair := eyePair(eyes, e)
		mouthGlyph := mouthGlyph(mouth, m)
		core := pair.Left + mouthGlyph + pair.Right
		switch look {
		case LookLeft:
			core += " "
		case LookRight:
			core = " " + core
		}
		return body.Left + core + body.Right + tail
	}
	frame := func(e, m string, look Look, tail string, ms int) Frame {
		return Frame{Text: face(e, m, look, tail), MS: ms}
	}
	anim := func(name StateName, frames []Frame, still string) Animation {
		duration := 0
		width := CellWidth(still)
		for _, frame := range frames {
			duration += frame.MS
			if w := CellWidth(frame.Text); w > width {
				width = w
			}
		}
		return Animation{Name: name, Still: still, Frames: frames, Duration: duration, Width: width}
	}

	dots := []string{".  ", ".. ", "...", " ..", "  .", "   "}
	scan := []Look{LookCenter, LookLeft, LookLeft, LookCenter, LookRight, LookRight}
	working := make([]Frame, len(dots))
	for i, dot := range dots {
		working[i] = frame("open", "flat", scan[i], " "+dot, 150)
	}

	out := Animations{
		StateIdle: anim(StateIdle, []Frame{
			frame("open", "calm", LookCenter, "", 2400),
			frame("blink", "calm", LookCenter, "", 110),
			frame("open", "calm", LookCenter, "", 1500),
			frame("open", "calm", LookLeft, "", 650),
			frame("open", "calm", LookRight, "", 650),
			frame("open", "calm", LookCenter, "", 1300),
			frame("blink", "calm", LookCenter, "", 110),
			frame("open", "calm", LookCenter, "", 150),
			frame("blink", "calm", LookCenter, "", 110),
		}, face("open", "calm", LookCenter, "")),
		StateWorking: anim(StateWorking, working, face("open", "flat", LookCenter, " ...")),
		StateWaiting: anim(StateWaiting, []Frame{
			frame("open", "calm", LookCenter, "", 700),
			frame("open", "calm", LookCenter, " .", 450),
			frame("open", "calm", LookCenter, " ..", 450),
			frame("open", "calm", LookCenter, " ...", 700),
			frame("blink", "calm", LookCenter, " ...", 110),
			frame("open", "calm", LookCenter, " ...", 500),
		}, face("open", "calm", LookCenter, " ...")),
		StateQuestioning: anim(StateQuestioning, []Frame{
			frame("open", "unsure", LookCenter, "", 500),
			frame("open", "unsure", LookLeft, " ?", 500),
			frame("open", "unsure", LookRight, " ?", 500),
			frame("open", "unsure", LookCenter, " ??", 600),
			frame("blink", "unsure", LookCenter, " ?", 110),
			frame("open", "unsure", LookCenter, " ?", 500),
		}, face("open", "unsure", LookCenter, " ?")),
		StateHappy: anim(StateHappy, []Frame{
			frame("happy", "big", LookCenter, "", 350),
			frame("happy", "big", LookLeft, " ♪", 300),
			frame("happy", "big", LookCenter, "", 350),
			frame("happy", "big", LookRight, " ♫", 300),
		}, face("happy", "big", LookCenter, " ♪")),
		StateSad: anim(StateSad, []Frame{
			frame("sad", "sad", LookCenter, "", 900),
			frame("blink", "sad", LookCenter, "", 140),
			frame("sad", "sad", LookCenter, "", 600),
			frame("sad", "sad", LookLeft, " …", 700),
			frame("sad", "sad", LookCenter, "", 700),
		}, face("sad", "sad", LookCenter, "")),
		StateSurprised: anim(StateSurprised, []Frame{
			frame("open", "calm", LookCenter, "", 500),
			frame("wide", "open", LookLeft, "!", 110),
			frame("wide", "open", LookRight, "!", 110),
			frame("wide", "open", LookLeft, "!!", 110),
			frame("wide", "open", LookRight, "!!", 110),
			frame("wide", "open", LookCenter, "!!", 1100),
		}, face("wide", "open", LookCenter, "!!")),
		StateAngry: anim(StateAngry, []Frame{
			frame("angry", "angry", LookCenter, "", 500),
			frame("angry", "angry", LookLeft, "", 80),
			frame("angry", "angry", LookRight, "", 80),
			frame("angry", "angry", LookLeft, "", 80),
			frame("angry", "angry", LookRight, "", 80),
			frame("angry", "angry", LookCenter, " #", 500),
			frame("angry", "angry", LookCenter, " ##", 500),
		}, face("angry", "angry", LookCenter, " #")),
		// A single frame stays still; its duration is the mood-cycle dwell time.
		StateDead: anim(StateDead, []Frame{
			frame("dead", "calm", LookCenter, "", 1000),
		}, face("dead", "calm", LookCenter, "")),
		StateSleepy: anim(StateSleepy, []Frame{
			frame("sleep", "sleep", LookCenter, "", 900),
			frame("sleep", "sleep", LookCenter, " z", 600),
			frame("sleep", "sleep", LookCenter, " zz", 600),
			frame("sleep", "sleep", LookCenter, " zzZ", 800),
		}, face("sleep", "sleep", LookCenter, " zzZ")),
	}
	return out, nil
}

func eyePair(eyes EyeDef, expression string) Pair {
	// The dead mood uses fixed X eyes rather than a part's expression.
	if expression == "dead" {
		return Pair{Left: "X", Right: "X"}
	}
	switch expression {
	case "open":
		return eyes.Open
	case "blink":
		return eyes.Blink
	case "happy":
		return eyes.Happy
	case "wide":
		return eyes.Wide
	case "sad":
		return eyes.Sad
	case "angry":
		return eyes.Angry
	case "sleep":
		return eyes.Sleep
	default:
		return eyes.Open
	}
}

func mouthGlyph(mouth MouthDef, expression string) string {
	switch expression {
	case "calm":
		return mouth.Calm
	case "smile":
		return mouth.Smile
	case "big":
		return mouth.Big
	case "open":
		return mouth.Open
	case "sad":
		return mouth.Sad
	case "flat":
		return mouth.Flat
	case "unsure":
		return mouth.Unsure
	case "angry":
		return mouth.Angry
	case "sleep":
		return mouth.Sleep
	default:
		return mouth.Calm
	}
}
