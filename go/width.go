package faceroll

// CellWidth estimates the terminal column width of text.
//
// East Asian wide and fullwidth characters count as 2, combining marks as 0,
// everything else (including ambiguous glyphs such as • and ◕) as 1. Fonts
// decide the real width; this matches common terminal defaults.
func CellWidth(text string) int {
	width := 0
	for _, r := range text {
		width += charWidth(r)
	}
	return width
}

func charWidth(r rune) int {
	cp := int(r)
	if cp < 32 || (cp >= 0x7f && cp < 0xa0) {
		return 0
	}
	if (cp >= 0x0300 && cp <= 0x036f) ||
		(cp >= 0x1ab0 && cp <= 0x1aff) ||
		(cp >= 0x1dc0 && cp <= 0x1dff) ||
		(cp >= 0x20d0 && cp <= 0x20ff) ||
		(cp >= 0xfe00 && cp <= 0xfe0f) ||
		(cp >= 0xfe20 && cp <= 0xfe2f) ||
		cp == 0x200b ||
		cp == 0x200d {
		return 0
	}
	if isWide(cp) {
		return 2
	}
	return 1
}

func isWide(cp int) bool {
	return (cp >= 0x1100 && cp <= 0x115f) ||
		(cp >= 0x2e80 && cp <= 0x303e) ||
		(cp >= 0x3041 && cp <= 0x33ff) ||
		(cp >= 0x3400 && cp <= 0x4dbf) ||
		(cp >= 0x4e00 && cp <= 0x9fff) ||
		(cp >= 0xa000 && cp <= 0xa4cf) ||
		(cp >= 0xac00 && cp <= 0xd7a3) ||
		(cp >= 0xf900 && cp <= 0xfaff) ||
		(cp >= 0xfe30 && cp <= 0xfe6f) ||
		(cp >= 0xff00 && cp <= 0xff60) ||
		(cp >= 0xffe0 && cp <= 0xffe6) ||
		(cp >= 0x1f300 && cp <= 0x1f64f) ||
		(cp >= 0x1f900 && cp <= 0x1f9ff) ||
		(cp >= 0x20000 && cp <= 0x3fffd)
}
