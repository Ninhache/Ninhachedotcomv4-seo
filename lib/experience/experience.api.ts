import { getSession } from "next-auth/react";
import { baseUrl } from "../baseurl";
import axios from "axios";

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const session = await getSession();
  console.log("session", session);
  // @ts-ignore
  config.headers.Authorization = `Bearer ${session?.accessToken}`;

  return config;
});

export const ExperienceApi = {
  findAll: () => {
    return api
      .get("/experience")
      .then((response) => response.data)
      .catch((error) => {
        throw new Error(
          error.response?.data?.message || "Failed to fetch experiences"
        );
      });
  },
};
