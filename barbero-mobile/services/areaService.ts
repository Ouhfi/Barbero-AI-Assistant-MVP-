import { apiClient } from "./api";

export interface Area {
  id: number;
  name: string;
}

/**
 * Fetches the list of all available service areas/neighborhoods.
 * Endpoint: GET /api/areas
 * Public endpoint (no auth required).
 */
export async function getAreas(): Promise<Area[]> {
  const response = await apiClient.get<Area[]>("/areas");
  return response.data || [];
}
