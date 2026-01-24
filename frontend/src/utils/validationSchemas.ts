import { isAfter } from "date-fns";
import * as yup from "yup";

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
});

export const signupSchema = yup.object().shape({
  name: yup
    .string()
    .min(2, "Name must be at least 2 characters")
    .required("Name is required"),
  email: yup
    .string()
    .email("Invalid email address")
    .required("Email is required"),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .required("Password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
  studentIdCard: yup
    .mixed()
    .test("fileType", "Only image files are allowed", (value) => {
      if (!value) return true; // Allow empty (will be validated conditionally)
      if (value instanceof File) {
        return ["image/jpeg", "image/png", "image/jpg"].includes(value.type);
      }
      return true;
    })
    .test("fileSize", "File size must be less than 5MB", (value) => {
      if (!value) return true;
      if (value instanceof File) {
        return value.size <= 5 * 1024 * 1024; // 5MB
      }
      return true;
    }),
});

export const bidValidationSchema = yup.object({
  checkInDate: yup.date().required("Check-in date is required"),
  checkOutDate: yup
    .date()
    .required("Check-out date is required")
    .test(
      "after-checkin",
      "Check-out must be after check-in",
      function (value) {
        return value ? isAfter(value, this.parent.checkInDate) : false;
      },
    ),
  bidPerNight: yup
    .number()
    .required("Bid amount is required")
    .min(1, "Bid must be greater than 0"),
});

export const placeValidationSchema = yup.object({
  name: yup
    .string()
    .required("Place name is required")
    .min(3, "Name must be at least 3 characters"),
  shortDescription: yup
    .string()
    .required("Short description is required")
    .max(100, "Must be 100 characters or less"),
  fullDescription: yup
    .string()
    .required("Full description is required")
    .min(50, "Description must be at least 50 characters"),
  city: yup.string().required("City is required"),
  country: yup.string().required("Country is required"),
  address: yup.string().required("Address is required"),
  email: yup
    .string()
    .required("Email is required")
    .email("Invalid email address")
    .nullable(),
  latitude: yup.number().nullable(),
  longitude: yup.number().nullable(),
  accommodationType: yup.string().required("Accommodation type is required"),
  retailPrice: yup
    .number()
    .required("Retail price is required")
    .min(1, "Price must be greater than 0"),
  minimumBid: yup
    .number()
    .required("Minimum bid is required")
    .min(1, "Minimum bid must be greater than 0")
    .test(
      "less-than-retail",
      "Minimum bid must be less than retail price",
      function (value) {
        return value < this.parent.retailPrice;
      },
    ),
});
