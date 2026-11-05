package faceroll

import (
	"io"
	"os"
	"sync"
)

const (
	clearLine  = "\r\x1b[K"
	hideCursor = "\x1b[?25l"
	showCursor = "\x1b[?25h"
)

// TerminalOptions controls NewTerminalPlayer.
type TerminalOptions struct {
	// Stream defaults to os.Stdout.
	Stream io.Writer
	// IsTTY overrides automatic terminal detection. When nil, detection uses
	// the stream's file mode.
	IsTTY *bool
	// Prefix is printed before the face, for example "pixel ".
	Prefix string
	// Suffix is printed after the face, for example " thinking".
	Suffix string
	// HideCursor hides the cursor while animating. Default true.
	HideCursor *bool
	PlayerOptions
}

// TerminalPlayer animates faces on one terminal line.
type TerminalPlayer struct {
	stream io.Writer
	isTTY  bool

	prefix string
	suffix string
	hide   bool

	mu           sync.Mutex
	player       *Player
	cursorHidden bool
	stopped      bool
}

// NewTerminalPlayer creates a terminal player. On a non-TTY stream (CI logs,
// pipes) it prints the still face once per Play call instead of redrawing.
func NewTerminalPlayer(options TerminalOptions) *TerminalPlayer {
	stream := options.Stream
	if stream == nil {
		stream = os.Stdout
	}
	isTTY := false
	if options.IsTTY != nil {
		isTTY = *options.IsTTY
	} else if file, ok := stream.(*os.File); ok {
		if info, err := file.Stat(); err == nil {
			isTTY = info.Mode()&os.ModeCharDevice != 0
		}
	}
	hide := true
	if options.HideCursor != nil {
		hide = *options.HideCursor
	}
	player := NewPlayer(nil, options.PlayerOptions)
	t := &TerminalPlayer{
		stream: stream,
		isTTY:  isTTY,
		prefix: options.Prefix,
		suffix: options.Suffix,
		hide:   hide,
		player: player,
	}
	player.onFrame = func(frame Frame, _ int, _ Animation) {
		t.mu.Lock()
		defer t.mu.Unlock()
		if t.stopped {
			return
		}
		_, _ = io.WriteString(t.stream, clearLine+t.prefix+frame.Text+t.suffix)
	}
	return t
}

// Play starts an animation.
func (t *TerminalPlayer) Play(animation Animation) {
	if !t.isTTY {
		t.mu.Lock()
		t.stopped = false
		_, _ = io.WriteString(t.stream, t.prefix+animation.Still+t.suffix+"\n")
		t.mu.Unlock()
		return
	}
	t.mu.Lock()
	t.stopped = false
	if t.hide && !t.cursorHidden {
		_, _ = io.WriteString(t.stream, hideCursor)
		t.cursorHidden = true
	}
	t.mu.Unlock()
	t.player.Play(animation)
}

// Stop stops the animation. When clear is true it erases the line instead of
// leaving the last frame.
func (t *TerminalPlayer) Stop(clear bool) {
	t.player.Stop()
	t.mu.Lock()
	defer t.mu.Unlock()
	t.stopped = true
	if !t.isTTY {
		return
	}
	if clear {
		_, _ = io.WriteString(t.stream, clearLine)
	} else {
		_, _ = io.WriteString(t.stream, "\n")
	}
	if t.cursorHidden {
		_, _ = io.WriteString(t.stream, showCursor)
		t.cursorHidden = false
	}
}

// PlayInTerminal plays one animation and returns a function that stops it.
func PlayInTerminal(animation Animation, options TerminalOptions) func(clear bool) {
	player := NewTerminalPlayer(options)
	player.Play(animation)
	return player.Stop
}
