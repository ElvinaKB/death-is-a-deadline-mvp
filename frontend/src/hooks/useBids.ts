import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateBidRequest, BidStatus, BidResponse } from "../types/bid.types";
import { MockDataService } from "../services/mockData";
import { differenceInDays } from "date-fns";

// Mock API delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const useCreateBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBidRequest): Promise<BidResponse> => {
      await delay(800); // Simulate network delay

      const place = MockDataService.getPlaceById(data.placeId);
      if (!place) {
        throw new Error("Place not found");
      }

      // Calculate total nights and amount
      const checkIn = new Date(data.checkInDate);
      const checkOut = new Date(data.checkOutDate);
      const totalNights = differenceInDays(checkOut, checkIn);
      const totalAmount = data.bidPerNight * totalNights;

      // Determine bid status based on auto-accept rules
      let status: BidStatus;
      let message: string;

      if (
        place.autoAcceptAboveMinimum &&
        data.bidPerNight >= place.minimumBid
      ) {
        status = BidStatus.ACCEPTED;
        message = "Congratulations! Your bid has been automatically accepted.";
      } else if (data.bidPerNight >= place.minimumBid) {
        // For demo purposes, randomly accept or reject bids at minimum
        status = Math.random() > 0.5 ? BidStatus.ACCEPTED : BidStatus.REJECTED;
        message =
          status === BidStatus.ACCEPTED
            ? "Great news! Your bid has been accepted."
            : "Unfortunately, your bid was not accepted. Try increasing your bid amount.";
      } else {
        status = BidStatus.REJECTED;
        message = `Your bid is below the minimum acceptable bid of $${place.minimumBid} per night.`;
      }

      // Create the bid
      const bid = MockDataService.createBid({
        placeId: data.placeId,
        studentId: "student-1", // Mock student ID
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        bidPerNight: data.bidPerNight,
        totalNights,
        totalAmount,
        status,
      });

      return {
        bid,
        status,
        message,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bids"] });
    },
  });
};
