import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Match {
  id: string;
  parentId: string;
  compatibilityScore: number;
  scoreBreakdown: Record<string, number>;
  status: 'pending' | 'liked' | 'matched';
}

interface MatchesState {
  matches: Match[];
  loading: boolean;
}

const initialState: MatchesState = {
  matches: [],
  loading: false,
};

const matchesSlice = createSlice({
  name: 'matches',
  initialState,
  reducers: {
    setMatches: (state, action: PayloadAction<Match[]>) => {
      state.matches = action.payload;
    },
    addMatch: (state, action: PayloadAction<Match>) => {
      state.matches.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setMatches, addMatch, setLoading } = matchesSlice.actions;
export default matchesSlice.reducer;
