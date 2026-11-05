package faceroll

// NameForParts returns the stable automatic name for a part combination.
//
// The table order and the permutation are a persistence contract: they match
// the TypeScript implementation so saved parts keep the same name.
func NameForParts(parts Parts) (string, error) {
	body := indexOfBody(string(parts.Body))
	eyes := indexOfEyes(string(parts.Eyes))
	mouth := indexOfMouth(string(parts.Mouth))
	if body < 0 || eyes < 0 || mouth < 0 {
		return "", &UnknownIDError{Kind: "character name", ID: string(parts.Body) + "/" + string(parts.Eyes) + "/" + string(parts.Mouth)}
	}
	index := (body*len(Eyes)+eyes)*len(Mouths) + mouth
	// 137 is coprime to 6480, so the permutation visits every slot once.
	slot := (index * 137) % (len(Bodies) * len(Eyes) * len(Mouths))
	return firstNameTable[slot%len(firstNameTable)], nil
}

func indexOfBody(id string) int {
	for i, body := range Bodies {
		if string(body.ID) == id {
			return i
		}
	}
	return -1
}

func indexOfEyes(id string) int {
	for i, eyes := range Eyes {
		if string(eyes.ID) == id {
			return i
		}
	}
	return -1
}

func indexOfMouth(id string) int {
	for i, mouth := range Mouths {
		if string(mouth.ID) == id {
			return i
		}
	}
	return -1
}
