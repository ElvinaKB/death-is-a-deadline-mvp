import axios from "axios";
import { CustomError } from "./CustomError";

export async function supabasePasswordLogin({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const url = `${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`;
    const { data } = await axios.post(
      url,
      { email, password },
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return data;
  } catch (error: any) {
    throw new CustomError(error?.response?.data?.msg || "Login failed");
  }
}
