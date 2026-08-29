import { ApiError } from "../http";
import type { TurfDetail, TurfListItem } from "@/lib/types";
import {
  findTurfBySlug,
  listCities,
  listTurfs,
  toDetail,
  toListItem,
  type TurfFilters,
} from "../repositories/turfs";

export function discoverTurfs(filters: TurfFilters): TurfListItem[] {
  return listTurfs(filters).map(toListItem);
}

export function getTurfDetail(slug: string): TurfDetail {
  const turf = findTurfBySlug(slug);
  if (!turf) throw ApiError.notFound("Turf not found");
  return toDetail(turf);
}

export function getCities(): string[] {
  return listCities();
}
