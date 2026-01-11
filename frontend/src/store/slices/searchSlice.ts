import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface SearchState {
  searchQuery: string;
  maxBid: string;
  selectedDate: string | null; // ISO string for serialization
  dateOption: "tonight" | "tomorrow" | "custom";
}

const initialState: SearchState = {
  searchQuery: "",
  maxBid: "",
  selectedDate: new Date().toISOString(),
  dateOption: "tonight",
};

const searchSlice = createSlice({
  name: "search",
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setMaxBid: (state, action: PayloadAction<string>) => {
      state.maxBid = action.payload;
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    setDateOption: (
      state,
      action: PayloadAction<"tonight" | "tomorrow" | "custom">
    ) => {
      state.dateOption = action.payload;
    },
    resetSearch: (state) => {
      state.searchQuery = "";
      state.maxBid = "";
      state.selectedDate = new Date().toISOString();
      state.dateOption = "tonight";
    },
  },
});

export const {
  setSearchQuery,
  setMaxBid,
  setSelectedDate,
  setDateOption,
  resetSearch,
} = searchSlice.actions;

export default searchSlice.reducer;
