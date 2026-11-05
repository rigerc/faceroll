package faceroll

// StateNames lists the states in display order.
func StateNames() []StateName {
	out := make([]StateName, len(States))
	for i, state := range States {
		out[i] = state.ID
	}
	return out
}

// GetState returns a state definition or an *UnknownIDError.
func GetState(name string) (StateInfo, error) {
	for _, state := range States {
		if string(state.ID) == name {
			return state, nil
		}
	}
	allowed := make([]string, len(States))
	for i, state := range States {
		allowed[i] = string(state.ID)
	}
	return StateInfo{}, &UnknownIDError{Kind: "state", ID: name, Allowed: allowed}
}
