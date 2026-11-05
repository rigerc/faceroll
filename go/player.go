package faceroll

import (
	"sync"
	"time"
)

// FrameIndexAt returns the index of the frame showing elapsedMS into a looping
// animation. Negative times wrap.
func FrameIndexAt(animation Animation, elapsedMS int) int {
	frames := animation.Frames
	duration := animation.Duration
	if len(frames) == 0 || duration <= 0 {
		return 0
	}
	t := ((elapsedMS % duration) + duration) % duration
	for i, frame := range frames {
		if t < frame.MS {
			return i
		}
		t -= frame.MS
	}
	return len(frames) - 1
}

// FrameAt returns the frame showing elapsedMS into a looping animation.
func FrameAt(animation Animation, elapsedMS int) Frame {
	if len(animation.Frames) == 0 {
		return Frame{}
	}
	return animation.Frames[FrameIndexAt(animation, elapsedMS)]
}

// PlayerOptions swaps in fake timers for tests.
type PlayerOptions struct {
	// After returns a channel that fires after ms milliseconds. Defaults to
	// time.After.
	After func(ms int) <-chan time.Time
}

// Player is a timer-driven animation player.
type Player struct {
	onFrame func(Frame, int, Animation)
	after   func(int) <-chan time.Time

	mu      sync.Mutex
	stopCh  chan struct{}
	current *Animation
}

// NewPlayer creates a player. onFrame runs once per frame, including the first
// one, when Play is called or a new animation starts.
func NewPlayer(onFrame func(Frame, int, Animation), options PlayerOptions) *Player {
	after := options.After
	if after == nil {
		after = func(ms int) <-chan time.Time {
			return time.After(time.Duration(ms) * time.Millisecond)
		}
	}
	return &Player{onFrame: onFrame, after: after}
}

// Play starts looping an animation. Switching animations restarts from frame
// zero. Single-frame animations render once and schedule no timer.
func (p *Player) Play(animation Animation) {
	p.Stop()
	if len(animation.Frames) == 0 {
		return
	}
	current := animation
	stop := make(chan struct{})

	p.mu.Lock()
	p.stopCh = stop
	p.current = &current
	p.mu.Unlock()

	go func() {
		for index := 0; ; index = (index + 1) % len(current.Frames) {
			select {
			case <-stop:
				return
			default:
			}
			p.onFrame(current.Frames[index], index, current)
			// A single-frame animation stays still: render once, schedule nothing.
			if len(current.Frames) == 1 {
				return
			}
			select {
			case <-stop:
				return
			case <-p.after(current.Frames[index].MS):
			}
		}
	}()
}

// Stop stops on the current frame.
func (p *Player) Stop() {
	p.mu.Lock()
	if p.stopCh != nil {
		close(p.stopCh)
		p.stopCh = nil
	}
	p.current = nil
	p.mu.Unlock()
}

// Playing reports whether an animation is active.
func (p *Player) Playing() bool {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.current != nil
}

// Current returns the active animation, if any.
func (p *Player) Current() *Animation {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.current
}
