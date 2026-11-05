package faceroll

import (
	"strconv"
	"strings"
)

// jsonValue is a small ordered JSON tree used to reproduce JavaScript's
// JSON.stringify output byte-for-byte. Go's encoding/json sorts map keys and
// escapes HTML characters differently, so the exporters build their output
// explicitly instead.
type jsonValue interface {
	writeJSON(*strings.Builder, int)
}

type jsonField struct {
	Key   string
	Value jsonValue
}

type jsonObject []jsonField

type jsonArray []jsonValue

type jsonString string

type jsonNumber int64

func (o jsonObject) writeJSON(b *strings.Builder, depth int) {
	if len(o) == 0 {
		b.WriteString("{}")
		return
	}
	b.WriteString("{\n")
	for i, field := range o {
		b.WriteString(indent(depth + 1))
		writeJSONString(b, field.Key)
		b.WriteString(": ")
		field.Value.writeJSON(b, depth+1)
		if i < len(o)-1 {
			b.WriteByte(',')
		}
		b.WriteByte('\n')
	}
	b.WriteString(indent(depth))
	b.WriteByte('}')
}

func (a jsonArray) writeJSON(b *strings.Builder, depth int) {
	if len(a) == 0 {
		b.WriteString("[]")
		return
	}
	b.WriteString("[\n")
	for i, value := range a {
		b.WriteString(indent(depth + 1))
		value.writeJSON(b, depth+1)
		if i < len(a)-1 {
			b.WriteByte(',')
		}
		b.WriteByte('\n')
	}
	b.WriteString(indent(depth))
	b.WriteByte(']')
}

func (s jsonString) writeJSON(b *strings.Builder, _ int) { writeJSONString(b, string(s)) }

func (n jsonNumber) writeJSON(b *strings.Builder, _ int) {
	b.WriteString(strconv.FormatInt(int64(n), 10))
}

func indent(depth int) string {
	if depth <= 0 {
		return ""
	}
	return strings.Repeat("  ", depth)
}

// writeJSONString quotes a string the way JSON.stringify does. Go strings are
// valid UTF-8, so supplementary characters can be written directly; JavaScript
// leaves ordinary non-ASCII characters unescaped too.
func writeJSONString(b *strings.Builder, value string) {
	b.WriteByte('"')
	for _, r := range value {
		switch r {
		case '"':
			b.WriteString(`\"`)
		case '\\':
			b.WriteString(`\\`)
		case '\b':
			b.WriteString(`\b`)
		case '\t':
			b.WriteString(`\t`)
		case '\n':
			b.WriteString(`\n`)
		case '\f':
			b.WriteString(`\f`)
		case '\r':
			b.WriteString(`\r`)
		default:
			if r < 0x20 {
				const hex = "0123456789abcdef"
				b.WriteString(`\u00`)
				b.WriteByte(hex[(r>>4)&0xf])
				b.WriteByte(hex[r&0xf])
				continue
			}
			b.WriteRune(r)
		}
	}
	b.WriteByte('"')
}

func prettyJSON(value jsonValue) string {
	var b strings.Builder
	value.writeJSON(&b, 0)
	return b.String()
}

// jsonQuote returns a JSON string literal, for the child family key.
func jsonQuote(value string) string {
	var b strings.Builder
	writeJSONString(&b, value)
	return b.String()
}
