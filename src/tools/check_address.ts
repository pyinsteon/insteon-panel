export const check_address = (address: string): boolean => {
  const valid_chars = [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
  ];
  address = address.replace(".", "").replace(".", "").toLocaleLowerCase();
  const check_value = [...address];
  if (check_value.length != 6) {
    return false;
  }
  for (let i = 0; i < check_value.length; i++) {
    if (!valid_chars.includes(check_value[i])) {
      return false;
    }
  }
  return true;
};
