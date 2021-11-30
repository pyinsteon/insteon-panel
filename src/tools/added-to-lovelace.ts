import { Repository } from "../data/common";
import { Insteon } from "../data/insteon";

const generateUniqueTag = (repository: Repository, version?: string): string =>
  String(
    `${repository.id}${(
      version ||
      repository.installed_version ||
      repository.selected_tag ||
      repository.available_version
    ).replace(/\D+/g, "")}`
  );

export const generateLovelaceURL = (options: {
  repository: Repository;
  version?: string;
  skipTag?: boolean;
}): string => `/insteon/${options.repository.file_name}`;

export const addedToLovelace = (insteon: Insteon, repository: Repository): boolean => {
  if (!repository.installed) {
    return true;
  }
  if (repository.category !== "plugin") {
    return true;
  }
  if (insteon.status?.lovelace_mode !== "storage") {
    return true;
  }
  const expectedUrl = generateLovelaceURL({ repository, skipTag: true });
  return insteon.resources?.some((resource) => resource.url.includes(expectedUrl)) || false;
};
