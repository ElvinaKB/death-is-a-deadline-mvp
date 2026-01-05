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
      }
    ),
  bidPerNight: yup
    .number()
    .required("Bid amount is required")
    .min(1, "Bid must be greater than 0"),
});
