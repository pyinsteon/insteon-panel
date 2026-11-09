const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export const nextGroup = (key: string, groups: number[], current: number): number | undefined => {
  if (key in STEP) {
    const index = groups.indexOf(current);
    return groups[(index + STEP[key] + groups.length) % groups.length];
  }
  if (key === "Home") {
    return groups[0];
  }
  if (key === "End") {
    return groups[groups.length - 1];
  }
  if (key === "Enter" || key === " ") {
    return current;
  }
  return undefined;
};
