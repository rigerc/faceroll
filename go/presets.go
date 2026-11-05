package faceroll

// GetFacePreset returns a named face or an *UnknownIDError.
func GetFacePreset(id string) (FacePreset, error) {
	for _, preset := range FacePresets {
		if string(preset.ID) == id {
			return preset, nil
		}
	}
	allowed := make([]string, len(FacePresets))
	for i, preset := range FacePresets {
		allowed[i] = string(preset.ID)
	}
	return FacePreset{}, &UnknownIDError{Kind: "face preset", ID: id, Allowed: allowed}
}

// CreatePresetCharacter builds an animated character from a named preset.
func CreatePresetCharacter(id string, options CreateOptions) (*Character, error) {
	preset, err := GetFacePreset(id)
	if err != nil {
		return nil, err
	}
	return New(preset.Parts, options)
}
