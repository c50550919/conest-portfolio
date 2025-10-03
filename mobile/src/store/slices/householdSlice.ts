import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Household {
  id: string;
  name: string;
  members: string[];
  monthlyRent: number;
  expenses: Record<string, number>;
}

interface HouseholdState {
  currentHousehold: Household | null;
  loading: boolean;
}

const initialState: HouseholdState = {
  currentHousehold: null,
  loading: false,
};

const householdSlice = createSlice({
  name: 'household',
  initialState,
  reducers: {
    setHousehold: (state, action: PayloadAction<Household>) => {
      state.currentHousehold = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setHousehold, setLoading } = householdSlice.actions;
export default householdSlice.reducer;
