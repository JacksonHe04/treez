import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ScoreMode = "ten" | "stars";

type PreferencesState = {
  scoreMode: ScoreMode;
};

const initialState: PreferencesState = {
  scoreMode: "ten",
};

const preferencesSlice = createSlice({
  name: "preferences",
  initialState,
  reducers: {
    setScoreMode(state, action: PayloadAction<ScoreMode>) {
      state.scoreMode = action.payload;
    },
    toggleScoreMode(state) {
      state.scoreMode = state.scoreMode === "ten" ? "stars" : "ten";
    },
  },
});

export const { setScoreMode, toggleScoreMode } = preferencesSlice.actions;
export default preferencesSlice.reducer;
