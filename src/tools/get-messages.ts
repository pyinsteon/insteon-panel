import memoizeOne from "memoize-one";
import { Message, Repository } from "../data/common";
import { Insteon } from "../data/insteon";
import { addedToLovelace } from "./added-to-lovelace";

export const getMessages = memoizeOne((insteon: Insteon): Message[] => {
  const messages: Message[] = [];
  const repositoriesNotAddedToLovelace: Repository[] = [];
  const repositoriesRestartPending: Repository[] = [];

  insteon.repositories.forEach((repo) => {
    if (repo.status === "pending-restart") {
      repositoriesRestartPending.push(repo);
    }
    if (repo.installed && repo.category === "plugin" && !addedToLovelace(insteon, repo)) {
      repositoriesNotAddedToLovelace.push(repo);
    }
    if (repo.installed && insteon.removed.map((r) => r.repository)?.includes(repo.full_name)) {
      const removedrepo = insteon.removed.find((r) => r.repository === repo.full_name);
      messages.push({
        name: insteon.localize("entry.messages.removed_repository", {
          repository: removedrepo.repository,
        }),
        info: removedrepo.reason,
        severity: "error",
        dialog: "remove",
        repository: repo,
      });
    }
  });

  if (insteon.status?.startup && ["setup", "waiting", "startup"].includes(insteon.status.stage)) {
    messages.push({
      name: insteon.localize(`entry.messages.${insteon.status.stage}.title`),
      info: insteon.localize(`entry.messages.${insteon.status.stage}.content`),
      severity: "warning",
    });
  }

  if (insteon.status?.has_pending_tasks) {
    messages.push({
      name: insteon.localize("entry.messages.has_pending_tasks.title"),
      info: insteon.localize("entry.messages.has_pending_tasks.content"),
      severity: "warning",
    });
  }

  if (insteon.status?.disabled) {
    return [
      {
        name: insteon.localize("entry.messages.disabled.title"),
        secondary: insteon.localize(
          `entry.messages.disabled.${insteon.status?.disabled_reason}.title`
        ),
        info: insteon.localize(
          `entry.messages.disabled.${insteon.status?.disabled_reason}.description`
        ),
        severity: "error",
      },
    ];
  }

  if (repositoriesNotAddedToLovelace.length > 0) {
    messages.push({
      name: insteon.localize("entry.messages.resources.title"),
      info: insteon.localize("entry.messages.resources.content", {
        number: repositoriesNotAddedToLovelace.length,
      }),
      severity: "error",
    });
  }

  if (repositoriesRestartPending.length > 0) {
    messages.push({
      name: insteon.localize("entry.messages.restart.title"),
      info: insteon.localize("entry.messages.restart.content", {
        number: repositoriesRestartPending.length,
        pluralWording:
          repositoriesRestartPending.length === 1
            ? insteon.localize("common.integration")
            : insteon.localize("common.integration_plural"),
      }),
      severity: "error",
    });
  }

  return messages;
});
