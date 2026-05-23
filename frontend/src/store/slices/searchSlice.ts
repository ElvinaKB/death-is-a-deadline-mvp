import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { format } from "date-fns";

interface SearchState {
  searchQuery: string;
  maxBid: string;
  /** yyyy-MM-dd — matches backend public places `date` query */
  selectedDate: string | null;
  dateOption: "tonight" | "tomorrow" | "custom";
}

const initialState: SearchState = {
  searchQuery: "",
  maxBid: "",
  selectedDate: format(new Date(), "yyyy-MM-dd"),
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
      action: PayloadAction<"tonight" | "tomorrow" | "custom">,
    ) => {
      state.dateOption = action.payload;
    },
    resetSearch: (state) => {
      state.searchQuery = "";
      state.maxBid = "";
      state.selectedDate = format(new Date(), "yyyy-MM-dd");
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
