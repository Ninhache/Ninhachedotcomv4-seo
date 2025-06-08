"use client";

import { ExperienceApi } from "./experience.api";

export const ExperienceService = {
  findAll: () => {
    return ExperienceApi.findAll();
  },
};
