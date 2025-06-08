"use client";

import { ExperienceService } from "@/lib/experience/experience.service";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Component() {
  const { data, status } = useSession();

  const [experienceData, setExperienceData] = useState<unknown>(null);

  useEffect(() => {
    const fetchExperienceData = async () => {
      try {
        const experiences = await ExperienceService.findAll();
        setExperienceData(experiences);
      } catch (error) {
        console.error("Error fetching experiences:", error);
      }
    };
    fetchExperienceData();
  }, []);

  return (
    <>
      Data: {JSON.stringify(data)}
      Status: {JSON.stringify(status)}
      <br />
      Fake Data: {JSON.stringify(experienceData)}
    </>
  );

  return (
    <>
      Data: {JSON.stringify(data)}
      Status: {JSON.stringify(status)}
    </>
  );
}
