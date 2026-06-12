import { createAsyncThunk } from "@reduxjs/toolkit";
import { AutoProviderPool } from "core/llm/autoRouter";
import { ThunkApiType } from "../store";

export const updateAutoModelSelection = createAsyncThunk<
  { enabled: boolean; pool: AutoProviderPool },
  {
    profileId: string;
    enabled?: boolean;
    pool?: AutoProviderPool;
  },
  ThunkApiType
>(
  "config/updateAutoModelSelection",
  async ({ profileId, enabled, pool }, { extra }) => {
    const result = await extra.ideMessenger.request(
      "config/updateAutoModelSelection",
      {
        profileId,
        enabled,
        pool,
      },
    );
    if (result.status === "error") {
      throw new Error(result.error);
    }
    return result.content;
  },
);

export const getAutoModelSelection = createAsyncThunk<
  { enabled: boolean; pool: AutoProviderPool },
  { profileId: string },
  ThunkApiType
>("config/getAutoModelSelection", async ({ profileId }, { extra }) => {
  const result = await extra.ideMessenger.request(
    "config/getAutoModelSelection",
    {
      profileId,
    },
  );
  if (result.status === "error") {
    throw new Error(result.error);
  }
  return result.content;
});
