import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface Hotel {
  id: string;
  name: string;
  [key: string]: unknown; // extensible for future fields
}

interface HotelState {
  selectedHotel: Hotel | null;
}

const initialState: HotelState = {
  selectedHotel: null,
};

const hotelSlice = createSlice({
  name: "hotel",
  initialState,
  reducers: {
    setSelectedHotel: (state, action: PayloadAction<Hotel>) => {
      state.selectedHotel = action.payload;
    },
    clearSelectedHotel: (state) => {
      state.selectedHotel = null;
    },
  },
});

export const { setSelectedHotel, clearSelectedHotel } = hotelSlice.actions;
export default hotelSlice.reducer;
