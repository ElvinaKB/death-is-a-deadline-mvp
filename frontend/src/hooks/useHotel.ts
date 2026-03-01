import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setSelectedHotel,
  clearSelectedHotel,
  Hotel,
} from "../store/slices/hotelSlice";

export function useHotel() {
  const dispatch = useAppDispatch();
  const selectedHotel = useAppSelector((state) => state.hotel.selectedHotel);

  return {
    selectedHotel,
    selectedHotelId: selectedHotel?.id ?? "",
    setHotel: (hotel: Hotel) => dispatch(setSelectedHotel(hotel)),
    clearHotel: () => dispatch(clearSelectedHotel()),
  };
}
